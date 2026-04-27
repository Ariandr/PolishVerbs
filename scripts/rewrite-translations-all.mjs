import { spawn } from 'node:child_process'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const verbsDir = path.join(rootDir, 'src/data/verbs')
const cacheDir = path.join(rootDir, 'node_modules/.tmp')
const cachePath = path.join(cacheDir, 'rewrite-translations-cache.json')
const outputPath = path.join(cacheDir, 'rewrite-translations-output.json')

const minRank = Number(process.env.MIN_RANK ?? 1)
const maxRank = Number(process.env.MAX_RANK ?? 3000)
const rankList = (process.env.RANKS ?? '')
  .split(',')
  .map((token) => Number(token.trim()))
  .filter((value) => Number.isInteger(value) && value > 0)
const rankSet = rankList.length > 0 ? new Set(rankList) : null
const batchSize = Number(process.env.BATCH_SIZE ?? 40)
const codexModel = process.env.CODEX_MODEL ?? 'gpt-5.4-mini'
const maxRetries = Number(process.env.MAX_RETRIES ?? 2)
const batchTimeoutMs = Number(process.env.BATCH_TIMEOUT_MS ?? 600_000)
const translationMode = process.env.TRANSLATION_MODE ?? 'auto' // auto | codex | google
const googleConcurrency = Math.max(1, Number(process.env.GOOGLE_CONCURRENCY ?? 8))

function normalizePolish(value) {
  return value
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonicalize(value, language) {
  let normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/g, '')
    .trim()

  if (language === 'en') {
    normalized = normalized.replace(/[’]/g, "'")
  }

  return normalized.toLocaleLowerCase(language === 'uk' ? 'uk' : 'en')
}

function dedupeEnglishSubglosses(entries) {
  const seenGlosses = new Set()
  const dedupedEntries = []

  for (const entry of entries) {
    const parts = String(entry)
      .split(',')
      .map((part) => part.replace(/\s+/g, ' ').replace(/[.;:!?]+$/g, '').trim())
      .filter(Boolean)

    const kept = []
    for (const part of parts) {
      const glossKey = part.toLowerCase().replace(/^to\s+/i, '').trim()
      if (!glossKey) continue
      if (seenGlosses.has(glossKey)) continue
      seenGlosses.add(glossKey)
      kept.push(part)
    }

    if (kept.length > 0) {
      dedupedEntries.push(kept.join(', '))
    }
  }

  return dedupedEntries
}

function sanitizeTranslationList(values, language) {
  const list = Array.isArray(values) ? values : []
  const deduped = []
  const seen = new Set()

  for (const item of list) {
    const trimmed = String(item ?? '').replace(/\s+/g, ' ').replace(/[.,;:!?]+$/g, '').trim()
    if (!trimmed) continue
    const key = canonicalize(trimmed, language)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(trimmed)
  }

  const languageAdjusted = language === 'en' ? dedupeEnglishSubglosses(deduped) : deduped
  return languageAdjusted.slice(0, 3)
}

function hasCyrillic(text) {
  return /[\u0400-\u04FF]/u.test(text)
}

function hasLatin(text) {
  return /[A-Za-z]/.test(text)
}

function hasVerbLikeUkrainianForm(text) {
  const normalized = String(text ?? '').toLocaleLowerCase('uk')
  const tokens = normalized.split(/[\s,;/]+/).map((token) => token.trim()).filter(Boolean)
  return tokens.some((token) => /(ти|тися|тись)$/u.test(token))
}

function looksFallbackTranslation(text) {
  return /переклад потребує перевірки/i.test(text) || /translation needs review/i.test(text)
}

function isBadUkTranslationEntry(entry) {
  if (!entry) return true
  if (looksFallbackTranslation(entry)) return true
  if (!hasCyrillic(entry)) return true
  if (hasLatin(entry) && !hasCyrillic(entry)) return true
  if (!hasVerbLikeUkrainianForm(entry)) return true
  return false
}

function isBadEnTranslationEntry(verb, entry) {
  if (!entry) return true
  if (looksFallbackTranslation(entry)) return true
  if (/[ąćęłńóśźż]/i.test(entry)) return true

  const en = canonicalize(entry, 'en')
  const infinitive = normalizePolish(verb.infinitive)
  if (!en) return true
  if (en === `to ${infinitive}`) return true
  if (en.includes(infinitive)) return true

  return false
}

