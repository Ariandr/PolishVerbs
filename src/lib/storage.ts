export interface StudyList {
  id: string
  name: string
  verbIds: string[]
  createdAt: string
  updatedAt: string
}

export interface StudyProgress {
  learnedVerbIds: string[]
  lists: StudyList[]
  selectedListId: string | null
}

const storageKey = 'polish-verbs-progress-v1'

const defaultProgress: StudyProgress = {
  learnedVerbIds: [],
  lists: [],
  selectedListId: null,
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
    return {
      learnedVerbIds: Array.isArray(parsed.learnedVerbIds) ? parsed.learnedVerbIds : [],
      lists: Array.isArray(parsed.lists) ? parsed.lists : [],
      selectedListId: parsed.selectedListId ?? null,
    }
  } catch {
    return defaultProgress
  }
}

export function saveProgress(progress: StudyProgress) {
  window.localStorage.setItem(storageKey, JSON.stringify(progress))
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
