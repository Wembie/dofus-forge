import { create } from 'zustand'
import { loadIndex, loadEquipment, loadSets, type IndexItem, type AppItem, type AppSet } from '@/data/loaders.ts'
import { useBuildStore } from './buildStore.ts'

interface DataState {
  lang:      string
  index:     IndexItem[] | null
  equipment: AppItem[] | null
  sets:      AppSet[] | null
  loading:   boolean
  error:     string | null
  load:      (lang: string) => Promise<void>
}

export const useDataStore = create<DataState>((set, get) => ({
  lang:      'en',
  index:     null,
  equipment: null,
  sets:      null,
  loading:   false,
  error:     null,

  load: async (lang) => {
    if (get().loading) return
    set({ loading: true, error: null, lang })
    try {
      const [index, equipment, sets] = await Promise.all([
        loadIndex(lang),
        loadEquipment(lang),
        loadSets(lang),
      ])
      set({ index, equipment, sets, loading: false })
      useBuildStore.getState().setEquipment(equipment)
      useBuildStore.getState().setSetsData(sets)
    } catch (e) {
      set({ loading: false, error: String(e) })
    }
  },
}))