function getSanitizedTranslations(verb) {
  return {
    en: sanitizeTranslationList(verb.translations?.en ?? [], 'en'),
    uk: sanitizeTranslationList(verb.translations?.uk ?? [], 'uk'),
  }
}

function needsRewrite(verb, sanitized) {
  if (sanitized.en.length === 0 || sanitized.uk.length === 0) return true
  if (sanitized.en.some((entry) => isBadEnTranslationEntry(verb, entry))) return true
  if (sanitized.uk.some((entry) => isBadUkTranslationEntry(entry))) return true
  return false
}

function buildPrompt(batch) {
  const payload = batch.map((verb) => ({
    frequencyRank: verb.frequencyRank,
    infinitive: verb.infinitive,
    aspect: verb.aspect,
    currentEn: sanitizeTranslationList(verb.translations?.en ?? [], 'en'),
    currentUk: sanitizeTranslationList(verb.translations?.uk ?? [], 'uk'),
  }))

  return [
    'Generate clean dictionary translations for Polish verbs.',
    'Return ONLY a JSON array of objects with: frequencyRank, en, uk.',
    'Rules:',
    '- Keep output order identical to input order.',
    '- `en` and `uk` must each be arrays with 1 to 3 short entries.',
    '- English entries must be natural infinitive glosses, usually starting with "to".',
    '- Ukrainian entries must be natural infinitive glosses in Cyrillic.',
    '- No duplicates, no trailing punctuation, no comments, no placeholders.',
    '- Do not keep Polish words in `en` or `uk` as untranslated items.',
    '- Prefer common meanings useful for learners.',
    '',
    `Input: ${JSON.stringify(payload)}`,
  ].join('\n')
}

function parseJsonArrayFromText(rawText) {
  const trimmed = rawText.trim()
  if (!trimmed) {
    throw new Error('Empty Codex output')
  }

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // Continue with fence/array extraction.
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) {
    const parsed = JSON.parse(fencedMatch[1])
    if (Array.isArray(parsed)) return parsed
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/)
  if (arrayMatch?.[0]) {
    const parsed = JSON.parse(arrayMatch[0])
    if (Array.isArray(parsed)) return parsed
  }

  throw new Error('Could not parse JSON array from Codex output')
}

function isValidCandidate(verb, candidate) {
  if (!candidate || typeof candidate !== 'object') return false
  const en = sanitizeTranslationList(candidate.en, 'en')
  const uk = sanitizeTranslationList(candidate.uk, 'uk')

  if (en.length === 0 || uk.length === 0) return false
  if (en.some((entry) => isBadEnTranslationEntry(verb, entry))) return false
  if (uk.some((entry) => isBadUkTranslationEntry(entry))) return false

  return true
}

function normalizeEnglishGloss(raw) {
  const cleaned = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/g, '')
    .trim()
  if (!cleaned) return ''

  const lower = cleaned.replace(/^to\s+/i, '').trim()
  if (!lower) return ''
  return `to ${lower.toLocaleLowerCase('en')}`
}

function normalizeUkrainianGloss(raw) {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/g, '')
    .trim()
    .toLocaleLowerCase('uk')
}

