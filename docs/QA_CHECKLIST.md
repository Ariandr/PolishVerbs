# PolishVerbs QA Checklist

Use this checklist for manual or automated regression passes at `http://127.0.0.1:5175/PolishVerbs/`.

## 1. Startup And Layout
- App loads without console errors.
- Desktop header shows theme, settings, progress, and games controls.
- Desktop search/filter controls stay usable and the verb list starts directly below the main controls.
- Full Progress content is opened from the header Postep button, not shown as a large sidebar card.
- Mobile search remains pinned near the top, secondary controls stack cleanly, and there is one normal page scroll.

## 2. Theme And Settings
- Theme toggle switches light/dark and persists after reload.
- Settings page opens and returns to the main app.
- Quick filter tags can be disabled and re-enabled; full selects remain available.
- Practice settings persist after reload.
- Export/import controls are visible only in Settings.

## 3. Search, Filters, And Lists
- Search by infinitive, English, Ukrainian, and conjugated form returns expected rows.
- Search highlights appear in rows and practical detail fields.
- Progress filters `Nowe`, `W trakcie nauki`, `Opanowane`, `Do powtorki`, and `Zalegle` match progress state.
- Aspect and rank filters update counts and selected rows.
- Quick chips update the same state as selects and `Wyczysc` resets filters.
- Study list selector switches visible verbs.
- `Zapisz widok` creates a list from the current visible set.
- Add/remove list actions work from desktop rows and mobile detail actions.

## 4. Detail Navigation
- Direct `?verb=<id>` loads the requested verb.
- Invalid `?verb=` falls back safely.
- Selecting a row updates the URL without clearing filters.
- Previous/next buttons move within the visible result set.
- Mobile row tap opens detail; browser Back returns to the list and preserves scroll position.

## 5. Study Mode
- `Start nauki` uses up to 20 shuffled visible verbs.
- Reveal/self-grade mode records `Know` as learned and `Review` as learning.
- Typed mode shows an input, checks exact Polish spelling including diacritics, and records mistakes.
- Due review starts only due verbs.
- Detail actions `Cwicz czasownik`, `Formy`, and `Przyklad` open focused practice.
- Cloze/example practice hides a detectable form or falls back to typed infinitive practice.

## 6. Progress Page
- Header Postep button opens the full Progress page.
- Counts for new, learning, learned, due today, overdue, and reviewed this week match current storage.
- Strongest, weakest, often missed verbs, missed forms, and recent mistakes render with useful labels.
- `Powtorz dzis`, `Zalegle`, `Najczestsze bledy`, and `Najczesciej mylone formy` open typed practice.

## 7. Games Module
- Games page opens from the header and returns without changing main filters or selected verb.
- Game source controls support current view, all verbs, saved list, and inclusive rank slices.
- Source count updates immediately; invalid rank ranges disable game starts with an inline error.
- Answer mode can switch between choice and typed for supported games.
- Difficulty normal/hard changes distractor quality without breaking small sources.
- Each game shows score/progress, restart, and clear insufficient-data states.

### Game Coverage
- Szybki test: correct and incorrect choice answers; typed mode grades exact input.
- Dopasuj znaczenie: correct and incorrect pair attempts are recorded.
- Sortowanie aspektu: all buckets accept tapped verbs and finish cleanly.
- Kolo odmiany: choice options prefer forms from the same infinitive.
- Kolo odmiany typed regression: submit an answer, confirm the displayed prompt does not change before feedback, click `Nastepne`, and confirm the input is cleared. Rapid Enter after feedback must not submit stale text into the next prompt.
- Odkryj karty: cards stay solved/wrong after answering; typed mode grades the active card only.
- Anagram bezokolicznika: letter taps assemble, clear, check, and advance correctly.
- Pary pamieciowe: both correct and incorrect attempts update score/progress.
- Brakujaca forma: choice and typed modes grade current prompt and advance cleanly.

## 8. Import/Export And Persistence
- Export downloads valid JSON with app name, schema version, progress, theme, and app settings.
- Import validates schema, merges progress/lists, and reports success or error.
- Existing storage with only `learnedVerbIds` still loads learned progress.
- New fields for due dates, mistake metadata, and game answer mode survive reload/export/import.

## 9. Hidden QA Panel
- `?qa=1` enables the QA entry.
- QA panel reports data issue groups and counts.
- Clicking an issue selects the affected verb via the same URL navigation.
- Closing QA does not affect progress or list data.

## 10. Console And Accessibility Basics
- No uncaught exceptions or React warnings during major flows.
- Buttons have accessible names or visible labels.
- Keyboard focus remains usable in rendered rows, dialogs, study mode, and typed games.
- Disabled controls explain insufficient data or unavailable pronunciation where practical.
