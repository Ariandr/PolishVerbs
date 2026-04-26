# PolishVerbs

A personal PWA for studying 600 high-frequency Polish verbs with English and Ukrainian translations, frequency ranking, present/non-past forms, past tense forms, examples, learned progress, search, filters, and custom study lists.

## Data

Verb order comes from the KWJP frequency list for Polish infinitive lemmas. The generator enriches each verb with Wiktionary forms/translations where available and flags records that need later manual review.

Data lives in `src/data/verbs/` as six JSON files:

- `001-100.json`
- `101-200.json`
- `201-300.json`
- `301-400.json`
- `401-500.json`
- `501-600.json`

The schema is defined in `src/data/schema.ts`.

## Commands

```bash
npm install
npm run dev
npm run validate:verbs
npm run build
```

Refresh the generated verb dataset:

```bash
npm run generate:verbs
```

## GitHub Pages

The Vite base path is `/PolishVerbs/`. Push this repo to GitHub as `PolishVerbs`, enable GitHub Pages with GitHub Actions as the source, and the workflow in `.github/workflows/deploy.yml` will publish `dist/`.
