const BASE = import.meta.env.BASE_URL

export type AppSpellElement    = 'earth' | 'fire' | 'water' | 'air' | 'neutral' | 'mixed'
export type AppSpellEffectKind =
  | 'damage' | 'steal' | 'poison' | 'push'
  | 'ap'      // steal AP from enemy
  | 'ap_gain' // gain AP (caster)
  | 'mp'      // steal MP from enemy
  | 'mp_gain' // gain MP (caster)
  | 'erosion'    // % incurable damage — min=pct, turns=duration
  | 'heal_mod'   // heals received modifier — min=pct
  | 'spell_buff' // stacking spell damage buff — min=amount, spellId, stack, turns, deathReset
  // poison = DoT damage (triggers="TE", effectTriggerDuration>0) — turns=duration in rounds

export type AppSpellEffect = {
  element:    Exclude<AppSpellElement, 'mixed'>
  min:        number
  max:        number
  kind:       AppSpellEffectKind
  condition?: 'shield'
  // spell_buff / erosion
  spellId?:    number
  stack?:      number
  turns?:      number
  deathReset?: boolean
}
export type AppSpellLevel = {
  grade:        number
  ap:           number
  minRange:     number
  maxRange:     number
  maxPerTurn:   number
  critChance:   number
  effects:      AppSpellEffect[]
  critEffects?: AppSpellEffect[]
  buffs?:       string[]
}
export type AppSpell = {
  id:          number
  name:        string
  element:     AppSpellElement
  is_variant:  boolean
  image_url:   string | null
  levels:      AppSpellLevel[]
  description?: string
}
export type ClassSpells = {
  classSlug: string
  spells:    AppSpell[]
}

export async function fetchSpells(lang: string, classSlug: string): Promise<ClassSpells> {
  const res = await fetch(`${BASE}data/${lang}/spells/${classSlug}.json`)
  if (!res.ok) throw new Error(`Spells not found: ${classSlug} (${lang}) — ${res.status}`)
  const data = await res.json() as ClassSpells
  data.spells = data.spells.map(sp => ({
    ...sp,
    image_url: sp.image_url ? BASE + sp.image_url.replace(/^\//, '') : null,
  }))
  return data
}
