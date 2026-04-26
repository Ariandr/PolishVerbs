import type { VerbEntry } from './schema'
import verbs001 from './verbs/001-100.json'
import verbs101 from './verbs/101-200.json'
import verbs201 from './verbs/201-300.json'
import verbs301 from './verbs/301-400.json'
import verbs401 from './verbs/401-500.json'
import verbs501 from './verbs/501-600.json'

export const verbs: VerbEntry[] = [
  ...verbs001,
  ...verbs101,
  ...verbs201,
  ...verbs301,
  ...verbs401,
  ...verbs501,
].sort((left, right) => left.frequencyRank - right.frequencyRank) as VerbEntry[]

export const verbById = new Map(verbs.map((verb) => [verb.id, verb]))
