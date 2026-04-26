import type { PastForms, PresentForms, VerbEntry } from '../data/schema'

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

export function PresentTable({ forms }: { forms: PresentForms }) {
  return (
    <table className="forms-table">
      <tbody>
        {presentRows.map(([label, key]) => (
          <tr key={label}>
            <th>{label}</th>
            <td>{key === 'on' ? forms.on : key === 'oni' ? forms.oni : forms[key]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PastTable({ forms }: { forms: PastForms }) {
  return (
    <table className="forms-table past-table">
      <tbody>
        {pastRows.map(([label, getValue]) => (
          <tr key={label}>
            <th>{label}</th>
            <td>{getValue(forms)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function VerbDetail({ verb }: { verb: VerbEntry }) {
  const example = verb.examples[0]

  return (
    <article className="detail-panel">
      <div className="detail-head">
        <div>
          <div className="rank-line">#{verb.frequencyRank} by verb frequency</div>
          <h2>{verb.infinitive}</h2>
          <p>
            {verb.translations.uk.join(', ')} · {verb.translations.en.join(', ')}
          </p>
        </div>
        <div className="metric-stack" aria-label="Frequency data">
          <span>{verb.frequency.ipm.toFixed(2)} IPM</span>
          <span>KWJP rank {verb.corpusRank}</span>
        </div>
      </div>

      <section className="detail-section">
        <div className="section-title">Forms</div>
        <PresentTable forms={verb.forms.present} />
      </section>

      <section className="example-box">
        <div className="section-title">Przykład</div>
        <p className="example-pl">{example.pl}</p>
        <p>{example.uk}</p>
        <p>{example.en}</p>
      </section>

      <section className="detail-section">
        <div className="section-title">Past tense</div>
        <PastTable forms={verb.forms.past} />
      </section>

      <section className="notes-row">
        <span>{verb.aspect}</span>
        <span>{verb.reviewStatus === 'wiktionary-enriched' ? 'Wiktionary enriched' : 'Needs review'}</span>
        {verb.notes.map((note) => (
          <span key={note}>{note}</span>
        ))}
      </section>
    </article>
  )
}
