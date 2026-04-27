import { Bug, X } from 'lucide-react'
import type { VerbEntry } from '../data/schema'
import { getQualityGroups } from '../lib/verbQuality'

interface QualityPanelProps {
  verbs: VerbEntry[]
  onClose: () => void
  onSelectVerb: (verbId: string) => void
}

export function QualityPanel({ verbs, onClose, onSelectVerb }: QualityPanelProps) {
  const groups = getQualityGroups(verbs)
  const totalIssues = groups.reduce((sum, group) => sum + group.issues.length, 0)

  return (
    <section className="qa-panel" aria-label="Panel kontroli danych">
      <div className="qa-head">
        <div>
          <div className="section-title">QA danych</div>
          <h2>Kontrola czasowników</h2>
          <p>{totalIssues} sygnałów do sprawdzenia</p>
        </div>
        <button className="icon-button" type="button" aria-label="Zamknij panel QA" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {!groups.length ? (
        <div className="modal-empty">Nie znaleziono problemów według obecnych reguł QA.</div>
      ) : (
        <div className="qa-groups">
          {groups.map((group) => (
            <details className="qa-group" key={group.id} open={group.id === groups[0].id}>
              <summary>
                <span>{group.title}</span>
                <strong>{group.issues.length}</strong>
              </summary>
              <div className="qa-issues">
                {group.issues.slice(0, 80).map((issue) => (
                  <button className="qa-issue" type="button" key={issue.id} onClick={() => onSelectVerb(issue.verbId)}>
                    <span>
                      <Bug size={14} />
                      {issue.verbLabel}
                    </span>
                    <small>{issue.message}</small>
                  </button>
                ))}
                {group.issues.length > 80 ? <p className="qa-more">Pokazano pierwsze 80 z {group.issues.length}.</p> : null}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  )
}
