import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const verbsDir = path.join(rootDir, 'src/data/verbs')
const minRank = Number(process.env.MIN_RANK ?? 3001)
const maxRank = Number(process.env.MAX_RANK ?? 5000)
const ukrainianFallbackNote = 'Ukrainian translation fallback needs review.'

function hasCyrillic(text) {
  return /[\u0400-\u04FF]/u.test(text)
}

function looksFallbackTranslation(text) {
  return /переклад потребує перевірки/i.test(text) || /translation needs review/i.test(text)
}

function hasVerbLikeUkrainianForm(text) {
  const normalized = String(text ?? '').toLocaleLowerCase('uk')
  const tokens = normalized.split(/[\s,;/]+/).map((token) => token.trim()).filter(Boolean)
  return tokens.some((token) => /(ти|тися|тись)$/u.test(token))
}

function hasGoodUkrainianTranslations(verb) {
  const entries = Array.isArray(verb.translations?.uk) ? verb.translations.uk : []
  return entries.length > 0 && entries.every((entry) => {
    const value = String(entry ?? '').trim()
    return value && hasCyrillic(value) && !looksFallbackTranslation(value) && hasVerbLikeUkrainianForm(value)
  })
}

async function main() {
  const files = (await readdir(verbsDir))
    .filter((file) => file.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))

  let changed = 0
  let clearedFallbackStatus = 0

  for (const file of files) {
    const filePath = path.join(verbsDir, file)
    const records = JSON.parse(await readFile(filePath, 'utf8'))
    let fileChanged = false

    for (const verb of records) {
      if (verb.frequencyRank < minRank || verb.frequencyRank > maxRank) {
        continue
      }

      const notes = Array.isArray(verb.notes) ? verb.notes : []
      if (notes.includes(ukrainianFallbackNote) && hasGoodUkrainianTranslations(verb)) {
        verb.notes = notes.filter((note) => note !== ukrainianFallbackNote)
        changed += 1
        fileChanged = true
      }

      if (verb.reviewStatus === 'fallback-needs-review' && verb.notes.length === 0) {
        verb.reviewStatus = 'wiktionary-enriched'
        clearedFallbackStatus += 1
        fileChanged = true
      }
    }

    if (fileChanged) {
      await writeFile(filePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8')
    }
  }

  console.log(
    `Cleaned ${changed} stale Ukrainian fallback note(s); cleared ${clearedFallbackStatus} fallback review status value(s).`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