function extractUkrainianVerbForms(text) {
  const normalized = String(text ?? '')
    .toLocaleLowerCase('uk')
    .replace(/[^\p{L}\s'-]/gu, ' ')
  const tokens = normalized.split(/\s+/).map((token) => token.trim()).filter(Boolean)
  return Array.from(new Set(tokens.filter((token) => /(ти|тися|тись)$/u.test(token))))
}

async function translateViaGoogle(text, targetLanguage) {
  const query = encodeURIComponent(text)
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pl&tl=${targetLanguage}&dt=t&q=${query}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Google Translate API ${targetLanguage} failed with ${response.status}`)
  }
  const body = await response.text()
  const parsed = JSON.parse(body)
  const translation = (parsed?.[0] ?? [])
    .map((part) => (typeof part?.[0] === 'string' ? part[0] : ''))
    .join('')
    .trim()
  if (!translation) {
    throw new Error(`Google Translate returned empty ${targetLanguage} translation`)
  }
  return translation
}

async function buildGoogleCandidate(verb) {
  const plToEn = await translateViaGoogle(verb.infinitive, 'en')

  const existingEn = sanitizeTranslationList(verb.translations?.en ?? [], 'en').filter(
    (entry) => !isBadEnTranslationEntry(verb, entry)
  )
  const existingUk = sanitizeTranslationList(verb.translations?.uk ?? [], 'uk').filter(
    (entry) => !isBadUkTranslationEntry(entry)
  )

  const en = sanitizeTranslationList([normalizeEnglishGloss(plToEn), ...existingEn], 'en')

  const ukFromEn = []
  for (const enGloss of en) {
    const sentence = `I need ${normalizeEnglishGloss(enGloss)}.`
    const sentenceUk = await translateViaGoogle(sentence, 'uk')
    const extracted = extractUkrainianVerbForms(sentenceUk)
    if (extracted.length > 0) {
      ukFromEn.push(...extracted)
      continue
    }

    const direct = await translateViaGoogle(enGloss, 'uk')
    ukFromEn.push(normalizeUkrainianGloss(direct))
  }

  const ukFromPl = normalizeUkrainianGloss(await translateViaGoogle(verb.infinitive, 'uk'))
  const uk = sanitizeTranslationList([...ukFromEn, ukFromPl, ...existingUk], 'uk').filter(
    (entry) => !isBadUkTranslationEntry(entry)
  )

  return { en, uk }
}

async function fillMissingWithGoogle(missing, cache) {
  const queue = Array.from(missing.values())
  let cursor = 0

  const workers = Array.from({ length: Math.min(googleConcurrency, queue.length) }, async () => {
    while (cursor < queue.length) {
      const index = cursor
      cursor += 1
      const verb = queue[index]
      if (!verb) continue

      try {
        const candidate = await buildGoogleCandidate(verb)
        if (!isValidCandidate(verb, candidate)) continue
        cache[verb.frequencyRank] = {
          en: sanitizeTranslationList(candidate.en, 'en'),
          uk: sanitizeTranslationList(candidate.uk, 'uk'),
        }
        missing.delete(verb.frequencyRank)
      } catch {
        // Keep unresolved; higher-level loop will report it.
      }
    }
  })

  await Promise.all(workers)
}

async function runCodexBatch(batch) {
  const args = [
    'exec',
    '--ephemeral',
    '--sandbox',
    'read-only',
    '-m',
    codexModel,
    '--output-last-message',
    outputPath,
    buildPrompt(batch),
  ]

  await new Promise((resolve, reject) => {
    const child = spawn('codex', args, {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      if (stdout.length < 8000) {
        stdout += String(chunk)
      }
    })

    child.stderr.on('data', (chunk) => {
      if (stderr.length < 8000) {
        stderr += String(chunk)
      }
    })

    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Codex batch timed out after ${batchTimeoutMs} ms`))
    }, batchTimeoutMs)

    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    child.on('close', (code, signal) => {
      clearTimeout(timeout)
      if (code === 0) {
        resolve()
        return
      }
      const details = [stderr.trim(), stdout.trim()].filter(Boolean).join('\n')
      reject(
        new Error(
          `Codex exited with code ${code ?? 'null'} signal ${signal ?? 'null'}${details ? `\n${details}` : ''}`
        )
      )
    })
  })

  const raw = await readFile(outputPath, 'utf8')
  const parsed = parseJsonArrayFromText(raw)
  if (!Array.isArray(parsed)) {
    throw new Error('Codex output is not an array')
  }
  return parsed
}

async function loadVerbChunks() {
  const files = (await readdir(verbsDir))
    .filter((file) => file.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))

  const chunks = []
  for (const file of files) {
    const filePath = path.join(verbsDir, file)
    chunks.push({
      file,
      filePath,
      records: JSON.parse(await readFile(filePath, 'utf8')),
    })
  }
  return chunks
}

async function loadCache() {
  try {
    return JSON.parse(await readFile(cachePath, 'utf8'))
  } catch {
    return {}
  }
}

