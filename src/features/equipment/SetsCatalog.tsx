import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, ChartNoAxesColumn, Check, Search } from 'lucide-react'
import { recompute, useBuildStore, type SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { useToastStore } from '@/store/toastStore.ts'
import { Modal, normalizeSearch, slotToastIcon } from '@/ui'
import { playEquip, playUnequip } from '@/lib/sound.ts'
import { setPath } from '@/features/set-guide/setGuideLinks.ts'
import type { AppEffect, AppItem, AppSet } from '@/data/loaders.ts'
import { levelCap, changeLevelRange } from './catalogFilters.ts'
import { isIgnored } from './statDisplay.ts'
import { assignSetSlots } from './setSlots.ts'
import { SLOT_CONFIGS } from './slotConfig.ts'
import { ImpactDeltas, ItemPeek, SetBonusEffects, useHoverIntent } from './ItemFacts.tsx'
import { useInfiniteList } from './useInfiniteList.ts'
import './catalog.css'
import './sets.css'
import { track } from '@/lib/analytics.ts'

interface Entry {
  set: AppSet
  items: AppItem[]
  minLevel: number
  maxLevel: number
  top: number
  topBonus: AppEffect[]
}
const LEVELS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200]
const PAGE_SIZE = 20
const levelOf = (e: Entry) => (e.minLevel === e.maxLevel ? e.minLevel : `${e.minLevel}–${e.maxLevel}`)

/** Set cards that show every piece and the full-set bonus without a click,
 * equip in one press, and open a panel with where each piece goes, the tier
 * reached and what the build gains. `open` starts on that set (links from an
 * item, a slot or the bonuses). With `single`, only that set's detail opens,
 * in its own smaller window. */
