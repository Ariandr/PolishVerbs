import { createVerbStudyProgress, type PracticeMistake, type StudyList, type StudyProgress, type ThemePreference, type VerbStudyProgress } from './storage'

export interface ProgressExportFile {
  app: 'PolishVerbs'
  schemaVersion: 1
  exportedAt: string
  progress: StudyProgress
  themePreference: ThemePreference
}

export interface ImportResult {
  progress: StudyProgress
  themePreference: ThemePreference | null
  importedListCount: number
  importedVerbProgressCount: number
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isThemePreference = (value: unknown): value is ThemePreference => value === 'light' || value === 'dark'

const isVerbProgress = (value: unknown): value is VerbStudyProgress => {
  if (!isObject(value)) {
    return false
  }

  return (
    (value.status === 'new' || value.status === 'learning' || value.status === 'learned') &&
    typeof value.reviewCount === 'number' &&
    typeof value.knowCount === 'number' &&
    typeof value.reviewAgainCount === 'number' &&
    (typeof value.lastReviewedAt === 'string' || value.lastReviewedAt === null)
  )
}

const normalizeMistakes = (value: unknown): PracticeMistake[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((mistake): mistake is PracticeMistake => {
      if (!isObject(mistake)) {
        return false
      }
      return (
        typeof mistake.id === 'string' &&
        typeof mistake.promptType === 'string' &&
        typeof mistake.expected === 'string' &&
        typeof mistake.given === 'string' &&
        typeof mistake.createdAt === 'string'
      )
    })
    .slice(-8)
}

const normalizeVerbProgress = (progress: VerbStudyProgress): VerbStudyProgress => ({
  ...createVerbStudyProgress(progress.status),
  ...progress,
  dueAt: typeof progress.dueAt === 'string' ? progress.dueAt : null,
  intervalLevel: typeof progress.intervalLevel === 'number' ? progress.intervalLevel : 0,
  correctCount: typeof progress.correctCount === 'number' ? progress.correctCount : 0,
  incorrectCount: typeof progress.incorrectCount === 'number' ? progress.incorrectCount : 0,
  lastMistakes: normalizeMistakes(progress.lastMistakes),
})

const isStudyList = (value: unknown): value is StudyList => {
  if (!isObject(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(value.verbIds) &&
    value.verbIds.every((verbId) => typeof verbId === 'string') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

const getSyncedLearnedIds = (verbProgress: Record<string, VerbStudyProgress>) =>
  Object.entries(verbProgress)
    .filter(([, progress]) => progress.status === 'learned')
    .map(([verbId]) => verbId)

const parseStudyProgress = (value: unknown): StudyProgress => {
  if (!isObject(value)) {
    throw new Error('Plik nie zawiera poprawnego obiektu postępu.')
  }

  const parsedVerbProgress = isObject(value.verbProgress) ? value.verbProgress : {}
  const verbProgress = Object.fromEntries(
    Object.entries(parsedVerbProgress)
      .filter((entry): entry is [string, VerbStudyProgress] => isVerbProgress(entry[1]))
      .map(([verbId, progress]) => [verbId, normalizeVerbProgress(progress)]),
  )
  const learnedVerbIds = Array.isArray(value.learnedVerbIds)
    ? value.learnedVerbIds.filter((verbId): verbId is string => typeof verbId === 'string')
    : []

  for (const verbId of learnedVerbIds) {
    verbProgress[verbId] = {
      ...createVerbStudyProgress('learned'),
      ...verbProgress[verbId],
      status: 'learned',
    }
  }

  return {
    learnedVerbIds: getSyncedLearnedIds(verbProgress),
    verbProgress,
    lists: Array.isArray(value.lists) ? value.lists.filter(isStudyList) : [],
    selectedListId: typeof value.selectedListId === 'string' ? value.selectedListId : null,
  }
}

export const createProgressExport = (
  progress: StudyProgress,
  themePreference: ThemePreference,
): ProgressExportFile => ({
  app: 'PolishVerbs',
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  progress: {
    ...progress,
    learnedVerbIds: getSyncedLearnedIds(progress.verbProgress),
  },
  themePreference,
})

export const serializeProgressExport = (progress: StudyProgress, themePreference: ThemePreference) =>
  JSON.stringify(createProgressExport(progress, themePreference), null, 2)

export const mergeProgressImport = (current: StudyProgress, raw: string): ImportResult => {
  const parsed = JSON.parse(raw) as unknown
  if (!isObject(parsed) || parsed.app !== 'PolishVerbs' || parsed.schemaVersion !== 1) {
    throw new Error('To nie wygląda na eksport postępu PolishVerbs.')
  }

  const importedProgress = parseStudyProgress(parsed.progress)
  const existingListIds = new Set(current.lists.map((list) => list.id))
  const importedLists = importedProgress.lists.filter((list) => !existingListIds.has(list.id))
  const mergedLists = [...current.lists, ...importedLists]
  const mergedVerbProgress = {
    ...current.verbProgress,
    ...importedProgress.verbProgress,
  }

  const selectedListStillExists = current.selectedListId
    ? mergedLists.some((list) => list.id === current.selectedListId)
    : true
  const importedSelectedListExists = importedProgress.selectedListId
    ? mergedLists.some((list) => list.id === importedProgress.selectedListId)
    : false

  return {
    progress: {
      learnedVerbIds: getSyncedLearnedIds(mergedVerbProgress),
      verbProgress: mergedVerbProgress,
      lists: mergedLists,
      selectedListId: selectedListStillExists
        ? current.selectedListId
        : importedSelectedListExists
          ? importedProgress.selectedListId
          : null,
    },
    themePreference: isThemePreference(parsed.themePreference) ? parsed.themePreference : null,
    importedListCount: importedLists.length,
    importedVerbProgressCount: Object.keys(importedProgress.verbProgress).length,
  }
}
