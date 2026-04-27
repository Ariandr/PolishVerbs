import { Download, Upload } from 'lucide-react'
import { useRef } from 'react'

interface ProgressToolsProps {
  onExport: () => void
  onImport: (file: File) => void
}

export function ProgressTools({ onExport, onImport }: ProgressToolsProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <section className="progress-tools" aria-label="Import i eksport postępu">
      <button className="secondary-button" type="button" onClick={onExport}>
        <Download size={15} />
        Eksportuj postęp
      </button>
      <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}>
        <Upload size={15} />
        Importuj postęp
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
