import { renderBuildSvg, type OgFont } from './ogImage.ts'
import { CARD_STATS, ELEMENT_COLOR, renderClassSvg, renderSetSvg, setFacts, setIdForSlug } from './ogPages.ts'
import { getClassNames, getEquipment, getSets, getTranslation, statIconDataUri, toDataUri, type Lang } from './data.ts'
import { buildOgImageData } from './buildImageData.ts'
import type { BuildMeta } from './supabase.ts'

/**
 * Share-card rendering, shared by the Worker (renders on a miss) and
 * scripts/og-pregenerate.ts (renders every set and class card ahead of time
 * in Node). Both give it the same inputs: the site's static files through a
 * Fetcher, item icons through an R2-like bucket, and the card fonts. Output
 * is SVG; each runtime rasterizes it with its own resvg build.
 */
export type OgSources = {
  assets: Fetcher
  origin: string
  bucket?: Pick<R2Bucket, 'get'>
  fonts: OgFont[]
}

/**
 * Part of every stored card's key: bump it when a card's design, its data or
 * the translation keys it shows change, so stored PNGs from before are never
 * served again (they expire from the bucket on their own).
 */
export const OG_RENDER_VERSION = 1

export const pageCardKey = (gameVersion: string, lang: Lang, kind: 'set' | 'class', slug: string) =>
  `v${OG_RENDER_VERSION}/pages/${gameVersion}/${lang}/${kind}/${slug}.png`

/** Marker written once every page card of a game version is stored. */
export const pageCardsCompleteKey = (gameVersion: string) => `v${OG_RENDER_VERSION}/pages/${gameVersion}/_complete`

/** A build's card changes with its content, so updated_at is part of the key. */
export const buildCardKey = (id: string, lang: Lang, updatedAt: string) =>
  `v${OG_RENDER_VERSION}/builds/${id.toLowerCase()}/${lang}-${Date.parse(updatedAt) || 0}.png`

// The brand mark drawn on every generated card (docs/brand/dofus-forge, --apply copies it).
const LOGO_PATH = '/brand/mark-256.png'

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''))
}

export async function renderBuildCard(src: OgSources, lang: Lang, build: BuildMeta): Promise<string> {
  const { assets, origin, bucket } = src
  // Stats must be computed from the English equipment/sets data, same as the
  // client (store/dataStore.ts): STAT_MAP's keys are English effect names, so
  // feeding it a localized item's `effects` (e.g. "vitalidad" instead of
  // "Vitality") makes every gear bonus silently fall into unknownStats and
  // the image shows only base characteristic points, nowhere near the real
  // totals. The requested `lang` only overlays item *names* for display.
  const [equipmentEn, setsEn, classNames, translation] = await Promise.all([
    getEquipment(assets, origin, 'en'),
    getSets(assets, origin, 'en'),
    getClassNames(assets, origin),
    getTranslation(assets, origin, lang),
  ])

  let equipment = equipmentEn
  let sets = setsEn
  if (lang !== 'en') {
    const [equipmentLang, setsLang] = await Promise.all([
      getEquipment(assets, origin, lang),
      getSets(assets, origin, lang),
    ])
    const nameBySlotId = new Map(equipmentLang.map(it => [it.ankama_id, it.name]))
    const setNameById = new Map(setsLang.map(s => [s.ankama_id, s.name]))
    equipment = equipmentEn.map(it => ({ ...it, name: nameBySlotId.get(it.ankama_id) ?? it.name }))
    sets = setsEn.map(s => ({ ...s, name: setNameById.get(s.ankama_id) ?? s.name }))
  }

  const classLabel = classNames[build.class_slug]?.[lang] ?? build.class_slug

  const data = await buildOgImageData(assets, origin, build, equipment, sets, classLabel, translation, bucket as R2Bucket | undefined)
  const portraitPath = `/data/classes/${build.class_slug}${build.gender === 'female' ? '-f' : ''}.png`
  const [portraitUri, logoUri] = await Promise.all([
    toDataUri(assets, origin, portraitPath),
    toDataUri(assets, origin, LOGO_PATH),
  ])

  return renderBuildSvg({ ...data, portraitUrl: portraitUri ?? '', logoUrl: logoUri }, src.fonts)
}

