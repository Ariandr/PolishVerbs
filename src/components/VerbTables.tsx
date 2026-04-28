import { BookOpenCheck, Check, ChevronLeft, ChevronRight, Dumbbell, Plus, Star, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PastForms, PresentForms, VerbEntry } from '../data/schema'
import { aspectLabels } from '../data/labels'
import { getRelatedVerbs } from '../lib/practice'
import { HighlightedText } from './HighlightedText'

const presentRows: Array<[string, keyof PresentForms]> = [
  ['ja', 'ja'],
  ['ty', 'ty'],
  ['on / ona', 'on'],
  ['my', 'my'],
  ['wy', 'wy'],
  ['oni / one', 'oni'],
]

const pastRows: Array<[string, (past: PastForms) => string]> = [
  ['ja - on', (past) => past.ja.masculine],
  ['ja - ona', (past) => past.ja.feminine],
  ['ty - on', (past) => past.ty.masculine],
  ['ty - ona', (past) => past.ty.feminine],
  ['on', (past) => past.on.masculine],
  ['ona', (past) => past.ona.feminine],
  ['my - oni', (past) => past.my.virile],
  ['my - one', (past) => past.my.nonvirile],
  ['wy - oni', (past) => past.wy.virile],
  ['wy - one', (past) => past.wy.nonvirile],
  ['oni', (past) => past.oni.virile],
  ['one', (past) => past.one.nonvirile],
]

