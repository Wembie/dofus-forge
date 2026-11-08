import { renderBuildSvg, type OgFont } from './ogImage.ts'
import { CARD_STATS, ELEMENT_COLOR, renderClassSvg, renderSetSvg, setFacts, setIdForSlug, type OgChip } from './ogPages.ts'
import { getClassNames, getEquipment, getSets, getTranslation, statIconDataUri, toDataUri, type Lang } from './data.ts'
import { buildOgImageData } from './buildImageData.ts'
import type { BuildMeta } from './supabase.ts'

/**
 * Share-card rendering, shared by the Worker (renders on a miss) and
 * scripts/og-pregenerate.ts (renders every set and class card ahead of time
 * in Node). Both give it the same inputs: the site's static files through a
 * Fetcher, item icons through an R2-like bucket, and the card fonts. Output
 * is SVG; each runtime rasterizes it with its own resvg build.
 *
 * Set and class cards are split in two steps: their *input* (every text,
 * number and image path the card shows, cheap to compute) and the render
 * (images inlined, SVG laid out, then rasterized: 0.3–1.4 s of CPU). The
 * pre-generation job hashes the input and re-renders only the cards whose
 * hash changed, so a game patch that touches ten sets re-renders ten cards.
 */
export type OgSources = {
  assets: Fetcher
  origin: string
  bucket?: Pick<R2Bucket, 'get'>
  fonts: OgFont[]
}

/** Namespace of the stored keys; a new layout of the keys themselves gets a new one. */
export const OG_KEY_VERSION = 1

/** The OG_BUCKET binding's bucket in wrangler.jsonc (a test keeps them equal). */
export const OG_BUCKET_NAME = 'dofus-forge-og'

/**
 * One object per page card, overwritten in place when its content changes
 * (scripts/og-pregenerate.ts): storage stays one card per page instead of
 * one per game version, and these keys never expire.
 */
export const pageCardKey = (lang: Lang, kind: 'set' | 'class', slug: string) =>
  `v${OG_KEY_VERSION}/pages/${lang}/${kind}/${slug}.png`

/** What the pre-generation job last stored for one shard: key → content hash. */
export const pageManifestKey = (shard: number, shards: number) =>
  `v${OG_KEY_VERSION}/pages/_manifest/${shard}-of-${shards}.json`

/**
 * A build's card changes with its content, so updated_at is part of the key.
 * Old versions expire from the bucket (lifecycle rule on this prefix only).
 */
export const BUILD_CARDS_PREFIX = `v${OG_KEY_VERSION}/builds/`
export const buildCardKey = (id: string, lang: Lang, updatedAt: string) =>
  `${BUILD_CARDS_PREFIX}${id.toLowerCase()}/${lang}-${Date.parse(updatedAt) || 0}.png`

// The brand mark drawn on every generated card (docs/brand/dofus-forge, --apply copies it).
const LOGO_PATH = '/brand/mark-256.png'

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''))
}

const translator = (translation: Record<string, string>) =>
  (key: string, vars: Record<string, string | number> = {}) => interpolate(translation[key] ?? key, vars)

