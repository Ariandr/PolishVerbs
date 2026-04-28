import type { VerbEntry } from '../data/schema'
import {
  createVerbStudyProgress,
  type PracticeMistake,
  type PracticePromptMode,
  type PracticePromptType,
  type StudyProgress,
  type VerbStudyProgress,
} from './storage'

export interface PracticePrompt {
  id: string
  verb: VerbEntry
  type: PracticePromptType
  prompt: string
  detail: string
  answer: string
  displayAnswer?: string
  formLabel?: string
}

export interface PracticeAnswerEvent {
  verbId: string
  correct: boolean
  promptType: PracticePromptType
  expected: string
  given: string
  prompt?: string
  detail?: string
  formLabel?: string
  promptId?: string
}

export interface ProgressStats {
  newCount: number
  learningCount: number
  learnedCount: number
  dueCount: number
  overdueCount: number
  reviewedThisWeek: number
  strongest: Array<{ verbId: string; score: number }>
  weakest: Array<{ verbId: string; score: number }>
  missed: Array<{ verbId: string; count: number }>
  missedVerbs: Array<{ verbId: string; count: number }>
  missedForms: Array<{ verbId: string; count: number; expected: string; promptType: PracticePromptType; formLabel?: string; prompt?: string; detail?: string; promptId?: string }>
  recentMistakes: Array<PracticeMistake & { verbId: string }>
}

const intervalsInDays = [0, 1, 3, 7, 14, 30]

const normalizeTypedAnswer = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl-PL')

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function checkTypedAnswer(given: string, expected: string) {
  return normalizeTypedAnswer(given) === normalizeTypedAnswer(expected)
}

export function isDue(progress: VerbStudyProgress | undefined, now = new Date()) {
  if (!progress?.dueAt) {
    return false
  }
  return new Date(progress.dueAt).getTime() <= now.getTime()
}

export function isOverdue(progress: VerbStudyProgress | undefined, now = new Date()) {
  if (!progress?.dueAt) {
    return false
  }
  const due = new Date(progress.dueAt)
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  return due.getTime() < startOfToday.getTime()
}

