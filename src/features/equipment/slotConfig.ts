import type { SlotId } from '@/store/buildStore.ts'

export type SlotConfig = {
  id:        SlotId
  label:     string
  apiSlot:   string    // matches AppItem.slot values
  apiTypes?: string[]  // optional type filter; if absent, show all in this slot
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
  { id: 'pet',       label: 'Pet',       apiSlot: 'pet',    apiTypes: ['Pet'],       icon: '🐾' },
  { id: 'petsmount', label: 'Petsmount', apiSlot: 'pet',    apiTypes: ['Petsmount'], icon: '🦄' },
  { id: 'mount',     label: 'Mount',     apiSlot: 'other',  apiTypes: ['Dragoturkey', 'Seemyool', 'Rhineetle'], icon: '🐴' },
  { id: 'sidekick',  label: 'Sidekick',  apiSlot: 'other',  apiTypes: ['Sidekick'],  icon: '🗡️' },
  { id: 'dofus1',    label: 'Dofus',     apiSlot: 'dofus',  icon: '🥚' },
  { id: 'dofus2',    label: 'Dofus',     apiSlot: 'dofus',  icon: '🥚' },
  { id: 'dofus3',    label: 'Dofus',     apiSlot: 'dofus',  icon: '🥚' },
  { id: 'dofus4',    label: 'Dofus',     apiSlot: 'dofus',  icon: '🥚' },
  { id: 'dofus5',    label: 'Dofus',     apiSlot: 'dofus',  icon: '🥚' },
  { id: 'dofus6',    label: 'Dofus',     apiSlot: 'dofus',  icon: '🥚' },
]
