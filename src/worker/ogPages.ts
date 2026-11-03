import satori from 'satori'
import { fullSetTotals, setLevel, setSlugs, statElements } from '../data/setGuide.ts'
import type { OgFont } from './ogImage.ts'
import type { WorkerAppItem, WorkerAppSet } from './data.ts'

// Share cards for set pages and class guides (/og/<lang>/set/<slug>.png,
// /og/<lang>/class/<id>.png), in the same language as the site's own cards
// (docs/brand/dofus-forge): void background, gold Cinzel title, real game icons.

const C = {
  void: '#0a0d13', panel: '#171c28', parch: '#1c2130', edge: '#2b3446', edgeS: '#3a465e',
  gold: '#c9a24b', goldB: '#eccb78', ink: '#e9e5da', muted: '#9aa0b0',
  earth: '#c98a2b', fire: '#e65f40', water: '#2f93d8', air: '#74b93f',
}
const ELEMENT_COLOR: Record<string, string> = { earth: C.earth, fire: C.fire, water: C.water, air: C.air }

function el(type: string, props: Record<string, unknown> = {}, children?: unknown) {
  return { type, props: children === undefined ? props : { ...props, children } }
}

export type OgChip = { label: string; color: string }
export type OgStat = { iconUri?: string; label: string; value: number; color: string }

export type OgSetCard = {
  kicker: string          // "Dofus 3 sets"
  name: string
  chips: OgChip[]         // level, pieces, elements
  items: (string | undefined)[]
  totalsTitle: string
  totals: OgStat[]
  logoUri?: string
  url: string             // dofusforge.com/sets/<slug>
}

export type OgClassCard = {
  kicker: string          // "Build guide"
  title: string           // "Cra builds by element"
  className: string
  portraitUri?: string
  chips: OgChip[]         // the four elements
  sections: string[]      // the guide's sections
  logoUri?: string
  url: string
}

function frame(children: unknown[]) {
  return el('div', {
    style: {
      width: 1200, height: 630, display: 'flex', flexDirection: 'column', padding: '44px 56px',
      background: `radial-gradient(circle at 85% 20%, rgba(201,162,75,0.14), rgba(10,13,19,0) 55%), ${C.void}`,
      fontFamily: 'Inter', color: C.ink, border: `1px solid ${C.edge}`,
    },
  }, children)
}

function brandRow(logoUri: string | undefined, kicker: string) {
  return el('div', { style: { display: 'flex', alignItems: 'center', gap: 14 } }, [
    ...(logoUri ? [el('img', { src: logoUri, width: 44, height: 44 })] : []),
    el('div', { style: { display: 'flex', fontFamily: 'Cinzel', fontSize: 24, color: C.goldB, letterSpacing: 2 } }, 'Dofus Forge'),
    el('div', { style: { display: 'flex', width: 1, height: 26, background: C.edgeS, margin: '0 6px' } }),
    el('div', { style: { display: 'flex', fontSize: 18, color: C.muted, letterSpacing: 3, textTransform: 'uppercase' } }, kicker),
  ])
}

function chipRow(chips: OgChip[]) {
  return el('div', { style: { display: 'flex', gap: 10, marginTop: 18 } }, chips.map(c => el('div', {
    style: {
      display: 'flex', padding: '6px 16px', borderRadius: 999, fontSize: 20, fontWeight: 700,
      color: c.color, border: `1.5px solid ${c.color}`, background: 'rgba(255,255,255,0.02)',
    },
  }, c.label)))
}

function footer(url: string) {
  return el('div', {
    style: { display: 'flex', marginTop: 'auto', paddingTop: 18, borderTop: `1px solid ${C.edge}`, alignItems: 'center', justifyContent: 'space-between' },
  }, [
    el('div', { style: { display: 'flex', fontSize: 22, fontWeight: 700, color: C.gold, letterSpacing: 1 } }, url),
    el('div', { style: { display: 'flex', fontSize: 16, color: C.muted } }, 'Dofus 3'),
  ])
}

function setTree(d: OgSetCard) {
  const title = el('div', {
    style: { display: 'flex', fontFamily: 'Cinzel', fontSize: d.name.length > 28 ? 50 : 62, color: C.goldB, marginTop: 34, lineHeight: 1.05 },
  }, d.name)
  const icons = d.items.filter((src): src is string => !!src).slice(0, 9)
  const items = el('div', { style: { display: 'flex', gap: 12, marginTop: 30 } }, icons.map(src => el('div', {
    style: {
      display: 'flex', width: 92, height: 92, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      background: C.parch, border: `1.5px solid ${C.edgeS}`,
    },
  }, [el('img', { src, width: 72, height: 72 })])))
  const totals = el('div', { style: { display: 'flex', flexDirection: 'column', marginTop: 28 } }, [
    el('div', { style: { display: 'flex', fontSize: 15, color: C.muted, letterSpacing: 3, textTransform: 'uppercase' } }, d.totalsTitle),
    el('div', { style: { display: 'flex', gap: 12, marginTop: 12 } }, d.totals.slice(0, 6).map(s => el('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12,
        background: C.panel, border: `1px solid ${C.edge}`,
      },
    }, [
      ...(s.iconUri ? [el('img', { src: s.iconUri, width: 28, height: 28 })] : []),
      el('div', { style: { display: 'flex', fontFamily: 'JetBrainsMono', fontSize: 24, color: s.color } }, `${s.value > 0 ? '+' : ''}${s.value}`),
      el('div', { style: { display: 'flex', fontSize: 15, color: C.muted } }, s.label),
    ]))),
  ])
  return frame([brandRow(d.logoUri, d.kicker), title, chipRow(d.chips), ...(icons.length ? [items] : []), totals, footer(d.url)])
}

