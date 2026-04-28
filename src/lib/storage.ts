export interface StudyList {
  id: string
  name: string
  verbIds: string[]
  createdAt: string
  updatedAt: string
}

export type VerbStudyStatus = 'new' | 'learning' | 'learned'

export interface VerbStudyProgress {
  status: VerbStudyStatus
  reviewCount: number
  knowCount: number
  reviewAgainCount: number
  lastReviewedAt: string | null
  dueAt: string | null
  intervalLevel: number
  correctCount: number
  incorrectCount: number
  lastMistakes: PracticeMistake[]
}

export type PracticePromptType =
  | 'meaning-to-infinitive'
  | 'infinitive-to-meaning'
  | 'present-form'
  | 'past-form'
  | 'cloze-example'
  | 'game'

export interface PracticeMistake {
  id: string
  promptType: PracticePromptType
  expected: string
  given: string
  createdAt: string
  prompt?: string
  detail?: string
  formLabel?: string
  promptId?: string
}

export interface StudyProgress {
  learnedVerbIds: string[]
  verbProgress: Record<string, VerbStudyProgress>
  lists: StudyList[]
  selectedListId: string | null
}

export type ThemePreference = 'light' | 'dark'

export type GameSourceBase = 'current-view' | 'all' | 'list'

export interface GameSourceSettings {
  base: GameSourceBase
  listId: string | null
  rankStart: string
  rankEnd: string
}

export type PracticeAnswerMode = 'reveal' | 'typed'
export type PracticePromptMode = 'meanings' | 'infinitives' | 'present' | 'past' | 'forms' | 'cloze' | 'mixed'
export type PracticeDifficulty = 'normal' | 'hard'
export type GameAnswerMode = 'choice' | 'typed'

export interface PracticeSettings {
  answerMode: PracticeAnswerMode
  promptMode: PracticePromptMode
  gameDifficulty: PracticeDifficulty
  gameAnswerMode: GameAnswerMode
}

export interface AppSettings {
  showQuickFilters: boolean
  gameSource: GameSourceSettings
  practice: PracticeSettings
}

const storageKey = 'polish-verbs-progress-v1'
const themeStorageKey = 'polish-verbs-theme-v1'
const appSettingsStorageKey = 'polish-verbs-settings-v1'

const defaultProgress: StudyProgress = {
  learnedVerbIds: [],
  verbProgress: {},
  lists: [],
  selectedListId: null,
}

const defaultAppSettings: AppSettings = {
  showQuickFilters: false,
  gameSource: {
    base: 'current-view',
    listId: null,
    rankStart: '',
    rankEnd: '',
  },
  practice: {
    answerMode: 'reveal',
    promptMode: 'mixed',
    gameDifficulty: 'normal',
    gameAnswerMode: 'choice',
  },
}

const isGameSourceBase = (value: unknown): value is GameSourceBase =>
  value === 'current-view' || value === 'all' || value === 'list'

const normalizeGameSource = (value: unknown): GameSourceSettings => {
  if (!value || typeof value !== 'object') {
    return defaultAppSettings.gameSource
  }

  const source = value as Record<string, unknown>
  return {
    base: isGameSourceBase(source.base) ? source.base : defaultAppSettings.gameSource.base,
    listId: typeof source.listId === 'string' ? source.listId : null,
    rankStart:
      typeof source.rankStart === 'string'
        ? source.rankStart
        : typeof source.rankStart === 'number'
          ? String(source.rankStart)
          : '',
    rankEnd:
      typeof source.rankEnd === 'string'
        ? source.rankEnd
        : typeof source.rankEnd === 'number'
          ? String(source.rankEnd)
          : '',
  }
}

const isPracticeAnswerMode = (value: unknown): value is PracticeAnswerMode => value === 'reveal' || value === 'typed'

const isPracticePromptMode = (value: unknown): value is PracticePromptMode =>
  value === 'meanings' ||
  value === 'infinitives' ||
  value === 'present' ||
  value === 'past' ||
  value === 'forms' ||
  value === 'cloze' ||
  value === 'mixed'

const isPracticeDifficulty = (value: unknown): value is PracticeDifficulty => value === 'normal' || value === 'hard'
const isGameAnswerMode = (value: unknown): value is GameAnswerMode => value === 'choice' || value === 'typed'

const normalizePracticeSettings = (value: unknown): PracticeSettings => {
  if (!value || typeof value !== 'object') {
    return defaultAppSettings.practice
  }

  const settings = value as Record<string, unknown>
  return {
    answerMode: isPracticeAnswerMode(settings.answerMode) ? settings.answerMode : defaultAppSettings.practice.answerMode,
    promptMode: isPracticePromptMode(settings.promptMode) ? settings.promptMode : defaultAppSettings.practice.promptMode,
    gameDifficulty: isPracticeDifficulty(settings.gameDifficulty) ? settings.gameDifficulty : defaultAppSettings.practice.gameDifficulty,
    gameAnswerMode: isGameAnswerMode(settings.gameAnswerMode) ? settings.gameAnswerMode : defaultAppSettings.practice.gameAnswerMode,
  }
}

