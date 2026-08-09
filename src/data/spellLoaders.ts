const BASE = import.meta.env.BASE_URL

export type AppSpellElement = 'earth' | 'fire' | 'water' | 'air' | 'neutral' | 'mixed'
export type AppSpellEffect = { element: Exclude<AppSpellElement, 'mixed'>; min: number; max: number }
export type AppSpellLevel = {
  grade:      number
  ap:         number
  minRange:   number
  maxRange:   number
  maxPerTurn: number
  critChance: number
  effects:    AppSpellEffect[]
}
export type AppSpell = {
  id:         number
  name:       string
  element:    AppSpellElement
  is_variant: boolean
  image_url:  string | null
  levels:     AppSpellLevel[]
}
export type ClassSpells = {
  classSlug: string
  spells:    AppSpell[]
}

export async function fetchSpells(lang: string, classSlug: string): Promise<ClassSpells> {
  const res = await fetch(`${BASE}data/${lang}/spells/${classSlug}.json`)
  if (!res.ok) throw new Error(`Spells not found: ${classSlug} (${lang}) — ${res.status}`)
  return res.json() as Promise<ClassSpells>
}