export function SetsCatalog({ onClose, open, onEquipped = onClose, single = false }: { onClose: () => void; open?: number; onEquipped?: () => void; single?: boolean }) {
  const { t, i18n } = useTranslation()
  const equipment    = useDataStore(s => s.equipment)
  const sets         = useDataStore(s => s.sets)
  const slugs        = useDataStore(s => s.setSlugs)
  const equipped     = useBuildStore(s => s.equipped)
  const equipItem    = useBuildStore(s => s.equipItem)
  const unequipItem  = useBuildStore(s => s.unequipItem)
  const equipMultiple = useBuildStore(s => s.equipMultiple)
  const addToast     = useToastStore(s => s.addToast)

  const [query, setQuery]   = useState('')
  const [range, setRange]   = useState({ min: 0, max: 200 })
  const [pieces, setPieces] = useState(0)
  const [sort, setSort]     = useState('level-desc')
  const [picked, setPicked] = useState<Entry | null | undefined>(undefined)
  const detailRef = useRef<HTMLHeadingElement>(null)
  const lastRow   = useRef<HTMLButtonElement | null>(null)
  const scroller  = useRef<HTMLDivElement>(null)

  const byId = useMemo(() => new Map((equipment ?? []).map(it => [it.ankama_id, it])), [equipment])
  const entries = useMemo(() => (sets ?? []).flatMap((set): Entry[] => {
    const items = set.items.flatMap(id => byId.get(id) ?? [])
    if (set.items.length < 2 || !items.length) return []
    const levels = items.map(it => it.level)
    const top = Math.max(...Object.keys(set.bonuses).map(Number))
    return [{ set, items, minLevel: Math.min(...levels), maxLevel: Math.max(...levels), top, topBonus: (set.bonuses[top] ?? []).filter(e => !isIgnored(e.stat)) }]
  }), [sets, byId])
  const selected = picked === undefined ? entries.find(e => e.set.ankama_id === open) ?? null : picked
  const sizes = useMemo(() => [...new Set(entries.map(e => e.items.length))].sort((a, b) => a - b), [entries])
  const list = useMemo(() => entries
    .filter(e =>
      e.maxLevel >= range.min && e.minLevel <= levelCap(range.max) &&
      (!pieces || e.items.length === pieces) &&
      (!query || normalizeSearch(e.set.name).includes(normalizeSearch(query))))
    .sort((a, b) =>
      sort === 'name-az' ? a.set.name.localeCompare(b.set.name)
      : sort === 'level-asc' ? a.minLevel - b.minLevel
      : sort === 'pieces' ? b.items.length - a.items.length
      : b.maxLevel - a.maxLevel),
  [entries, query, range, pieces, sort])
  const { visible, sentinel, more } = useInfiniteList(list, scroller, PAGE_SIZE)

  const worn = useMemo(() => new Set(Object.values(equipped)), [equipped])
  const count = (e: Entry) => e.items.filter(it => worn.has(it.ankama_id)).length
  const wornSets = entries.map(e => ({ e, n: count(e) })).filter(x => x.n > 0).sort((a, b) => b.n - a.n)
  const plan = useMemo(() => (selected ? assignSetSlots(selected.items, equipped) : []), [selected, equipped])
  const preview = useMemo(() => {
    if (!plan.length) return null
    const b = useBuildStore.getState()
    const nextEquipped = { ...b.equipped }
    const runes = { ...b.runes }
    for (const { slot, item } of plan) {
      if (nextEquipped[slot] !== item.ankama_id) runes[slot] = {}
      nextEquipped[slot] = item.ankama_id
    }
    return recompute(b.selectedClass, b.level, b.allocated, b.scrolled, nextEquipped, b._equipment, b._sets, runes)
  }, [plan])

  useEffect(() => { if (selected && innerWidth <= 700) detailRef.current?.focus() }, [selected])
  const hover = useHoverIntent<Entry>(setPicked)

  function clear() { setQuery(''); setRange({ min: 0, max: 200 }); setPieces(0) }
  function back() {
    setPicked(null)
    requestAnimationFrame(() => lastRow.current?.focus())
  }
  /** One piece on its own: the first empty slot that takes it, else the first one. */
  function equipPiece(item: AppItem) {
    const slots = SLOT_CONFIGS.filter(c => (Array.isArray(c.apiSlot) ? c.apiSlot : [c.apiSlot]).includes(item.slot)).map(c => c.id)
    const target = slots.find(slot => equipped[slot] == null) ?? slots[0]
    if (!target) return
    equipItem(target, item.ankama_id)
    track('equip_item', { slot: target })
    playEquip()
    addToast(t('toast_equipped', { slot: t(`slot_${target}`), item: item.name }), slotToastIcon(target))
  }
  function removePiece(item: AppItem) {
    const slot = (Object.entries(equipped) as [SlotId, number][]).find(([, id]) => id === item.ankama_id)?.[0]
    if (slot) { unequipItem(slot); playUnequip() }
  }
  /** The whole set in one store update, so a single undo reverts it. */
  function equipSet(entry: Entry) {
    const placed = assignSetSlots(entry.items, equipped)
    if (!placed.length) return
    equipMultiple(placed.map(({ slot, item }) => ({ slot, ankama_id: item.ankama_id })))
    playEquip()
    for (const { slot, item } of placed) addToast(t('toast_equipped', { slot: t(`slot_${slot}`), item: item.name }), slotToastIcon(slot))
    onEquipped()
  }

  const have = selected ? count(selected) : 0
  const after = have + plan.length
  const replaced = plan.filter(p => equipped[p.slot]).length
  const tiers = selected ? Object.keys(selected.set.bonuses).map(Number).sort((a, b) => a - b) : []
  const slug = selected ? slugs.get(selected.set.ankama_id) : undefined

  // On its own the set's window title is the h2, so the sections step down to h3.
  const Sub = single ? 'h3' : 'h4'
  const detail = selected && (
  <>
    <div className="catalog-item-heading set-heading">
      <div>
        <span>{t('catalog_level_upper', { level: levelOf(selected) })}</span>
        {!single && <h3 tabIndex={-1} ref={detailRef}>{selected.set.name}</h3>}
        <p>{t('setcat_pieces_worn', { count: selected.items.length, have })}</p>
        {slug && (
          <Link className="set-page-link" to={setPath(i18n.language, slug)} onClick={onClose}>
            {t('setcat_open_page')}
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
    <Sub>{t('sets_sort_pieces')} <span>{t('setcat_where_each')}</span></Sub>
    <ul className="set-pieces-plan">
      {selected.items.map(it => {
        const target = plan.find(p => p.item.ankama_id === it.ankama_id)
        const out = target && byId.get(equipped[target.slot] ?? -1)
        const isWorn = worn.has(it.ankama_id)
        return (
          <li key={it.ankama_id}>
            <ItemPeek item={it}>
              <span className="set-card-piece" tabIndex={0}>{it.image_url && <img src={it.image_url} alt="" />}</span>
            </ItemPeek>
            <span>
              <b>{it.name}</b>
              <small>
                {isWorn ? <><Check size={12} /> {t('setcat_already_worn')}</>
                  : !target ? t('setcat_no_room_piece')
                  : out ? t('setcat_slot_replaces', { slot: t(`slot_${target.slot}`), name: out.name })
                  : t('setcat_slot_empty', { slot: t(`slot_${target.slot}`) })}
              </small>
              <em>{t('catalog_level_short', { level: it.level })}</em>
            </span>
            {isWorn ? (
              <button type="button" className="set-piece-action" aria-label={t('setcat_remove_named', { name: it.name })} onClick={() => removePiece(it)}>
                {t('unequip_btn')}
              </button>
            ) : (
              <button type="button" className="set-piece-action" aria-label={t('setcat_equip_only', { name: it.name })} onClick={() => equipPiece(it)}>
                {t('equip_item')}
              </button>
            )}
          </li>
        )
      })}
    </ul>
    <Sub>{t('setcat_bonuses')} <span>{t('setcat_by_worn')}</span></Sub>
    <ol className="set-tiers">
      {tiers.map(n => (
        <li key={n} className={n === after ? 'is-reached' : n === have ? 'is-current' : ''}>
          <span className="set-tier-count">{n} <small>{t('setcat_tier_pieces', { count: n })}</small></span>
          <span className="set-tier-effects"><SetBonusEffects effects={selected.set.bonuses[n].filter(e => !isIgnored(e.stat))} /></span>
          {n === after && plan.length > 0 && <span className="set-tier-note">{t('setcat_with_change')}</span>}
          {n === have && !(n === after && plan.length > 0) && <span className="set-tier-note">{t('setcat_now')}</span>}
        </li>
      ))}
    </ol>
    {preview && (
      <>
        <Sub>{t('catalog_in_build')} <span>{t('setcat_now_with_set')}</span></Sub>
        <ImpactDeltas preview={preview} />
        <p className="catalog-footnote">{t('setcat_footnote')}</p>
      </>
    )}
    <div className="catalog-equip">
      <p>
        {!plan.length ? (have ? t('setcat_all_worn') : t('setcat_no_room_any'))
          : replaced ? t('setcat_equip_replace', { count: plan.length, replaced })
          : t('setcat_equip_empty', { count: plan.length })}
      </p>
      <button type="button" className="site-primary" disabled={!plan.length} onClick={() => equipSet(selected)}>
        {plan.length ? t('setcat_equip_btn', { count: plan.length }) : t('setcat_equipped')}
        <ArrowRight size={17} />
      </button>
    </div>
  </>
  )

  if (single) {
    return (
      <Modal open onClose={onClose} title={selected?.set.name ?? t('nav_sets')} size="2xl">
        <div className="catalog-composition has-selection set-single">
          <div className="catalog-inspection">{detail}</div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title={t('nav_sets')} size="full" className="catalog-dialog">
      <div className={'catalog-composition' + (selected ? ' has-selection' : '')}>
        <div className="catalog-toolbar">
          <div className="catalog-toolbar-main">
            <label className="catalog-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">{t('setcat_search')}</span>
              <input type="search" autoFocus placeholder={t('setcat_name')} value={query} onChange={e => setQuery(e.target.value)} />
            </label>
          </div>
          <div className="catalog-filters">
            <label>
              {t('a11y_level_min')}
              <select value={range.min} onChange={e => setRange(changeLevelRange(range, 'min', Number(e.target.value)))}>
                {LEVELS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>
              {t('a11y_level_max')}
              <select value={range.max} onChange={e => setRange(changeLevelRange(range, 'max', Number(e.target.value)))}>
                {LEVELS.map(n => <option key={n} value={n}>{n || t('catalog_level_any')}</option>)}
              </select>
            </label>
            <label>
              {t('catalog_sort')}
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="level-desc">{t('sort_level_desc')}</option>
                <option value="level-asc">{t('sort_level_asc')}</option>
                <option value="pieces">{t('setcat_sort_pieces')}</option>
                <option value="name-az">{t('sort_name_az')}</option>
              </select>
            </label>
          </div>
          <div className="catalog-types" role="group" aria-label={t('setcat_piece_count_label')}>
            <button type="button" aria-pressed={!pieces} onClick={() => setPieces(0)}>{t('explore_tag_all')}</button>
            {sizes.map(n => (
              <button type="button" key={n} aria-pressed={pieces === n} onClick={() => setPieces(pieces === n ? 0 : n)}>
                {t('setcat_pieces', { count: n })}
              </button>
            ))}
          </div>
        </div>

        <section className="catalog-browse" aria-label={t('setcat_results')} ref={scroller}>
          <div className="catalog-results-heading">
            <span>{t('setcat_count', { count: list.length })}</span>
            <span>{t('setcat_hint')}</span>
          </div>
          <div className="catalog-grid is-sets">
            {visible.map(e => {
              const mine = count(e)
              const active = selected?.set.ankama_id === e.set.ankama_id
              const placeable = assignSetSlots(e.items, equipped).length
              const complete = mine === e.items.length
              return (
                <article key={e.set.ankama_id}
                  className={'catalog-card set-card' + (active ? ' is-selected' : '') + (complete ? ' is-equipped' : '')}
                  onMouseEnter={() => hover.enter(e)} onMouseLeave={hover.leave}>
                  <div className="set-card-head">
                    <div>
                      <button type="button" className="catalog-result-open"
                        aria-label={placeable ? t('setcat_card_equip', { name: e.set.name, count: placeable })
                          : complete ? t('setcat_card_equipped', { name: e.set.name }) : t('setcat_card_no_room', { name: e.set.name })}
                        aria-disabled={!placeable}
                        onClick={() => equipSet(e)}
                        onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setPicked(e) }}>
                        {e.set.name}
                      </button>
                      <small>{t('setcat_level_pieces', { level: levelOf(e), count: e.items.length })}</small>
                    </div>
                    <span className="catalog-card-tools">
                      <span className="set-card-count" aria-label={t('setcat_worn_of', { worn: mine, total: e.items.length })}>
                        {complete && <Check size={12} aria-hidden="true" />}
                        {mine}/{e.items.length}
                      </span>
                      <button type="button" className="catalog-card-inspect" aria-label={t('setcat_see_detail', { name: e.set.name })}
                        title={t('setcat_see_detail_title')}
                        onClick={event => { lastRow.current = event.currentTarget; setPicked(e) }}>
                        <ChartNoAxesColumn size={16} />
                      </button>
                    </span>
                  </div>
                  <ul className="set-card-pieces" aria-label={t('sets_sort_pieces')}>
                    {e.items.map(it => (
                      <li key={it.ankama_id} className={worn.has(it.ankama_id) ? 'is-worn' : undefined}>
                        <ItemPeek item={it}>
                          <span className="set-card-piece" tabIndex={0}>
                            {it.image_url && <img src={it.image_url} alt={it.name} loading="lazy" />}
                          </span>
                        </ItemPeek>
                      </li>
                    ))}
                  </ul>
                  {e.topBonus.length > 0 && (
                    <div className="set-card-bonus">
                      <p className="set-card-bonus-title">{t('setcat_with_pieces', { count: e.top })}</p>
                      <p className="set-tier-effects"><SetBonusEffects effects={e.topBonus} /></p>
                    </div>
                  )}
                  <footer className="catalog-card-cta" aria-hidden="true">
                    {placeable ? <>{t('setcat_equip_pieces', { count: placeable })} <ArrowRight size={13} /></>
                      : complete ? t('setcat_equipped') : t('setcat_no_room')}
                  </footer>
                </article>
              )
            })}
          </div>
          {!list.length && (
            <div className="catalog-empty">
              <h3>{t('setcat_no_matches')}</h3>
              <p>{t('setcat_empty_hint')}</p>
              <button type="button" onClick={clear}>{t('catalog_reset_filters')}</button>
            </div>
          )}
          {more && <div ref={sentinel} className="catalog-sentinel" aria-hidden="true" />}
        </section>

        <aside className="catalog-inspection" aria-label={t('setcat_panel')}>
          {!selected ? (
            <div className="catalog-now">
              <span className="catalog-kicker">{t('setcat_in_build')}</span>
              {wornSets.length ? (
                <ul className="set-worn">
                  {wornSets.map(({ e, n }) => (
                    <li key={e.set.ankama_id}>
                      <button type="button" onClick={event => { lastRow.current = event.currentTarget; setPicked(e) }}>
                        <b>{e.set.name}</b>
                        <span>{n}/{e.items.length}</span>
                        <ArrowRight size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="catalog-now-empty">{t('setcat_no_piece')}</p>}
              <p>{t('setcat_intro')}</p>
            </div>
          ) : (
            <>
              <button type="button" className="catalog-back" onClick={back}>
                <ArrowLeft size={17} />
                {t('setcat_back')}
              </button>
              {detail}
            </>
          )}
        </aside>
      </div>
    </Modal>
  )
}