export function PresentTable({ forms, highlightQuery = '' }: { forms: PresentForms; highlightQuery?: string }) {
  return (
    <table className="forms-table">
      <tbody>
        {presentRows.map(([label, key]) => (
          <tr key={label}>
            <th>{label}</th>
            <td>
              <HighlightedText text={key === 'on' ? forms.on : key === 'oni' ? forms.oni : forms[key]} query={highlightQuery} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PastTable({ forms, highlightQuery = '' }: { forms: PastForms; highlightQuery?: string }) {
  return (
    <table className="forms-table past-table">
      <tbody>
        {pastRows.map(([label, getValue]) => (
          <tr key={label}>
            <th>{label}</th>
            <td>
              <HighlightedText text={getValue(forms)} query={highlightQuery} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface VerbDetailProps {
  verb: VerbEntry
  highlightQuery?: string
  hasPrevious?: boolean
  hasNext?: boolean
  learned?: boolean
  inList?: boolean
  selectedListId?: string | null
  allVerbs?: VerbEntry[]
  onPreviousVerb?: () => void
  onNextVerb?: () => void
  onToggleLearned?: () => void
  onOpenListPicker?: () => void
  onSelectRelatedVerb?: (verbId: string) => void
  onPracticeVerb?: () => void
  onPracticeForms?: () => void
  onPracticeExamples?: () => void
}

export function VerbDetail({
  verb,
  highlightQuery = '',
  hasPrevious = false,
  hasNext = false,
  learned = false,
  inList = false,
  selectedListId = null,
  allVerbs = [],
  onPreviousVerb,
  onNextVerb,
  onToggleLearned,
  onOpenListPicker,
  onSelectRelatedVerb,
  onPracticeVerb,
  onPracticeForms,
  onPracticeExamples,
}: VerbDetailProps) {
  const example = verb.examples[0]
  const related = getRelatedVerbs(verb, allVerbs)
  const [polishVoice, setPolishVoice] = useState<SpeechSynthesisVoice | null>(null)
  const canSpeak = Boolean(polishVoice)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }

    const loadVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      setPolishVoice(voices.find((voice) => voice.lang.toLocaleLowerCase().startsWith('pl')) ?? null)
    }

    loadVoice()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoice)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoice)
  }, [])

  const speak = (text: string) => {
    if (!canSpeak) {
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pl-PL'
    utterance.voice = polishVoice
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  return (
    <article className="detail-panel">
      <div className="detail-nav">
        <button className="secondary-button" type="button" disabled={!hasPrevious} onClick={onPreviousVerb}>
          <ChevronLeft size={16} />
          Poprzedni
        </button>
        <button className="secondary-button" type="button" disabled={!hasNext} onClick={onNextVerb}>
          Następny
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="detail-head">
        <div>
          <div className="rank-line">#{verb.frequencyRank} według częstotliwości czasowników</div>
          <h2>
            <HighlightedText text={verb.infinitive} query={highlightQuery} />
          </h2>
          <p>
            <HighlightedText text={verb.translations.uk.join(', ')} query={highlightQuery} /> ·{' '}
            <HighlightedText text={verb.translations.en.join(', ')} query={highlightQuery} />
          </p>
        </div>
        <div className="metric-stack" aria-label="Dane częstotliwości">
          <span>{verb.frequency.ipm.toFixed(2)} IPM</span>
          <span>Ranga KWJP {verb.corpusRank}</span>
        </div>
      </div>

      <section className="detail-action-row" aria-label="Ćwiczenia i wymowa">
        <button className="secondary-button" type="button" onClick={onPracticeVerb}>
          <Dumbbell size={16} />
          Ćwicz czasownik
        </button>
        <button className="secondary-button" type="button" onClick={onPracticeForms}>
          Formy
        </button>
        <button className="secondary-button" type="button" onClick={onPracticeExamples}>
          Przykład
        </button>
        <button className="secondary-button" type="button" disabled={!canSpeak} title={canSpeak ? 'Odtwórz wymowę' : 'Brak polskiego głosu w przeglądarce'} onClick={() => speak(verb.infinitive)}>
          <Volume2 size={16} />
          Wymowa
        </button>
        <button className="secondary-button" type="button" disabled={!canSpeak} title={canSpeak ? 'Odtwórz formę ja' : 'Brak polskiego głosu w przeglądarce'} onClick={() => speak(verb.forms.present.ja)}>
          <Volume2 size={16} />
          Forma ja
        </button>
      </section>

      <section className="detail-section">
        <div className="section-title">Formy</div>
        <PresentTable forms={verb.forms.present} highlightQuery={highlightQuery} />
      </section>

      <section className="example-box">
        <div className="section-title">Przykład</div>
        <p className="example-pl">
          <HighlightedText text={example.pl} query={highlightQuery} />
        </p>
        <p>
          <HighlightedText text={example.uk} query={highlightQuery} />
        </p>
        <p>
          <HighlightedText text={example.en} query={highlightQuery} />
        </p>
        <button className="secondary-button example-speak" type="button" disabled={!canSpeak} title={canSpeak ? 'Odtwórz przykład' : 'Brak polskiego głosu w przeglądarce'} onClick={() => speak(example.pl)}>
          <Volume2 size={15} />
          Odtwórz przykład
        </button>
      </section>

      <section className="detail-section">
        <div className="section-title">Czas przeszły</div>
        <PastTable forms={verb.forms.past} highlightQuery={highlightQuery} />
      </section>

      <section className="notes-row">
        <span>{aspectLabels[verb.aspect]}</span>
        <span>{verb.reviewStatus === 'wiktionary-enriched' ? 'Uzupełniono z Wiktionary' : 'Do sprawdzenia'}</span>
        {verb.notes.map((note) => (
          <span key={note}>{note}</span>
        ))}
      </section>

      {(related.pair || related.family.length) ? (
        <section className="detail-section">
          <div className="section-title">Rodzina i para aspektowa</div>
          <div className="related-verbs">
            {related.pair ? (
              <button type="button" onClick={() => onSelectRelatedVerb?.(related.pair?.id ?? '')}>
                Para: {related.pair.infinitive}
              </button>
            ) : null}
            {related.family.map((item) => (
              <button type="button" key={item.id} onClick={() => onSelectRelatedVerb?.(item.id)}>
                {item.infinitive}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mobile-detail-actions" aria-label="Akcje czasownika">
        <button className={`secondary-button ${learned ? 'active-mobile-action' : ''}`} type="button" onClick={onToggleLearned}>
          {learned ? <Check size={16} /> : <BookOpenCheck size={16} />}
          {learned ? 'Opanowane' : 'Oznacz jako opanowane'}
        </button>
        <button className={`secondary-button ${inList ? 'active-list-mobile-action' : ''}`} type="button" onClick={onOpenListPicker}>
          {inList ? <Star size={16} /> : <Plus size={16} />}
          {selectedListId ? (inList ? 'Na liście' : 'Dodaj do listy') : 'Wybierz listę'}
        </button>
      </section>
    </article>
  )
}
