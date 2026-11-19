import type { Characteristic } from '@/engine/types.ts'

/** The workshop opens its characteristics window on this event. */
export const OPEN_CHARACTERISTICS_EVENT = 'df:open-characteristics'

/** Opens the characteristics window, with `focus`'s points field selected. */
export function openCharacteristics(focus?: Characteristic) {
  window.dispatchEvent(new CustomEvent<Characteristic | undefined>(OPEN_CHARACTERISTICS_EVENT, { detail: focus }))
}
