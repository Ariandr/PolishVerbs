import { BookOpenCheck, Check, Plus, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { VerbEntry } from '../data/schema'
import { getVirtualWindow, virtualListThreshold, virtualRowHeight } from '../lib/virtualList'
import { HighlightedText } from './HighlightedText'

interface VerbListProps {
  verbs: VerbEntry[]
  selectedVerbId: string
  learnedVerbIds: Set<string>
  activeListVerbIds: Set<string>
  selectedListId: string | null
  query: string
  onSelectVerb: (verbId: string) => void
  onToggleLearned: (verbId: string) => void
  onOpenListPicker: (verbId: string) => void
}

export function VerbList({
  verbs,
  selectedVerbId,
  learnedVerbIds,
  activeListVerbIds,
  selectedListId,
  query,
  onSelectVerb,
  onToggleLearned,
  onOpenListPicker,
}: VerbListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({ scrollOffset: 0, viewportHeight: 720, mobile: false })
  const virtualized = verbs.length > virtualListThreshold
  const virtualWindow = virtualized
    ? getVirtualWindow(verbs.length, scrollState.scrollOffset, scrollState.viewportHeight)
    : {
        startIndex: 0,
        endIndex: verbs.length,
        beforeHeight: 0,
        afterHeight: 0,
      }
  const renderedVerbs = verbs.slice(virtualWindow.startIndex, virtualWindow.endIndex)

  useEffect(() => {
    if (!virtualized) {
      return
    }

    const list = listRef.current
    if (!list) {
      return
    }

    const updateScrollState = () => {
      const mobile = window.matchMedia('(max-width: 980px)').matches
      if (mobile) {
        const listTop = list.getBoundingClientRect().top + window.scrollY
        setScrollState({
          scrollOffset: Math.max(0, window.scrollY - listTop),
          viewportHeight: window.innerHeight,
          mobile: true,
        })
        return
      }

      setScrollState({
        scrollOffset: list.scrollTop,
        viewportHeight: list.clientHeight || window.innerHeight,
        mobile: false,
      })
    }

    updateScrollState()
    list.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)

    return () => {
      list.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [virtualized, verbs.length])

  return (
    <div
      className={`verb-list ${virtualized ? 'virtualized' : ''} ${scrollState.mobile ? 'window-virtualized' : ''}`}
      aria-label="Wyniki czasowników"
      ref={listRef}
    >
      {virtualized ? <div aria-hidden="true" style={{ height: virtualWindow.beforeHeight }} /> : null}
      {renderedVerbs.map((verb) => {
        const learned = learnedVerbIds.has(verb.id)
        const inList = activeListVerbIds.has(verb.id)
        return (
          <div className="virtual-row" key={verb.id} style={virtualized ? { height: virtualRowHeight } : undefined}>
          <div className={`verb-row ${selectedVerbId === verb.id ? 'selected' : ''}`}>
            <button className="verb-select" type="button" onClick={() => onSelectVerb(verb.id)}>
              <span className="verb-rank">{verb.frequencyRank}</span>
              <span className="verb-main">
                <strong>
                  <HighlightedText text={verb.infinitive} query={query} />
                </strong>
                <small>
                  <HighlightedText text={verb.translations.en.slice(0, 2).join(', ')} query={query} /> ·{' '}
                  <HighlightedText text={verb.translations.uk.slice(0, 2).join(', ')} query={query} />
                </small>
              </span>
            </button>
            <span className="row-actions">
              <button
                className={`icon-button ${learned ? 'active' : ''}`}
                type="button"
                aria-label={learned ? 'Oznacz jako nieopanowane' : 'Oznacz jako opanowane'}
                title={learned ? 'Opanowane' : 'Oznacz jako opanowane'}
                onClick={() => onToggleLearned(verb.id)}
              >
                {learned ? <Check size={17} /> : <BookOpenCheck size={17} />}
              </button>
              <button
                className={`icon-button ${inList ? 'active-list' : ''}`}
                type="button"
                aria-label={
                  selectedListId
                    ? inList
                      ? 'Usuń z wybranej listy'
                      : 'Dodaj do wybranej listy'
                    : 'Wybierz listę'
                }
                title={selectedListId ? (inList ? 'Na liście' : 'Dodaj do listy') : 'Wybierz listę'}
                onClick={() => onOpenListPicker(verb.id)}
              >
                {inList ? <Star size={17} /> : <Plus size={17} />}
              </button>
            </span>
          </div>
          </div>
        )
      })}
      {virtualized ? <div aria-hidden="true" style={{ height: virtualWindow.afterHeight }} /> : null}
    </div>
  )
}
