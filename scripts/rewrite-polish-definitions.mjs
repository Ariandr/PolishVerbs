import { spawn } from 'node:child_process'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const verbsDir = path.join(rootDir, 'src/data/verbs')
const cacheDir = path.join(rootDir, 'node_modules/.tmp')
const cachePath = path.join(cacheDir, 'rewrite-polish-definitions-cache.json')
const outputPath = path.join(cacheDir, 'rewrite-polish-definitions-output.json')

const minRank = Number(process.env.MIN_RANK ?? 1)
const maxRank = Number(process.env.MAX_RANK ?? 5000)
const rankList = (process.env.RANKS ?? '')
  .split(',')
  .map((token) => Number(token.trim()))
  .filter((value) => Number.isInteger(value) && value > 0)
const rankSet = rankList.length > 0 ? new Set(rankList) : null
const batchSize = Number(process.env.BATCH_SIZE ?? 50)
const codexModel = process.env.CODEX_MODEL ?? 'gpt-5.4'
const maxRetries = Number(process.env.MAX_RETRIES ?? 2)
const batchTimeoutMs = Number(process.env.BATCH_TIMEOUT_MS ?? 900_000)
const forceRewrite = process.env.FORCE === '1'

const boilerplatePatterns = [
  /^czasownik\s+/i,
  /^oznacza\s+/i,
  /^jest to\s+/i,
  /^czynno[śs][ćc]\s+polegaj[aą]ca\s+na\s+/i,
  /w j[eę]zyku polskim/i,
  /po polsku/i,
]

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function normalize(value) {
  return clean(value).toLocaleLowerCase('pl-PL')
}

function hasCyrillic(value) {
  return /[\u0400-\u04FF]/u.test(value)
}

function hasMarkup(value) {
  return /\{\{|\}\}|<[^>]+>|\[\[|\]\]|&nbsp;|Category:/i.test(value)
}

function looksEnglishHeavy(value) {
  return /(?:^|[\s,;:()])(?:make|have|get|run|move|use|say|take|give|become|put|set)(?:$|[\s,;:()])/i.test(value)
}

function sanitizeDefinition(raw, verb) {
  let definition = clean(raw)
    .replace(/^["'`„”]+|["'`„”]+$/g, '')
    .replace(/[.;]+$/g, '')
    .trim()

  const escapedInfinitive = verb.infinitive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  definition = definition
    .replace(new RegExp(`^${escapedInfinitive}\\s*(?:->|→|—|-|:)+\\s*`, 'i'), '')
    .replace(/^definicja\s*:\s*/i, '')
    .trim()

  return definition
}

function isValidDefinition(verb, rawDefinition) {
  const definition = sanitizeDefinition(rawDefinition, verb)
  if (definition.length < 18 || definition.length > 260) return false
  if (hasCyrillic(definition) || hasMarkup(definition) || looksEnglishHeavy(definition)) return false
  if (boilerplatePatterns.some((pattern) => pattern.test(definition))) return false
  if (normalize(definition) === normalize(verb.infinitive)) return false
  return true
}

function compactPastForms(verb) {
  return {
    ja: [verb.forms?.past?.ja?.masculine, verb.forms?.past?.ja?.feminine].filter(Boolean),
    my: [verb.forms?.past?.my?.virile, verb.forms?.past?.my?.nonvirile].filter(Boolean),
    oni: [verb.forms?.past?.oni?.virile, verb.forms?.past?.one?.nonvirile].filter(Boolean),
  }
}

function buildPrompt(batch) {
  const payload = batch.map((verb) => ({
    frequencyRank: verb.frequencyRank,
    infinitive: verb.infinitive,
    aspect: verb.aspect,
    aspectPair: verb.aspectPair ?? null,
    translationsEn: (verb.translations?.en ?? []).slice(0, 3),
    translationsUk: (verb.translations?.uk ?? []).slice(0, 3),
    presentForms: {
      ja: verb.forms?.present?.ja,
      my: verb.forms?.present?.my,
      oni: verb.forms?.present?.oni,
    },
    pastForms: compactPastForms(verb),
    examplePl: verb.examples?.[0]?.pl ?? '',
    existingDefinitionPl: verb.definitionPl ?? '',
  }))

  return [
    'Generate high-quality Polish learner definitions for Polish verbs.',
    'Return ONLY a JSON array of objects with: frequencyRank, definitionPl.',
    'Rules:',
    '- Keep output order identical to input order.',
    '- Write in Polish only.',
    '- Define the verb with natural infinitive verb phrases whenever possible.',
    '- Good style examples: "szybko poruszać się...", "doprowadzać do...", "zaczynać robić...", "sprawiać, że...".',
    '- Do NOT write boilerplate such as "czasownik oznacza", "jest to", "czynność polegająca na", "w języku polskim".',
    '- Include the main common senses useful for learners; separate related senses with commas or semicolons.',
    '- Be concise and clear, usually 8-28 Polish words.',
    '- Do not include example sentences, markdown, quotes, numbering, English, Ukrainian, or source notes.',
    '- Do not just translate the English gloss literally if it would sound unnatural in Polish.',
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
      if (stdout.length < 8000) stdout += String(chunk)
    })

    child.stderr.on('data', (chunk) => {
      if (stderr.length < 8000) stderr += String(chunk)
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
          `Codex exited with code ${code ?? 'null'} signal ${signal ?? 'null'}${details ? `\n${details}` : ''}`,
        ),
      )
    })
  })

  return parseJsonArrayFromText(await readFile(outputPath, 'utf8'))
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

