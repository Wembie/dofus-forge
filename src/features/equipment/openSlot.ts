import type { SlotId } from '@/store/buildStore.ts'

/** The equipment grid opens a slot (its sheet, or the catalog when empty) on this event. */
export const OPEN_SLOT_EVENT = 'df:open-slot'

export function openSlot(slot: SlotId) {
  window.dispatchEvent(new CustomEvent<SlotId>(OPEN_SLOT_EVENT, { detail: slot }))
}

/** True while the user types or a window is open: global letter keys stay out of the way. */
export function keysBusy(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return true
  if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]')) return true
  return document.querySelector('[role="dialog"]') != null
}
