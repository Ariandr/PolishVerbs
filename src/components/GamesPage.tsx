import {
  ArrowLeft,
  Boxes,
  Check,
  CircleHelp,
  CircleOff,
  Dices,
  Grid2X2,
  ListChecks,
  Puzzle,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { VerbEntry } from '../data/schema'
import {
  aspectBucketLabels,
  aspectBuckets,
  buildAnagramQuestions,
  buildAspectItems,
  buildFormQuestions,
  buildMeaningPairs,
  buildMemoryCards,
  buildOpenCardQuestions,
  buildQuickQuestions,
  formatScore,
  shuffleItems,
  type ChoiceQuestion,
  type GameId,
} from '../lib/gameEngine'

interface GamesPageProps {
  verbs: VerbEntry[]
  onBack: () => void
}

interface GameMeta {
  id: GameId
  title: string
  description: string
  minVerbs: number
  icon: ReactNode
}

const games: GameMeta[] = [
  {
    id: 'quick-test',
    title: 'Szybki test',
    description: 'Wybierz polski czasownik do podanego znaczenia.',
    minVerbs: 4,
    icon: <CircleHelp size={19} />,
  },
  {
    id: 'meaning-match',
    title: 'Dopasuj znaczenie',
    description: 'Łącz bezokoliczniki z tłumaczeniami.',
    minVerbs: 2,
    icon: <ListChecks size={19} />,
  },
  {
    id: 'aspect-sort',
    title: 'Sortowanie aspektu',
    description: 'Przypisuj czasowniki do grup aspektu.',
    minVerbs: 1,
    icon: <Boxes size={19} />,
  },
  {
    id: 'conjugation-wheel',
    title: 'Koło odmiany',
    description: 'Losuj wyzwania z odmiany i wybieraj formę.',
    minVerbs: 4,
    icon: <Dices size={19} />,
  },
  {
    id: 'open-cards',
    title: 'Odkryj karty',
    description: 'Otwieraj karty i odpowiadaj na pytania.',
    minVerbs: 4,
    icon: <Grid2X2 size={19} />,
  },
  {
    id: 'infinitive-anagram',
    title: 'Anagram bezokolicznika',
    description: 'Ułóż polski bezokolicznik z liter.',
    minVerbs: 1,
    icon: <Shuffle size={19} />,
  },
  {
    id: 'memory-pairs',
    title: 'Pary pamięciowe',
    description: 'Odkrywaj pary czasownik - znaczenie.',
    minVerbs: 2,
    icon: <Puzzle size={19} />,
  },
  {
    id: 'missing-form',
    title: 'Brakująca forma',
    description: 'Wybierz brakującą formę odmiany.',
    minVerbs: 4,
    icon: <Sparkles size={19} />,
  },
]

export function GamesPage({ verbs, onBack }: GamesPageProps) {
  const [selectedGameId, setSelectedGameId] = useState<GameId | null>(null)
  const [sessionKey, setSessionKey] = useState(0)
  const selectedGame = games.find((game) => game.id === selectedGameId)

  const openGame = (gameId: GameId) => {
    setSelectedGameId(gameId)
    setSessionKey((key) => key + 1)
  }

  const restartGame = () => {
    setSessionKey((key) => key + 1)
  }

  return (
    <section className="games-page" aria-labelledby="games-title">
      <header className="games-head">
        <button className="secondary-button" type="button" onClick={selectedGame ? () => setSelectedGameId(null) : onBack}>
          <ArrowLeft size={17} />
          {selectedGame ? 'Gry' : 'Wróć'}
        </button>
        <div>
          <div className="section-title">Gry</div>
          <h2 id="games-title">{selectedGame?.title ?? 'Gry czasownikowe'}</h2>
          <p>{verbs.length} czasowników z obecnego widoku</p>
        </div>
      </header>

      {selectedGame ? (
        <ActiveGame key={`${selectedGame.id}-${sessionKey}`} game={selectedGame} verbs={verbs} onRestart={restartGame} />
      ) : (
        <div className="games-grid">
          {games.map((game) => {
            const enabled = verbs.length >= game.minVerbs
            return (
              <button
                className="game-card"
                type="button"
                key={game.id}
                disabled={!enabled}
                onClick={() => openGame(game.id)}
              >
                <span className="game-card-icon">{enabled ? game.icon : <CircleOff size={19} />}</span>
                <strong>{game.title}</strong>
                <small>{game.description}</small>
                {!enabled ? <em>Potrzeba co najmniej {game.minVerbs} czasowników w obecnym widoku.</em> : null}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function ActiveGame({ game, verbs, onRestart }: { game: GameMeta; verbs: VerbEntry[]; onRestart: () => void }) {
  if (game.id === 'quick-test') {
    return (
      <ChoiceQuestionGame
        title={game.title}
        emptyText="Ten test potrzebuje co najmniej 4 czasowników z różnymi odpowiedziami."
        questions={buildQuickQuestions(verbs)}
        onRestart={onRestart}
      />
    )
  }

  if (game.id === 'meaning-match') {
    return <MeaningMatchGame verbs={verbs} onRestart={onRestart} />
  }

  if (game.id === 'aspect-sort') {
    return <AspectSortGame verbs={verbs} onRestart={onRestart} />
  }

  if (game.id === 'conjugation-wheel') {
    return (
      <ChoiceQuestionGame
        title={game.title}
        emptyText="Koło odmiany potrzebuje co najmniej 4 różnych form z obecnego widoku."
        questions={buildFormQuestions(verbs, 'wheel')}
        onRestart={onRestart}
        leadIcon={<Dices size={28} />}
      />
    )
  }

  if (game.id === 'open-cards') {
    return <OpenCardsGame verbs={verbs} onRestart={onRestart} />
  }

  if (game.id === 'infinitive-anagram') {
    return <AnagramGame verbs={verbs} onRestart={onRestart} />
  }

  if (game.id === 'memory-pairs') {
    return <MemoryPairsGame verbs={verbs} onRestart={onRestart} />
  }

  return (
    <ChoiceQuestionGame
      title={game.title}
      emptyText="Ta gra potrzebuje co najmniej 4 różnych form z obecnego widoku."
      questions={buildFormQuestions(verbs, 'missing')}
      onRestart={onRestart}
    />
  )
}

function GameEmpty({ text, onRestart }: { text: string; onRestart: () => void }) {
  return (
    <div className="game-empty">
      <CircleOff size={28} />
      <p>{text}</p>
      <button className="secondary-button" type="button" onClick={onRestart}>
        <RotateCcw size={16} />
        Spróbuj ponownie
      </button>
    </div>
  )
}

function GameSummary({
  correct,
  attempts,
  onRestart,
}: {
  correct: number
  attempts: number
  onRestart: () => void
}) {
  return (
    <div className="game-summary">
      <Trophy size={32} />
      <div>
        <div className="section-title">Koniec gry</div>
        <h3>Wynik: {formatScore(correct, attempts)}</h3>
      </div>
      <button className="primary-button" type="button" onClick={onRestart}>
        <RotateCcw size={16} />
        Nowa sesja
      </button>
    </div>
  )
}

function ScoreBar({ correct, attempts, progress }: { correct: number; attempts: number; progress: string }) {
  return (
    <div className="game-scorebar">
      <span>{progress}</span>
      <strong>{formatScore(correct, attempts)}</strong>
    </div>
  )
}

function ChoiceQuestionGame({
  title,
  emptyText,
  questions,
  onRestart,
  leadIcon,
}: {
  title: string
  emptyText: string
  questions: ChoiceQuestion[]
  onRestart: () => void
  leadIcon?: ReactNode
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const question = questions[currentIndex]
  const completed = currentIndex >= questions.length
  const answered = selectedAnswer !== null

  if (!questions.length) {
    return <GameEmpty text={emptyText} onRestart={onRestart} />
  }

  if (completed) {
    return <GameSummary correct={correct} attempts={attempts} onRestart={onRestart} />
  }

  const chooseAnswer = (answer: string) => {
    if (answered) {
      return
    }
    setSelectedAnswer(answer)
    setAttempts((count) => count + 1)
    if (answer === question.answer) {
      setCorrect((count) => count + 1)
    }
  }

  const nextQuestion = () => {
    setSelectedAnswer(null)
    setCurrentIndex((index) => index + 1)
  }

  return (
    <article className="game-board">
      <ScoreBar correct={correct} attempts={attempts} progress={`${currentIndex + 1} / ${questions.length}`} />
      <section className={`game-prompt ${leadIcon ? 'with-icon' : ''}`}>
        {leadIcon ? <span className="game-lead-icon">{leadIcon}</span> : null}
        <div>
          <div className="section-title">{title}</div>
          <h3>{question.prompt}</h3>
          <p>{question.detail}</p>
        </div>
      </section>
      <div className="game-options">
        {question.options.map((option) => (
          <button
            className={`game-option ${answered && option === question.answer ? 'correct' : ''} ${
              answered && option === selectedAnswer && option !== question.answer ? 'wrong' : ''
            }`}
            type="button"
            key={option}
            disabled={answered}
            onClick={() => chooseAnswer(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {answered ? (
        <div className="game-feedback">
          {selectedAnswer === question.answer ? <Check size={18} /> : <X size={18} />}
          <span>{selectedAnswer === question.answer ? 'Dobrze.' : `Poprawnie: ${question.answer}`}</span>
          <button className="primary-button" type="button" onClick={nextQuestion}>
            {currentIndex === questions.length - 1 ? 'Zakończ' : 'Następne'}
          </button>
        </div>
      ) : null}
    </article>
  )
}

function MeaningMatchGame({ verbs, onRestart }: { verbs: VerbEntry[]; onRestart: () => void }) {
  const pairs = useMemo(() => buildMeaningPairs(verbs), [verbs])
  const rightColumn = useMemo(() => shuffleItems(pairs), [pairs])
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(() => new Set())
  const [attempts, setAttempts] = useState(0)
  const [message, setMessage] = useState('Wybierz czasownik, potem znaczenie.')

  if (pairs.length < 2) {
    return <GameEmpty text="Dopasowanie potrzebuje co najmniej 2 czasowników w obecnym widoku." onRestart={onRestart} />
  }

  if (matched.size === pairs.length) {
    return <GameSummary correct={matched.size} attempts={attempts} onRestart={onRestart} />
  }

  const chooseMeaning = (id: string) => {
    if (!selectedLeft || matched.has(id)) {
      return
    }
    setAttempts((count) => count + 1)
    if (selectedLeft === id) {
      setMatched((current) => new Set(current).add(id))
      setMessage('Dobra para.')
    } else {
      setMessage('To nie ta para.')
    }
    setSelectedLeft(null)
  }

  return (
    <article className="game-board">
      <ScoreBar correct={matched.size} attempts={attempts} progress={`${matched.size} / ${pairs.length}`} />
      <div className="match-grid">
        <div className="match-column">
          {pairs.map((pair) => (
            <button
              className={`match-tile ${selectedLeft === pair.id ? 'selected' : ''} ${matched.has(pair.id) ? 'matched' : ''}`}
              type="button"
              key={pair.id}
              disabled={matched.has(pair.id)}
              onClick={() => setSelectedLeft(pair.id)}
            >
              {pair.polish}
            </button>
          ))}
        </div>
        <div className="match-column">
          {rightColumn.map((pair) => (
            <button
              className={`match-tile meaning ${matched.has(pair.id) ? 'matched' : ''}`}
              type="button"
              key={pair.id}
              disabled={matched.has(pair.id)}
              onClick={() => chooseMeaning(pair.id)}
            >
              {pair.meaning}
            </button>
          ))}
        </div>
      </div>
      <p className="game-message">{message}</p>
    </article>
  )
}

function AspectSortGame({ verbs, onRestart }: { verbs: VerbEntry[]; onRestart: () => void }) {
  const items = useMemo(() => buildAspectItems(verbs), [verbs])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, { bucket: string; correct: boolean }>>({})
  const attempts = Object.keys(results).length
  const correct = Object.values(results).filter((result) => result.correct).length
  const selectedItem = items.find((item) => item.id === selectedId)

  if (!items.length) {
    return <GameEmpty text="Sortowanie aspektu potrzebuje co najmniej 1 czasownika w obecnym widoku." onRestart={onRestart} />
  }

  if (attempts === items.length) {
    return <GameSummary correct={correct} attempts={attempts} onRestart={onRestart} />
  }

  const assignBucket = (bucket: string) => {
    if (!selectedItem) {
      return
    }
    setResults((current) => ({
      ...current,
      [selectedItem.id]: {
        bucket,
        correct: selectedItem.aspect === bucket,
      },
    }))
    setSelectedId(null)
  }

  return (
    <article className="game-board">
      <ScoreBar correct={correct} attempts={attempts} progress={`${attempts} / ${items.length}`} />
      <div className="sort-layout">
        <div className="sort-items">
          {items.map((item) => (
            <button
              className={`sort-item ${selectedId === item.id ? 'selected' : ''} ${results[item.id]?.correct ? 'correct' : ''} ${
                results[item.id] && !results[item.id].correct ? 'wrong' : ''
              }`}
              type="button"
              key={item.id}
              disabled={Boolean(results[item.id])}
              onClick={() => setSelectedId(item.id)}
            >
              <strong>{item.label}</strong>
              <small>{item.meaning}</small>
            </button>
          ))}
        </div>
        <div className="sort-buckets">
          {aspectBuckets.map((bucket) => (
            <button className="sort-bucket" type="button" key={bucket} disabled={!selectedItem} onClick={() => assignBucket(bucket)}>
              {aspectBucketLabels[bucket]}
            </button>
          ))}
        </div>
      </div>
      <p className="game-message">{selectedItem ? `Wybrano: ${selectedItem.label}` : 'Wybierz czasownik i przypisz go do aspektu.'}</p>
    </article>
  )
}

function OpenCardsGame({ verbs, onRestart }: { verbs: VerbEntry[]; onRestart: () => void }) {
  const questions = useMemo(() => buildOpenCardQuestions(verbs), [verbs])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [cardStates, setCardStates] = useState<Record<string, 'correct' | 'wrong'>>({})
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const attempts = Object.keys(cardStates).length
  const correct = Object.values(cardStates).filter((state) => state === 'correct').length
  const activeQuestion = activeIndex === null ? null : questions[activeIndex]

  if (!questions.length) {
    return <GameEmpty text="Odkrywanie kart potrzebuje co najmniej 4 czasowników w obecnym widoku." onRestart={onRestart} />
  }

  if (attempts === questions.length) {
    return <GameSummary correct={correct} attempts={attempts} onRestart={onRestart} />
  }

  const chooseAnswer = (answer: string) => {
    if (!activeQuestion || selectedAnswer) {
      return
    }
    setSelectedAnswer(answer)
    setCardStates((current) => ({
      ...current,
      [activeQuestion.id]: answer === activeQuestion.answer ? 'correct' : 'wrong',
    }))
  }

  return (
    <article className="game-board">
      <ScoreBar correct={correct} attempts={attempts} progress={`${attempts} / ${questions.length}`} />
      <div className="open-card-grid">
        {questions.map((question, index) => (
          <button
            className={`open-card ${cardStates[question.id] ?? ''} ${activeIndex === index ? 'active' : ''}`}
            type="button"
            key={question.id}
            disabled={Boolean(cardStates[question.id])}
            onClick={() => {
              setActiveIndex(index)
              setSelectedAnswer(null)
            }}
          >
            {index + 1}
          </button>
        ))}
      </div>
      {activeQuestion ? (
        <section className="game-prompt compact">
          <div>
            <div className="section-title">{activeQuestion.detail}</div>
            <h3>{activeQuestion.prompt}</h3>
          </div>
        </section>
      ) : null}
      {activeQuestion ? (
        <div className="game-options">
          {activeQuestion.options.map((option) => (
            <button
              className={`game-option ${selectedAnswer && option === activeQuestion.answer ? 'correct' : ''} ${
                selectedAnswer === option && option !== activeQuestion.answer ? 'wrong' : ''
              }`}
              type="button"
              key={option}
              disabled={Boolean(selectedAnswer)}
              onClick={() => chooseAnswer(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <p className="game-message">Wybierz kartę.</p>
      )}
      {activeQuestion && selectedAnswer ? (
        <div className="game-feedback">
          {selectedAnswer === activeQuestion.answer ? <Check size={18} /> : <X size={18} />}
          <span>{selectedAnswer === activeQuestion.answer ? 'Dobrze.' : `Poprawnie: ${activeQuestion.answer}`}</span>
          <button className="primary-button" type="button" onClick={() => setActiveIndex(null)}>
            Wróć do kart
          </button>
        </div>
      ) : null}
    </article>
  )
}

function AnagramGame({ verbs, onRestart }: { verbs: VerbEntry[]; onRestart: () => void }) {
  const questions = useMemo(() => buildAnagramQuestions(verbs), [verbs])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [pickedTileIds, setPickedTileIds] = useState<string[]>([])
  const [answered, setAnswered] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const question = questions[currentIndex]
  const answer = question ? pickedTileIds.map((id) => question.letters.find((tile) => tile.id === id)?.letter ?? '').join('') : ''

  if (!questions.length) {
    return <GameEmpty text="Anagram potrzebuje co najmniej 1 czasownika z bezokolicznikiem dłuższym niż 3 litery." onRestart={onRestart} />
  }

  if (currentIndex >= questions.length) {
    return <GameSummary correct={correct} attempts={attempts} onRestart={onRestart} />
  }

  const checkAnswer = () => {
    if (answered || answer.length !== question.answer.length) {
      return
    }
    setAnswered(true)
    setAttempts((count) => count + 1)
    if (answer === question.answer) {
      setCorrect((count) => count + 1)
    }
  }

  const nextQuestion = () => {
    setPickedTileIds([])
    setAnswered(false)
    setCurrentIndex((index) => index + 1)
  }

  return (
    <article className="game-board">
      <ScoreBar correct={correct} attempts={attempts} progress={`${currentIndex + 1} / ${questions.length}`} />
      <section className="game-prompt">
        <div>
          <div className="section-title">Ułóż bezokolicznik</div>
          <h3>{question.meaning}</h3>
          <p>Dotknij liter w poprawnej kolejności.</p>
        </div>
      </section>
      <div className={`anagram-answer ${answered ? (answer === question.answer ? 'correct' : 'wrong') : ''}`}>
        {answer || ' '}
      </div>
      <div className="letter-grid">
        {question.letters.map((tile) => (
          <button
            className="letter-tile"
            type="button"
            key={tile.id}
            disabled={pickedTileIds.includes(tile.id) || answered}
            onClick={() => setPickedTileIds((current) => [...current, tile.id])}
          >
            {tile.letter}
          </button>
        ))}
      </div>
      <div className="game-feedback">
        {answered ? (
          <>
            {answer === question.answer ? <Check size={18} /> : <X size={18} />}
            <span>{answer === question.answer ? 'Dobrze.' : `Poprawnie: ${question.answer}`}</span>
            <button className="primary-button" type="button" onClick={nextQuestion}>
              {currentIndex === questions.length - 1 ? 'Zakończ' : 'Następne'}
            </button>
          </>
        ) : (
          <>
            <button className="secondary-button" type="button" disabled={!pickedTileIds.length} onClick={() => setPickedTileIds([])}>
              Wyczyść
            </button>
            <button className="primary-button" type="button" disabled={answer.length !== question.answer.length} onClick={checkAnswer}>
              Sprawdź
            </button>
          </>
        )}
      </div>
    </article>
  )
}

function MemoryPairsGame({ verbs, onRestart }: { verbs: VerbEntry[]; onRestart: () => void }) {
  const cards = useMemo(() => buildMemoryCards(verbs), [verbs])
  const pairTotal = cards.length / 2
  const [flipped, setFlipped] = useState<string[]>([])
  const [matched, setMatched] = useState<Set<string>>(() => new Set())
  const [attempts, setAttempts] = useState(0)
  const [message, setMessage] = useState('Odkryj dwie karty.')
  const mismatch = flipped.length === 2 && cards.find((card) => card.id === flipped[0])?.pairId !== cards.find((card) => card.id === flipped[1])?.pairId

  if (pairTotal < 2) {
    return <GameEmpty text="Pary pamięciowe potrzebują co najmniej 2 czasowników w obecnym widoku." onRestart={onRestart} />
  }

  if (matched.size === pairTotal) {
    return <GameSummary correct={matched.size} attempts={attempts} onRestart={onRestart} />
  }

  const flipCard = (cardId: string) => {
    if (flipped.includes(cardId) || mismatch) {
      return
    }
    const nextFlipped = [...flipped, cardId]
    setFlipped(nextFlipped)
    if (nextFlipped.length === 2) {
      setAttempts((count) => count + 1)
      const [firstId, secondId] = nextFlipped
      const first = cards.find((card) => card.id === firstId)
      const second = cards.find((card) => card.id === secondId)
      if (first && second && first.pairId === second.pairId) {
        setMatched((current) => new Set(current).add(first.pairId))
        setFlipped([])
        setMessage('Dobra para.')
      } else {
        setMessage('To nie ta para.')
      }
    }
  }

  return (
    <article className="game-board">
      <ScoreBar correct={matched.size} attempts={attempts} progress={`${matched.size} / ${pairTotal}`} />
      <div className="memory-grid">
        {cards.map((card) => {
          const visible = flipped.includes(card.id) || matched.has(card.pairId)
          return (
            <button
              className={`memory-card ${visible ? 'visible' : ''} ${matched.has(card.pairId) ? 'matched' : ''}`}
              type="button"
              key={card.id}
              disabled={matched.has(card.pairId)}
              onClick={() => flipCard(card.id)}
            >
              {visible ? card.label : '?'}
            </button>
          )
        })}
      </div>
      <div className="game-feedback">
        <span>{message}</span>
        {mismatch ? (
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setFlipped([])
              setMessage('Odkryj dwie karty.')
            }}
          >
            Ukryj parę
          </button>
        ) : null}
      </div>
    </article>
  )
}