async function main() {
  await mkdir(cacheDir, { recursive: true })
  const chunks = await loadVerbChunks()
  const cache = await loadCache()

  const allTargets = chunks
    .flatMap((chunk) => chunk.records)
    .filter((verb) => {
      if (rankSet) return rankSet.has(verb.frequencyRank)
      return verb.frequencyRank >= minRank && verb.frequencyRank <= maxRank
    })

  const needsRewriteTargets = allTargets.filter((verb) => needsRewrite(verb, getSanitizedTranslations(verb)))
  const pending = needsRewriteTargets.filter((verb) => !isValidCandidate(verb, cache[verb.frequencyRank]))
  let googleFallbackEnabled = translationMode === 'google'

  console.log(
    rankSet
      ? `Custom ranks (${rankSet.size} requested). Found: ${allTargets.length}. Need rewrite: ${needsRewriteTargets.length}. Pending generation: ${pending.length}.`
      : `Rank range ${minRank}-${maxRank}. In range: ${allTargets.length}. Need rewrite: ${needsRewriteTargets.length}. Pending generation: ${pending.length}.`
  )

  for (let i = 0; i < pending.length; i += batchSize) {
    const slice = pending.slice(i, i + batchSize)
    const totalBatches = Math.ceil(pending.length / batchSize)
    const currentBatch = Math.floor(i / batchSize) + 1
    console.log(`Batch ${currentBatch}/${totalBatches} (${slice.length} verbs)...`)

    const missing = new Map(slice.map((verb) => [verb.frequencyRank, verb]))

    for (let attempt = 1; attempt <= maxRetries && missing.size > 0; attempt += 1) {
      const attemptBatch = Array.from(missing.values())
      if (googleFallbackEnabled) {
        await fillMissingWithGoogle(missing, cache)
      } else {
        try {
          const generated = await runCodexBatch(attemptBatch)
          for (const item of generated) {
            const rank = Number(item?.frequencyRank)
            const verb = missing.get(rank)
            if (!verb) continue
            if (!isValidCandidate(verb, item)) continue

            cache[rank] = {
              en: sanitizeTranslationList(item.en, 'en'),
              uk: sanitizeTranslationList(item.uk, 'uk'),
            }
            missing.delete(rank)
          }
        } catch (error) {
          const message = String(error?.message ?? error)
          console.error(`  attempt ${attempt} failed: ${message}`)
          if (translationMode !== 'codex') {
            if (/usage limit|purchase more credits|try again at/i.test(message)) {
              console.warn('  Codex usage limit hit. Switching to Google fallback for remaining work.')
            } else {
              console.warn('  Falling back to Google translation for unresolved items in this batch.')
            }
            googleFallbackEnabled = true
            await fillMissingWithGoogle(missing, cache)
          }
        }
      }

      await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
      if (missing.size > 0) {
        console.log(`  unresolved after attempt ${attempt}: ${missing.size}`)
      }
    }

    if (missing.size > 0) {
      console.warn(
        `Batch ${currentBatch}: keeping existing translations for unresolved ranks ${Array.from(missing.keys()).join(', ')}`
      )
    }
  }

  let changed = 0
  let rewritten = 0
  let normalizedOnly = 0

  for (const chunk of chunks) {
    let chunkChanged = false
    for (const verb of chunk.records) {
      const inScope = rankSet
        ? rankSet.has(verb.frequencyRank)
        : verb.frequencyRank >= minRank && verb.frequencyRank <= maxRank
      if (!inScope) continue

      const sanitized = getSanitizedTranslations(verb)
      const replacement = cache[verb.frequencyRank]
      const shouldRewrite = needsRewrite(verb, sanitized) && isValidCandidate(verb, replacement)

      const finalTranslations = shouldRewrite
        ? {
            en: sanitizeTranslationList(replacement.en, 'en'),
            uk: sanitizeTranslationList(replacement.uk, 'uk'),
          }
        : sanitized

      const currentEn = Array.isArray(verb.translations?.en) ? verb.translations.en : []
      const currentUk = Array.isArray(verb.translations?.uk) ? verb.translations.uk : []
      const sameEn = JSON.stringify(currentEn) === JSON.stringify(finalTranslations.en)
      const sameUk = JSON.stringify(currentUk) === JSON.stringify(finalTranslations.uk)
      if (sameEn && sameUk) continue

      verb.translations = finalTranslations
      changed += 1
      if (shouldRewrite) rewritten += 1
      else normalizedOnly += 1
      chunkChanged = true
    }

    if (chunkChanged) {
      await writeFile(chunk.filePath, `${JSON.stringify(chunk.records, null, 2)}\n`, 'utf8')
    }
  }

  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
  console.log(
    `Updated ${changed} verbs (${rewritten} rewritten, ${normalizedOnly} normalization-only) using mode=${translationMode}.`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
