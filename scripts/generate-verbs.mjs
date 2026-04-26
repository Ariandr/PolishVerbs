import * as cheerio from 'cheerio'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const outputDir = path.join(rootDir, 'src/data/verbs')
const kwjpSource = 'KWJP balanced contemporary Polish corpus frequency list, all subcorpora, lemma, infinitive POS'
const kwjpUrl = 'https://kwjp.pl/lists/en'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'user-agent': 'PolishVerbs personal study app data generator',
          ...(options.headers ?? {}),
        },
      })
      const copy = response.clone()
      const text = await copy.text()
      if (!response.ok || text.includes('You are making too many requests')) {
        throw new Error(`${response.status} ${response.statusText}`)
      }
      return response
    } catch (error) {
      if (attempt === retries) {
        throw error
      }
      await sleep(1200 + attempt * 1800)
    }
  }
}

async function fetchText(url, options) {
  return (await fetchWithRetry(url, options)).text()
}

function dataTablesBody(length) {
  const body = new URLSearchParams()
  Object.entries({
    subcorpus: 'all',
    unit_type: 'lemma',
    ngram: '1',
    draw: '1',
    start: '0',
    length: String(length),
    'order[0][column]': '0',
    'order[0][dir]': 'asc',
  }).forEach(([key, value]) => body.set(key, value))

  const columns = ['measure_0', 'name_0', 'name_1', 'name_2', 'name_3', 'pos', 'measure_1', 'measure_2', 'measure_3', 'measure_4', 'measure_5']
  columns.forEach((column, index) => {
    body.set(`columns[${index}][data]`, column)
    body.set(`columns[${index}][searchable]`, index === 0 || index >= 6 ? 'false' : 'true')
    body.set(`columns[${index}][orderable]`, 'true')
    body.set(`columns[${index}][search][value]`, '')
    body.set(`columns[${index}][search][regex]`, 'false')
  })

  return body
}

async function fetchFrequencyRows() {
  const response = await fetchWithRetry('https://kwjp.pl/lists/_get_list/en', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: dataTablesBody(50000),
  })
  const json = await response.json()
  const seen = new Set()

  return json.data
    .filter((row) => row.pos.includes('title="infinitive"'))
    .filter((row) => {
      const lemma = row.name_0.trim()
      if (!lemma || seen.has(lemma)) {
        return false
      }
      seen.add(lemma)
      return true
    })
    .slice(0, 600)
    .map((row, index) => ({
      frequencyRank: index + 1,
      corpusRank: Number(row.measure_0),
      infinitive: row.name_0.trim(),
      frequency: {
        absolute: Number(row.measure_1),
        ipm: Number(row.measure_2),
        arf: Number(row.measure_3),
      },
    }))
}

function cleanText(value) {
  return value
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim()
}

