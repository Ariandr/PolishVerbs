import { ListPlus, Pencil, Trash2 } from 'lucide-react'
import type { StudyList } from '../lib/storage'

interface StudyListsProps {
  lists: StudyList[]
  selectedListId: string | null
  onOpenCreateList: () => void
  onRenameList: (listId: string, name: string) => void
  onDeleteList: (listId: string) => void
  onSelectList: (listId: string | null) => void
}

export function StudyLists({
  lists,
  selectedListId,
  onOpenCreateList,
  onRenameList,
  onDeleteList,
  onSelectList,
}: StudyListsProps) {
  return (
    <section className="lists-panel" aria-label="Własne listy do nauki">
      <div className="panel-title">
        <ListPlus size={18} />
        Listy do nauki
      </div>

      <div className="list-select-row">
        <select value={selectedListId ?? ''} onChange={(event) => onSelectList(event.target.value || null)}>
          <option value="">Wszystkie czasowniki</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name} ({list.verbIds.length})
            </option>
          ))}
        </select>
        <button
          className="icon-button"
          type="button"
          title="Utwórz listę"
          aria-label="Utwórz listę"
          onClick={onOpenCreateList}
        >
          <ListPlus size={17} />
        </button>
      </div>

      {selectedListId ? (
        <div className="list-tools">
          <button
            type="button"
            onClick={() => {
              const active = lists.find((list) => list.id === selectedListId)
              const name = window.prompt('Zmień nazwę listy', active?.name)
              if (name?.trim()) {
                onRenameList(selectedListId, name)
              }
            }}
          >
            <Pencil size={15} />
            Zmień nazwę
          </button>
          <button type="button" className="danger" onClick={() => onDeleteList(selectedListId)}>
            <Trash2 size={15} />
            Usuń
          </button>
        </div>
      ) : null}
    </section>
  )
}
