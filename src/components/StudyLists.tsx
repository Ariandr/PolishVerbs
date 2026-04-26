import { ListPlus, Pencil, Trash2 } from 'lucide-react'
import type { StudyList } from '../lib/storage'

interface StudyListsProps {
  lists: StudyList[]
  selectedListId: string | null
  onCreateList: (name: string) => void
  onRenameList: (listId: string, name: string) => void
  onDeleteList: (listId: string) => void
  onSelectList: (listId: string | null) => void
}

export function StudyLists({
  lists,
  selectedListId,
  onCreateList,
  onRenameList,
  onDeleteList,
  onSelectList,
}: StudyListsProps) {
  return (
    <section className="lists-panel" aria-label="Custom study lists">
      <div className="panel-title">
        <ListPlus size={18} />
        Study lists
      </div>

      <div className="list-select-row">
        <select value={selectedListId ?? ''} onChange={(event) => onSelectList(event.target.value || null)}>
          <option value="">All verbs</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name} ({list.verbIds.length})
            </option>
          ))}
        </select>
        <button
          className="icon-button"
          type="button"
          title="Create list"
          aria-label="Create list"
          onClick={() => {
            const name = window.prompt('List name')
            if (name?.trim()) {
              onCreateList(name)
            }
          }}
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
              const name = window.prompt('Rename list', active?.name)
              if (name?.trim()) {
                onRenameList(selectedListId, name)
              }
            }}
          >
            <Pencil size={15} />
            Rename
          </button>
          <button type="button" className="danger" onClick={() => onDeleteList(selectedListId)}>
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      ) : null}
    </section>
  )
}