async function applyCachedDefinitions(chunks, cache, targetFilter) {
  let changed = 0
  for (const chunk of chunks) {
    let chunkChanged = false
    for (const verb of chunk.records) {
      if (!targetFilter(verb)) continue
      const cached = cache[verb.frequencyRank]?.definitionPl
      if (!isValidDefinition(verb, cached)) continue
      const definitionPl = sanitizeDefinition(cached, verb)
      if (verb.definitionPl === definitionPl) continue

      verb.definitionPl = definitionPl
      chunkChanged = true
      changed += 1
    }

    if (chunkChanged) {
      await writeFile(chunk.filePath, `${JSON.stringify(chunk.records, null, 2)}\n`, 'utf8')
    }
  }
  return changed
}

async function main() {
  await mkdir(cacheDir, { recursive: true })
  const chunks = await loadVerbChunks()
  const cache = await loadCache()
  const targetFilter = (verb) => {
    if (rankSet) return rankSet.has(verb.frequencyRank)
    return verb.frequencyRank >= minRank && verb.frequencyRank <= maxRank
  }
  const allTargets = chunks
    .flatMap((chunk) => chunk.records)
    .filter(targetFilter)

  const initiallyApplied = await applyCachedDefinitions(chunks, cache, targetFilter)
  if (initiallyApplied > 0) {
    console.log(`Applied cached definitions before generation: ${initiallyApplied}.`)
  }

  const targets = allTargets.filter((verb) => forceRewrite || !isValidDefinition(verb, verb.definitionPl))
  const pending = targets.filter((verb) => !isValidDefinition(verb, cache[verb.frequencyRank]?.definitionPl))

  console.log(
    rankSet
      ? `Custom ranks (${rankSet.size} requested). Found: ${allTargets.length}. Need definition: ${targets.length}. Pending generation: ${pending.length}.`
      : `Rank range ${minRank}-${maxRank}. In range: ${allTargets.length}. Need definition: ${targets.length}. Pending generation: ${pending.length}.`,
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
          const definitionPl = sanitizeDefinition(item?.definitionPl, verb)
          if (!isValidDefinition(verb, definitionPl)) continue
          cache[rank] = { definitionPl }
          missing.delete(rank)
        }
      } catch (error) {
        console.error(`  attempt ${attempt} failed: ${String(error?.message ?? error)}`)
      }

      await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
      const applied = await applyCachedDefinitions(chunks, cache, targetFilter)
      if (applied > 0) {
        console.log(`  applied cached definitions: ${applied}`)
      }
      if (missing.size > 0) {
        console.log(`  unresolved after attempt ${attempt}: ${missing.size}`)
      }
    }

    if (missing.size > 0) {
      console.warn(`Batch ${currentBatch}: unresolved ranks ${Array.from(missing.keys()).join(', ')}`)
    }
  }

  const changed = await applyCachedDefinitions(chunks, cache, targetFilter)

  const unresolved = allTargets.filter((verb) => !isValidDefinition(verb, verb.definitionPl) && !isValidDefinition(verb, cache[verb.frequencyRank]?.definitionPl))
  console.log(`Definitions written/updated: ${changed}. Unresolved definitions: ${unresolved.length}.`)
  if (unresolved.length) {
    console.error(unresolved.slice(0, 100).map((verb) => `#${verb.frequencyRank} ${verb.infinitive}`).join('\n'))
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