function uniqueClean(values) {
  const seen = new Set()
  return values
    .map(cleanText)
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLocaleLowerCase()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function parseAspect(headwordText) {
  if (/\bimpf\b/.test(headwordText) && /\bpf\b/.test(headwordText)) {
    return 'biaspectual'
  }
  if (/\bimpf\b/.test(headwordText)) {
    return 'imperfective'
  }
  if (/\bpf\b/.test(headwordText)) {
    return 'perfective'
  }
  return 'unknown'
}

function fallbackPresent(infinitive) {
  if (infinitive === 'być') {
    return { ja: 'jestem', ty: 'jesteś', on: 'jest', ona: 'jest', my: 'jesteśmy', wy: 'jesteście', oni: 'są', one: 'są' }
  }
  if (infinitive === 'mieć') {
    return { ja: 'mam', ty: 'masz', on: 'ma', ona: 'ma', my: 'mamy', wy: 'macie', oni: 'mają', one: 'mają' }
  }
  if (infinitive.endsWith('ować')) {
    const stem = infinitive.slice(0, -4)
    return { ja: `${stem}uję`, ty: `${stem}ujesz`, on: `${stem}uje`, ona: `${stem}uje`, my: `${stem}ujemy`, wy: `${stem}ujecie`, oni: `${stem}ują`, one: `${stem}ują` }
  }
  if (infinitive.endsWith('ać')) {
    const stem = infinitive.slice(0, -2)
    return { ja: `${stem}am`, ty: `${stem}asz`, on: `${stem}a`, ona: `${stem}a`, my: `${stem}amy`, wy: `${stem}acie`, oni: `${stem}ają`, one: `${stem}ają` }
  }
  if (infinitive.endsWith('ić')) {
    const stem = infinitive.slice(0, -2)
    return { ja: `${stem}ię`, ty: `${stem}isz`, on: `${stem}i`, ona: `${stem}i`, my: `${stem}imy`, wy: `${stem}icie`, oni: `${stem}ią`, one: `${stem}ią` }
  }
  if (infinitive.endsWith('yć')) {
    const stem = infinitive.slice(0, -2)
    return { ja: `${stem}ę`, ty: `${stem}ysz`, on: `${stem}y`, ona: `${stem}y`, my: `${stem}ymy`, wy: `${stem}ycie`, oni: `${stem}ą`, one: `${stem}ą` }
  }
  const stem = infinitive.replace(/ć$/, '')
  return { ja: `${stem}ę`, ty: `${stem}esz`, on: `${stem}e`, ona: `${stem}e`, my: `${stem}emy`, wy: `${stem}ecie`, oni: `${stem}ą`, one: `${stem}ą` }
}

function fallbackPast(infinitive) {
  const stem = infinitive.replace(/ć$/, 'ł').replace(/eł$/, 'ał')
  return {
    ja: { masculine: `${stem}em`, feminine: `${stem}am` },
    ty: { masculine: `${stem}eś`, feminine: `${stem}aś` },
    on: { masculine: stem },
    ona: { feminine: stem.replace(/ł$/, 'ła') },
    my: { virile: `${stem.replace(/ł$/, 'li')}śmy`, nonvirile: `${stem.replace(/ł$/, 'ły')}śmy` },
    wy: { virile: `${stem.replace(/ł$/, 'li')}ście`, nonvirile: `${stem.replace(/ł$/, 'ły')}ście` },
    oni: { virile: stem.replace(/ł$/, 'li') },
    one: { nonvirile: stem.replace(/ł$/, 'ły') },
  }
}

function extractForms(html, infinitive) {
  const $ = cheerio.load(html)
  const present = fallbackPresent(infinitive)
  const past = fallbackPast(infinitive)
  let foundPresent = 0
  let foundPast = 0

  $('span.form-of.lang-pl').each((_, element) => {
    const className = $(element).attr('class') ?? ''
    const value = cleanText($(element).text())
    if (!value) {
      return
    }

    const isNonPast =
      className.includes('pres-form-of') ||
      className.includes('fut-form-of') ||
      className.includes('futr-form-of')

    if (isNonPast && className.includes('1|s|')) {
      present.ja = value
      foundPresent += 1
    } else if (isNonPast && className.includes('2|s|')) {
      present.ty = value
      foundPresent += 1
    } else if (isNonPast && className.includes('3|s|')) {
      present.on = value
      present.ona = value
      foundPresent += 1
    } else if (isNonPast && className.includes('1|p|')) {
      present.my = value
      foundPresent += 1
    } else if (isNonPast && className.includes('2|p|')) {
      present.wy = value
      foundPresent += 1
    } else if (isNonPast && className.includes('3|p|')) {
      present.oni = value
      present.one = value
      foundPresent += 1
    } else if (className.includes('1|s|m|past-form-of')) {
      past.ja.masculine = value
      foundPast += 1
    } else if (className.includes('1|s|f|past-form-of')) {
      past.ja.feminine = value
      foundPast += 1
    } else if (className.includes('2|s|m|past-form-of')) {
      past.ty.masculine = value
      foundPast += 1
    } else if (className.includes('2|s|f|past-form-of')) {
      past.ty.feminine = value
      foundPast += 1
    } else if (className.includes('3|s|m|past-form-of')) {
      past.on.masculine = value
      foundPast += 1
    } else if (className.includes('3|s|f|past-form-of')) {
      past.ona.feminine = value
      foundPast += 1
    } else if (className.includes('1|p|vr|past-form-of')) {
      past.my.virile = value
      foundPast += 1
    } else if (className.includes('1|p|nv|past-form-of')) {
      past.my.nonvirile = value
      foundPast += 1
    } else if (className.includes('2|p|vr|past-form-of')) {
      past.wy.virile = value
      foundPast += 1
    } else if (className.includes('2|p|nv|past-form-of')) {
      past.wy.nonvirile = value
      foundPast += 1
    } else if (className.includes('3|p|vr|past-form-of')) {
      past.oni.virile = value
      foundPast += 1
    } else if (className.includes('3|p|nv|past-form-of')) {
      past.one.nonvirile = value
      foundPast += 1
    }
  })

  const headword = cleanText($('.headword-line').first().text())
  return {
    present,
    past,
    aspect: parseAspect(headword),
    usedFallback: foundPresent < 6 || foundPast < 10,
  }
}

async function fetchEnglishData(infinitive) {
  const encoded = encodeURIComponent(infinitive)
  const sourceUrl = `https://en.wiktionary.org/wiki/${encoded}`
  let html = ''
  let raw = ''
  let translations = []

  try {
    html = await fetchText(sourceUrl)
  } catch {
    html = ''
  }

  try {
    raw = await fetchText(`${sourceUrl}?action=raw`)
    translations = parseEnglishDefinitions(raw).slice(0, 3)
  } catch {
    translations = []
  }

  return {
    sourceUrl,
    translations: translations.length ? translations : [`to ${infinitive}`],
    ...extractForms(html, infinitive),
  }
}

async function fetchUkrainianTranslations(infinitive) {
  const encoded = encodeURIComponent(infinitive)
  try {
    const html = await fetchText(`https://pl.wiktionary.org/wiki/${encoded}`)
    const $ = cheerio.load(html)
    const row = $('li')
      .filter((_, element) => cleanText($(element).text()).startsWith('ukraiński:'))
      .first()

    const values = row
      .find('a')
      .map((_, element) => cleanText($(element).text()))
      .get()
      .filter((value) => value && !value.includes(':'))

    return uniqueClean(values).slice(0, 3)
  } catch {
    return []
  }
}

function parseEnglishDefinitions(raw) {
  const polishSection = raw.match(/(?:^|\n)==Polish==\n([\s\S]*?)(?=\n==[^=]|\n\[\[Category:|$)/)?.[1] ?? raw
  const lines = polishSection
    .split('\n')
    .filter((line) => /^#(?![:*])\s/.test(line))
    .map((line) =>
      line
        .replace(/^#\s*/, '')
        .replace(/\{\{gl\|([^}]+)\}\}/g, ' ')
        .replace(/\{\{lb\|[^}]+\}\}/g, '')
        .replace(/\{\{[^}]+\}\}/g, '')
        .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/''+/g, '')
        .split(';')[0],
    )
  return uniqueClean(lines)
}

async function enrichVerb(row) {
  const english = await fetchEnglishData(row.infinitive)
  const uk = await fetchUkrainianTranslations(row.infinitive)
  const ukTranslations = uk.length ? uk : [`${row.infinitive} (переклад потребує перевірки)`]
  const englishTranslations = english.translations.map((translation) => translation.replace(/^to to /, 'to '))
  const englishForExample = englishTranslations[0].replace(/^to\s+/i, '')
  const notes = []

  if (english.usedFallback) {
    notes.push('Some forms were generated by fallback rules and should be checked.')
  }
  if (!uk.length) {
    notes.push('Ukrainian translation fallback needs review.')
  }

  return {
    id: `${String(row.frequencyRank).padStart(3, '0')}-${slugify(row.infinitive)}`,
    infinitive: row.infinitive,
    frequencyRank: row.frequencyRank,
    corpusRank: row.corpusRank,
    frequencySource: kwjpSource,
    frequency: row.frequency,
    translations: {
      en: englishTranslations,
      uk: ukTranslations,
    },
    aspect: english.aspect,
    forms: {
      present: english.present,
      past: english.past,
    },
    examples: [
      {
        pl: `Uczę się, jak poprawnie ${row.infinitive} po polsku.`,
        en: `I am learning how to ${englishForExample} correctly in Polish.`,
        uk: `Я вчуся правильно ${ukTranslations[0]} польською.`,
      },
    ],
    notes,
    sourceUrls: [kwjpUrl, english.sourceUrl, `https://pl.wiktionary.org/wiki/${encodeURIComponent(row.infinitive)}`],
    reviewStatus: english.usedFallback || !uk.length ? 'fallback-needs-review' : 'wiktionary-enriched',
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length)
  let index = 0

  async function worker() {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await mapper(items[current], current)
    }
  }

  await Promise.all(Array.from({ length: limit }, worker))
  return results
}

async function main() {
  await mkdir(outputDir, { recursive: true })
  console.log('Fetching KWJP frequency rows...')
  const frequencyRows = await fetchFrequencyRows()
  if (frequencyRows.length < 600) {
    throw new Error(`Expected 600 infinitive rows, got ${frequencyRows.length}`)
  }

  console.log('Enriching verbs from Wiktionary...')
  const verbs = await mapWithConcurrency(frequencyRows, 8, async (row, index) => {
    const verb = await enrichVerb(row)
    if ((index + 1) % 25 === 0) {
      console.log(`  ${index + 1}/600`)
    }
    return verb
  })

  for (let start = 0; start < 600; start += 100) {
    const chunk = verbs.slice(start, start + 100)
    const filename = `${String(start + 1).padStart(3, '0')}-${String(start + chunk.length).padStart(3, '0')}.json`
    await writeFile(path.join(outputDir, filename), `${JSON.stringify(chunk, null, 2)}\n`, 'utf8')
  }

  const fallbackCount = verbs.filter((verb) => verb.reviewStatus === 'fallback-needs-review').length
  console.log(`Wrote 600 verbs. ${fallbackCount} records need later manual review.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
