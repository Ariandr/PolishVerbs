import { createStudyList, type StudyList } from './storage'

export interface StudyListExportFile {
  app: 'PolishVerbs'
  kind: 'study-list'
  schemaVersion: 1
  exportedAt: string
  list: {
    name: string
    verbIds: string[]
  }
}

export interface ListImportResult {
  list: StudyList
  skippedVerbCount: number
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const sanitizeFilePart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'lista'

export const getStudyListExportFileName = (list: StudyList) =>
  `polishverbs-list-${sanitizeFilePart(list.name)}-${new Date().toISOString().slice(0, 10)}.json`

export const createStudyListExport = (list: StudyList): StudyListExportFile => ({
  app: 'PolishVerbs',
  kind: 'study-list',
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  list: {
    name: list.name,
    verbIds: list.verbIds,
  },
})

export const serializeStudyListExport = (list: StudyList) =>
  JSON.stringify(createStudyListExport(list), null, 2)

export const parseStudyListImport = (raw: string, knownVerbIds: Set<string>): ListImportResult => {
  const parsed = JSON.parse(raw) as unknown
  if (
    !isObject(parsed) ||
    parsed.app !== 'PolishVerbs' ||
    parsed.kind !== 'study-list' ||
    parsed.schemaVersion !== 1 ||
    !isObject(parsed.list)
  ) {
    throw new Error('To nie wygląda na eksport listy PolishVerbs.')
  }

  const rawName = typeof parsed.list.name === 'string' ? parsed.list.name.trim() : ''
  if (!rawName) {
    throw new Error('Importowana lista nie ma poprawnej nazwy.')
  }
  if (!Array.isArray(parsed.list.verbIds)) {
    throw new Error('Importowana lista nie zawiera poprawnej tablicy czasowników.')
  }

  const uniqueVerbIds = [...new Set(parsed.list.verbIds.filter((verbId): verbId is string => typeof verbId === 'string'))]
  const verbIds = uniqueVerbIds.filter((verbId) => knownVerbIds.has(verbId))
  if (!verbIds.length) {
    throw new Error('Importowana lista nie zawiera czasowników dostępnych w tej bazie.')
  }

  return {
    list: {
      ...createStudyList(rawName),
      verbIds,
    },
    skippedVerbCount: uniqueVerbIds.length - verbIds.length,
  }
}
