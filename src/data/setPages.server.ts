import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { AppItem, AppSet } from './loaders.ts'
import { catalog } from './buildCatalog.server.ts'
import {
  GUIDE_ELEMENTS, LEVEL_BRACKETS, elementScore, fullSetTotals, gearTotals, setClass, setLevel, setSlugs, statElements,
  type GuideBuild, type GuideElement, type SetLink, type StatTotal,
} from './setGuide.ts'
import { fetchPublicBuilds, type BuildRow } from '@/features/builds/api.ts'
import type { PathLang } from '@/i18n/langPath.ts'

// Read while prerendering (react-router.config.ts): the set pages, the sets
// index and the class guides' set and build sections.
const DATA = join(process.cwd(), 'public', 'data')

type SetEntry = SetLink & { items: AppItem[]; set: AppSet; scores: Record<GuideElement, number> }

type Guide = { entries: SetEntry[]; bySlug: Map<string, SetEntry> }

async function classBySpellId(): Promise<Map<number, string>> {
  const dir = join(DATA, 'en', 'spells')
  const files = (await readdir(dir)).filter(f => f.endsWith('.json') && f !== 'common.json')
  const map = new Map<number, string>()
  for (const file of files) {
    const { spells } = JSON.parse(await readFile(join(dir, file), 'utf-8')) as { spells: { id: number }[] }
    for (const sp of spells) map.set(sp.id, file.slice(0, -'.json'.length))
  }
  return map
}

const guides = new Map<PathLang, Promise<Guide>>()

/** Every set page's data for one language, built once per prerender. */
function guide(lang: PathLang): Promise<Guide> {
  let pending = guides.get(lang)
  if (!pending) {
    pending = (async () => {
      const [en, local, spellClasses] = await Promise.all([catalog('en'), catalog(lang), classBySpellId()])
      const slugs = setSlugs([...en.sets.values()], new Set(en.items.keys()))
      const entries: SetEntry[] = []
      for (const [id, slug] of slugs) {
        const set = local.sets.get(id)!
        const items = set.items.flatMap(itemId => (local.items.has(itemId) ? [local.items.get(itemId)!] : [])).sort((a, b) => b.level - a.level || a.ankama_id - b.ankama_id)
        const totals = fullSetTotals(set, items)
        entries.push({
          id, slug, set, items,
          name:     set.name,
          level:    setLevel(items),
          pieces:   items.length,
          icon:     items[0]?.image_url ?? null,
          elements: statElements(totals),
          classId:  setClass(items, spellClasses),
          scores:   Object.fromEntries(GUIDE_ELEMENTS.map(el => [el, elementScore(totals, el)])) as Record<GuideElement, number>,
        })
      }
      entries.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, lang))
      return { entries, bySlug: new Map(entries.map(e => [e.slug, e])) }
    })()
    guides.set(lang, pending)
  }
  return pending
}

const toLink = ({ id, slug, name, level, pieces, icon, elements, classId }: SetEntry): SetLink => ({ id, slug, name, level, pieces, icon, elements, classId })

/** Every set slug, for the list of pages to prerender and the sitemap. */
export async function allSetSlugs(): Promise<string[]> {
  return (await guide('en')).entries.map(e => e.slug)
}

export async function loadSetsIndex(lang: PathLang) {
  return { sets: (await guide(lang)).entries.map(toLink) }
}

let publicBuildsRequest: Promise<BuildRow[]> | null = null

/** The public builds (gear only), once per prerender. Empty without Supabase (CI). */
function publicBuilds(): Promise<BuildRow[]> {
  return (publicBuildsRequest ??= fetchPublicBuilds({ sort: 'rating', page: 0, pageSize: 1000 }).then(r => (r.error ? [] : r.data)))
}

function toGuideBuild(build: BuildRow, elements: GuideElement[]): GuideBuild {
  return {
    id:        build.id,
    name:      build.name,
    classSlug: build.class_slug,
    gender:    build.gender,
    level:     build.level,
    rating:    build.avg_rating,
    likes:     build.like_count,
    author:    build.profiles?.username ?? null,
    elements,
  }
}

const SET_PAGE_RELATED = 6
const SET_PAGE_BUILDS = 6

export async function loadSetPage(lang: PathLang, slug: string) {
  const { entries, bySlug } = await guide(lang)
  const entry = bySlug.get(slug)
  if (!entry) return null

  const { set, items } = entry
  const tiers = Object.entries(set.bonuses)
    .map(([pieces, effects]) => ({ pieces: Number(pieces), effects }))
    .sort((a, b) => a.pieces - b.pieces)

  // Closest in level, sharing an element when this set has one.
  const related = entries
    .filter(e => e.id !== entry.id && (entry.elements.length === 0 || e.elements.some(el => entry.elements.includes(el))))
    .sort((a, b) => Math.abs(a.level - entry.level) - Math.abs(b.level - entry.level) || b.pieces - a.pieces)
    .slice(0, SET_PAGE_RELATED)
    .map(toLink)

  const itemIds = new Set(set.items)
  const builds = (await publicBuilds())
    .filter(b => b.snapshot.e.some(id => id != null && itemIds.has(id)))
    .slice(0, SET_PAGE_BUILDS)
    .map(b => toGuideBuild(b, []))

  return {
    set:    toLink(entry),
    items:  items.map(({ ankama_id, name, level, type, slot, effects, image_url, description, conditions }) => ({ ankama_id, name, level, type, slot, effects, image_url, description, conditions })),
    tiers,
    totals: fullSetTotals(set, items).list() satisfies StatTotal[],
    related,
    builds,
  }
}

export type SetPageData = NonNullable<Awaited<ReturnType<typeof loadSetPage>>>

const BEST_PER_BRACKET = 3
const CLASS_BUILDS = 8

/**
 * The class guide's build sections: the strongest sets of each element in
 * every level bracket, the sets made for the class (they modify its spells)
 * and its community builds, each tagged with the elements its gear plays.
 */
export async function loadClassBuildGuide(lang: PathLang, classId: string) {
  const [{ entries }, local] = await Promise.all([guide(lang), catalog(lang)])

  const byElement = Object.fromEntries(GUIDE_ELEMENTS.map(el => [el, LEVEL_BRACKETS.map(([min, max]) => ({
    min, max,
    sets: entries
      .filter(e => e.level >= min && e.level <= max && e.scores[el] > 0 && e.elements.includes(el))
      .sort((a, b) => b.scores[el] - a.scores[el])
      .slice(0, BEST_PER_BRACKET)
      .map(toLink),
  })).filter(bracket => bracket.sets.length > 0)])) as Record<GuideElement, { min: number; max: number; sets: SetLink[] }[]>

  const classSets = entries.filter(e => e.classId === classId).map(toLink)

  const builds = (await publicBuilds())
    .filter(b => b.class_slug === classId)
    .slice(0, CLASS_BUILDS)
    .map(b => {
      const gear = b.snapshot.e.flatMap(id => (id != null && local.items.has(id) ? [local.items.get(id)!] : []))
      return toGuideBuild(b, statElements(gearTotals(gear, local.sets)))
    })

  return { byElement, classSets, builds }
}
