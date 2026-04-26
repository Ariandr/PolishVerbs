import type { VerbEntry } from './schema'

const modules = import.meta.glob('./verbs/*.json', { eager: true, import: 'default' }) as Record<string, VerbEntry[]>

export const verbs: VerbEntry[] = Object.entries(modules)
  .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
  .flatMap(([, records]) => records)
  .sort((left, right) => left.frequencyRank - right.frequencyRank)

export const verbById = new Map(verbs.map((verb) => [verb.id, verb]))
