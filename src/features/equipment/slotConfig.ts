import type { SlotId } from '@/store/buildStore.ts'

export type SlotConfig = {
  id:        SlotId
  label:     string
  apiSlot:   string | string[]
  apiTypes?: string[]
}

export const SLOT_CONFIGS: SlotConfig[] = [
  { id: 'hat',       label: 'Hat',       apiSlot: 'hat' },
  { id: 'cape',      label: 'Cape',      apiSlot: 'cape' },
  { id: 'amulet',    label: 'Amulet',    apiSlot: 'amulet' },
  { id: 'ring1',     label: 'Ring',      apiSlot: 'ring' },
  { id: 'ring2',     label: 'Ring',      apiSlot: 'ring' },
  { id: 'belt',      label: 'Belt',      apiSlot: 'belt' },
  { id: 'boots',     label: 'Boots',     apiSlot: 'boots' },
  { id: 'weapon',    label: 'Weapon',    apiSlot: 'weapon' },
  { id: 'shield',    label: 'Shield',    apiSlot: 'shield' },
  {
    id: 'companion', label: 'Companion',
    apiSlot:   ['pet', 'other'],
    apiTypes:  ['Pet', 'Petsmount', 'Dragoturkey', 'Seemyool', 'Rhineetle'],
  },
  { id: 'sidekick',  label: 'Sidekick',  apiSlot: 'other', apiTypes: ['Sidekick'] },
  { id: 'dofus1',    label: 'Dofus',     apiSlot: 'dofus' },
  { id: 'dofus2',    label: 'Dofus',     apiSlot: 'dofus' },
  { id: 'dofus3',    label: 'Dofus',     apiSlot: 'dofus' },
  { id: 'dofus4',    label: 'Dofus',     apiSlot: 'dofus' },
  { id: 'dofus5',    label: 'Dofus',     apiSlot: 'dofus' },
  { id: 'dofus6',    label: 'Dofus',     apiSlot: 'dofus' },
]

export function isDofusSlot(id: SlotId): boolean {
  return id.startsWith('dofus')
}
