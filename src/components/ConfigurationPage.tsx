import { ArrowLeft, Filter, SlidersHorizontal } from 'lucide-react'
import type { PracticeSettings } from '../lib/storage'
import { ProgressTools } from './ProgressTools'

interface ConfigurationPageProps {
  showQuickFilters: boolean
  practice: PracticeSettings
  onBack: () => void
  onToggleQuickFilters: () => void
  onUpdatePractice: (practice: PracticeSettings) => void
  onExportProgress: () => void
  onImportProgress: (file: File) => void
}

export function ConfigurationPage({
  showQuickFilters,
  practice,
  onBack,
  onToggleQuickFilters,
  onUpdatePractice,
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

        <section className="settings-card" aria-labelledby="practice-settings-title">
          <div className="settings-card-title">
            <SlidersHorizontal size={18} />
            <h3 id="practice-settings-title">Ćwiczenia</h3>
          </div>
          <label className="settings-field">
            <span>Tryb odpowiedzi</span>
            <select value={practice.answerMode} onChange={(event) => onUpdatePractice({ ...practice, answerMode: event.target.value as PracticeSettings['answerMode'] })}>
              <option value="reveal">Fiszki z oceną własną</option>
              <option value="typed">Wpisywanie dokładnej odpowiedzi</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Typ pytań</span>
            <select value={practice.promptMode} onChange={(event) => onUpdatePractice({ ...practice, promptMode: event.target.value as PracticeSettings['promptMode'] })}>
              <option value="mixed">Mieszane</option>
              <option value="meanings">Znaczenie → bezokolicznik</option>
              <option value="infinitives">Bezokolicznik → znaczenie</option>
              <option value="present">Formy teraźniejsze</option>
              <option value="past">Formy przeszłe</option>
              <option value="forms">Wszystkie formy</option>
              <option value="cloze">Luki w przykładach</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Trudność gier</span>
            <select value={practice.gameDifficulty} onChange={(event) => onUpdatePractice({ ...practice, gameDifficulty: event.target.value as PracticeSettings['gameDifficulty'] })}>
              <option value="normal">Normalna</option>
              <option value="hard">Trudniejsza</option>
            </select>
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
