import { spawn } from 'node:child_process'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const verbsDir = path.join(rootDir, 'src/data/verbs')
const cacheDir = path.join(rootDir, 'node_modules/.tmp')
const cachePath = path.join(cacheDir, 'rewrite-examples-901-plus-codex-cache.json')
const outputPath = path.join(cacheDir, 'rewrite-examples-901-plus-output.json')

const minRank = Number(process.env.MIN_RANK ?? 901)
const maxRank = Number(process.env.MAX_RANK ?? 5000)
const rankList = (process.env.RANKS ?? '')
  .split(',')
  .map((token) => Number(token.trim()))
  .filter((value) => Number.isInteger(value) && value > 0)
const rankSet = rankList.length > 0 ? new Set(rankList) : null
const batchSize = Number(process.env.BATCH_SIZE ?? 40)
const codexModel = process.env.CODEX_MODEL ?? 'gpt-5.2'
const maxRetries = Number(process.env.MAX_RETRIES ?? 3)
const batchTimeoutMs = Number(process.env.BATCH_TIMEOUT_MS ?? 600_000)

const templatePatterns = [
  /^Dzisiaj chcę .* to spokojnie i dokładnie\.$/i,
  /^Muszę .* z nim o tej sprawie\.$/i,
  /^Jutro chcę .* do biura wcześniej niż zwykle\.$/i,
  /^Trudno .* o tym bez dodatkowych informacji\.$/i,
  /^Muszę .* to przed końcem dnia\.$/i,
  /^Warto .* ludzi, którzy nas wspierają\.$/i,
  /^To może .*, jeśli zlekceważymy problem\.$/i,
  /^Uczę się, jak poprawnie /i,
]

