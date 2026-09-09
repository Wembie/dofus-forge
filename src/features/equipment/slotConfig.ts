import type { SlotId } from '@/store/buildStore.ts'
import { statIconUrl } from './statDisplay.ts'

export type SlotConfig = {
  id:        SlotId
  label:     string
  apiSlot:   string | string[]
  apiTypes?: string[]
  icon:      string
}

export const SLOT_CONFIGS: SlotConfig[] = [
  { id: 'hat',       label: 'Hat',       apiSlot: 'hat',    icon: '🎩' },
  { id: 'cape',      label: 'Cape',      apiSlot: 'cape',   icon: '🧣' },
  { id: 'amulet',    label: 'Amulet',    apiSlot: 'amulet', icon: '📿' },
  { id: 'ring1',     label: 'Ring',      apiSlot: 'ring',   icon: '💍' },
  { id: 'ring2',     label: 'Ring',      apiSlot: 'ring',   icon: '💍' },
  { id: 'belt',      label: 'Belt',      apiSlot: 'belt',   icon: '🔵' },
  { id: 'boots',     label: 'Boots',     apiSlot: 'boots',  icon: '👢' },
  { id: 'weapon',    label: 'Weapon',    apiSlot: 'weapon', icon: '⚔️' },
  { id: 'shield',    label: 'Shield',    apiSlot: 'shield', icon: '🛡️' },
  {
    id: 'companion', label: 'Companion',
    apiSlot:   ['pet', 'other'],
    apiTypes:  ['Pet', 'Petsmount', 'Dragoturkey', 'Seemyool', 'Rhineetle'],
    icon: '🐾',
  },
  { id: 'sidekick',  label: 'Sidekick',  apiSlot: 'other', apiTypes: ['Sidekick'],  icon: '🗡️' },
  { id: 'dofus1',    label: 'Dofus',     apiSlot: 'dofus',  icon: '🥚' },
  { id: 'dofus2',    label: 'Dofus',     apiSlot: 'dofus',  icon: '🥚' },
  { id: 'dofus3',    label: 'Dofus',     apiSlot: 'dofus',  icon: '🥚' },
  { id: 'dofus4',    label: 'Dofus',     apiSlot: 'dofus',  icon: '🥚' },
  { id: 'dofus5',    label: 'Dofus',     apiSlot: 'dofus',  icon: '🥚' },
  { id: 'dofus6',    label: 'Dofus',     apiSlot: 'dofus',  icon: '🥚' },
]

// Every dofus1-6 slot still carries the 🥚 emoji as its `icon` fallback (used as
// plain text in toasts/badges where an <img> doesn't fit) — but wherever we can
// render a real image, use the actual Dofus icon instead of the egg emoji.
export function isDofusSlot(id: SlotId): boolean {
  return id.startsWith('dofus')
}

export function slotImageIcon(id: SlotId): string | null {
  return isDofusSlot(id) ? statIconUrl('dofus') : null
}
