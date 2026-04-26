import { useEffect, useMemo, useState } from 'react'
import { Filter, Search } from 'lucide-react'
import './App.css'
import { CreateListModal, ListPickerModal } from './components/ListModals'
import { StudyLists } from './components/StudyLists'
import { VerbDetail } from './components/VerbTables'
import { VerbList } from './components/VerbList'
import { verbs } from './data/verbs'
import type { Aspect, VerbEntry } from './data/schema'
import { createStudyList, loadProgress, saveProgress, touchList, type StudyProgress } from './lib/storage'

type LearnedFilter = 'all' | 'learning' | 'learned'
type RangeFilter = 'all' | 'top100' | 'top300' | 'top600'

const normalize = (value: string) =>
  value
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

const getSearchIndex = (verb: VerbEntry) =>
  normalize(
    [
      verb.infinitive,
      ...Object.values(verb.forms.present),
      ...verb.translations.en,
      ...verb.translations.uk,
      ...verb.examples.flatMap((example) => [example.pl, example.en, example.uk]),
    ].join(' '),
  )

function App() {
  const [progress, setProgress] = useState<StudyProgress>(() => loadProgress())
  const [selectedVerbId, setSelectedVerbId] = useState(verbs[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [learnedFilter, setLearnedFilter] = useState<LearnedFilter>('all')
  const [aspectFilter, setAspectFilter] = useState<Aspect | 'all'>('all')
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all')
  const [showCreateList, setShowCreateList] = useState(false)
  const [listPickerVerbId, setListPickerVerbId] = useState<string | null>(null)

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  const learnedVerbIds = useMemo(() => new Set(progress.learnedVerbIds), [progress.learnedVerbIds])
  const activeList = progress.lists.find((list) => list.id === progress.selectedListId)
  const activeListVerbIds = useMemo(() => new Set(activeList?.verbIds ?? []), [activeList])
  const searchIndexes = useMemo(() => new Map(verbs.map((verb) => [verb.id, getSearchIndex(verb)])), [])

  const visibleVerbs = useMemo(() => {
    const normalizedQuery = normalize(query.trim())
    return verbs.filter((verb) => {
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
      if (normalizedQuery && !searchIndexes.get(verb.id)?.includes(normalizedQuery)) {
        return false
      }
      return true
    })
  }, [activeList, aspectFilter, learnedFilter, learnedVerbIds, query, rangeFilter, searchIndexes])

  const selectedVerb =
    visibleVerbs.find((verb) => verb.id === selectedVerbId) ??
    verbs.find((verb) => verb.id === selectedVerbId) ??
    visibleVerbs[0] ??
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
    const list = createStudyList(name)
    updateProgress({ ...progress, lists: [list, ...progress.lists], selectedListId: list.id })
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

  const listPickerVerb = listPickerVerbId ? verbs.find((verb) => verb.id === listPickerVerbId) : undefined

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">PolishVerbs</p>
          <h1>600 Polish verbs by frequency</h1>
        </div>
        <div className="progress-summary">
          <strong>{learnedCount}</strong>
          <span>learned</span>
          <small>{Math.round((learnedCount / verbs.length) * 100)}% of 600</small>
        </div>
      </header>

      <section className="toolbar" aria-label="Search and filters">
        <label className="search-field">
          <Search size={18} />
          <input
            type="search"
            value={query}
            placeholder="Search Polish, English, Ukrainian, or forms"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="filter-group">
          <Filter size={17} />
          <select value={learnedFilter} onChange={(event) => setLearnedFilter(event.target.value as LearnedFilter)}>
            <option value="all">All progress</option>
            <option value="learning">Learning</option>
            <option value="learned">Learned</option>
          </select>
          <select value={aspectFilter} onChange={(event) => setAspectFilter(event.target.value as Aspect | 'all')}>
            <option value="all">All aspects</option>
            <option value="imperfective">Imperfective</option>
            <option value="perfective">Perfective</option>
            <option value="biaspectual">Biaspectual</option>
            <option value="unknown">Unknown</option>
          </select>
          <select value={rangeFilter} onChange={(event) => setRangeFilter(event.target.value as RangeFilter)}>
            <option value="all">Full 600</option>
            <option value="top100">Top 100</option>
            <option value="top300">Top 300</option>
            <option value="top600">Top 600</option>
          </select>
        </div>
      </section>

      <section className="workspace">
        <aside className="sidebar">
          <StudyLists
            lists={progress.lists}
            selectedListId={progress.selectedListId}
            onOpenCreateList={() => setShowCreateList(true)}
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
            <span>verbs shown</span>
          </div>

          <VerbList
            verbs={visibleVerbs}
            selectedVerbId={selectedVerb?.id ?? ''}
            learnedVerbIds={learnedVerbIds}
            activeListVerbIds={activeListVerbIds}
            selectedListId={progress.selectedListId}
            onSelectVerb={setSelectedVerbId}
            onToggleLearned={toggleLearned}
            onOpenListPicker={openListAction}
          />
        </aside>

        {selectedVerb ? (
          <VerbDetail verb={selectedVerb} />
        ) : (
          <div className="empty-state">No verbs match the current filters.</div>
        )}
      </section>

      {showCreateList ? <CreateListModal onClose={() => setShowCreateList(false)} onCreate={createList} /> : null}
      {listPickerVerb ? (
        <ListPickerModal
          lists={progress.lists}
          verb={listPickerVerb}
          onClose={() => setListPickerVerbId(null)}
          onCreateList={() => setShowCreateList(true)}
          onToggleList={(listId) => toggleVerbInList(listPickerVerb.id, listId)}
        />
      ) : null}
    </main>
  )
}

export default App
