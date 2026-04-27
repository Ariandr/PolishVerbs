import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const verbsDir = path.join(rootDir, 'src/data/verbs')

function splitGlosses(entry) {
  return String(entry ?? '')
    .split(',')
    .map((part) => part.replace(/\s+/g, ' ').replace(/[.;:!?]+$/g, '').trim())
    .filter(Boolean)
}

function canonicalGloss(gloss) {
  return gloss.toLowerCase().replace(/^to\s+/i, '').trim()
}

function dedupeEnglishTranslations(enTranslations) {
  const seenGlosses = new Set()
  const dedupedEntries = []
  const seenEntries = new Set()

  for (const entry of Array.isArray(enTranslations) ? enTranslations : []) {
    const glosses = splitGlosses(entry)
    const keptGlosses = []

    for (const gloss of glosses) {
      const key = canonicalGloss(gloss)
      if (!key) continue
      if (seenGlosses.has(key)) continue
      seenGlosses.add(key)
      keptGlosses.push(gloss)
    }

    if (keptGlosses.length === 0) continue
    const rebuilt = keptGlosses.join(', ')
    const rebuiltKey = rebuilt.toLowerCase()
    if (seenEntries.has(rebuiltKey)) continue
    seenEntries.add(rebuiltKey)
    dedupedEntries.push(rebuilt)
  }

  return dedupedEntries
}

async function main() {
  const files = (await readdir(verbsDir))
    .filter((file) => file.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  let changedVerbs = 0
  let changedFiles = 0

  for (const file of files) {
    const filePath = path.join(verbsDir, file)
    const verbs = JSON.parse(await readFile(filePath, 'utf8'))
    let fileChanged = false

    for (const verb of verbs) {
      const currentEn = Array.isArray(verb.translations?.en) ? verb.translations.en : []
      const dedupedEn = dedupeEnglishTranslations(currentEn)

      if (JSON.stringify(currentEn) === JSON.stringify(dedupedEn)) {
        continue
      }

      if (!verb.translations) {
        verb.translations = { en: dedupedEn, uk: [] }
      } else {
        verb.translations.en = dedupedEn
      }

      fileChanged = true
      changedVerbs += 1
    }

    if (fileChanged) {
      await writeFile(filePath, `${JSON.stringify(verbs, null, 2)}\n`, 'utf8')
      changedFiles += 1
    }
  }

  console.log(`Updated EN duplicates in ${changedVerbs} verbs across ${changedFiles} files.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
