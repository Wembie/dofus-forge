/** Key actions sent to Google Analytics through the Tag Manager container. */
export type AnalyticsEvent = 'equip_item' | 'forge_run' | 'publish_build' | 'share_link' | 'export_sheet'

/**
 * Queues an event on the shared data layer, where the container's GA4 event
 * tag picks it up (Custom Event trigger, event name = {{Event}}). Consent is
 * applied by Google's consent mode, not here. Outside production the
 * container never loads, so the push goes nowhere.
 */
export function track(event: AnalyticsEvent, params: Record<string, string | number> = {}) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { dataLayer?: unknown[] }
  w.dataLayer?.push({ event, ...params })
}