const isVerbStudyStatus = (value: unknown): value is VerbStudyStatus =>
  value === 'new' || value === 'learning' || value === 'learned'

const normalizeVerbProgress = (value: unknown): VerbStudyProgress | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const progress = value as Partial<VerbStudyProgress>
  if (!isVerbStudyStatus(progress.status)) {
    return null
  }

  return {
    status: progress.status,
    reviewCount: typeof progress.reviewCount === 'number' ? progress.reviewCount : 0,
    knowCount: typeof progress.knowCount === 'number' ? progress.knowCount : 0,
    reviewAgainCount: typeof progress.reviewAgainCount === 'number' ? progress.reviewAgainCount : 0,
    lastReviewedAt: typeof progress.lastReviewedAt === 'string' ? progress.lastReviewedAt : null,
    dueAt: typeof progress.dueAt === 'string' ? progress.dueAt : null,
    intervalLevel: typeof progress.intervalLevel === 'number' ? progress.intervalLevel : 0,
    correctCount: typeof progress.correctCount === 'number' ? progress.correctCount : 0,
    incorrectCount: typeof progress.incorrectCount === 'number' ? progress.incorrectCount : 0,
    lastMistakes: Array.isArray(progress.lastMistakes)
      ? progress.lastMistakes
          .filter((mistake): mistake is PracticeMistake => {
            if (!mistake || typeof mistake !== 'object') {
              return false
            }
            const item = mistake as Partial<PracticeMistake>
            return (
              typeof item.id === 'string' &&
              typeof item.expected === 'string' &&
              typeof item.given === 'string' &&
              typeof item.createdAt === 'string' &&
              typeof item.promptType === 'string'
            )
          })
          .map((mistake) => ({
            ...mistake,
            prompt: typeof mistake.prompt === 'string' ? mistake.prompt : undefined,
            detail: typeof mistake.detail === 'string' ? mistake.detail : undefined,
            formLabel: typeof mistake.formLabel === 'string' ? mistake.formLabel : undefined,
            promptId: typeof mistake.promptId === 'string' ? mistake.promptId : undefined,
          }))
          .slice(-8)
      : [],
  }
}

const getSyncedLearnedIds = (verbProgress: Record<string, VerbStudyProgress>) =>
  Object.entries(verbProgress)
    .filter(([, progress]) => progress.status === 'learned')
    .map(([verbId]) => verbId)

export function createVerbStudyProgress(status: VerbStudyStatus): VerbStudyProgress {
  return {
    status,
    reviewCount: 0,
    knowCount: 0,
    reviewAgainCount: 0,
    lastReviewedAt: null,
    dueAt: null,
    intervalLevel: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastMistakes: [],
  }
}

export function loadProgress(): StudyProgress {
  if (typeof window === 'undefined') {
    return defaultProgress
  }

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return defaultProgress
    }

    const parsed = JSON.parse(raw) as Partial<StudyProgress>
    const learnedVerbIds = Array.isArray(parsed.learnedVerbIds) ? parsed.learnedVerbIds : []
    const parsedVerbProgress =
      parsed.verbProgress && typeof parsed.verbProgress === 'object' ? parsed.verbProgress : {}
    const verbProgress = Object.fromEntries(
      Object.entries(parsedVerbProgress)
        .map(([verbId, value]) => [verbId, normalizeVerbProgress(value)] as const)
        .filter((entry): entry is readonly [string, VerbStudyProgress] => entry[1] !== null),
    )

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
      lists: Array.isArray(parsed.lists) ? parsed.lists : [],
      selectedListId: parsed.selectedListId ?? null,
    }
  } catch {
    return defaultProgress
  }
}

export function saveProgress(progress: StudyProgress) {
  const normalizedProgress = {
    ...progress,
    learnedVerbIds: getSyncedLearnedIds(progress.verbProgress),
  }
  window.localStorage.setItem(storageKey, JSON.stringify(normalizedProgress))
}

export function loadThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem(themeStorageKey)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function saveThemePreference(themePreference: ThemePreference) {
  window.localStorage.setItem(themeStorageKey, themePreference)
}

export function loadAppSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return defaultAppSettings
  }

  try {
    const raw = window.localStorage.getItem(appSettingsStorageKey)
    if (!raw) {
      return defaultAppSettings
    }

    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      showQuickFilters:
        typeof parsed.showQuickFilters === 'boolean'
          ? parsed.showQuickFilters
          : defaultAppSettings.showQuickFilters,
      gameSource: normalizeGameSource(parsed.gameSource),
      practice: normalizePracticeSettings(parsed.practice),
    }
  } catch {
    return defaultAppSettings
  }
}

export function saveAppSettings(settings: AppSettings) {
  window.localStorage.setItem(appSettingsStorageKey, JSON.stringify(settings))
}

export function createStudyList(name: string): StudyList {
  const now = new Date().toISOString()
  return {
    id: `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    verbIds: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function touchList(list: StudyList): StudyList {
  return {
    ...list,
    updatedAt: new Date().toISOString(),
  }
}
