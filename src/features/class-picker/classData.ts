import type { DofusClass } from '@/engine/types.ts'

const BASE = import.meta.env.BASE_URL

export type Element = 'earth' | 'fire' | 'water' | 'air' | 'neutral' | 'multi'

export type ClassInfo = {
  id:        DofusClass
  name:      string
  element:   Element
  breed:     number   // game breed id
  imageUrl:  string   // male portrait
  imageFUrl: string   // female portrait
}

function cls(id: DofusClass, name: string, element: Element, breed: number): ClassInfo {
  return {
    id,
    name,
    element,
    breed,
    imageUrl:  `${BASE}data/classes/${id}.png`,
    imageFUrl: `${BASE}data/classes/${id}-f.png`,
  }
}

export const CLASS_DATA: ClassInfo[] = [
  cls('cra',          'Cra',          'air',     9),
  cls('ecaflip',      'Ecaflip',      'fire',    6),
  cls('eniripsa',     'Eniripsa',     'water',   7),
  cls('enutrof',      'Enutrof',      'fire',    3),
  cls('eliotrope',    'Eliotrope',    'multi',   16),
  cls('feca',         'Feca',         'earth',   1),
  cls('foggernaut',   'Foggernaut',   'neutral', 15),
  cls('forgelance',   'Forgelance',   'earth',   20),
  cls('huppermage',   'Huppermage',   'multi',   17),
  cls('iop',          'Iop',          'earth',   8),
  cls('masqueraider', 'Masqueraider', 'earth',   14),
  cls('osamodas',     'Osamodas',     'air',     2),
  cls('ouginak',      'Ouginak',      'earth',   18),
  cls('pandawa',      'Pandawa',      'water',   12),
  cls('rogue',        'Rogue',        'fire',    13),
  cls('sacrier',      'Sacrier',      'neutral', 11),
  cls('sadida',       'Sadida',       'earth',   10),
  cls('sram',         'Sram',         'air',     4),
  cls('xelor',        'Xelor',        'air',     5),
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
