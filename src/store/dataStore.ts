import { create } from 'zustand'
import { loadVersion, loadIndex, loadEquipment, loadSets, type IndexItem, type AppItem, type AppSet } from '@/data/loaders.ts'
import { fetchSpells, type ClassSpells } from '@/data/spellLoaders.ts'
import { useBuildStore } from './buildStore.ts'

interface DataState {
  lang:       string
  index:      IndexItem[] | null
  equipment:  AppItem[] | null
  sets:       AppSet[] | null
  spells:     Map<string, ClassSpells>
  loading:    boolean
  error:      string | null
  load:       (lang: string) => Promise<void>
  loadSpells: (lang: string, classSlug: string) => Promise<void>
}

export const useDataStore = create<DataState>((set, get) => ({
  lang:      'en',
  index:     null,
  equipment: null,
  sets:      null,
  spells:    new Map(),
  loading:   false,
  error:     null,

  load: async (lang) => {
    if (get().loading) return
    set({ loading: true, error: null, lang, spells: new Map() })
    try {
      // Load version first — use gameVersion as cache-buster so when game data
      // updates the browser fetches fresh JSON instead of serving stale cache.
      const { gameVersion } = await loadVersion()
      const v = gameVersion

      // Base data always English — STAT_META/STAT_MAP keys must match stat names.
      // Non-English stat strings (e.g. "fuerza", "vitalidad") are not in STAT_MAP
      // so they'd produce no icons, colors, or engine values.
      const [indexEn, equipmentEn, setsEn] = await Promise.all([
        loadIndex('en', v),
        loadEquipment('en', v),
        loadSets('en', v),
      ])

      let index     = indexEn
      let equipment = equipmentEn
      let sets      = setsEn

      // For non-English: overlay translated item/set names onto the English base.
      // Effects and slot identifiers stay English so the engine keeps working.
      if (lang !== 'en') {
        const [indexLang, equipLang, setsLang] = await Promise.all([
          loadIndex(lang, v),
          loadEquipment(lang, v),
          loadSets(lang, v),
        ])

        const indexNames = new Map(indexLang.map(it => [it.id,         it.name]))
        const itemNames  = new Map(equipLang.map (it => [it.ankama_id, it.name]))
        const setNames   = new Map(setsLang.map  (s  => [s.ankama_id,  s.name]))

        index     = indexEn.map(it => ({ ...it, name: indexNames.get(it.id)           ?? it.name }))
        equipment = equipmentEn.map(it => ({ ...it, name: itemNames.get(it.ankama_id) ?? it.name }))
        sets      = setsEn.map(s  => ({ ...s,  name: setNames.get(s.ankama_id)        ?? s.name  }))
      }

      set({ index, equipment, sets, loading: false })
      useBuildStore.getState().setEquipment(equipment)
      useBuildStore.getState().setSetsData(sets)
    } catch (e) {
      set({ loading: false, error: String(e) })
    }
  },

  // Spells always English — spell effect stat names must match STAT_MAP keys.
  loadSpells: async (_lang, classSlug) => {
    const current = get().spells
    if (current.has(classSlug) && current.has('common')) return
    try {
      const next = new Map(current)
      if (!next.has(classSlug)) {
        const data = await fetchSpells('en', classSlug)
        next.set(classSlug, data)
      }
      if (!next.has('common')) {
        try {
          const commonData = await fetchSpells('en', 'common')
          next.set('common', commonData)
        } catch { /* common spells optional */ }
      }
      set({ spells: next })
    } catch {
      // spell files absent until ETL runs — fail silently
    }
  },
}))
