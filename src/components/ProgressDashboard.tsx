import { BarChart3, Clock, Target } from 'lucide-react'
import type { VerbEntry } from '../data/schema'
import type { ProgressStats } from '../lib/practice'

interface ProgressDashboardProps {
  stats: ProgressStats
  verbs: VerbEntry[]
  onOpenProgress: () => void
  onStartDueReview: () => void
  onStartMistakeReview: () => void
}

export function ProgressDashboard({ stats, verbs, onOpenProgress, onStartDueReview, onStartMistakeReview }: ProgressDashboardProps) {
  const verbById = new Map(verbs.map((verb) => [verb.id, verb]))

  return (
    <section className="dashboard-card" aria-label="Panel postępu">
      <div className="panel-title">
        <BarChart3 size={18} />
        Postęp
      </div>
      <div className="dashboard-grid">
        <span>
          <strong>{stats.dueCount}</strong>
          do powtórki
        </span>
        <span>
          <strong>{stats.learningCount}</strong>w nauce
        </span>
        <span>
          <strong>{stats.reviewedThisWeek}</strong>w tym tygodniu
        </span>
      </div>
      <div className="dashboard-actions">
        <button className="secondary-button" type="button" disabled={!stats.dueCount} onClick={onStartDueReview}>
          <Clock size={15} />
          Powtórz dziś
        </button>
        <button className="secondary-button" type="button" disabled={!stats.missed.length} onClick={onStartMistakeReview}>
          <Target size={15} />
          Najczęstsze błędy
        </button>
        <button className="secondary-button dashboard-wide-action" type="button" onClick={onOpenProgress}>
          <BarChart3 size={15} />
          Pełny postęp
        </button>
      </div>
      {stats.weakest.length ? (
        <div className="dashboard-list">
          <div className="section-title">Najtrudniejsze</div>
          {stats.weakest.slice(0, 3).map((item) => (
            <span key={item.verbId}>{verbById.get(item.verbId)?.infinitive ?? item.verbId}</span>
          ))}
        </div>
      ) : null}
    </section>
  )
}
