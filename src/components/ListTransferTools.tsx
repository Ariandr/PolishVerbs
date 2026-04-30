import { Download, Upload } from 'lucide-react'
import { useRef } from 'react'

interface ListTransferToolsProps {
  canExport: boolean
  onExport: () => void
  onImport: (file: File) => void
}

export function ListTransferTools({ canExport, onExport, onImport }: ListTransferToolsProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <section className="progress-tools" aria-label="Import i eksport listy czasowników">
      <button className="secondary-button" type="button" disabled={!canExport} onClick={onExport}>
        <Download size={15} />
        Eksportuj listę
      </button>
      <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}>
        <Upload size={15} />
        Importuj listę
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) {
            onImport(file)
          }
        }}
      />
    </section>
  )
}
