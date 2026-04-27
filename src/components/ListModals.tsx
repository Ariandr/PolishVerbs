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
            <div className="section-title">Nowa lista do nauki</div>
            <h2 id="create-list-title">Utwórz listę</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Zamknij" onClick={onClose}>
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
            Nazwa listy
            <input autoFocus value={name} placeholder="Podróże, codzienna powtórka..." onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Anuluj
            </button>
            <button type="submit" className="primary-button" disabled={!name.trim()}>
              Utwórz
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
            <div className="section-title">Dodaj czasownik</div>
            <h2 id="list-picker-title">{verb.infinitive}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Zamknij" onClick={onClose}>
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
                    <small>{list.verbIds.length} czasowników</small>
                  </span>
                </label>
              )
            })}
          </div>
        ) : (
          <div className="modal-empty">Najpierw utwórz listę, a potem dodaj do niej ten czasownik.</div>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCreateList}>
            <ListPlus size={16} />
            Nowa lista
          </button>
          <button type="button" className="primary-button" onClick={onClose}>
            Gotowe
          </button>
        </div>
      </section>
    </div>
  )
}
