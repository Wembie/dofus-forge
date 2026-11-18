import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Catalogue paging: mount a page of cards, grow it as a sentinel
 * nears the bottom of the scroller, and start over whenever the list changes.
 */
export function useInfiniteList<T>(
  list: T[],
  root: RefObject<HTMLElement | null>,
  size: number,
) {
  const [count, setCount] = useState(size),
    sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setCount(size);
    root.current?.scrollTo?.({ top: 0 });
  }, [list, size]);
  const more = count < list.length;
  useEffect(() => {
    if (!more || !sentinel.current || !root.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting)
          setCount((c) => Math.min(c + size, list.length));
      },
      { root: root.current, rootMargin: "600px 0px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [more, count, list.length, size]);
  return { visible: list.slice(0, count), sentinel, more };
}
