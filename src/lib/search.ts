import type { VerbEntry } from '../data/schema'

export interface SearchRecord {
  infinitive: string
  forms: string
  translations: string
  all: string
}

export interface HighlightRange {
  start: number
  end: number
}

export const normalizeSearch = (value: string) =>
  value
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

const getPastFormValues = (verb: VerbEntry) =>
  Object.values(verb.forms.past).flatMap((group) => Object.values(group))

export const getSearchIndex = (verb: VerbEntry): SearchRecord => {
  const infinitive = normalizeSearch(verb.infinitive)
  const forms = normalizeSearch([...Object.values(verb.forms.present), ...getPastFormValues(verb)].join(' '))
  const translations = normalizeSearch([...verb.translations.en, ...verb.translations.uk].join(' '))

  return {
    infinitive,
    forms,
    translations,
    all: `${infinitive} ${forms} ${translations}`,
  }
}

export const getSearchScore = (record: SearchRecord, query: string) => {
  if (record.infinitive === query) {
    return 0
  }
  if (record.infinitive.startsWith(query)) {
    return 1
  }
  if (record.infinitive.includes(query)) {
    return 2
  }
  if (record.forms.includes(query)) {
    return 3
  }
  if (record.translations.includes(query)) {
    return 4
  }
  return 5
}

export const getHighlightRanges = (value: string, query: string): HighlightRange[] => {
  const normalizedQuery = normalizeSearch(query.trim())
  if (!normalizedQuery) {
    return []
  }

  const normalized = normalizeSearch(value)
  const ranges: HighlightRange[] = []
  let fromIndex = 0

  while (fromIndex < normalized.length) {
    const index = normalized.indexOf(normalizedQuery, fromIndex)
    if (index === -1) {
      break
    }
    ranges.push({ start: index, end: index + normalizedQuery.length })
    fromIndex = index + normalizedQuery.length
  }

  return ranges
}