function normalize(value) {
  return value.toLocaleLowerCase('pl').normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function normalizeWords(value) {
  return normalize(value)
    .replace(/[^\p{L}\s-]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function flattenPastForms(pastForms) {
  const flat = []
  for (const personValue of Object.values(pastForms ?? {})) {
    for (const form of Object.values(personValue ?? {})) {
      if (typeof form === 'string' && form.trim()) {
        flat.push(form.trim())
      }
    }
  }
  return flat
}

function collectVerbForms(verb) {
  const presentForms = Object.values(verb.forms?.present ?? {})
  const pastForms = flattenPastForms(verb.forms?.past)
  return [verb.infinitive, ...presentForms, ...pastForms]
    .map((form) => (typeof form === 'string' ? form.trim() : ''))
    .filter(Boolean)
}

function containsVerbForm(verb, sentence) {
  const sentenceWords = normalizeWords(sentence)
  const sentenceJoined = ` ${sentenceWords.join(' ')} `
  return collectVerbForms(verb).some((form) => {
    const formWords = normalizeWords(form)
    if (formWords.length === 0) return false
    if (formWords.length === 1) {
      return sentenceWords.includes(formWords[0])
    }
    return sentenceJoined.includes(` ${formWords.join(' ')} `)
  })
}

function looksTemplate(plSentence) {
  return templatePatterns.some((pattern) => pattern.test(plSentence))
}

function isGoodExample(verb) {
  const example = verb.examples?.[0]
  if (!example?.pl || !example?.en || !example?.uk) return false

  const pl = example.pl.trim()
  const en = example.en.trim()
  const uk = example.uk.trim()

  if (looksTemplate(pl)) return false
  if (uk.includes('переклад потребує перевірки')) return false
  if (en.includes('translation needs review')) return false
  if (pl.length < 8 || pl.length > 140) return false
  if (en.length < 6 || en.length > 190) return false
  if (uk.length < 6 || uk.length > 190) return false
  if ((pl.match(/,\s/g) ?? []).length > 3) return false
  if (!containsVerbForm(verb, pl)) return false

  return true
}

function buildPrompt(batch) {
  const payload = batch.map((verb) => ({
    frequencyRank: verb.frequencyRank,
    infinitive: verb.infinitive,
    aspect: verb.aspect,
    translationsEn: (verb.translations?.en ?? []).slice(0, 3),
    translationsUk: (verb.translations?.uk ?? []).slice(0, 3),
    acceptedPolishForms: Array.from(new Set(collectVerbForms(verb))).slice(0, 24),
  }))

  return [
    'Generate one high-quality example sentence for each Polish verb.',
    'Return ONLY a JSON array of objects with: frequencyRank, pl, en, uk.',
    'Rules:',
    '- Polish must be grammatical, natural, contemporary, and useful for learners.',
    '- The Polish sentence must include exactly one target form copied from acceptedPolishForms.',
    '- Copy that target form exactly as written, including Polish diacritics.',
    '- Do not invent a different conjugated form if it is not listed in acceptedPolishForms.',
    '- The sentence can be in present, past, or future.',
    '- Each Polish sentence must be exactly one sentence and typically 7-16 words.',
    '- English and Ukrainian must be faithful, natural translations of the Polish sentence.',
    '- Avoid generic template phrasing and avoid metadata-like wording.',
    '- Keep output in the same order as input.',
    '',
    `Input: ${JSON.stringify(payload)}`,
  ].join('\n')
}

function isValidCandidate(verb, candidate) {
  if (!candidate || typeof candidate !== 'object') return false
  if (typeof candidate.pl !== 'string' || typeof candidate.en !== 'string' || typeof candidate.uk !== 'string') return false

  const pl = candidate.pl.trim()
  const en = candidate.en.trim()
  const uk = candidate.uk.trim()

  if (!pl || !en || !uk) return false
  if (looksTemplate(pl)) return false
  if (pl.length < 8 || pl.length > 150) return false
  if (en.length < 6 || en.length > 210) return false
  if (uk.length < 6 || uk.length > 210) return false
  if (uk.includes('переклад потребує перевірки')) return false
  if (!containsVerbForm(verb, pl)) return false

  return true
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
    // Continue with fence extraction.
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

  const weakTargets = allTargets.filter((verb) => !isGoodExample(verb))
  const pending = weakTargets.filter((verb) => !isValidCandidate(verb, cache[verb.frequencyRank]))

  console.log(
    rankSet
      ? `Custom ranks (${rankSet.size} requested). Found: ${allTargets.length}. Need rewrite: ${weakTargets.length}. Pending generation: ${pending.length}.`
      : `Rank range ${minRank}-${maxRank}. In range: ${allTargets.length}. Need rewrite: ${weakTargets.length}. Pending generation: ${pending.length}.`
  )

  for (let i = 0; i < pending.length; i += batchSize) {
    const slice = pending.slice(i, i + batchSize)
    const totalBatches = Math.ceil(pending.length / batchSize)
    const currentBatch = Math.floor(i / batchSize) + 1
    console.log(`Batch ${currentBatch}/${totalBatches} (${slice.length} verbs)...`)

    const missing = new Map(slice.map((verb) => [verb.frequencyRank, verb]))
    for (let attempt = 1; attempt <= maxRetries && missing.size > 0; attempt += 1) {
      const attemptBatch = Array.from(missing.values())
      try {
        const generated = await runCodexBatch(attemptBatch)
        for (const item of generated) {
          const rank = Number(item?.frequencyRank)
          const verb = missing.get(rank)
          if (!verb) continue
          if (!isValidCandidate(verb, item)) continue
          cache[rank] = {
            pl: item.pl.trim(),
            en: item.en.trim(),
            uk: item.uk.trim(),
          }
          missing.delete(rank)
        }
      } catch (error) {
        console.error(`  attempt ${attempt} failed: ${error.message}`)
      }

      await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
      if (missing.size > 0) {
        console.log(`  unresolved after attempt ${attempt}: ${missing.size}`)
      }
    }

    if (missing.size > 0) {
      console.warn(
        `Batch ${currentBatch}: keeping existing examples for unresolved ranks ${Array.from(missing.keys()).join(', ')}`
      )
    }
  }

  let changed = 0
  for (const chunk of chunks) {
    let chunkChanged = false
    for (const verb of chunk.records) {
      if (verb.frequencyRank < minRank || verb.frequencyRank > maxRank) {
        if (!rankSet || !rankSet.has(verb.frequencyRank)) {
          continue
        }
      } else if (rankSet && !rankSet.has(verb.frequencyRank)) {
        continue
      }

      if (isGoodExample(verb)) {
        continue
      }

      const replacement = cache[verb.frequencyRank]
      if (!isValidCandidate(verb, replacement)) {
        continue
      }

      const current = verb.examples?.[0]
      if (current?.pl !== replacement.pl || current?.en !== replacement.en || current?.uk !== replacement.uk) {
        verb.examples = [replacement]
        changed += 1
        chunkChanged = true
      }
    }
    if (chunkChanged) {
      await writeFile(chunk.filePath, `${JSON.stringify(chunk.records, null, 2)}\n`, 'utf8')
    }
  }

  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
  console.log(`Applied ${changed} rewritten examples using Codex ${codexModel}.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
