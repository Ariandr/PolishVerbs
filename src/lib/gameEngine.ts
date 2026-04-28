import type { Aspect, PastForms, PronounKey, VerbEntry } from '../data/schema'

export type GameId =
  | 'quick-test'
  | 'meaning-match'
  | 'aspect-sort'
  | 'conjugation-wheel'
  | 'open-cards'
  | 'infinitive-anagram'
  | 'memory-pairs'
  | 'missing-form'

export interface ChoiceQuestion {
  id: string
  prompt: string
  detail: string
  answer: string
  options: string[]
  verb: VerbEntry
}

export interface FormChallenge {
  id: string
  verb: VerbEntry
  label: string
  answer: string
}

const sessionQuestionCount = 10
const pairCount = 8
const memoryPairCount = 6

const presentLabels: Array<[PronounKey, string]> = [
  ['ja', 'ja'],
  ['ty', 'ty'],
  ['on', 'on / ona'],
  ['my', 'my'],
  ['wy', 'wy'],
  ['oni', 'oni / one'],
]

const pastAccessors: Array<[string, (forms: PastForms) => string]> = [
  ['ja - on', (forms) => forms.ja.masculine],
  ['ja - ona', (forms) => forms.ja.feminine],
  ['ty - on', (forms) => forms.ty.masculine],
  ['ty - ona', (forms) => forms.ty.feminine],
  ['on', (forms) => forms.on.masculine],
  ['ona', (forms) => forms.ona.feminine],
  ['my - oni', (forms) => forms.my.virile],
  ['my - one', (forms) => forms.my.nonvirile],
  ['wy - oni', (forms) => forms.wy.virile],
  ['wy - one', (forms) => forms.wy.nonvirile],
  ['oni', (forms) => forms.oni.virile],
  ['one', (forms) => forms.one.nonvirile],
]

export const aspectBucketLabels: Record<Aspect, string> = {
  imperfective: 'Niedokonane',
  perfective: 'Dokonane',
  biaspectual: 'Dwuaspektowe',
  unknown: 'Nieznane',
}

export const aspectBuckets: Aspect[] = ['imperfective', 'perfective', 'biaspectual', 'unknown']

