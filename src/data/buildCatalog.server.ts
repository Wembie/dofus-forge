import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { itemImageUrl, type AppItem, type AppSet } from './loaders.ts'
import { localizeEquipment, localizeSets } from './localizeItems.ts'
import type { PathLang } from '@/i18n/langPath.ts'

// Read while prerendering (react-router.config.ts), from the same files the
// browser fetches from /data.
const DATA = join(process.cwd(), 'public', 'data')

async function readJson<T>(lang: string, file: string): Promise<T> {
  return JSON.parse(await readFile(join(DATA, lang, file), 'utf-8')) as T
}

type Catalog = { items: Map<number, AppItem>; sets: Map<number, AppSet> }
const catalogs = new Map<PathLang, Promise<Catalog>>()

// Built the way dataStore builds it in the browser, once per language for
// the whole prerender (the equipment file alone is ~5 MB).
function catalog(lang: PathLang): Promise<Catalog> {
  let pending = catalogs.get(lang)
  if (!pending) {
    pending = (async () => {
      const [equipmentEn, setsEn] = await Promise.all([readJson<AppItem[]>('en', 'equipment.json'), readJson<AppSet[]>('en', 'sets.json')])
      let equipment = equipmentEn.map(item => ({ ...item, image_url: itemImageUrl(item.image_url) }))
      let sets = setsEn
      if (lang !== 'en') {
        const [equipmentLang, setsLang] = await Promise.all([readJson<AppItem[]>(lang, 'equipment.json'), readJson<AppSet[]>(lang, 'sets.json')])
        equipment = localizeEquipment(equipment, equipmentLang)
        sets = localizeSets(setsEn, setsLang)
      }
      return { items: new Map(equipment.map(it => [it.ankama_id, it])), sets: new Map(sets.map(s => [s.ankama_id, s])) }
    })()
    catalogs.set(lang, pending)
  }
  return pending
}

/**
 * Just the build's equipped items and their sets: enough for the page to
 * compute stats, active set bonuses and passives exactly as it does with the
 * full catalog, without shipping ~5 MB in the page. The browser switches to
 * the full catalog once it loads, with the same results.
 */
export async function equippedCatalog(lang: PathLang, equippedIds: (number | null)[]) {
  const { items, sets } = await catalog(lang)
  const equipped = [...new Set(equippedIds)].flatMap(id => (id != null && items.has(id) ? [items.get(id)!] : []))
  const setIds = new Set(equipped.flatMap(it => (it.set_id != null ? [it.set_id] : [])))
  return { items: equipped, sets: [...setIds].flatMap(id => (sets.has(id) ? [sets.get(id)!] : [])) }
}