/** null when no set has this slug. */
export async function renderSetCard(src: OgSources, lang: Lang, slug: string): Promise<string | null> {
  const { assets, origin, bucket } = src
  const [setsEn, equipmentEn, setsLang, translation] = await Promise.all([
    getSets(assets, origin, 'en'),
    getEquipment(assets, origin, 'en'),
    getSets(assets, origin, lang),
    getTranslation(assets, origin, lang),
  ])
  const id = setIdForSlug(slug, setsEn, equipmentEn)
  const set = id === undefined ? undefined : setsEn.find(s => s.ankama_id === id)
  if (!set) return null

  const facts = setFacts(set, equipmentEn)
  const name = setsLang.find(s => s.ankama_id === id)?.name ?? set.name
  const t = (key: string, vars: Record<string, string | number> = {}) => interpolate(translation[key] ?? key, vars)
  const [items, totals, logoUri] = await Promise.all([
    Promise.all(facts.items.slice(0, 9).map(async it => {
      if (!it.image_url) return undefined
      // Same fallback as /img/item: an icon missing from R2 comes from DofusDude's live CDN.
      return (await toDataUri(assets, origin, it.image_url, bucket as R2Bucket | undefined))
        ?? toDataUri(assets, origin, `https://api.dofusdu.de/dofus3/v1/img/item/${it.image_url.split('/').pop()}`)
    })),
    Promise.all(facts.totals.slice(0, 6).map(async s => ({
      iconUri: await statIconDataUri(assets, origin, CARD_STATS[s.stat].icon),
      label: t(CARD_STATS[s.stat].tKey),
      value: s.value,
      color: CARD_STATS[s.stat].color,
    }))),
    toDataUri(assets, origin, LOGO_PATH),
  ])
  const prefix = lang === 'en' ? '' : `/${lang}`
  return renderSetSvg({
    kicker: t('sets_page_title'),
    name,
    chips: [
      { label: t('sets_card_level', { level: facts.level }), color: '#eccb78' },
      { label: t('sets_card_pieces_other', { count: facts.items.length }), color: '#9aa0b0' },
      ...facts.elements.map(e => ({ label: t(`elem_${e}_label`), color: ELEMENT_COLOR[e] })),
    ],
    items,
    totalsTitle: t('set_page_totals_title'),
    totals,
    logoUri,
    url: `dofusforge.com${prefix}/sets/${slug}`,
  }, src.fonts)
}

/** null when no class has this slug. */
export async function renderClassCard(src: OgSources, lang: Lang, slug: string): Promise<string | null> {
  const { assets, origin } = src
  const [classNames, translation] = await Promise.all([getClassNames(assets, origin), getTranslation(assets, origin, lang)])
  const className = classNames[slug]?.[lang]
  if (!className) return null
  const t = (key: string, vars: Record<string, string | number> = {}) => interpolate(translation[key] ?? key, vars)
  const [portraitUri, logoUri] = await Promise.all([
    toDataUri(assets, origin, `/data/classes/${slug}.png`),
    toDataUri(assets, origin, LOGO_PATH),
  ])
  const prefix = lang === 'en' ? '' : `/${lang}`
  return renderClassSvg({
    kicker: 'Dofus 3',
    title: t('class_guide_elements_title', { class: className }),
    className,
    portraitUri,
    chips: (['earth', 'fire', 'water', 'air'] as const).map(e => ({ label: t(`elem_${e}_label`), color: ELEMENT_COLOR[e] })),
    sections: [t('class_guide_nav_class_sets'), t('class_guide_nav_builds'), t('class_guide_nav_spells')],
    logoUri,
    url: `dofusforge.com${prefix}/classes/${slug}`,
  }, src.fonts)
}
