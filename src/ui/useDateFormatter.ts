import { useCallback, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

const noSubscription = () => () => {}

/**
 * Formats dates in the active language. Prerendered pages are built in UTC
 * and the visitor's time zone is unknown there, so the server render and the
 * hydrating render both use UTC (identical text, no hydration mismatch);
 * React re-renders right after hydration in the visitor's own time zone.
 * Client-side navigations format locally from the start.
 */
export function useDateFormatter() {
  const { i18n } = useTranslation()
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false)
  return useCallback(
    (iso: string, options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' }) =>
      new Date(iso).toLocaleString(i18n.language, hydrated ? options : { ...options, timeZone: 'UTC' }),
    [i18n.language, hydrated],
  )
}