function classTree(d: OgClassCard) {
  const body = el('div', { style: { display: 'flex', gap: 44, flex: 1, alignItems: 'center' } }, [
    el('div', {
      style: {
        display: 'flex', width: 200, height: 200, borderRadius: 32, overflow: 'hidden', alignItems: 'flex-end', justifyContent: 'center',
        border: `2px solid ${C.gold}`, background: C.parch, boxShadow: '0 0 60px rgba(201,162,75,0.25)',
      },
    // Portraits are busts cut at their bottom edge: sit them on the frame's floor.
    }, d.portraitUri ? [el('img', { src: d.portraitUri, width: 196, height: 196 })] : []),
    el('div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } }, [
      el('div', { style: { display: 'flex', fontFamily: 'Cinzel', fontSize: 88, color: C.goldB, lineHeight: 1 } }, d.className),
      el('div', { style: { display: 'flex', fontSize: 30, color: C.ink, marginTop: 14 } }, d.title),
      chipRow(d.chips),
      el('div', { style: { display: 'flex', gap: 22, marginTop: 26 } }, d.sections.map(s => el('div', {
        style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, color: C.muted },
      }, [el('div', { style: { display: 'flex', width: 10, height: 10, background: C.gold, transform: 'rotate(45deg)' } }), s]))),
    ]),
  ])
  return frame([brandRow(d.logoUri, d.kicker), body, footer(d.url)])
}

const satoriOptions = (fonts: OgFont[]) => ({
  width: 1200, height: 630, fonts: fonts.map(f => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
})

export function renderSetSvg(data: OgSetCard, fonts: OgFont[]): Promise<string> {
  return satori(setTree(data) as never, satoriOptions(fonts))
}

export function renderClassSvg(data: OgClassCard, fonts: OgFont[]): Promise<string> {
  return satori(classTree(data) as never, satoriOptions(fonts))
}

// ── Data: the same slugs, levels and totals as the prerendered set pages ──
type SetItem = WorkerAppItem & { level: number }

// Stats that have an OG icon (public/data/stats-og) and a label key in translation.json.
export const CARD_STATS: Record<string, { icon: string; tKey: string; color: string }> = {
  Vitality: { icon: 'vitality', tKey: 'stat_vitality', color: '#db5a74' },
  Wisdom: { icon: 'wisdom', tKey: 'stat_wisdom', color: '#a06fd0' },
  Strength: { icon: 'strength', tKey: 'stat_strength', color: C.earth },
  Intelligence: { icon: 'intelligence', tKey: 'stat_intelligence', color: C.fire },
  Chance: { icon: 'chance', tKey: 'stat_chance', color: C.water },
  Agility: { icon: 'agility', tKey: 'stat_agility', color: C.air },
  AP: { icon: 'ap', tKey: 'stat_ap', color: '#38a7cf' },
  MP: { icon: 'mp', tKey: 'stat_mp', color: '#4fae5a' },
  Range: { icon: 'range', tKey: 'stat_range', color: C.goldB },
}

let slugIndex: { sets: WorkerAppSet[]; bySlug: Map<string, number> } | null = null

/** slug → set id, computed once per isolate from the English catalog, exactly like the prerender does. */
export function setIdForSlug(slug: string, setsEn: WorkerAppSet[], equipmentEn: WorkerAppItem[]): number | undefined {
  if (!slugIndex || slugIndex.sets !== setsEn) {
    const slugs = setSlugs(setsEn, new Set(equipmentEn.map(it => it.ankama_id)))
    slugIndex = { sets: setsEn, bySlug: new Map([...slugs].map(([id, s]) => [s, id])) }
  }
  return slugIndex.bySlug.get(slug)
}

export function setFacts(set: WorkerAppSet, equipmentEn: WorkerAppItem[]) {
  const byId = new Map(equipmentEn.map(it => [it.ankama_id, it as SetItem]))
  const items = set.items.flatMap(id => (byId.has(id) ? [byId.get(id)!] : [])).sort((a, b) => b.level - a.level || a.ankama_id - b.ankama_id)
  const totals = fullSetTotals(set, items)
  return {
    items,
    level: setLevel(items),
    elements: statElements(totals),
    totals: totals.list().filter(t => CARD_STATS[t.stat]),
  }
}

export { ELEMENT_COLOR }
