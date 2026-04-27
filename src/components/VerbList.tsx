import { BookOpenCheck, Check, Plus, Star } from 'lucide-react'
import type { VerbEntry } from '../data/schema'

interface VerbListProps {
  verbs: VerbEntry[]
  selectedVerbId: string
  learnedVerbIds: Set<string>
  activeListVerbIds: Set<string>
  selectedListId: string | null
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
  onSelectVerb,
  onToggleLearned,
  onOpenListPicker,
}: VerbListProps) {
  return (
    <div className="verb-list" aria-label="Wyniki czasowników">
      {verbs.map((verb) => {
        const learned = learnedVerbIds.has(verb.id)
        const inList = activeListVerbIds.has(verb.id)
        return (
          <button
            className={`verb-row ${selectedVerbId === verb.id ? 'selected' : ''}`}
            key={verb.id}
            type="button"
            onClick={() => onSelectVerb(verb.id)}
          >
            <span className="verb-rank">{verb.frequencyRank}</span>
            <span className="verb-main">
              <strong>{verb.infinitive}</strong>
              <small>
                {verb.translations.en.slice(0, 2).join(', ')} · {verb.translations.uk.slice(0, 2).join(', ')}
              </small>
            </span>
            <span className="row-actions" onClick={(event) => event.stopPropagation()}>
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
          </button>
        )
      })}
    </div>
  )
}
