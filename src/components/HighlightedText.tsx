import type { ReactNode } from 'react'
import { getHighlightRanges } from '../lib/search'

interface HighlightedTextProps {
  text: string
  query: string
}

export function HighlightedText({ text, query }: HighlightedTextProps) {
  const ranges = getHighlightRanges(text, query)
  if (!ranges.length) {
    return <>{text}</>
  }

  const parts: ReactNode[] = []
  let index = 0

  ranges.forEach((range) => {
    if (range.start > index) {
      parts.push(text.slice(index, range.start))
    }
    parts.push(<mark key={`${range.start}-${range.end}`}>{text.slice(range.start, range.end)}</mark>)
    index = range.end
  })

  if (index < text.length) {
    parts.push(text.slice(index))
  }

  return <>{parts}</>
}
