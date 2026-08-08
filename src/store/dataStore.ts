import { create } from 'zustand'
import { loadIndex, loadEquipment, loadSets, type IndexItem, type AppItem, type AppSet } from '@/data/loaders.ts'
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
      // Always load item/stat data in English — STAT_META and STAT_MAP keys are
      // English-only. Non-English data would produce unmatched stat names with no
      // icons, colors, or labels. UI language (i18next) handles UI strings separately.
      const [index, equipment, sets] = await Promise.all([
        loadIndex('en'),
        loadEquipment('en'),
        loadSets('en'),
      ])
      set({ index, equipment, sets, loading: false })
      useBuildStore.getState().setEquipment(equipment)
      useBuildStore.getState().setSetsData(sets)
    } catch (e) {
      set({ loading: false, error: String(e) })
    }
  },

  loadSpells: async (_lang, classSlug) => {
    if (get().spells.has(classSlug)) return
    try {
      const data = await fetchSpells('en', classSlug)
      const next = new Map(get().spells)
      next.set(classSlug, data)
      set({ spells: next })
    } catch {
      // spell files absent until ETL runs — fail silently
    }
  },
}))
