import { Check, RotateCcw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { aspectLabels } from '../data/labels'
import type { VerbEntry } from '../data/schema'
import { buildPracticePrompts, checkTypedAnswer, type PracticeAnswerEvent, type PracticePrompt } from '../lib/practice'
import type { PracticeAnswerMode, PracticePromptMode } from '../lib/storage'
import { PastTable, PresentTable } from './VerbTables'

const sessionSize = 20

type StudyGrade = 'know' | 'review'

interface StudyModeProps {
  verbs: VerbEntry[]
  onClose: () => void
  onGrade: (verbId: string, grade: StudyGrade) => void
  onAnswer?: (event: PracticeAnswerEvent) => void
  answerMode?: PracticeAnswerMode
  promptMode?: PracticePromptMode
  title?: string
}

const shuffleCards = (verbs: VerbEntry[], promptMode: PracticePromptMode) =>
  buildPracticePrompts(verbs, promptMode, sessionSize)
    .map((prompt) => ({ prompt, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .slice(0, sessionSize)
    .map(({ prompt }) => prompt)

export function StudyMode({
  verbs,
  onClose,
  onGrade,
  onAnswer,
  answerMode = 'reveal',
  promptMode = 'mixed',
  title = 'Powtórka czasowników',
}: StudyModeProps) {
  const [queue, setQueue] = useState<PracticePrompt[]>(() => shuffleCards(verbs, promptMode))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [typedResult, setTypedResult] = useState<null | { correct: boolean; given: string }>(null)
  const [knownCount, setKnownCount] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const currentPrompt = queue[currentIndex]
  const currentVerb = currentPrompt?.verb
  const completed = currentIndex >= queue.length
  const progressLabel = useMemo(() => {
    if (!queue.length) {
      return '0 / 0'
    }
    return `${Math.min(currentIndex + 1, queue.length)} / ${queue.length}`
  }, [currentIndex, queue.length])

  const restart = () => {
    setQueue(shuffleCards(verbs, promptMode))
    setCurrentIndex(0)
    setRevealed(false)
    setTypedAnswer('')
    setTypedResult(null)
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
    setTypedAnswer('')
    setTypedResult(null)
    setRevealed(false)
    setCurrentIndex((index) => index + 1)
  }

  const submitTypedAnswer = () => {
    if (!currentPrompt || typedResult) {
      return
    }
    const correct = checkTypedAnswer(typedAnswer, currentPrompt.answer)
    setTypedResult({ correct, given: typedAnswer })
    if (correct) {
      setKnownCount((count) => count + 1)
    } else {
      setReviewCount((count) => count + 1)
    }
    onAnswer?.({
      verbId: currentPrompt.verb.id,
      correct,
      promptType: currentPrompt.type,
      expected: currentPrompt.answer,
      given: typedAnswer,
    })
  }

  const nextTypedPrompt = () => {
    setTypedAnswer('')
    setTypedResult(null)
    setCurrentIndex((index) => index + 1)
  }

  return (
    <div className="study-overlay" role="dialog" aria-modal="true" aria-labelledby="study-title">
      <section className="study-panel">
        <header className="study-topbar">
          <div>
            <div className="section-title">Tryb nauki</div>
            <h2 id="study-title">{title}</h2>
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
              <span>{answerMode === 'typed' ? 'wpisywanie' : 'fiszki'}</span>
            </div>

            <section className="study-prompt">
              <div className="section-title">{currentPrompt.type === 'cloze-example' ? 'Uzupełnij przykład' : 'Pytanie'}</div>
              <p>{currentPrompt.prompt}</p>
              <p>{currentPrompt.detail}</p>
            </section>

            {answerMode === 'typed' ? (
              <section className="typed-answer-panel">
                <label>
                  <span>Odpowiedź</span>
                  <input
                    type="text"
                    value={typedAnswer}
                    disabled={Boolean(typedResult)}
                    autoFocus
                    onChange={(event) => setTypedAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        if (typedResult) {
                          nextTypedPrompt()
                        } else {
                          submitTypedAnswer()
                        }
                      }
                    }}
                  />
                </label>
                {typedResult ? (
                  <div className={`typed-result ${typedResult.correct ? 'correct' : 'wrong'}`}>
                    {typedResult.correct ? 'Dobrze.' : `Poprawnie: ${currentPrompt.answer}`}
                    {currentPrompt.displayAnswer ? <small>{currentPrompt.displayAnswer}</small> : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {(revealed || typedResult) ? (
              <div className="study-answer">
                <div className="detail-head">
                  <div>
                    <div className="rank-line">Odpowiedź</div>
                    <h2>{currentPrompt.answer}</h2>
                    <p>{currentVerb.infinitive}</p>
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
              {answerMode === 'typed' ? (
                typedResult ? (
                  <button className="primary-button" type="button" onClick={nextTypedPrompt}>
                    {currentIndex === queue.length - 1 ? 'Zakończ' : 'Następne'}
                  </button>
                ) : (
                  <button className="primary-button" type="button" disabled={!typedAnswer.trim()} onClick={submitTypedAnswer}>
                    Sprawdź
                  </button>
                )
              ) : revealed ? (
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
