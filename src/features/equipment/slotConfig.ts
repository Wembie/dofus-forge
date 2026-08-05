import type { SlotId } from '@/store/buildStore.ts'

export type SlotConfig = {
  id:       SlotId
  label:    string
  apiSlot:  string    // matches AppItem.slot values
  icon:     string
}

export const SLOT_CONFIGS: SlotConfig[] = [
  { id: 'hat',    label: 'Hat',    apiSlot: 'hat',     icon: '🎩' },
  { id: 'cape',   label: 'Cape',   apiSlot: 'cape',    icon: '🧣' },
  { id: 'amulet', label: 'Amulet', apiSlot: 'amulet',  icon: '📿' },
  { id: 'ring1',  label: 'Ring',   apiSlot: 'ring',    icon: '💍' },
  { id: 'ring2',  label: 'Ring',   apiSlot: 'ring',    icon: '💍' },
  { id: 'belt',   label: 'Belt',   apiSlot: 'belt',    icon: '🔵' },
  { id: 'boots',  label: 'Boots',  apiSlot: 'boots',   icon: '👢' },
  { id: 'weapon', label: 'Weapon', apiSlot: 'weapon',  icon: '⚔️' },
  { id: 'shield', label: 'Shield', apiSlot: 'shield',  icon: '🛡️' },
  { id: 'pet',    label: 'Pet',    apiSlot: 'pet',     icon: '🐾' },
  { id: 'dofus1', label: 'Dofus',  apiSlot: 'dofus',   icon: '🥚' },
  { id: 'dofus2', label: 'Dofus',  apiSlot: 'dofus',   icon: '🥚' },
  { id: 'dofus3', label: 'Dofus',  apiSlot: 'dofus',   icon: '🥚' },
  { id: 'dofus4', label: 'Dofus',  apiSlot: 'dofus',   icon: '🥚' },
  { id: 'dofus5', label: 'Dofus',  apiSlot: 'dofus',   icon: '🥚' },
  { id: 'dofus6', label: 'Dofus',  apiSlot: 'dofus',   icon: '🥚' },
]