/** sha-256 hex of a card's input plus a fingerprint of everything that draws it (code, fonts, images). */
export async function cardHash(rendererFingerprint: string, input: PageCardInput): Promise<string> {
  const bytes = new TextEncoder().encode(`${rendererFingerprint}\n${JSON.stringify(input)}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Build cards ──────────────────────────────────────────────────────────

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

// ── Set and class cards: input, then render ──────────────────────────────

export type SetCardInput = {
  kind: 'set'
  kicker: string
  name: string
  chips: OgChip[]
  /** Item image paths (/img/item/<file>), up to 9; their pixels come from the bucket at render time. */
  itemImages: (string | null)[]
  totalsTitle: string
  totals: { icon: string; label: string; value: number; color: string }[]
  url: string
}

export type ClassCardInput = {
  kind: 'class'
  slug: string
  title: string
  className: string
  chips: OgChip[]
  sections: string[]
  url: string
}

export type PageCardInput = SetCardInput | ClassCardInput

/** null when no set has this slug. */
export async function setCardInput(src: OgSources, lang: Lang, slug: string): Promise<SetCardInput | null> {
  const { assets, origin } = src
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
  const t = translator(translation)
  const prefix = lang === 'en' ? '' : `/${lang}`
  return {
    kind: 'set',
    kicker: t('sets_page_title'),
    name: setsLang.find(s => s.ankama_id === id)?.name ?? set.name,
    chips: [
      { label: t('sets_card_level', { level: facts.level }), color: '#eccb78' },
      { label: t('sets_card_pieces_other', { count: facts.items.length }), color: '#9aa0b0' },
      ...facts.elements.map(e => ({ label: t(`elem_${e}_label`), color: ELEMENT_COLOR[e] })),
    ],
    itemImages: facts.items.slice(0, 9).map(it => it.image_url),
    totalsTitle: t('set_page_totals_title'),
    totals: facts.totals.slice(0, 6).map(s => ({
      icon: CARD_STATS[s.stat].icon,
      label: t(CARD_STATS[s.stat].tKey),
      value: s.value,
      color: CARD_STATS[s.stat].color,
    })),
    url: `dofusforge.com${prefix}/sets/${slug}`,
  }
}

/** null when no class has this slug. */
export async function classCardInput(src: OgSources, lang: Lang, slug: string): Promise<ClassCardInput | null> {
  const { assets, origin } = src
  const [classNames, translation] = await Promise.all([getClassNames(assets, origin), getTranslation(assets, origin, lang)])
  const className = classNames[slug]?.[lang]
  if (!className) return null
  const t = translator(translation)
  const prefix = lang === 'en' ? '' : `/${lang}`
  return {
    kind: 'class',
    slug,
    title: t('class_guide_elements_title', { class: className }),
    className,
    chips: (['earth', 'fire', 'water', 'air'] as const).map(e => ({ label: t(`elem_${e}_label`), color: ELEMENT_COLOR[e] })),
    sections: [t('class_guide_nav_class_sets'), t('class_guide_nav_builds'), t('class_guide_nav_spells')],
    url: `dofusforge.com${prefix}/classes/${slug}`,
  }
}

export async function renderPageCard(src: OgSources, input: PageCardInput): Promise<string> {
  const { assets, origin, bucket } = src
  const logoUri = await toDataUri(assets, origin, LOGO_PATH)
  if (input.kind === 'class') {
    return renderClassSvg({
      kicker: 'Dofus 3',
      title: input.title,
      className: input.className,
      portraitUri: await toDataUri(assets, origin, `/data/classes/${input.slug}.png`),
      chips: input.chips,
      sections: input.sections,
      logoUri,
      url: input.url,
    }, src.fonts)
  }
  const [items, totals] = await Promise.all([
    Promise.all(input.itemImages.map(async image => {
      if (!image) return undefined
      // Same fallback as /img/item: an icon missing from R2 comes from DofusDude's live CDN.
      return (await toDataUri(assets, origin, image, bucket as R2Bucket | undefined))
        ?? toDataUri(assets, origin, `https://api.dofusdu.de/dofus3/v1/img/item/${image.split('/').pop()}`)
    })),
    Promise.all(input.totals.map(async s => ({
      iconUri: await statIconDataUri(assets, origin, s.icon),
      label: s.label,
      value: s.value,
      color: s.color,
    }))),
  ])
  return renderSetSvg({
    kicker: input.kicker,
    name: input.name,
    chips: input.chips,
    items,
    totalsTitle: input.totalsTitle,
    totals,
    logoUri,
    url: input.url,
  }, src.fonts)
}

/** Input and render in one go (the Worker, on a miss). null when the page does not exist. */
export async function renderSetCard(src: OgSources, lang: Lang, slug: string): Promise<string | null> {
  const input = await setCardInput(src, lang, slug)
  return input && renderPageCard(src, input)
}

export async function renderClassCard(src: OgSources, lang: Lang, slug: string): Promise<string | null> {
  const input = await classCardInput(src, lang, slug)
  return input && renderPageCard(src, input)
}
