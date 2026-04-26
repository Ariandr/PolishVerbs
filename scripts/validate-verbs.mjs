import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const verbsDir = path.join(rootDir, 'src/data/verbs')
const expectedVerbCount = 3000
const pronouns = ['ja', 'ty', 'on', 'ona', 'my', 'wy', 'oni', 'one']

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertString(value, message) {
  assert(typeof value === 'string' && value.trim().length > 0, message)
}

function validatePast(verb) {
  assertString(verb.forms?.past?.ja?.masculine, `${verb.id}: missing past ja masculine`)
  assertString(verb.forms?.past?.ja?.feminine, `${verb.id}: missing past ja feminine`)
  assertString(verb.forms?.past?.ty?.masculine, `${verb.id}: missing past ty masculine`)
  assertString(verb.forms?.past?.ty?.feminine, `${verb.id}: missing past ty feminine`)
  assertString(verb.forms?.past?.on?.masculine, `${verb.id}: missing past on masculine`)
  assertString(verb.forms?.past?.ona?.feminine, `${verb.id}: missing past ona feminine`)
  assertString(verb.forms?.past?.my?.virile, `${verb.id}: missing past my virile`)
  assertString(verb.forms?.past?.my?.nonvirile, `${verb.id}: missing past my nonvirile`)
  assertString(verb.forms?.past?.wy?.virile, `${verb.id}: missing past wy virile`)
  assertString(verb.forms?.past?.wy?.nonvirile, `${verb.id}: missing past wy nonvirile`)
  assertString(verb.forms?.past?.oni?.virile, `${verb.id}: missing past oni virile`)
  assertString(verb.forms?.past?.one?.nonvirile, `${verb.id}: missing past one nonvirile`)
}

async function main() {
  const files = (await readdir(verbsDir)).filter((file) => file.endsWith('.json')).sort()
  const verbs = []

  for (const file of files) {
    const records = JSON.parse(await readFile(path.join(verbsDir, file), 'utf8'))
    assert(Array.isArray(records), `${file}: expected an array`)
    verbs.push(...records)
  }

  assert(verbs.length === expectedVerbCount, `expected ${expectedVerbCount} verbs, got ${verbs.length}`)

  const ids = new Set()
  const ranks = new Set()

  verbs.forEach((verb, index) => {
    assertString(verb.id, `record ${index}: missing id`)
    assert(!ids.has(verb.id), `${verb.id}: duplicate id`)
    ids.add(verb.id)

    assert(Number.isInteger(verb.frequencyRank), `${verb.id}: invalid frequency rank`)
    assert(!ranks.has(verb.frequencyRank), `${verb.id}: duplicate rank ${verb.frequencyRank}`)
    ranks.add(verb.frequencyRank)
    assert(verb.frequencyRank >= 1 && verb.frequencyRank <= expectedVerbCount, `${verb.id}: rank out of range`)

    assertString(verb.infinitive, `${verb.id}: missing infinitive`)
    assertString(verb.frequencySource, `${verb.id}: missing source`)
    assert(typeof verb.frequency?.ipm === 'number', `${verb.id}: missing IPM`)
    assert(Array.isArray(verb.translations?.en) && verb.translations.en.length > 0, `${verb.id}: missing English translation`)
    assert(Array.isArray(verb.translations?.uk) && verb.translations.uk.length > 0, `${verb.id}: missing Ukrainian translation`)
    assert(Array.isArray(verb.examples) && verb.examples.length > 0, `${verb.id}: missing examples`)
    assertString(verb.examples[0].pl, `${verb.id}: missing Polish example`)
    assertString(verb.examples[0].en, `${verb.id}: missing English example`)
    assertString(verb.examples[0].uk, `${verb.id}: missing Ukrainian example`)

    pronouns.forEach((pronoun) => {
      assertString(verb.forms?.present?.[pronoun], `${verb.id}: missing present ${pronoun}`)
    })
    validatePast(verb)
  })

  console.log(`Validated ${verbs.length} verbs across ${files.length} files.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
