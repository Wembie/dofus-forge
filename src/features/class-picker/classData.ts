import type { DofusClass } from '@/engine/types.ts'

const BASE = import.meta.env.BASE_URL

export type Element = 'earth' | 'fire' | 'water' | 'air' | 'neutral' | 'multi'

export type ClassInfo = {
  id:        DofusClass
  name:      string
  element:   Element
  imageUrl:  string   // male portrait
  imageFUrl: string   // female portrait
}

function cls(id: DofusClass, name: string, element: Element): ClassInfo {
  return {
    id,
    name,
    element,
    imageUrl:  `${BASE}data/classes/${id}.png`,
    imageFUrl: `${BASE}data/classes/${id}-f.png`,
  }
}

export const CLASS_DATA: ClassInfo[] = [
  cls('cra',          'Cra',          'air'    ),
  cls('ecaflip',      'Ecaflip',      'fire'   ),
  cls('eniripsa',     'Eniripsa',     'water'  ),
  cls('enutrof',      'Enutrof',      'fire'   ),
  cls('eliotrope',    'Eliotrope',    'multi'  ),
  cls('feca',         'Feca',         'earth'  ),
  cls('foggernaut',   'Foggernaut',   'neutral'),
  cls('forgelance',   'Forgelance',   'earth'  ),
  cls('huppermage',   'Huppermage',   'multi'  ),
  cls('iop',          'Iop',          'earth'  ),
  cls('masqueraider', 'Masqueraider', 'earth'  ),
  cls('osamodas',     'Osamodas',     'air'    ),
  cls('ouginak',      'Ouginak',      'earth'  ),
  cls('pandawa',      'Pandawa',      'water'  ),
  cls('rogue',        'Rogue',        'fire'   ),
  cls('sacrier',      'Sacrier',      'neutral'),
  cls('sadida',       'Sadida',       'earth'  ),
  cls('sram',         'Sram',         'air'    ),
  cls('xelor',        'Xelor',        'air'    ),
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
