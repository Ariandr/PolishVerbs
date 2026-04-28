import { ArrowLeft, BarChart3, Clock, Target, Trophy } from 'lucide-react'
import type { VerbEntry } from '../data/schema'
import type { ProgressStats } from '../lib/practice'

interface ProgressPageProps {
  stats: ProgressStats
  verbs: VerbEntry[]
  onBack: () => void
  onStartDueReview: () => void
  onStartOverdueReview: () => void
  onStartMistakeReview: () => void
  onStartMissedForms: () => void
  onSelectVerb: (verbId: string) => void
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))

export function ProgressPage({
  stats,
  verbs,
  onBack,
  onStartDueReview,
  onStartOverdueReview,
  onStartMistakeReview,
  onStartMissedForms,
  onSelectVerb,
}: ProgressPageProps) {
  const verbById = new Map(verbs.map((verb) => [verb.id, verb]))
  const metricItems = [
    ['Nowe', stats.newCount],
    ['W nauce', stats.learningCount],
    ['Opanowane', stats.learnedCount],
    ['Dziś', stats.dueCount],
    ['Zaległe', stats.overdueCount],
    ['Ten tydzień', stats.reviewedThisWeek],
  ] as const

  const renderVerbList = (items: Array<{ verbId: string; score?: number; count?: number }>, empty: string) =>
    items.length ? (
      <div className="progress-list">
        {items.map((item) => {
          const verb = verbById.get(item.verbId)
          return (
            <button type="button" key={`${item.verbId}-${item.score ?? item.count ?? ''}`} onClick={() => onSelectVerb(item.verbId)}>
              <span>{verb?.infinitive ?? item.verbId}</span>
              <small>{item.count !== undefined ? `${item.count} bł.` : `${item.score} pkt`}</small>
            </button>
          )
        })}
      </div>
    ) : (
      <p className="muted-copy">{empty}</p>
    )

  return (
    <section className="progress-page" aria-labelledby="progress-title">
      <div className="settings-head">
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          Wróć
        </button>
        <div>
          <div className="section-title">Postęp</div>
          <h2 id="progress-title">Panel nauki</h2>
        </div>
      </div>

      <div className="progress-metrics">
        {metricItems.map(([label, value]) => (
          <span key={label}>
            <strong>{value}</strong>
            {label}
          </span>
        ))}
      </div>

      <section className="progress-actions-card" aria-label="Szybka praktyka">
        <div className="settings-card-title">
          <Clock size={18} />
          <h3>Powtórki</h3>
        </div>
        <div className="progress-action-grid">
          <button className="primary-button" type="button" disabled={!stats.dueCount} onClick={onStartDueReview}>
            Powtórz dziś
          </button>
          <button className="secondary-button" type="button" disabled={!stats.overdueCount} onClick={onStartOverdueReview}>
            Zaległe
          </button>
          <button className="secondary-button" type="button" disabled={!stats.missedVerbs.length} onClick={onStartMistakeReview}>
            Najczęstsze błędy
          </button>
          <button className="secondary-button" type="button" disabled={!stats.missedForms.length} onClick={onStartMissedForms}>
            Najczęściej mylone formy
          </button>
        </div>
      </section>

      <div className="progress-grid">
        <section className="settings-card">
          <div className="settings-card-title">
            <Target size={18} />
            <h3>Najczęstsze błędy</h3>
          </div>
          {renderVerbList(stats.missedVerbs.slice(0, 8), 'Brak zapisanych błędów.')}
        </section>

        <section className="settings-card">
          <div className="settings-card-title">
            <Trophy size={18} />
            <h3>Najmocniejsze</h3>
          </div>
          {renderVerbList(stats.strongest.slice(0, 8), 'Jeszcze brak dodatnich wyników.')}
        </section>

        <section className="settings-card">
          <div className="settings-card-title">
            <BarChart3 size={18} />
            <h3>Najtrudniejsze</h3>
          </div>
          {renderVerbList(stats.weakest.slice(0, 8), 'Jeszcze brak trudnych czasowników.')}
        </section>

        <section className="settings-card">
          <div className="settings-card-title">
            <Target size={18} />
            <h3>Najczęściej mylone formy</h3>
          </div>
          {stats.missedForms.length ? (
            <div className="progress-list">
              {stats.missedForms.slice(0, 8).map((item) => (
                <button type="button" key={`${item.verbId}-${item.expected}-${item.formLabel ?? ''}`} onClick={() => onSelectVerb(item.verbId)}>
                  <span>{verbById.get(item.verbId)?.infinitive ?? item.verbId}</span>
                  <small>
                    {item.formLabel ?? item.expected} · {item.count} bł.
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted-copy">Brak mylonych form.</p>
          )}
        </section>
      </div>

      <section className="settings-card progress-history">
        <div className="settings-card-title">
          <Clock size={18} />
          <h3>Ostatnie pomyłki</h3>
        </div>
        {stats.recentMistakes.length ? (
          <div className="mistake-history">
            {stats.recentMistakes.map((mistake) => (
              <button type="button" key={`${mistake.verbId}-${mistake.id}`} onClick={() => onSelectVerb(mistake.verbId)}>
                <strong>{verbById.get(mistake.verbId)?.infinitive ?? mistake.verbId}</strong>
                <span>{mistake.prompt ?? mistake.formLabel ?? mistake.promptType}</span>
                <small>
                  Oczekiwano: {mistake.expected} · wpisano: {mistake.given || '—'} · {formatDateTime(mistake.createdAt)}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted-copy">Brak historii pomyłek.</p>
        )}
      </section>
    </section>
  )
}
