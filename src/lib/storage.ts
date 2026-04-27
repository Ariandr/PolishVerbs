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
}

export interface StudyProgress {
  learnedVerbIds: string[]
  verbProgress: Record<string, VerbStudyProgress>
  lists: StudyList[]
  selectedListId: string | null
}

export type ThemePreference = 'light' | 'dark'

export interface AppSettings {
  showQuickFilters: boolean
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
  showQuickFilters: true,
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
