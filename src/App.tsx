import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BarChart3, BookOpen, Filter, Gamepad2, Moon, Search, Settings, Sun, Wrench } from 'lucide-react'
import './App.css'
import { ConfigurationPage } from './components/ConfigurationPage'
import { CreateListModal, ListPickerModal } from './components/ListModals'
import { GamesPage } from './components/GamesPage'
import { ProgressPage } from './components/ProgressPage'
import { QualityPanel } from './components/QualityPanel'
import { StudyMode } from './components/StudyMode'
import { StudyLists } from './components/StudyLists'
import { VerbDetail } from './components/VerbTables'
import { VerbList } from './components/VerbList'
import { verbById, verbs } from './data/verbs'
import { TOTAL_VERB_COUNT } from './data/constants'
import type { Aspect } from './data/schema'
import { getStudyListExportFileName, parseStudyListImport, serializeStudyListExport } from './lib/listTransfer'
import { mergeProgressImport, serializeProgressExport } from './lib/progressTransfer'
import {
  applyPracticeAnswer,
  buildMissedFormPrompts,
  getDueVerbs,
  getOftenMissedVerbs,
  getOverdueVerbs,
  getProgressStats,
  getRelatedVerbs,
  isDue,
  isOverdue,
  type PracticeAnswerEvent,
  type PracticePrompt,
} from './lib/practice'
import { getSearchIndex, getSearchScore, normalizeSearch } from './lib/search'
import {
  createStudyList,
  createVerbStudyProgress,
  loadAppSettings,
  loadProgress,
  loadThemePreference,
  saveAppSettings,
  saveProgress,
  saveThemePreference,
  touchList,
  type AppSettings,
  type PracticeAnswerMode,
  type PracticePromptMode,
  type StudyProgress,
  type ThemePreference,
  type VerbStudyStatus,
} from './lib/storage'
import { getVerbIdFromUrl, isQaEnabledFromUrl, setQaInUrl, setVerbIdInUrl } from './lib/urlState'

type LearnedFilter = 'all' | 'new' | 'learning' | 'learned' | 'due' | 'overdue'
type VisibleAspectFilter = Exclude<Aspect, 'unknown'>
type RangeFilter = 'all' | 'top100' | 'top300' | 'top600' | 'top1200'

