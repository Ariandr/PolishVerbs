import { ArrowLeft, Filter, SlidersHorizontal } from 'lucide-react'
import { ProgressTools } from './ProgressTools'

interface ConfigurationPageProps {
  showQuickFilters: boolean
  onBack: () => void
  onToggleQuickFilters: () => void
  onExportProgress: () => void
  onImportProgress: (file: File) => void
}

export function ConfigurationPage({
  showQuickFilters,
  onBack,
  onToggleQuickFilters,
  onExportProgress,
  onImportProgress,
}: ConfigurationPageProps) {
  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <div className="settings-head">
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          Wróć
        </button>
        <div>
          <div className="section-title">Konfiguracja</div>
          <h2 id="settings-title">Ustawienia</h2>
        </div>
      </div>

      <div className="settings-grid">
        <section className="settings-card" aria-labelledby="display-settings-title">
          <div className="settings-card-title">
            <Filter size={18} />
            <h3 id="display-settings-title">Widok filtrów</h3>
          </div>
          <label className="settings-toggle">
            <input type="checkbox" checked={showQuickFilters} onChange={onToggleQuickFilters} />
            <span>
              <strong>Pokaż szybkie tagi filtrów</strong>
              <small>Top 100, W trakcie nauki, Opanowane, Niedokonane, Dokonane i Wyczyść.</small>
            </span>
          </label>
        </section>

        <section className="settings-card" aria-labelledby="progress-settings-title">
          <div className="settings-card-title">
            <SlidersHorizontal size={18} />
            <h3 id="progress-settings-title">Postęp</h3>
          </div>
          <p>Eksportuj albo zaimportuj lokalny postęp nauki, listy i ustawienia motywu.</p>
          <ProgressTools onExport={onExportProgress} onImport={onImportProgress} />
        </section>
      </div>
    </section>
  )
}
