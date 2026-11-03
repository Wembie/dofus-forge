// Equipment slot icons on a 24 grid, in the brand's faceted style: `base` is the
// whole silhouette (drawn at reduced opacity), `lit` the facets that catch the
// light. Plain data so docs/brand/slot-icons/board.mjs can render the same
// shapes. SlotIcon.tsx draws them in currentColor; the Dofus slots keep the
// game's Dofus icon (no shape here).

export type SlotIconKey =
  | 'hat' | 'cape' | 'amulet' | 'ring' | 'weapon' | 'shield' | 'belt' | 'boots'
  | 'companion' | 'sidekick' | 'dofus'

export type SlotIconShape = {
  base: string
  lit: string
  stroke?: string     // drawn as a line at base opacity (the amulet's chain)
  rotate?: number     // degrees around the centre
  evenodd?: boolean   // the shape has holes
}

type Pt = [number, number]
const hex = (cx: number, cy: number, rx = 2, ry = 2.6): Pt[] =>
  [[cx, cy - ry], [cx + rx, cy - ry / 2], [cx + rx, cy + ry / 2], [cx, cy + ry], [cx - rx, cy + ry / 2], [cx - rx, cy - ry / 2]]
const hexLeft = (cx: number, cy: number, rx = 2, ry = 2.6): Pt[] =>
  [[cx, cy - ry], [cx - rx, cy - ry / 2], [cx - rx, cy + ry / 2], [cx, cy + ry]]
const poly = (pts: Pt[]) => 'M' + pts.map(p => p.join(' ')).join(' L') + ' Z'

export const SLOT_ICON_SHAPES: Record<Exclude<SlotIconKey, 'dofus'>, SlotIconShape> = {
  hat: {
    base: 'M7 12.5 L8.2 6 L12 3.5 L15.8 6 L17 12.5 Z M2.5 13 H21.5 L19.5 16.5 H4.5 Z M12 8.6 L13.6 10.6 L12 12.6 L10.4 10.6 Z',
    lit: 'M7 12.5 L8.2 6 L12 3.5 V8.6 L10.4 10.6 L12 12.6 V12.5 Z M2.5 13 H21.5 L21 14 H3 Z',
    evenodd: true,
  },
  cape: {
    base: 'M8 3 H16 L17 6.5 L20.5 21 L16.5 19.5 L12 21.5 L7.5 19.5 L3.5 21 L7 6.5 Z M10 3 L12 6.5 L14 3 Z',
    lit: 'M8 3 H10 L12 6.5 V21.5 L7.5 19.5 L3.5 21 L7 6.5 Z',
    evenodd: true,
  },
  amulet: {
    stroke: 'M4.5 2 C5.8 7.6 8.6 10.4 12 10.6 C15.4 10.4 18.2 7.6 19.5 2',
    base: 'M12 9.6 L16.8 14.6 L12 22 L7.2 14.6 Z',
    lit: 'M12 9.6 L7.2 14.6 L12 22 Z M12 9.6 L16.8 14.6 H12 Z',
  },
  ring: {
    base: 'M8.9 7 H15.1 L19.5 11.4 V17.6 L15.1 22 H8.9 L4.5 17.6 V11.4 Z M10 9.7 L7.2 12.5 V16.5 L10 19.3 H14 L16.8 16.5 V12.5 L14 9.7 Z M12 1.5 L15 4.5 L12 7.5 L9 4.5 Z',
    lit: 'M12 7 H8.9 L4.5 11.4 V17.6 L8.9 22 H12 V19.3 H10 L7.2 16.5 V12.5 L10 9.7 H12 Z M12 1.5 L9 4.5 L12 7.5 Z',
    evenodd: true,
  },
  weapon: {
    rotate: 45,
    base: 'M12 1.5 L14 4.5 V15 H10 V4.5 Z M6.5 15 H17.5 L16.5 17 H7.5 Z M11 17 H13 V20.2 H11 Z M12 19.8 L13.7 21.5 L12 23.2 L10.3 21.5 Z',
    lit: 'M12 1.5 L10 4.5 V15 H12 Z M6.5 15 H12 V17 H7.5 Z M12 19.8 L10.3 21.5 L12 23.2 Z',
  },
  shield: {
    base: 'M12 2 L20 4.5 L19.5 13 L16 18.5 L12 22 L8 18.5 L4.5 13 L4 4.5 Z M12 8 L14.5 11.5 L12 15 L9.5 11.5 Z',
    lit: 'M12 2 L4 4.5 L4.5 13 L8 18.5 L12 22 V15 L9.5 11.5 L12 8 Z',
    evenodd: true,
  },
  belt: {
    base: 'M2 10 H20.5 L22 12 L20.5 14 H2 Z',
    lit: 'M8.5 7.5 H15.5 V16.5 H8.5 Z M10.5 9.5 V14.5 H13.5 V9.5 Z M11.4 9.5 H12.6 V12.5 H11.4 Z',
    evenodd: true,
  },
  boots: {
    base: 'M7 2.5 H14 L14.5 12.5 L19.5 15 L21 17.5 V20 H4 L4.5 16 L6.5 14 Z',
    lit: 'M6.5 2.5 H14.5 V5.5 H6.5 Z M3.5 20 H21.5 V22 H3.5 Z',
  },
  companion: {
    base: [poly([[12, 12], [16.5, 14.5], [17, 18], [14.5, 21], [9.5, 21], [7, 18], [7.5, 14.5]]), poly(hex(5.5, 11)), poly(hex(9.5, 6)), poly(hex(14.5, 6)), poly(hex(18.5, 11))].join(' '),
    lit: [poly([[12, 12], [7.5, 14.5], [7, 18], [9.5, 21], [12, 21]]), poly(hexLeft(5.5, 11)), poly(hexLeft(9.5, 6)), poly(hexLeft(14.5, 6)), poly(hexLeft(18.5, 11))].join(' '),
  },
  sidekick: {
    base: [poly(hex(12, 7, 3.2, 4)), 'M5 21.5 L6.5 15 L9.5 12.5 H14.5 L17.5 15 L19 21.5 Z'].join(' '),
    lit: [poly(hexLeft(12, 7, 3.2, 4)), 'M12 12.5 H9.5 L6.5 15 L5 21.5 H12 Z'].join(' '),
  },
}

/** ring1/ring2 share the ring, dofus1-6 the Dofus. */
export function slotIconKey(slot: string): SlotIconKey {
  if (slot.startsWith('ring')) return 'ring'
  if (slot.startsWith('dofus')) return 'dofus'
  return slot as SlotIconKey
}

const TOAST_PREFIX = 'slot:'

/** Toast icons are strings (an emoji or an image URL); this one makes the Toaster draw a SlotIcon. */
export const slotToastIcon = (slot: string) => TOAST_PREFIX + slot
export const toastSlot = (icon: string) => (icon.startsWith(TOAST_PREFIX) ? icon.slice(TOAST_PREFIX.length) : null)