export function shuffleItems<T>(items: T[]): T[] {
  return [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .map(({ item }) => item)
}

export function sampleItems<T>(items: T[], limit: number): T[] {
  return shuffleItems(items).slice(0, limit)
}

export function getPrimaryMeaning(verb: VerbEntry): string {
  const en = verb.translations.en.slice(0, 2).join(', ')
  const uk = verb.translations.uk.slice(0, 2).join(', ')
  return [en, uk].filter(Boolean).join(' / ')
}

export function buildMeaningPairs(verbs: VerbEntry[]) {
  return sampleItems(verbs, Math.min(pairCount, verbs.length)).map((verb) => ({
    id: verb.id,
    polish: verb.infinitive,
    meaning: getPrimaryMeaning(verb),
  }))
}

export function buildAspectItems(verbs: VerbEntry[]) {
  return sampleItems(verbs, Math.min(sessionQuestionCount, verbs.length)).map((verb) => ({
    id: verb.id,
    label: verb.infinitive,
    aspect: verb.aspect,
    meaning: getPrimaryMeaning(verb),
  }))
}

export function buildMemoryCards(verbs: VerbEntry[]) {
  const pairs = sampleItems(verbs, Math.min(memoryPairCount, verbs.length)).map((verb) => ({
    pairId: verb.id,
    polish: verb.infinitive,
    meaning: getPrimaryMeaning(verb),
  }))
  return shuffleItems(
    pairs.flatMap((pair) => [
      { id: `${pair.pairId}-pl`, pairId: pair.pairId, label: pair.polish, kind: 'pl' as const },
      { id: `${pair.pairId}-meaning`, pairId: pair.pairId, label: pair.meaning, kind: 'meaning' as const },
    ]),
  )
}

export function getAllFormChallenges(verbs: VerbEntry[]): FormChallenge[] {
  return verbs.flatMap((verb) => [
    ...presentLabels.map(([key, label]) => ({
      id: `${verb.id}-present-${key}`,
      verb,
      label: `czas teraźniejszy, ${label}`,
      answer: verb.forms.present[key],
    })),
    ...pastAccessors.map(([label, getValue], index) => ({
      id: `${verb.id}-past-${index}`,
      verb,
      label: `czas przeszły, ${label}`,
      answer: getValue(verb.forms.past),
    })),
  ])
}

export function createOptions(answer: string, candidates: string[], count = 4): string[] {
  const uniqueCandidates = [...new Set(candidates.filter((candidate) => candidate && candidate !== answer))]
  const distractors = sampleItems(uniqueCandidates, count - 1)
  if (distractors.length < count - 1) {
    return []
  }
  return shuffleItems([answer, ...distractors])
}

export function buildQuickQuestions(verbs: VerbEntry[]): ChoiceQuestion[] {
  if (verbs.length < 4) {
    return []
  }

  const infinitives = verbs.map((verb) => verb.infinitive)
  return sampleItems(verbs, Math.min(sessionQuestionCount, verbs.length))
    .map((verb) => {
      const prompt = getPrimaryMeaning(verb)
      const options = createOptions(verb.infinitive, infinitives)
      if (!options.length) {
        return null
      }
      return {
        id: `quick-${verb.id}`,
        prompt,
        detail: 'Wybierz polski bezokolicznik.',
        answer: verb.infinitive,
        options,
        verb,
      }
    })
    .filter((question): question is ChoiceQuestion => Boolean(question))
}

export function buildOpenCardQuestions(verbs: VerbEntry[]): ChoiceQuestion[] {
  return buildQuickQuestions(verbs).map((question) => ({
    ...question,
    id: `open-${question.verb.id}`,
    detail: `Karta #${question.verb.frequencyRank}. Wybierz polski czasownik.`,
  }))
}

export function buildFormQuestions(verbs: VerbEntry[], mode: 'wheel' | 'missing'): ChoiceQuestion[] {
  const challenges = getAllFormChallenges(verbs).filter((challenge) => challenge.answer)
  const formCandidates = challenges.map((challenge) => challenge.answer)
  return sampleItems(challenges, Math.min(sessionQuestionCount, challenges.length))
    .map((challenge) => {
      const options = createOptions(challenge.answer, formCandidates)
      if (!options.length) {
        return null
      }
      return {
        id: `${mode}-${challenge.id}`,
        prompt: challenge.verb.infinitive,
        detail:
          mode === 'wheel'
            ? `Wylosowano: ${challenge.label}.`
            : `Uzupełnij formę: ${challenge.label}.`,
        answer: challenge.answer,
        options,
        verb: challenge.verb,
      }
    })
    .filter((question): question is ChoiceQuestion => Boolean(question))
}

export function buildAnagramQuestions(verbs: VerbEntry[]) {
  return sampleItems(
    verbs.filter((verb) => verb.infinitive.length >= 4),
    Math.min(sessionQuestionCount, verbs.length),
  ).map((verb) => {
    const letters = verb.infinitive.split('').map((letter, index) => ({ id: `${verb.id}-${index}`, letter }))
    let shuffled = shuffleItems(letters)
    if (shuffled.map((tile) => tile.letter).join('') === verb.infinitive) {
      shuffled = [...shuffled].reverse()
    }
    return {
      id: `anagram-${verb.id}`,
      verb,
      answer: verb.infinitive,
      letters: shuffled,
      meaning: getPrimaryMeaning(verb),
    }
  })
}

export function formatScore(correct: number, attempts: number) {
  if (!attempts) {
    return '0 / 0'
  }
  return `${correct} / ${attempts}`
}
