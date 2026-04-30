# PolishVerbs

PolishVerbs is a local-first PWA for studying 5000 high-frequency Polish verbs. It includes English and Ukrainian meanings, frequency ranking, aspect metadata, present/non-past forms, past tense forms, examples, search, filters, custom study lists, study mode, games, progress tracking, import/export, and a hidden data QA panel.

The app stores learner progress only in the browser's localStorage. There is no backend and no account system.

## Features

- Search by Polish infinitive, forms, English meanings, or Ukrainian meanings.
- Filter by progress, aspect, frequency range, and custom study list.
- URL-addressable verb details with previous/next navigation.
- Self-graded and typed study modes with simple due-review scheduling.
- Word games for quiz, matching, sorting, wheel, open cards, anagram, memory pairs, and missing forms.
- Custom lists, including list-only import/export for teachers and learners.
- Full progress import/export for a learner's own local backup.
- PWA support through a service worker.
- Local data QA tools available with `?qa=1`.

## Data

Verb order is based on KWJP frequency lists for Polish infinitive lemmas. Verb forms and lexical metadata are enriched from Wiktionary where available, with project-specific cleanup, generated examples, translations, and validation.

Data lives in `src/data/verbs/` as 100-verb JSON chunks:

- `001-100.json`
- `101-200.json`
- `201-300.json`
- ...
- `4901-5000.json`

The schema is defined in `src/data/schema.ts`.

See `ATTRIBUTION.md` and `LICENSE` before reusing or redistributing the dataset.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run validate:verbs
npm run audit:verbs
npm run build
```

Refresh the generated verb dataset:

```bash
npm run generate:verbs
```

Some repair/enrichment scripts use external services and expect environment variables such as `GEMINI_API_KEY`. Do not commit `.env` files; they are ignored by `.gitignore`.

## GitHub Pages

The Vite base path is `/PolishVerbs/`. Push this repo to GitHub as `PolishVerbs`, enable GitHub Pages with GitHub Actions as the source, and the workflow in `.github/workflows/deploy.yml` will publish `dist/`.

## Security Notes

- The browser app does not contain API keys.
- Model/API credentials are read only from local environment variables by maintenance scripts.
- Learner progress remains in localStorage unless the user manually exports or imports JSON.
