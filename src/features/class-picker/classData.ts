import type { DofusClass } from '@/engine/types.ts'

const BASE = import.meta.env.BASE_URL

export type Element = 'earth' | 'fire' | 'water' | 'air' | 'neutral' | 'multi'

export type ClassInfo = {
  id:       DofusClass
  name:     string
  element:  Element
  imageUrl: string
}

export const CLASS_DATA: ClassInfo[] = [
  { id: 'cra',          name: 'Cra',          element: 'air',     imageUrl: `${BASE}data/classes/cra.png` },
  { id: 'ecaflip',      name: 'Ecaflip',      element: 'fire',    imageUrl: `${BASE}data/classes/ecaflip.png` },
  { id: 'eniripsa',     name: 'Eniripsa',     element: 'water',   imageUrl: `${BASE}data/classes/eniripsa.png` },
  { id: 'enutrof',      name: 'Enutrof',      element: 'fire',    imageUrl: `${BASE}data/classes/enutrof.png` },
  { id: 'eliotrope',    name: 'Eliotrope',    element: 'multi',   imageUrl: `${BASE}data/classes/eliotrope.png` },
  { id: 'feca',         name: 'Feca',         element: 'earth',   imageUrl: `${BASE}data/classes/feca.png` },
  { id: 'foggernaut',   name: 'Foggernaut',   element: 'neutral', imageUrl: `${BASE}data/classes/foggernaut.png` },
  { id: 'forgelance',   name: 'Forgelance',   element: 'earth',   imageUrl: `${BASE}data/classes/forgelance.png` },
  { id: 'huppermage',   name: 'Huppermage',   element: 'multi',   imageUrl: `${BASE}data/classes/huppermage.png` },
  { id: 'iop',          name: 'Iop',          element: 'earth',   imageUrl: `${BASE}data/classes/iop.png` },
  { id: 'masqueraider', name: 'Masqueraider', element: 'earth',   imageUrl: `${BASE}data/classes/masqueraider.png` },
  { id: 'osamodas',     name: 'Osamodas',     element: 'air',     imageUrl: `${BASE}data/classes/osamodas.png` },
  { id: 'ouginak',      name: 'Ouginak',      element: 'earth',   imageUrl: `${BASE}data/classes/ouginak.png` },
  { id: 'pandawa',      name: 'Pandawa',      element: 'water',   imageUrl: `${BASE}data/classes/pandawa.png` },
  { id: 'rogue',        name: 'Rogue',        element: 'fire',    imageUrl: `${BASE}data/classes/rogue.png` },
  { id: 'sacrier',      name: 'Sacrier',      element: 'neutral', imageUrl: `${BASE}data/classes/sacrier.png` },
  { id: 'sadida',       name: 'Sadida',       element: 'earth',   imageUrl: `${BASE}data/classes/sadida.png` },
  { id: 'sram',         name: 'Sram',         element: 'air',     imageUrl: `${BASE}data/classes/sram.png` },
  { id: 'xelor',        name: 'Xelor',        element: 'air',     imageUrl: `${BASE}data/classes/xelor.png` },
]

export const ELEMENT_COLORS: Record<Element, string> = {
  earth:   'border-forge-earth   text-forge-earth',
  fire:    'border-forge-fire    text-forge-fire',
  water:   'border-forge-water   text-forge-water',
  air:     'border-forge-air     text-forge-air',
  neutral: 'border-forge-neutral text-forge-neutral',
  multi:   'border-forge-gold    text-forge-gold',
}

export const ELEMENT_HEX: Record<Element, string> = {
  earth:   '#b8860b',
  fire:    '#dc4e22',
  water:   '#2a8fd4',
  air:     '#6ab04c',
  neutral: '#9b9b9b',
  multi:   '#c9a84c',
}
