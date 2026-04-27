export const virtualRowHeight = 82
export const virtualListThreshold = 150
export const virtualOverscan = 8

export interface VirtualWindow {
  startIndex: number
  endIndex: number
  beforeHeight: number
  afterHeight: number
}

export const getVirtualWindow = (
  itemCount: number,
  scrollOffset: number,
  viewportHeight: number,
  rowHeight = virtualRowHeight,
  overscan = virtualOverscan,
): VirtualWindow => {
  if (itemCount <= 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      beforeHeight: 0,
      afterHeight: 0,
    }
  }

  const visibleStart = Math.max(0, Math.floor(scrollOffset / rowHeight) - overscan)
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2
  const endIndex = Math.min(itemCount, visibleStart + visibleCount)

  return {
    startIndex: visibleStart,
    endIndex,
    beforeHeight: visibleStart * rowHeight,
    afterHeight: Math.max(0, (itemCount - endIndex) * rowHeight),
  }
}
