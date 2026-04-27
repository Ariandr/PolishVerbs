import type { VerbEntry } from './schema'

export const aspectLabels: Record<VerbEntry['aspect'], string> = {
  imperfective: 'niedokonany',
  perfective: 'dokonany',
  biaspectual: 'dwuaspektowy',
  unknown: 'aspekt nieznany',
}
