import type { DofusClass } from '@/engine/types.ts'

export type Element = 'earth' | 'fire' | 'water' | 'air' | 'neutral' | 'multi'

export type ClassInfo = {
  id:      DofusClass
  name:    string
  element: Element
  icon:    string  // emoji placeholder
}

export const CLASS_DATA: ClassInfo[] = [
  { id: 'cra',          name: 'Cra',          element: 'air',     icon: '🏹' },
  { id: 'ecaflip',      name: 'Ecaflip',      element: 'fire',    icon: '🎲' },
  { id: 'eniripsa',     name: 'Eniripsa',     element: 'water',   icon: '✨' },
  { id: 'enutrof',      name: 'Enutrof',      element: 'fire',    icon: '💰' },
  { id: 'eliotrope',    name: 'Eliotrope',    element: 'multi',   icon: '🌀' },
  { id: 'feca',         name: 'Feca',         element: 'earth',   icon: '🛡️' },
  { id: 'foggernaut',   name: 'Foggernaut',   element: 'neutral', icon: '⚙️' },
  { id: 'huppermage',   name: 'Huppermage',   element: 'multi',   icon: '🔮' },
  { id: 'iop',          name: 'Iop',          element: 'earth',   icon: '⚔️' },
  { id: 'masqueraider', name: 'Masqueraider', element: 'earth',   icon: '🎭' },
  { id: 'osamodas',     name: 'Osamodas',     element: 'air',     icon: '🐉' },
  { id: 'ouginak',      name: 'Ouginak',      element: 'earth',   icon: '🐺' },
  { id: 'pandawa',      name: 'Pandawa',      element: 'water',   icon: '🐼' },
  { id: 'rogue',        name: 'Rogue',        element: 'fire',    icon: '💣' },
  { id: 'sacrier',      name: 'Sacrier',      element: 'neutral', icon: '🩸' },
  { id: 'sadida',       name: 'Sadida',       element: 'earth',   icon: '🌿' },
  { id: 'sram',         name: 'Sram',         element: 'air',     icon: '☠️' },
  { id: 'xelor',        name: 'Xelor',        element: 'air',     icon: '⏱️' },
]

export const ELEMENT_COLORS: Record<Element, string> = {
  earth:   'border-forge-earth   text-forge-earth',
  fire:    'border-forge-fire    text-forge-fire',
  water:   'border-forge-water   text-forge-water',
  air:     'border-forge-air     text-forge-air',
  neutral: 'border-forge-neutral text-forge-neutral',
  multi:   'border-forge-gold    text-forge-gold',
}
