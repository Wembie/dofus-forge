import { SPELL_ITEM_EFFECT_IDS } from '@/data/effectIds.ts'
import type { AppEffect, AppItem, AppSet } from '@/data/loaders.ts'

// Item and set data always starts from English: STAT_META/STAT_MAP keys must
// match the English stat names, or the engine finds no icons, colors or
// values. Other languages overlay only what is shown as text.

export function overlayLocalizedSpellEffects(effects: AppEffect[], localizedEffects: AppEffect[]): AppEffect[] {
  const localizedByKey = new Map<string, AppEffect[]>()
  for (const effect of localizedEffects) {
    if (!SPELL_ITEM_EFFECT_IDS.has(effect.effect_id ?? -1)) continue
    const key = `${effect.effect_id}:${effect.min}:${effect.max}`
    const matches = localizedByKey.get(key) ?? []
    matches.push(effect)
    localizedByKey.set(key, matches)
  }

  return effects.map(effect => {
    if (!SPELL_ITEM_EFFECT_IDS.has(effect.effect_id ?? -1)) return effect
    const key = `${effect.effect_id}:${effect.min}:${effect.max}`
    const localized = localizedByKey.get(key)?.shift()
    return localized?.formatted ? { ...effect, formatted: localized.formatted } : effect
  })
}

/** English items with translated names, types, descriptions and special spell-effect text. */
export function localizeEquipment(equipmentEn: AppItem[], equipmentLang: AppItem[]): AppItem[] {
  const byId = new Map(equipmentLang.map(it => [it.ankama_id, it]))
  return equipmentEn.map(it => {
    const loc = byId.get(it.ankama_id)
    if (!loc) return it
    return {
      ...it,
      name:        loc.name,
      type:        loc.type,
      description: loc.description,
      ability:     loc.ability,
      effects:     overlayLocalizedSpellEffects(it.effects, loc.effects),
    }
  })
}

export function localizeSets(setsEn: AppSet[], setsLang: AppSet[]): AppSet[] {
  const names = new Map(setsLang.map(s => [s.ankama_id, s.name]))
  return setsEn.map(s => ({ ...s, name: names.get(s.ankama_id) ?? s.name }))
}
