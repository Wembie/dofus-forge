import { useRef, useState, useCallback, useEffect } from 'react'
import type { UIEvent } from 'react'

export function useVirtualList<T>(
  items:    T[],
  rowHeight: number,
  overscan  = 4,
) {
  const containerRef              = useRef<HTMLUListElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [vpHeight,  setVpHeight]  = useState(400)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setVpHeight(el.clientHeight)
    const ro = new ResizeObserver(([e]) => setVpHeight(e.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onScroll = useCallback((e: UIEvent<HTMLUListElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const startIdx    = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const endIdx      = Math.min(items.length, Math.ceil((scrollTop + vpHeight) / rowHeight) + overscan)
  const totalHeight = items.length * rowHeight

  return {
    containerRef,
    onScroll,
    visibleItems:  items.slice(startIdx, endIdx),
    totalHeight,
    paddingTop:    startIdx * rowHeight,
    paddingBottom: Math.max(0, totalHeight - endIdx * rowHeight),
    startIdx,
  }
}
