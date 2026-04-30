import { ArrowLeft, Filter, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { PracticeSettings, StudyList } from '../lib/storage'
import { ListTransferTools } from './ListTransferTools'
import { ProgressTools } from './ProgressTools'

interface ConfigurationPageProps {
  showQuickFilters: boolean
  practice: PracticeSettings
  lists: StudyList[]
  selectedListId: string | null
  onBack: () => void
  onToggleQuickFilters: () => void
  onUpdatePractice: (practice: PracticeSettings) => void
  onExportProgress: () => void
  onImportProgress: (file: File) => void
  onExportList: (listId: string) => void
  onImportList: (file: File) => void
}

export function ConfigurationPage({
  showQuickFilters,
  practice,
  lists,
  selectedListId,
  onBack,
  onToggleQuickFilters,
  onUpdatePractice,
  onExportProgress,
  onImportProgress,
  onExportList,
  onImportList,
}: ConfigurationPageProps) {
  const defaultExportListId = selectedListId ?? lists[0]?.id ?? ''
  const [exportListId, setExportListId] = useState(defaultExportListId)
  const safeExportListId = lists.some((list) => list.id === exportListId) ? exportListId : defaultExportListId
  const exportList = useMemo(
    () => lists.find((list) => list.id === safeExportListId),
    [safeExportListId, lists],
  )

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
          <label className="settings-field">
            <span>Tryb odpowiedzi w grach</span>
            <select value={practice.gameAnswerMode} onChange={(event) => onUpdatePractice({ ...practice, gameAnswerMode: event.target.value as PracticeSettings['gameAnswerMode'] })}>
              <option value="choice">Wybór odpowiedzi</option>
              <option value="typed">Wpisywanie tam, gdzie pasuje</option>
            </select>
          </label>
        </section>

        <section className="settings-card" aria-labelledby="list-transfer-title">
          <div className="settings-card-title">
            <SlidersHorizontal size={18} />
            <h3 id="list-transfer-title">Listy dla uczniów</h3>
          </div>
          <p>Eksportuj albo zaimportuj samą listę czasowników. Nie zmienia to postępu, motywu ani ustawień.</p>
          <label className="settings-field">
            <span>Lista do eksportu</span>
            <select value={safeExportListId} disabled={!lists.length} onChange={(event) => setExportListId(event.target.value)}>
              {lists.length ? null : <option value="">Brak własnych list</option>}
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.verbIds.length})
                </option>
              ))}
            </select>
          </label>
          <ListTransferTools
            canExport={Boolean(exportList)}
            onExport={() => {
              if (exportList) {
                onExportList(exportList.id)
              }
            }}
            onImport={onImportList}
          />
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
