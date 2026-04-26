import { ListPlus, X } from 'lucide-react'
import { useState } from 'react'
import type { VerbEntry } from '../data/schema'
import type { StudyList } from '../lib/storage'

interface CreateListModalProps {
  onClose: () => void
  onCreate: (name: string) => void
}

interface ListPickerModalProps {
  lists: StudyList[]
  verb: VerbEntry
  onClose: () => void
  onCreateList: () => void
  onToggleList: (listId: string) => void
}

export function CreateListModal({ onClose, onCreate }: CreateListModalProps) {
  const [name, setName] = useState('')

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="create-list-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="section-title">New study list</div>
            <h2 id="create-list-title">Create list</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form
          className="modal-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (name.trim()) {
              onCreate(name)
            }
          }}
        >
          <label>
            List name
            <input autoFocus value={name} placeholder="Travel verbs, daily review..." onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={!name.trim()}>
              Create
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export function ListPickerModal({ lists, verb, onClose, onCreateList, onToggleList }: ListPickerModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="list-picker-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="section-title">Add verb</div>
            <h2 id="list-picker-title">{verb.infinitive}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {lists.length ? (
          <div className="list-picker">
            {lists.map((list) => {
              const checked = list.verbIds.includes(verb.id)
              return (
                <label className="picker-row" key={list.id}>
                  <input type="checkbox" checked={checked} onChange={() => onToggleList(list.id)} />
                  <span>
                    <strong>{list.name}</strong>
                    <small>{list.verbIds.length} verbs</small>
                  </span>
                </label>
              )
            })}
          </div>
        ) : (
          <div className="modal-empty">Create a list first, then add this verb to it.</div>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCreateList}>
            <ListPlus size={16} />
            New list
          </button>
          <button type="button" className="primary-button" onClick={onClose}>
            Done
          </button>
        </div>
      </section>
    </div>
  )
}