function App() {
  const initialVerbId = typeof window === 'undefined' ? null : getVerbIdFromUrl()
  const listScrollYRef = useRef(0)
  const openedMobileDetailFromListRef = useRef(false)
  const [progress, setProgress] = useState<StudyProgress>(() => loadProgress())
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => loadThemePreference())
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadAppSettings())
  const [selectedVerbId, setSelectedVerbId] = useState(initialVerbId && verbById.has(initialVerbId) ? initialVerbId : verbs[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [learnedFilter, setLearnedFilter] = useState<LearnedFilter>('all')
  const [aspectFilter, setAspectFilter] = useState<VisibleAspectFilter | 'all'>('all')
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(() =>
    typeof window === 'undefined' ? false : Boolean(initialVerbId && verbById.has(initialVerbId) && window.matchMedia('(max-width: 980px)').matches),
  )
  const [studyModeOpen, setStudyModeOpen] = useState(false)
  const [studySession, setStudySession] = useState<{
    verbs: typeof verbs
    title: string
    answerMode?: PracticeAnswerMode
    promptMode?: PracticePromptMode
    prompts?: PracticePrompt[]
  } | null>(null)
  const [configurationOpen, setConfigurationOpen] = useState(false)
  const [gamesOpen, setGamesOpen] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [showQaPanel, setShowQaPanel] = useState(() => isQaEnabledFromUrl())
  const [qaEntryEnabled, setQaEntryEnabled] = useState(() => isQaEnabledFromUrl())
  const [transferMessage, setTransferMessage] = useState<{ title: string; body: string } | null>(null)
  const [showCreateList, setShowCreateList] = useState(false)
  const [createListVerbId, setCreateListVerbId] = useState<string | null>(null)
  const [listPickerVerbId, setListPickerVerbId] = useState<string | null>(null)

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  useEffect(() => {
    document.documentElement.dataset.theme = themePreference
    saveThemePreference(themePreference)
  }, [themePreference])

  useEffect(() => {
    saveAppSettings(appSettings)
  }, [appSettings])

  useEffect(() => {
    const onPopState = () => {
      const urlVerbId = getVerbIdFromUrl()
      if (urlVerbId && verbById.has(urlVerbId)) {
        setSelectedVerbId(urlVerbId)
        if (window.matchMedia('(max-width: 980px)').matches) {
          setMobileDetailOpen(true)
        }
      } else if (window.matchMedia('(max-width: 980px)').matches) {
        setMobileDetailOpen(false)
        window.requestAnimationFrame(() => window.scrollTo({ top: listScrollYRef.current, behavior: 'auto' }))
      }
      const qaEnabled = isQaEnabledFromUrl()
      setShowQaPanel(qaEnabled)
      setQaEntryEnabled(qaEnabled)
    }

    window.addEventListener('popstate', onPopState)
    const urlVerbId = getVerbIdFromUrl()
    if (urlVerbId && !verbById.has(urlVerbId) && verbs[0]) {
      setVerbIdInUrl(verbs[0].id, 'replace')
    }
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const getVerbStatus = (verbId: string): VerbStudyStatus => progress.verbProgress[verbId]?.status ?? 'new'
  const learnedVerbIds = useMemo(
    () =>
      new Set(
        Object.entries(progress.verbProgress)
          .filter(([, verbProgress]) => verbProgress.status === 'learned')
          .map(([verbId]) => verbId),
      ),
    [progress.verbProgress],
  )
  const activeList = progress.lists.find((list) => list.id === progress.selectedListId)
  const activeListVerbIds = useMemo(() => new Set(activeList?.verbIds ?? []), [activeList])
  const searchIndexes = useMemo(() => new Map(verbs.map((verb) => [verb.id, getSearchIndex(verb)])), [])
  const progressStats = useMemo(() => getProgressStats(progress, verbs.map((verb) => verb.id)), [progress])

  const visibleVerbs = useMemo(() => {
    const normalizedQuery = normalizeSearch(query.trim())
    const filtered = verbs.filter((verb) => {
      if (activeList && !activeList.verbIds.includes(verb.id)) {
        return false
      }
      const studyStatus = progress.verbProgress[verb.id]?.status ?? 'new'
      const verbProgress = progress.verbProgress[verb.id]
      if (learnedFilter === 'new' && studyStatus !== 'new') {
        return false
      }
      if (learnedFilter === 'learned' && studyStatus !== 'learned') {
        return false
      }
      if (learnedFilter === 'learning' && studyStatus !== 'learning') {
        return false
      }
      if (learnedFilter === 'due' && !isDue(verbProgress)) {
        return false
      }
      if (learnedFilter === 'overdue' && !isOverdue(verbProgress)) {
        return false
      }
      if (aspectFilter !== 'all' && verb.aspect !== aspectFilter) {
        return false
      }
      if (rangeFilter === 'top100' && verb.frequencyRank > 100) {
        return false
      }
      if (rangeFilter === 'top300' && verb.frequencyRank > 300) {
        return false
      }
      if (rangeFilter === 'top600' && verb.frequencyRank > 600) {
        return false
      }
      if (rangeFilter === 'top1200' && verb.frequencyRank > 1200) {
        return false
      }
      if (normalizedQuery && !searchIndexes.get(verb.id)?.all.includes(normalizedQuery)) {
        return false
      }
      return true
    })

    if (!normalizedQuery) {
      return filtered
    }

    return [...filtered].sort((left, right) => {
      const leftRecord = searchIndexes.get(left.id)
      const rightRecord = searchIndexes.get(right.id)
      const leftScore = leftRecord ? getSearchScore(leftRecord, normalizedQuery) : 5
      const rightScore = rightRecord ? getSearchScore(rightRecord, normalizedQuery) : 5
      return leftScore - rightScore || left.frequencyRank - right.frequencyRank
    })
  }, [activeList, aspectFilter, learnedFilter, progress.verbProgress, query, rangeFilter, searchIndexes])

  const selectedVerb =
    visibleVerbs.find((verb) => verb.id === selectedVerbId) ??
    visibleVerbs[0] ??
    verbs.find((verb) => verb.id === selectedVerbId) ??
    verbs[0]
  const selectedIndex = selectedVerb ? visibleVerbs.findIndex((verb) => verb.id === selectedVerb.id) : -1
  const selectedLearned = selectedVerb ? learnedVerbIds.has(selectedVerb.id) : false
  const selectedInList = selectedVerb ? activeListVerbIds.has(selectedVerb.id) : false
  const learnedCount = learnedVerbIds.size

  const updateProgress = (next: StudyProgress) => {
    setProgress(next)
  }

  const updateVerbStatus = (verbId: string, status: VerbStudyStatus) => {
    updateProgress({
      ...progress,
      verbProgress: {
        ...progress.verbProgress,
        [verbId]: createVerbStudyProgress(status),
      },
    })
  }

  const toggleLearned = (verbId: string) => {
    updateVerbStatus(verbId, getVerbStatus(verbId) === 'learned' ? 'new' : 'learned')
  }

  const gradeStudyVerb = (verbId: string, grade: 'know' | 'review') => {
    const verb = verbs.find((item) => item.id === verbId)
    updateProgress(applyPracticeAnswer(progress, {
      verbId,
      correct: grade === 'know',
      promptType: 'meaning-to-infinitive',
      expected: verb?.infinitive ?? verbId,
      given: grade,
    }))
  }

  const recordPracticeAnswer = (event: PracticeAnswerEvent) => {
    updateProgress(applyPracticeAnswer(progress, event))
  }

  const startStudy = (
    sessionVerbs: typeof verbs,
    title = 'Powtórka czasowników',
    options: { answerMode?: PracticeAnswerMode; promptMode?: PracticePromptMode; prompts?: PracticePrompt[] } = {},
  ) => {
    setStudySession({ verbs: sessionVerbs, title, ...options })
    setStudyModeOpen(true)
  }

  const startDueReview = () => {
    startStudy(getDueVerbs(verbs, progress), 'Powtórka na dziś', { answerMode: 'typed', promptMode: 'mixed' })
  }

  const startOverdueReview = () => {
    startStudy(getOverdueVerbs(verbs, progress), 'Zaległe powtórki', { answerMode: 'typed', promptMode: 'mixed' })
  }

  const startMistakeReview = () => {
    startStudy(getOftenMissedVerbs(verbs, progress), 'Najczęstsze błędy', { answerMode: 'typed', promptMode: 'mixed' })
  }

  const startMissedFormsReview = () => {
    const prompts = buildMissedFormPrompts(verbs, progressStats)
    startStudy(
      prompts.map((prompt) => prompt.verb),
      'Najczęściej mylone formy',
      { answerMode: 'typed', promptMode: 'forms', prompts },
    )
  }

  const saveCurrentViewAsList = () => {
    if (!visibleVerbs.length) {
      return
    }
    const list = {
      ...createStudyList(`Widok ${new Date().toLocaleDateString('pl-PL')}`),
      verbIds: visibleVerbs.map((verb) => verb.id),
    }
    updateProgress({
      ...progress,
      lists: [list, ...progress.lists],
      selectedListId: list.id,
    })
  }

  const createList = (name: string) => {
    const list = {
      ...createStudyList(name),
      verbIds: createListVerbId ? [createListVerbId] : [],
    }
    updateProgress({ ...progress, lists: [list, ...progress.lists], selectedListId: list.id })
    setCreateListVerbId(null)
    setShowCreateList(false)
  }

  const openCreateList = (verbId: string | null = null) => {
    setCreateListVerbId(verbId)
    setListPickerVerbId(null)
    setShowCreateList(true)
  }

  const closeCreateList = () => {
    setCreateListVerbId(null)
    setShowCreateList(false)
  }

  const toggleVerbInList = (verbId: string, listId: string) => {
    updateProgress({
      ...progress,
      lists: progress.lists.map((list) => {
        if (list.id !== listId) {
          return list
        }
        const inList = list.verbIds.includes(verbId)
        return touchList({
          ...list,
          verbIds: inList ? list.verbIds.filter((id) => id !== verbId) : [...list.verbIds, verbId],
        })
      }),
    })
  }

  const openListAction = (verbId: string) => {
    if (activeList) {
      toggleVerbInList(verbId, activeList.id)
      return
    }

    setListPickerVerbId(verbId)
  }

  const selectVerb = (verbId: string, openedFromList = true) => {
    setSelectedVerbId(verbId)
    setVerbIdInUrl(verbId, 'push')
    if (window.matchMedia('(max-width: 980px)').matches) {
      if (openedFromList) {
        listScrollYRef.current = window.scrollY
        openedMobileDetailFromListRef.current = true
      }
      window.requestAnimationFrame(() => {
        setMobileDetailOpen(true)
        window.scrollTo({ top: 0, behavior: 'auto' })
      })
    }
  }

  const closeMobileDetail = () => {
    openedMobileDetailFromListRef.current = false
    setMobileDetailOpen(false)
    setVerbIdInUrl(null, 'replace')
    window.requestAnimationFrame(() => window.scrollTo({ top: listScrollYRef.current, behavior: 'auto' }))
  }

  const navigateSelectedVerb = (offset: -1 | 1) => {
    const nextVerb = visibleVerbs[selectedIndex + offset]
    if (nextVerb) {
      selectVerb(nextVerb.id, false)
    }
  }

  const clearFilters = () => {
    setQuery('')
    setLearnedFilter('all')
    setAspectFilter('all')
    setRangeFilter('all')
  }

  const updateAppSettings = (next: AppSettings) => {
    setAppSettings(next)
  }

  const exportProgress = () => {
    const blob = new Blob([serializeProgressExport(progress, themePreference, appSettings)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `polishverbs-progress-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importProgress = async (file: File) => {
    try {
      const result = mergeProgressImport(progress, await file.text())
      updateProgress(result.progress)
      if (result.themePreference) {
        setThemePreference(result.themePreference)
      }
      if (result.appSettings) {
        setAppSettings({
          ...appSettings,
          ...result.appSettings,
          practice: {
            ...appSettings.practice,
            ...result.appSettings.practice,
          },
        })
      }
      setTransferMessage({
        title: 'Zaimportowano postęp',
        body: `Dodano ${result.importedListCount} list i scalono ${result.importedVerbProgressCount} wpisów postępu.`,
      })
    } catch (error) {
      setTransferMessage({
        title: 'Nie udało się zaimportować',
        body: error instanceof Error ? error.message : 'Plik ma nieobsługiwany format.',
      })
    }
  }

  const exportStudyList = (listId: string) => {
    const list = progress.lists.find((item) => item.id === listId)
    if (!list) {
      setTransferMessage({
        title: 'Nie udało się wyeksportować listy',
        body: 'Wybrana lista nie istnieje.',
      })
      return
    }

    const blob = new Blob([serializeStudyListExport(list)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = getStudyListExportFileName(list)
    link.click()
    URL.revokeObjectURL(url)
  }

  const importStudyList = async (file: File) => {
    try {
      const knownVerbIds = new Set(verbs.map((verb) => verb.id))
      const result = parseStudyListImport(await file.text(), knownVerbIds)
      updateProgress({
        ...progress,
        lists: [result.list, ...progress.lists],
      })
      setTransferMessage({
        title: 'Zaimportowano listę',
        body: `Dodano listę „${result.list.name}” z ${result.list.verbIds.length} czasownikami.${
          result.skippedVerbCount ? ` Pominięto ${result.skippedVerbCount} nieznanych identyfikatorów.` : ''
        }`,
      })
    } catch (error) {
      setTransferMessage({
        title: 'Nie udało się zaimportować listy',
        body: error instanceof Error ? error.message : 'Plik ma nieobsługiwany format.',
      })
    }
  }

  const toggleQaPanel = () => {
    const next = !showQaPanel
    setQaEntryEnabled(true)
    setShowQaPanel(next)
    setQaInUrl(next)
  }

  const listPickerVerb = listPickerVerbId ? verbs.find((verb) => verb.id === listPickerVerbId) : undefined
  const nextThemePreference = themePreference === 'dark' ? 'light' : 'dark'
  const nextThemeLabel = nextThemePreference === 'dark' ? 'ciemny' : 'jasny'
  const activeFilterCount = [learnedFilter !== 'all', aspectFilter !== 'all', rangeFilter !== 'all'].filter(Boolean).length
  const quickFilters = [
    {
      label: 'Top 100',
      active: rangeFilter === 'top100',
      onClick: () => setRangeFilter(rangeFilter === 'top100' ? 'all' : 'top100'),
    },
    {
      label: 'W trakcie nauki',
      active: learnedFilter === 'learning',
      onClick: () => setLearnedFilter(learnedFilter === 'learning' ? 'all' : 'learning'),
    },
    {
      label: 'Nowe',
      active: learnedFilter === 'new',
      onClick: () => setLearnedFilter(learnedFilter === 'new' ? 'all' : 'new'),
    },
    {
      label: 'Do powtórki',
      active: learnedFilter === 'due',
      onClick: () => setLearnedFilter(learnedFilter === 'due' ? 'all' : 'due'),
    },
    {
      label: 'Zaległe',
      active: learnedFilter === 'overdue',
      onClick: () => setLearnedFilter(learnedFilter === 'overdue' ? 'all' : 'overdue'),
    },
    {
      label: 'Opanowane',
      active: learnedFilter === 'learned',
      onClick: () => setLearnedFilter(learnedFilter === 'learned' ? 'all' : 'learned'),
    },
    {
      label: 'Niedokonane',
      active: aspectFilter === 'imperfective',
      onClick: () => setAspectFilter(aspectFilter === 'imperfective' ? 'all' : 'imperfective'),
    },
    {
      label: 'Dokonane',
      active: aspectFilter === 'perfective',
      onClick: () => setAspectFilter(aspectFilter === 'perfective' ? 'all' : 'perfective'),
    },
  ]

  return (
    <main
      className={`app-shell ${mobileDetailOpen ? 'mobile-detail-open' : ''} ${configurationOpen ? 'configuration-open' : ''} ${gamesOpen ? 'games-open' : ''}`}
      data-theme={themePreference}
    >
      <header className="app-header">
        <div className="brand-block">
          <h1>PolishVerbs</h1>
          <span>{TOTAL_VERB_COUNT} czasowników według częstotliwości</span>
        </div>

        <nav className="header-controls" aria-label="Główna nawigacja">
          <button
            className="header-icon-button"
            type="button"
            aria-label={`Przełącz na tryb ${nextThemeLabel}`}
            title={`Przełącz na tryb ${nextThemeLabel}`}
            onClick={() => setThemePreference(nextThemePreference)}
          >
            {themePreference === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className={`header-icon-button ${configurationOpen ? 'active' : ''}`}
            type="button"
            aria-label="Otwórz konfigurację"
            title="Konfiguracja"
            onClick={() => {
              setGamesOpen(false)
              setProgressOpen(false)
              setConfigurationOpen(true)
            }}
          >
            <Settings size={18} />
          </button>
          <button
            className={`header-icon-button ${progressOpen ? 'active' : ''}`}
            type="button"
            aria-label="Otwórz postęp"
            title="Postęp"
            onClick={() => {
              setConfigurationOpen(false)
              setGamesOpen(false)
              setProgressOpen(true)
            }}
          >
            <BarChart3 size={18} />
          </button>
          <button
            className={`header-icon-button ${gamesOpen ? 'active' : ''}`}
            type="button"
            aria-label="Otwórz gry"
            title="Gry"
            onClick={() => {
              setConfigurationOpen(false)
              setProgressOpen(false)
              setGamesOpen(true)
            }}
          >
            <Gamepad2 size={18} />
          </button>
        </nav>

        <div className="progress-summary">
          <span className="progress-summary-main">
            <strong>{learnedCount}</strong>
            <span>opanowanych</span>
            <small>
              {Math.round((learnedCount / verbs.length) * 100)}% z {verbs.length}
            </small>
          </span>
          {progressStats.dueCount ? (
            <button className="due-review-button" type="button" onClick={startDueReview}>
              <strong>{progressStats.dueCount}</strong>
              <span>do powtórki</span>
              <small>Powtórz dziś</small>
            </button>
          ) : null}
        </div>
      </header>

      {configurationOpen ? (
        <ConfigurationPage
          showQuickFilters={appSettings.showQuickFilters}
          practice={appSettings.practice}
          lists={progress.lists}
          selectedListId={progress.selectedListId}
          onBack={() => setConfigurationOpen(false)}
          onToggleQuickFilters={() =>
            updateAppSettings({ ...appSettings, showQuickFilters: !appSettings.showQuickFilters })
          }
          onUpdatePractice={(practice) => updateAppSettings({ ...appSettings, practice })}
          onExportProgress={exportProgress}
          onImportProgress={importProgress}
          onExportList={exportStudyList}
          onImportList={importStudyList}
        />
      ) : progressOpen ? (
        <ProgressPage
          stats={progressStats}
          verbs={verbs}
          onBack={() => setProgressOpen(false)}
          onStartDueReview={startDueReview}
          onStartOverdueReview={startOverdueReview}
          onStartMistakeReview={startMistakeReview}
          onStartMissedForms={startMissedFormsReview}
          onSelectVerb={(verbId) => {
            setProgressOpen(false)
            selectVerb(verbId, false)
          }}
        />
      ) : gamesOpen ? (
        <GamesPage
          allVerbs={verbs}
          visibleVerbs={visibleVerbs}
          lists={progress.lists}
          appSettings={appSettings}
          onUpdateAppSettings={updateAppSettings}
          onAnswer={recordPracticeAnswer}
          onBack={() => setGamesOpen(false)}
        />
      ) : (
        <>
      <section className={`toolbar ${mobileFiltersOpen ? 'filters-open' : ''}`} aria-label="Wyszukiwanie i filtry">
        <div className="toolbar-search-row">
          <label className="search-field">
            <Search size={18} />
            <input
              type="search"
              value={query}
              placeholder="Szukaj po bezokoliczniku, formach, angielskim lub ukraińskim"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            className={`filter-toggle ${activeFilterCount > 0 ? 'active' : ''}`}
            type="button"
            aria-controls="verb-filters"
            aria-expanded={mobileFiltersOpen}
            aria-label={mobileFiltersOpen ? 'Ukryj filtry' : 'Pokaż filtry'}
            onClick={() => setMobileFiltersOpen((open) => !open)}
          >
            <Filter size={17} />
            <span>Filtry</span>
            {activeFilterCount > 0 ? <small>{activeFilterCount}</small> : null}
          </button>
        </div>
        {appSettings.showQuickFilters ? (
          <div className="quick-filters" aria-label="Szybkie filtry">
            {quickFilters.map((filter) => (
              <button
                className={`filter-chip ${filter.active ? 'active' : ''}`}
                type="button"
                key={filter.label}
                onClick={filter.onClick}
              >
                {filter.label}
              </button>
            ))}
            <button className="filter-chip clear-chip" type="button" onClick={clearFilters}>
              Wyczyść
            </button>
          </div>
        ) : null}
        <div className="filter-group" id="verb-filters">
          <Filter size={17} />
          <select value={learnedFilter} onChange={(event) => setLearnedFilter(event.target.value as LearnedFilter)}>
            <option value="all">Cały postęp</option>
            <option value="new">Nowe</option>
            <option value="learning">W trakcie nauki</option>
            <option value="learned">Opanowane</option>
            <option value="due">Do powtórki</option>
            <option value="overdue">Zaległe</option>
          </select>
          <select value={aspectFilter} onChange={(event) => setAspectFilter(event.target.value as VisibleAspectFilter | 'all')}>
            <option value="all">Wszystkie aspekty</option>
            <option value="imperfective">Niedokonane</option>
            <option value="perfective">Dokonane</option>
            <option value="biaspectual">Dwuaspektowe</option>
          </select>
          <select value={rangeFilter} onChange={(event) => setRangeFilter(event.target.value as RangeFilter)}>
            <option value="all">Pełne {TOTAL_VERB_COUNT}</option>
            <option value="top100">Pierwsze 100</option>
            <option value="top300">Pierwsze 300</option>
            <option value="top600">Pierwsze 600</option>
            <option value="top1200">Pierwsze 1200</option>
          </select>
        </div>

        <div className="toolbar-secondary">
          <StudyLists
            lists={progress.lists}
            selectedListId={progress.selectedListId}
            onOpenCreateList={() => openCreateList()}
            onRenameList={(listId, name) =>
              updateProgress({
                ...progress,
                lists: progress.lists.map((list) => (list.id === listId ? touchList({ ...list, name }) : list)),
              })
            }
            onDeleteList={(listId) =>
              updateProgress({
                ...progress,
                selectedListId: progress.selectedListId === listId ? null : progress.selectedListId,
                lists: progress.lists.filter((list) => list.id !== listId),
              })
            }
            onSelectList={(listId) => updateProgress({ ...progress, selectedListId: listId })}
          />

          <div className="results-meta">
            <span>
              <strong>{visibleVerbs.length}</strong>
              <span>pokazanych czasowników</span>
            </span>
            <div className="results-actions">
              <button
                className="secondary-button study-start-button"
                type="button"
                disabled={!visibleVerbs.length}
                onClick={() => startStudy(visibleVerbs)}
              >
                <BookOpen size={16} />
                Start nauki
              </button>
              <button className="secondary-button study-start-button" type="button" disabled={!visibleVerbs.length} onClick={saveCurrentViewAsList}>
                Zapisz widok
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="workspace">
        <aside className="sidebar">
          <VerbList
            verbs={visibleVerbs}
            selectedVerbId={selectedVerb?.id ?? ''}
            learnedVerbIds={learnedVerbIds}
            activeListVerbIds={activeListVerbIds}
            selectedListId={progress.selectedListId}
            query={query}
            onSelectVerb={selectVerb}
            onToggleLearned={toggleLearned}
            onOpenListPicker={openListAction}
          />
        </aside>

        {selectedVerb ? (
          <div className="detail-anchor">
            <div className="mobile-detail-nav">
              <button className="secondary-button detail-back" type="button" onClick={closeMobileDetail}>
                <ArrowLeft size={17} />
                Lista
              </button>
            </div>
            <VerbDetail
              verb={selectedVerb}
              highlightQuery={query}
              hasPrevious={selectedIndex > 0}
              hasNext={selectedIndex >= 0 && selectedIndex < visibleVerbs.length - 1}
              learned={selectedLearned}
              inList={selectedInList}
              selectedListId={progress.selectedListId}
              onPreviousVerb={() => navigateSelectedVerb(-1)}
              onNextVerb={() => navigateSelectedVerb(1)}
              onToggleLearned={() => toggleLearned(selectedVerb.id)}
              onOpenListPicker={() => openListAction(selectedVerb.id)}
              allVerbs={verbs}
              onSelectRelatedVerb={(verbId) => selectVerb(verbId)}
              onPracticeVerb={() => startStudy([selectedVerb], `Ćwiczenie: ${selectedVerb.infinitive}`, { answerMode: 'typed', promptMode: 'mixed' })}
              onPracticeForms={() => startStudy([selectedVerb], `Formy: ${selectedVerb.infinitive}`, { answerMode: 'typed', promptMode: 'forms' })}
              onPracticeExamples={() => startStudy([selectedVerb], `Przykład: ${selectedVerb.infinitive}`, { answerMode: 'typed', promptMode: 'cloze' })}
              onPracticeAspectPair={() => {
                const related = getRelatedVerbs(selectedVerb, verbs)
                if (related.pair) {
                  startStudy([selectedVerb, related.pair], `Para aspektowa: ${selectedVerb.infinitive}`, { answerMode: 'typed', promptMode: 'mixed' })
                }
              }}
              onPracticeFamily={() => {
                const related = getRelatedVerbs(selectedVerb, verbs)
                const familyVerbs = [selectedVerb, ...related.family]
                if (familyVerbs.length > 1) {
                  startStudy(familyVerbs, `Rodzina: ${selectedVerb.infinitive}`, { answerMode: 'typed', promptMode: 'mixed' })
                }
              }}
            />
          </div>
        ) : (
          <div className="empty-state">Żaden czasownik nie pasuje do obecnych filtrów.</div>
        )}
      </section>
        </>
      )}

      {!configurationOpen && !gamesOpen && !progressOpen && showQaPanel ? (
        <QualityPanel
          verbs={verbs}
          onClose={toggleQaPanel}
          onSelectVerb={(verbId) => {
            selectVerb(verbId)
            setShowQaPanel(false)
          }}
        />
      ) : !configurationOpen && !gamesOpen && !progressOpen && qaEntryEnabled ? (
        <button className="qa-open-button" type="button" onClick={toggleQaPanel}>
          <Wrench size={14} />
          QA
        </button>
      ) : null}

      {showCreateList ? <CreateListModal onClose={closeCreateList} onCreate={createList} /> : null}
      {studyModeOpen ? (
        <StudyMode
          verbs={studySession?.verbs ?? visibleVerbs}
          prompts={studySession?.prompts}
          title={studySession?.title}
          answerMode={studySession?.answerMode ?? appSettings.practice.answerMode}
          promptMode={studySession?.promptMode ?? appSettings.practice.promptMode}
          onClose={() => setStudyModeOpen(false)}
          onGrade={gradeStudyVerb}
          onAnswer={recordPracticeAnswer}
        />
      ) : null}
      {transferMessage ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setTransferMessage(null)}>
          <section className="modal-panel compact-modal" role="dialog" aria-modal="true" aria-labelledby="transfer-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="section-title">Import i eksport</div>
                <h2 id="transfer-title">{transferMessage.title}</h2>
              </div>
            </div>
            <p>{transferMessage.body}</p>
            <div className="modal-actions">
              <button className="primary-button" type="button" onClick={() => setTransferMessage(null)}>
                OK
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {listPickerVerb ? (
        <ListPickerModal
          lists={progress.lists}
          verb={listPickerVerb}
          onClose={() => setListPickerVerbId(null)}
          onCreateList={() => openCreateList(listPickerVerb.id)}
          onToggleList={(listId) => toggleVerbInList(listPickerVerb.id, listId)}
        />
      ) : null}
    </main>
  )
}

export default App
