import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Filter, Moon, Search, Sun } from 'lucide-react'
import './App.css'
import { CreateListModal, ListPickerModal } from './components/ListModals'
import { StudyLists } from './components/StudyLists'
import { VerbDetail } from './components/VerbTables'
import { VerbList } from './components/VerbList'
import { verbs } from './data/verbs'
import type { Aspect, VerbEntry } from './data/schema'
import {
  createStudyList,
  loadProgress,
  loadThemePreference,
  saveProgress,
  saveThemePreference,
  touchList,
  type StudyProgress,
  type ThemePreference,
} from './lib/storage'

type LearnedFilter = 'all' | 'learning' | 'learned'
type RangeFilter = 'all' | 'top100' | 'top300' | 'top600' | 'top1200' | 'top3000'

interface SearchRecord {
  infinitive: string
  forms: string
  translations: string
  all: string
}

const normalize = (value: string) =>
  value
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

const getPastFormValues = (verb: VerbEntry) =>
  Object.values(verb.forms.past).flatMap((group) => Object.values(group))

const getSearchIndex = (verb: VerbEntry) =>
  {
    const infinitive = normalize(verb.infinitive)
    const forms = normalize([...Object.values(verb.forms.present), ...getPastFormValues(verb)].join(' '))
    const translations = normalize([...verb.translations.en, ...verb.translations.uk].join(' '))

    return {
      infinitive,
      forms,
      translations,
      all: `${infinitive} ${forms} ${translations}`,
    }
  }

const getSearchScore = (record: SearchRecord, query: string) => {
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

function App() {
  const [progress, setProgress] = useState<StudyProgress>(() => loadProgress())
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => loadThemePreference())
  const [selectedVerbId, setSelectedVerbId] = useState(verbs[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [learnedFilter, setLearnedFilter] = useState<LearnedFilter>('all')
  const [aspectFilter, setAspectFilter] = useState<Aspect | 'all'>('all')
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
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

  const learnedVerbIds = useMemo(() => new Set(progress.learnedVerbIds), [progress.learnedVerbIds])
  const activeList = progress.lists.find((list) => list.id === progress.selectedListId)
  const activeListVerbIds = useMemo(() => new Set(activeList?.verbIds ?? []), [activeList])
  const searchIndexes = useMemo(() => new Map(verbs.map((verb) => [verb.id, getSearchIndex(verb)])), [])

  const visibleVerbs = useMemo(() => {
    const normalizedQuery = normalize(query.trim())
    const filtered = verbs.filter((verb) => {
      if (activeList && !activeList.verbIds.includes(verb.id)) {
        return false
      }
      if (learnedFilter === 'learned' && !learnedVerbIds.has(verb.id)) {
        return false
      }
      if (learnedFilter === 'learning' && learnedVerbIds.has(verb.id)) {
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
      if (rangeFilter === 'top3000' && verb.frequencyRank > 3000) {
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
  }, [activeList, aspectFilter, learnedFilter, learnedVerbIds, query, rangeFilter, searchIndexes])

  const selectedVerb =
    visibleVerbs.find((verb) => verb.id === selectedVerbId) ??
    visibleVerbs[0] ??
    verbs.find((verb) => verb.id === selectedVerbId) ??
    verbs[0]
  const learnedCount = progress.learnedVerbIds.length

  const updateProgress = (next: StudyProgress) => {
    setProgress(next)
  }

  const toggleLearned = (verbId: string) => {
    const learned = learnedVerbIds.has(verbId)
    updateProgress({
      ...progress,
      learnedVerbIds: learned
        ? progress.learnedVerbIds.filter((id) => id !== verbId)
        : [...progress.learnedVerbIds, verbId],
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

  const selectVerb = (verbId: string) => {
    setSelectedVerbId(verbId)
    if (window.matchMedia('(max-width: 980px)').matches) {
      window.requestAnimationFrame(() => {
        setMobileDetailOpen(true)
        window.scrollTo({ top: 0, behavior: 'auto' })
      })
    }
  }

  const listPickerVerb = listPickerVerbId ? verbs.find((verb) => verb.id === listPickerVerbId) : undefined
  const nextThemePreference = themePreference === 'dark' ? 'light' : 'dark'
  const nextThemeLabel = nextThemePreference === 'dark' ? 'ciemny' : 'jasny'
  const activeFilterCount = [learnedFilter !== 'all', aspectFilter !== 'all', rangeFilter !== 'all'].filter(Boolean).length

  return (
    <main className={`app-shell ${mobileDetailOpen ? 'mobile-detail-open' : ''}`} data-theme={themePreference}>
      <header className="app-header">
        <button
          className="theme-toggle"
          type="button"
          aria-label={`Przełącz na tryb ${nextThemeLabel}`}
          title={`Przełącz na tryb ${nextThemeLabel}`}
          onClick={() => setThemePreference(nextThemePreference)}
        >
          {themePreference === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div>
          <p className="eyebrow">PolishVerbs</p>
          <h1>3000 polskich czasowników według częstotliwości</h1>
        </div>
        <div className="progress-summary">
          <strong>{learnedCount}</strong>
          <span>opanowanych</span>
          <small>
            {Math.round((learnedCount / verbs.length) * 100)}% z {verbs.length}
          </small>
        </div>
      </header>

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
        <div className="filter-group" id="verb-filters">
          <Filter size={17} />
          <select value={learnedFilter} onChange={(event) => setLearnedFilter(event.target.value as LearnedFilter)}>
            <option value="all">Cały postęp</option>
            <option value="learning">Do nauki</option>
            <option value="learned">Opanowane</option>
          </select>
          <select value={aspectFilter} onChange={(event) => setAspectFilter(event.target.value as Aspect | 'all')}>
            <option value="all">Wszystkie aspekty</option>
            <option value="imperfective">Niedokonane</option>
            <option value="perfective">Dokonane</option>
            <option value="biaspectual">Dwuaspektowe</option>
            <option value="unknown">Nieznane</option>
          </select>
          <select value={rangeFilter} onChange={(event) => setRangeFilter(event.target.value as RangeFilter)}>
            <option value="all">Pełne 3000</option>
            <option value="top100">Pierwsze 100</option>
            <option value="top300">Pierwsze 300</option>
            <option value="top600">Pierwsze 600</option>
            <option value="top1200">Pierwsze 1200</option>
            <option value="top3000">Pierwsze 3000</option>
          </select>
        </div>
      </section>

      <section className="workspace">
        <aside className="sidebar">
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
            <strong>{visibleVerbs.length}</strong>
            <span>pokazanych czasowników</span>
          </div>

          <VerbList
            verbs={visibleVerbs}
            selectedVerbId={selectedVerb?.id ?? ''}
            learnedVerbIds={learnedVerbIds}
            activeListVerbIds={activeListVerbIds}
            selectedListId={progress.selectedListId}
            onSelectVerb={selectVerb}
            onToggleLearned={toggleLearned}
            onOpenListPicker={openListAction}
          />
        </aside>

        {selectedVerb ? (
          <div className="detail-anchor">
            <div className="mobile-detail-nav">
              <button className="secondary-button detail-back" type="button" onClick={() => setMobileDetailOpen(false)}>
                <ArrowLeft size={17} />
                Lista
              </button>
            </div>
            <VerbDetail verb={selectedVerb} />
          </div>
        ) : (
          <div className="empty-state">Żaden czasownik nie pasuje do obecnych filtrów.</div>
        )}
      </section>

      {showCreateList ? <CreateListModal onClose={closeCreateList} onCreate={createList} /> : null}
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