export function gradeVerbProgress(
  current: VerbStudyProgress | undefined,
  event: PracticeAnswerEvent,
  now = new Date(),
): VerbStudyProgress {
  const base = current ?? createVerbStudyProgress('new')
  const nextIntervalLevel = event.correct ? Math.min(base.intervalLevel + 1, intervalsInDays.length) : 0
  const dueDays = event.correct ? intervalsInDays[Math.max(0, nextIntervalLevel - 1)] : 0
  const dueAt = addDays(now, dueDays).toISOString()
  const mistake: PracticeMistake | null = event.correct
    ? null
    : {
        id: `mistake-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        promptType: event.promptType,
        expected: event.expected,
        given: event.given,
        createdAt: now.toISOString(),
        prompt: event.prompt,
        detail: event.detail,
        formLabel: event.formLabel,
        promptId: event.promptId,
      }

  return {
    ...base,
    status: event.correct && nextIntervalLevel >= 2 ? 'learned' : 'learning',
    reviewCount: base.reviewCount + 1,
    knowCount: base.knowCount + (event.correct ? 1 : 0),
    reviewAgainCount: base.reviewAgainCount + (event.correct ? 0 : 1),
    lastReviewedAt: now.toISOString(),
    dueAt,
    intervalLevel: nextIntervalLevel,
    correctCount: base.correctCount + (event.correct ? 1 : 0),
    incorrectCount: base.incorrectCount + (event.correct ? 0 : 1),
    lastMistakes: mistake ? [...base.lastMistakes, mistake].slice(-8) : base.lastMistakes,
  }
}

export function applyPracticeAnswer(progress: StudyProgress, event: PracticeAnswerEvent): StudyProgress {
  const nextVerbProgress = {
    ...progress.verbProgress,
    [event.verbId]: gradeVerbProgress(progress.verbProgress[event.verbId], event),
  }
  return {
    ...progress,
    verbProgress: nextVerbProgress,
    learnedVerbIds: Object.entries(nextVerbProgress)
      .filter(([, item]) => item.status === 'learned')
      .map(([verbId]) => verbId),
  }
}

export function buildPracticePrompts(verbs: VerbEntry[], mode: PracticePromptMode, limit = 20): PracticePrompt[] {
  const prompts = verbs.flatMap((verb) => getPromptsForVerb(verb, mode))
  return prompts
    .map((prompt) => ({ prompt, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .slice(0, limit)
    .map(({ prompt }) => prompt)
}

export function getPromptsForVerb(verb: VerbEntry, mode: PracticePromptMode): PracticePrompt[] {
  const promptBuilders: Record<Exclude<PracticePromptMode, 'mixed'>, () => PracticePrompt[]> = {
    meanings: () => [
      {
        id: `${verb.id}-meaning`,
        verb,
        type: 'meaning-to-infinitive',
        prompt: [...verb.translations.en, ...verb.translations.uk].slice(0, 4).join(', '),
        detail: 'Wpisz polski bezokolicznik.',
        answer: verb.infinitive,
      },
    ],
    infinitives: () => [
      {
        id: `${verb.id}-infinitive`,
        verb,
        type: 'infinitive-to-meaning',
        prompt: verb.infinitive,
        detail: 'Podaj pierwsze angielskie znaczenie.',
        answer: verb.translations.en[0] ?? '',
      },
    ],
    present: () =>
      [
        ['ja', verb.forms.present.ja],
        ['ty', verb.forms.present.ty],
        ['on / ona', verb.forms.present.on],
        ['my', verb.forms.present.my],
        ['wy', verb.forms.present.wy],
        ['oni / one', verb.forms.present.oni],
      ].map(([label, answer]) => ({
        id: `${verb.id}-present-${label}`,
        verb,
        type: 'present-form',
        prompt: verb.infinitive,
        detail: `Wpisz formę: czas teraźniejszy, ${label}.`,
        answer,
        formLabel: `czas teraźniejszy, ${label}`,
      })),
    past: () =>
      [
        ['ja - on', verb.forms.past.ja.masculine],
        ['ja - ona', verb.forms.past.ja.feminine],
        ['ty - on', verb.forms.past.ty.masculine],
        ['ty - ona', verb.forms.past.ty.feminine],
        ['on', verb.forms.past.on.masculine],
        ['ona', verb.forms.past.ona.feminine],
        ['my - oni', verb.forms.past.my.virile],
        ['my - one', verb.forms.past.my.nonvirile],
        ['wy - oni', verb.forms.past.wy.virile],
        ['wy - one', verb.forms.past.wy.nonvirile],
        ['oni', verb.forms.past.oni.virile],
        ['one', verb.forms.past.one.nonvirile],
      ].map(([label, answer]) => ({
        id: `${verb.id}-past-${label}`,
        verb,
        type: 'past-form',
        prompt: verb.infinitive,
        detail: `Wpisz formę: czas przeszły, ${label}.`,
        answer,
        formLabel: `czas przeszły, ${label}`,
      })),
    forms: () => [...promptBuilders.present(), ...promptBuilders.past()],
    cloze: () => [buildClozePrompt(verb)].filter((prompt): prompt is PracticePrompt => Boolean(prompt)),
  }

  if (mode === 'mixed') {
    return [
      ...promptBuilders.meanings(),
      ...promptBuilders.present().slice(0, 2),
      ...promptBuilders.past().slice(0, 2),
      ...promptBuilders.cloze(),
    ].filter((prompt) => prompt.answer)
  }

  return promptBuilders[mode]().filter((prompt) => prompt.answer)
}

export function buildClozePrompt(verb: VerbEntry): PracticePrompt | null {
  const example = verb.examples[0]
  if (!example) {
    return null
  }
  const possibleAnswers = [
    verb.infinitive,
    ...Object.values(verb.forms.present),
    verb.forms.past.ja.masculine,
    verb.forms.past.ja.feminine,
    verb.forms.past.ty.masculine,
    verb.forms.past.ty.feminine,
    verb.forms.past.on.masculine,
    verb.forms.past.ona.feminine,
    verb.forms.past.my.virile,
    verb.forms.past.my.nonvirile,
    verb.forms.past.wy.virile,
    verb.forms.past.wy.nonvirile,
    verb.forms.past.oni.virile,
    verb.forms.past.one.nonvirile,
  ]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
  const answer = possibleAnswers.find((form) => new RegExp(`\\b${escapeRegExp(form)}\\b`, 'iu').test(example.pl))
  if (!answer) {
    return {
      id: `${verb.id}-cloze-fallback`,
      verb,
      type: 'meaning-to-infinitive',
      prompt: example.pl,
      detail: `${example.en} / ${example.uk}. Wpisz polski bezokolicznik.`,
      answer: verb.infinitive,
      displayAnswer: example.pl,
    }
  }

  return {
    id: `${verb.id}-cloze`,
    verb,
    type: 'cloze-example',
    prompt: example.pl.replace(new RegExp(`\\b${escapeRegExp(answer)}\\b`, 'iu'), '___'),
    detail: `${example.en} / ${example.uk}`,
    answer,
    displayAnswer: example.pl,
    formLabel: 'luka w przykładzie',
  }
}

export function getProgressStats(progress: StudyProgress, allVerbIds: string[], now = new Date()): ProgressStats {
  const oneWeekAgo = addDays(now, -7)
  const entries = Object.entries(progress.verbProgress)
  const learned = entries.filter(([, item]) => item.status === 'learned')
  const learning = entries.filter(([, item]) => item.status === 'learning')
  const due = entries.filter(([, item]) => isDue(item, now))
  const overdue = entries.filter(([, item]) => isOverdue(item, now))
  const reviewedThisWeek = entries.filter(([, item]) => item.lastReviewedAt && new Date(item.lastReviewedAt) >= oneWeekAgo).length
  const scored = entries.map(([verbId, item]) => ({ verbId, score: item.correctCount - item.incorrectCount }))
  const missed = entries
    .map(([verbId, item]) => ({ verbId, count: item.incorrectCount + item.lastMistakes.length }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 10)
  const recentMistakes = entries
    .flatMap(([verbId, item]) => item.lastMistakes.map((mistake) => ({ ...mistake, verbId })))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 20)
  const missedFormMap = new Map<string, { verbId: string; count: number; expected: string; promptType: PracticePromptType; formLabel?: string; prompt?: string; detail?: string; promptId?: string }>()
  for (const mistake of recentMistakes) {
    if (mistake.promptType !== 'present-form' && mistake.promptType !== 'past-form' && mistake.promptType !== 'cloze-example') {
      continue
    }
    const key = `${mistake.verbId}:${mistake.promptId ?? mistake.formLabel ?? mistake.expected}`
    const current = missedFormMap.get(key)
    missedFormMap.set(key, {
      verbId: mistake.verbId,
      count: (current?.count ?? 0) + 1,
      expected: mistake.expected,
      promptType: mistake.promptType,
      formLabel: mistake.formLabel,
      prompt: mistake.prompt,
      detail: mistake.detail,
      promptId: mistake.promptId,
    })
  }
  const missedForms = [...missedFormMap.values()].sort((left, right) => right.count - left.count).slice(0, 10)

  return {
    newCount: Math.max(0, allVerbIds.length - entries.length),
    learningCount: learning.length,
    learnedCount: learned.length,
    dueCount: due.length,
    overdueCount: overdue.length,
    reviewedThisWeek,
    strongest: scored
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5),
    weakest: scored
      .filter((item) => item.score < 0)
      .sort((left, right) => left.score - right.score)
      .slice(0, 5),
    missed,
    missedVerbs: missed,
    missedForms,
    recentMistakes,
  }
}

export function getDueVerbs(verbs: VerbEntry[], progress: StudyProgress, now = new Date()) {
  return verbs.filter((verb) => isDue(progress.verbProgress[verb.id], now)).slice(0, 20)
}

export function getOverdueVerbs(verbs: VerbEntry[], progress: StudyProgress, now = new Date()) {
  return verbs.filter((verb) => isOverdue(progress.verbProgress[verb.id], now)).slice(0, 20)
}

export function getOftenMissedVerbs(verbs: VerbEntry[], progress: StudyProgress, limit = 20) {
  return Object.entries(progress.verbProgress)
    .map(([verbId, item]) => ({ verbId, count: item.incorrectCount + item.lastMistakes.length }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .map((item) => verbs.find((verb) => verb.id === item.verbId))
    .filter((verb): verb is VerbEntry => Boolean(verb))
    .slice(0, limit)
}

export function buildMissedFormPrompts(verbs: VerbEntry[], stats: ProgressStats, limit = 20): PracticePrompt[] {
  const byId = new Map(verbs.map((verb) => [verb.id, verb]))
  const prompts: PracticePrompt[] = []
  for (const item of stats.missedForms.slice(0, limit)) {
    const verb = byId.get(item.verbId)
    if (!verb) {
      continue
    }
    prompts.push({
      id: item.promptId ?? `missed-${item.verbId}-${item.expected}`,
      verb,
      type: item.promptType,
      prompt: item.prompt ?? verb.infinitive,
      detail: item.detail ?? (item.formLabel ? `Wpisz formę: ${item.formLabel}.` : 'Wpisz brakującą formę.'),
      answer: item.expected || verb.infinitive,
      displayAnswer: verb.examples[0]?.pl,
      formLabel: item.formLabel,
    })
  }
  return prompts
}

export function getRelatedVerbs(verb: VerbEntry, verbs: VerbEntry[]) {
  const pair = verb.aspectPair ? verbs.find((candidate) => candidate.infinitive === verb.aspectPair || candidate.id === verb.aspectPair) : undefined
  const root = stripCommonPrefix(verb.infinitive.replace(/ć$/, ''))
  const family = verbs
    .filter((candidate) => candidate.id !== verb.id && candidate.id !== pair?.id)
    .filter((candidate) => {
      const candidateRoot = stripCommonPrefix(candidate.infinitive.replace(/ć$/, ''))
      return root.length >= 4 && candidateRoot.includes(root)
    })
    .slice(0, 8)

  return {
    pair,
    family,
  }
}

function stripCommonPrefix(value: string) {
  return value.replace(/^(po|za|wy|do|od|prze|przy|roz|u|w|na|z|s)/, '')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
