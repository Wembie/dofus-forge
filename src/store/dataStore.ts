import { create } from 'zustand'
import { loadVersion, loadIndex, loadEquipment, loadSets, loadClassNames, type IndexItem, type AppEffect, type AppItem, type AppSet } from '@/data/loaders.ts'
import { fetchSpells, type ClassSpells } from '@/data/spellLoaders.ts'
import { useBuildStore } from './buildStore.ts'
import { SPELL_ITEM_EFFECT_IDS } from '@/data/effectIds.ts'

interface DataState {
  lang:        string
  index:       IndexItem[] | null
  equipment:   AppItem[] | null
  sets:        AppSet[] | null
  classNames:  Record<string, Record<string, string>> | null
  spells:      Map<string, ClassSpells>
  loading:     boolean
  error:       string | null
  load:        (lang: string) => Promise<void>
  loadSpells:  (lang: string, classSlug: string) => Promise<void>
}

// Bumped by every load(): a response from an older request (e.g. the first
// load still running when the user switches language) must not overwrite
// the newer one.
let loadSeq = 0

function overlayLocalizedSpellEffects(effects: AppEffect[], localizedEffects: AppEffect[]): AppEffect[] {
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

export const useDataStore = create<DataState>((set, get) => ({
  lang:       'en',
  index:      null,
  equipment:  null,
  sets:       null,
  classNames: null,
  spells:     new Map(),
  loading:    false,
  error:      null,

  load: async (lang) => {
    if (get().loading && get().lang === lang) return
    const seq = ++loadSeq
    set({ loading: true, error: null, lang, spells: new Map() })
    try {
      // Load version first — use gameVersion as cache-buster so when game data
      // updates the browser fetches fresh JSON instead of serving stale cache.
      const { gameVersion } = await loadVersion()
      const v = gameVersion

      // Base data always English — STAT_META/STAT_MAP keys must match stat names.
      // Non-English stat strings (e.g. "fuerza", "vitalidad") are not in STAT_MAP
      // so they'd produce no icons, colors, or engine values.
      const [indexEn, equipmentEn, setsEn, classNames] = await Promise.all([
        loadIndex('en', v),
        loadEquipment('en', v),
        loadSets('en', v),
        loadClassNames(v).catch(() => null),  // optional — older cached deploys may lack the file
      ])

      let index     = indexEn
      let equipment = equipmentEn
      let sets      = setsEn

      // For non-English: keep English stat identifiers for the engine while
      // overlaying translated item names and special spell-effect descriptions.
      if (lang !== 'en') {
        const [indexLang, equipLang, setsLang] = await Promise.all([
          loadIndex(lang, v),
          loadEquipment(lang, v),
          loadSets(lang, v),
        ])

        const indexNames = new Map(indexLang.map(it => [it.id,         it.name]))
        const itemLocMap = new Map(equipLang.map (it => [it.ankama_id, it]))
        const setNames   = new Map(setsLang.map  (s  => [s.ankama_id,  s.name]))

        index     = indexEn.map(it => ({ ...it, name: indexNames.get(it.id) ?? it.name }))
        equipment = equipmentEn.map(it => {
          const loc = itemLocMap.get(it.ankama_id)
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
        sets      = setsEn.map(s  => ({ ...s,  name: setNames.get(s.ankama_id) ?? s.name }))
      }

      if (seq !== loadSeq) return
      set({ index, equipment, sets, classNames, loading: false })
      useBuildStore.getState().setEquipment(equipment)
      useBuildStore.getState().setSetsData(sets)
    } catch (e) {
      if (seq === loadSeq) set({ loading: false, error: String(e) })
    }
  },

  // Effects stay English (STAT_MAP keys). Overlay translated spell names for display.
  loadSpells: async (lang, classSlug) => {
    const current = get().spells
    if (current.has(classSlug) && current.has('common')) return
    try {
      const next = new Map<string, ClassSpells>()
      if (!current.has(classSlug)) {
        const data = await fetchSpells('en', classSlug)
        if (lang !== 'en') {
          try {
            const langData = await fetchSpells(lang, classSlug)
            const langMap = new Map(langData.spells.map(sp => [sp.id, sp]))
            data.spells = data.spells.map(sp => {
              const loc = langMap.get(sp.id)
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
          } catch { /* lang spell file optional */ }
        }
        next.set(classSlug, data)
      }
      if (!current.has('common')) {
        try {
          const commonData = await fetchSpells('en', 'common')
          if (lang !== 'en') {
            try {
              const langCommon = await fetchSpells(lang, 'common')
              const langMap = new Map(langCommon.spells.map(sp => [sp.id, sp]))
              commonData.spells = commonData.spells.map(sp => {
                const loc = langMap.get(sp.id)
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
            } catch { /* lang common file optional */ }
          }
          next.set('common', commonData)
        } catch { /* common spells optional */ }
      }
      // A language switch while fetching resets `spells`; these results would
      // put old-language names back. Merge into the live map so a class
      // loaded concurrently isn't dropped either.
      if (get().lang !== lang) return
      set(s => {
        const spells = new Map(s.spells)
        for (const [k, v] of next) if (!spells.has(k)) spells.set(k, v)
        return { spells }
      })
    } catch {
      // spell files absent until ETL runs — fail silently
    }
  },
}))
