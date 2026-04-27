import { Check, RotateCcw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { aspectLabels } from '../data/labels'
import type { VerbEntry } from '../data/schema'
import { PastTable, PresentTable } from './VerbTables'

const sessionSize = 20

type StudyGrade = 'know' | 'review'

interface StudyModeProps {
  verbs: VerbEntry[]
  onClose: () => void
  onGrade: (verbId: string, grade: StudyGrade) => void
}

const shuffleVerbs = (verbs: VerbEntry[]) =>
  [...verbs]
    .map((verb) => ({ verb, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .slice(0, sessionSize)
    .map(({ verb }) => verb)

export function StudyMode({ verbs, onClose, onGrade }: StudyModeProps) {
  const [queue, setQueue] = useState(() => shuffleVerbs(verbs))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [knownCount, setKnownCount] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const currentVerb = queue[currentIndex]
  const completed = currentIndex >= queue.length
  const progressLabel = useMemo(() => {
    if (!queue.length) {
      return '0 / 0'
    }
    return `${Math.min(currentIndex + 1, queue.length)} / ${queue.length}`
  }, [currentIndex, queue.length])

  const restart = () => {
    setQueue(shuffleVerbs(verbs))
    setCurrentIndex(0)
    setRevealed(false)
    setKnownCount(0)
    setReviewCount(0)
  }

  const gradeCurrentVerb = (grade: StudyGrade) => {
    if (!currentVerb) {
      return
    }

    onGrade(currentVerb.id, grade)
    if (grade === 'know') {
      setKnownCount((count) => count + 1)
    } else {
      setReviewCount((count) => count + 1)
    }
    setRevealed(false)
    setCurrentIndex((index) => index + 1)
  }

  return (
    <div className="study-overlay" role="dialog" aria-modal="true" aria-labelledby="study-title">
      <section className="study-panel">
        <header className="study-topbar">
          <div>
            <div className="section-title">Tryb nauki</div>
            <h2 id="study-title">Powtórka czasowników</h2>
          </div>
          <div className="study-topbar-actions">
            <span className="study-progress">{completed ? `${queue.length} / ${queue.length}` : progressLabel}</span>
            <button className="icon-button" type="button" aria-label="Zamknij tryb nauki" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>

        {!queue.length ? (
          <div className="study-empty">
            <p>Brak czasowników do nauki w obecnym widoku.</p>
            <button className="primary-button" type="button" onClick={onClose}>
              Wróć do listy
            </button>
          </div>
        ) : completed ? (
          <div className="study-summary">
            <div className="section-title">Koniec sesji</div>
            <h2>Wynik powtórki</h2>
            <div className="study-summary-grid">
              <span>
                <strong>{queue.length}</strong>
                przerobionych
              </span>
              <span>
                <strong>{knownCount}</strong>
                opanowanych
              </span>
              <span>
                <strong>{reviewCount}</strong>
                do powtórki
              </span>
            </div>
            <div className="study-actions">
              <button className="secondary-button" type="button" onClick={restart}>
                <RotateCcw size={16} />
                Nowa sesja
              </button>
              <button className="primary-button" type="button" onClick={onClose}>
                Wróć do listy
              </button>
            </div>
          </div>
        ) : (
          <article className="study-card">
            <div className="study-card-head">
              <span>#{currentVerb.frequencyRank}</span>
              <span>{aspectLabels[currentVerb.aspect]}</span>
            </div>

            <section className="study-prompt">
              <div className="section-title">Znaczenie</div>
              <p>{currentVerb.translations.en.join(', ')}</p>
              <p>{currentVerb.translations.uk.join(', ')}</p>
            </section>

            {revealed ? (
              <div className="study-answer">
                <div className="detail-head">
                  <div>
                    <div className="rank-line">Odpowiedź</div>
                    <h2>{currentVerb.infinitive}</h2>
                  </div>
                  <div className="metric-stack" aria-label="Dane częstotliwości">
                    <span>{currentVerb.frequency.ipm.toFixed(2)} IPM</span>
                    <span>Ranga KWJP {currentVerb.corpusRank}</span>
                  </div>
                </div>

                <section className="detail-section">
                  <div className="section-title">Formy</div>
                  <PresentTable forms={currentVerb.forms.present} />
                </section>

                <section className="example-box">
                  <div className="section-title">Przykład</div>
                  <p className="example-pl">{currentVerb.examples[0].pl}</p>
                  <p>{currentVerb.examples[0].uk}</p>
                  <p>{currentVerb.examples[0].en}</p>
                </section>

                <section className="detail-section">
                  <div className="section-title">Czas przeszły</div>
                  <PastTable forms={currentVerb.forms.past} />
                </section>
              </div>
            ) : null}

            <div className="study-actions">
              {revealed ? (
                <>
                  <button className="secondary-button study-review-button" type="button" onClick={() => gradeCurrentVerb('review')}>
                    Do powtórki
                  </button>
                  <button className="primary-button" type="button" onClick={() => gradeCurrentVerb('know')}>
                    <Check size={16} />
                    Umiem
                  </button>
                </>
              ) : (
                <button className="primary-button" type="button" onClick={() => setRevealed(true)}>
                  Pokaż odpowiedź
                </button>
              )}
            </div>
          </article>
        )}
      </section>
    </div>
  )
}
