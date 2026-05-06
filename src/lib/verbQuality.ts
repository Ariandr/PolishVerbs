import type { VerbEntry } from '../data/schema'
import { normalizeSearch } from './search'

export interface QualityIssue {
  id: string
  verbId: string
  verbLabel: string
  message: string
}

export interface QualityGroup {
  id: string
  title: string
  issues: QualityIssue[]
}

const hasDuplicate = (values: string[]) => {
  const seen = new Set<string>()
  return values.some((value) => {
    const normalized = normalizeSearch(value.trim())
    if (seen.has(normalized)) {
      return true
    }
    seen.add(normalized)
    return false
  })
}

const hasWeakDefinition = (verb: VerbEntry) => {
  const definition = verb.definitionPl?.replace(/\s+/g, ' ').trim() ?? ''
  return (
    !definition ||
    definition.length < 18 ||
    definition.length > 260 ||
    /[\u0400-\u04FF]/u.test(definition) ||
    /^czasownik\s+|^oznacza\s+|^jest to\s+|^czynno[śs][ćc]\s+polegaj[aą]ca\s+na\s+/i.test(definition)
  )
}

const issue = (groupId: string, verb: VerbEntry, message: string): QualityIssue => ({
  id: `${groupId}-${verb.id}`,
  verbId: verb.id,
  verbLabel: `#${verb.frequencyRank} ${verb.infinitive}`,
  message,
})

export const getQualityGroups = (verbs: VerbEntry[]): QualityGroup[] => {
  const groups: QualityGroup[] = [
    {
      id: 'fallback',
      title: 'Do sprawdzenia',
      issues: verbs
        .filter((verb) => verb.reviewStatus === 'fallback-needs-review')
        .map((verb) => issue('fallback', verb, 'Dane pochodzą z fallbacku i wymagają przeglądu.')),
    },
    {
      id: 'unknown-aspect',
      title: 'Nieznany aspekt',
      issues: verbs
        .filter((verb) => verb.aspect === 'unknown')
        .map((verb) => issue('unknown-aspect', verb, 'Czasownik ma nieznany aspekt.')),
    },
    {
      id: 'missing-pair',
      title: 'Brak pary aspektowej',
      issues: verbs
        .filter((verb) => (verb.aspect === 'imperfective' || verb.aspect === 'perfective') && !verb.aspectPair)
        .map((verb) => issue('missing-pair', verb, 'Czasownik dokonany/niedokonany nie ma uzupełnionej pary aspektowej.')),
    },
    {
      id: 'duplicate-translations',
      title: 'Powtórzone tłumaczenia',
      issues: verbs
        .filter((verb) => hasDuplicate(verb.translations.en) || hasDuplicate(verb.translations.uk))
        .map((verb) => issue('duplicate-translations', verb, 'Lista tłumaczeń zawiera powtórzenia.')),
    },
    {
      id: 'weak-definitions',
      title: 'Słabe definicje po polsku',
      issues: verbs
        .filter(hasWeakDefinition)
        .map((verb) => issue('weak-definitions', verb, 'Definicja po polsku jest pusta, zbyt długa, zbyt krótka albo ma słaby format.')),
    },
    {
      id: 'duplicate-examples',
      title: 'Powtórzone przykłady',
      issues: verbs
        .filter((verb) => {
          const examples = verb.examples.map((example) => `${example.pl} ${example.en} ${example.uk}`)
          return hasDuplicate(examples)
        })
        .map((verb) => issue('duplicate-examples', verb, 'Przykłady zawierają duplikaty.')),
    },
    {
      id: 'empty-metadata',
      title: 'Puste notatki lub źródła',
      issues: verbs
        .filter((verb) => !verb.notes.length || !verb.sourceUrls.length)
        .map((verb) => issue('empty-metadata', verb, 'Brakuje notatek albo źródeł.')),
    },
    {
      id: 'long-text',
      title: 'Podejrzanie długie teksty',
      issues: verbs
        .filter(
          (verb) =>
            [...verb.translations.en, ...verb.translations.uk].some((translation) => translation.length > 60) ||
            verb.examples.some((example) => example.pl.length > 180 || example.en.length > 180 || example.uk.length > 180),
        )
        .map((verb) => issue('long-text', verb, 'Tłumaczenie albo przykład jest bardzo długi.')),
    },
  ]

  return groups.filter((group) => group.issues.length)
}
