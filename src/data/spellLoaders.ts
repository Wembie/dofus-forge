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
  rangeModifiable?: boolean
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
  return withSpellImageUrls(await res.json() as ClassSpells)
}

export function withSpellImageUrls(data: ClassSpells): ClassSpells {
  return {
    ...data,
    spells: data.spells.map(sp => ({
      ...sp,
      image_url: sp.image_url ? BASE + sp.image_url.replace(/^\//, '') : null,
    })),
  }
}

/** English spells (the engine's source of truth) with names, descriptions and buffs from `localized`. */
export function localizeSpells(spells: AppSpell[], localized: AppSpell[]): AppSpell[] {
  const byId = new Map(localized.map(sp => [sp.id, sp]))
  return spells.map(sp => {
    const loc = byId.get(sp.id)
    if (!loc) return sp
    return {
      ...sp,
      name: loc.name,
      ...(loc.description != null ? { description: loc.description } : {}),
      levels: sp.levels.map((lvl, i) => {
        const locLvl = loc.levels[i]
        return locLvl?.buffs?.length ? { ...lvl, buffs: locLvl.buffs } : lvl
      }),
    }
  })
}
