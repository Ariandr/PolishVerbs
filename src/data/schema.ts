export type PronounKey = 'ja' | 'ty' | 'on' | 'ona' | 'my' | 'wy' | 'oni' | 'one'

export type Aspect = 'imperfective' | 'perfective' | 'biaspectual' | 'unknown'

export type PresentForms = Record<PronounKey, string>

export interface PastForms {
  ja: {
    masculine: string
    feminine: string
  }
  ty: {
    masculine: string
    feminine: string
  }
  on: {
    masculine: string
  }
  ona: {
    feminine: string
  }
  my: {
    virile: string
    nonvirile: string
  }
  wy: {
    virile: string
    nonvirile: string
  }
  oni: {
    virile: string
  }
  one: {
    nonvirile: string
  }
}

export interface VerbExample {
  pl: string
  en: string
  uk: string
}

export interface VerbEntry {
  id: string
  infinitive: string
  frequencyRank: number
  corpusRank: number
  frequencySource: string
  frequency: {
    absolute: number
    ipm: number
    arf: number
  }
  translations: {
    en: string[]
    uk: string[]
  }
  definitionPl: string
  aspect: Aspect
  aspectPair?: string
  forms: {
    present: PresentForms
    past: PastForms
  }
  examples: VerbExample[]
  notes: string[]
  sourceUrls: string[]
  reviewStatus: 'wiktionary-enriched' | 'fallback-needs-review'
}
