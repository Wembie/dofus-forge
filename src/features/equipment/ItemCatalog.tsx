import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, ChartNoAxesColumn, Check, Crown, Search, SlidersHorizontal, Star } from 'lucide-react'
import { PRYSMA_SLOT, recompute, useBuildStore, type SlotId } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { useToastStore } from '@/store/toastStore.ts'
import { useFavorites } from '@/store/useFavorites.ts'
import { Modal, StatFilter, normalizeSearch, slotToastIcon } from '@/ui'
import { playEquip, playDenied } from '@/lib/sound.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { SlotConfig } from './slotConfig.ts'
import { matchesSlot, matchesStatFilter, levelCap, changeLevelRange, catalogBlock, isAttackEffect } from './catalogFilters.ts'
import { STAT_META, isIgnored } from './statDisplay.ts'
import { ImpactDeltas, ItemFactsList, useHoverIntent } from './ItemFacts.tsx'
import { useInfiniteList } from './useInfiniteList.ts'
import { SetDetailModal } from './SetDetailModal.tsx'
import './catalog.css'
import { track } from '@/lib/analytics.ts'

type Props = {
  slot:           SlotConfig
  slotId:         SlotId
  onClose:        () => void
  onAfterEquip?:  (slotId: SlotId) => void
}

const LEVELS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200]
const PAGE_SIZE = 20
type SortKey = 'level-desc' | 'level-asc' | 'name-az'

/** Picks a piece for one slot. Cards read in full without a click (effects,
 * weapon attack, spell effects, ability, lore, set, favourite) and equip on
 * click; beside them, what the hovered or inspected piece changes in the
 * build before equipping it. */
export function ItemCatalog({ slot, slotId, onClose, onAfterEquip }: Props) {
  const { t } = useTranslation()
  const equipment = useDataStore(s => s.equipment)
  const sets      = useDataStore(s => s.sets)
  const equipped  = useBuildStore(s => s.equipped)
  const level     = useBuildStore(s => s.level)
  const equipItem = useBuildStore(s => s.equipItem)
  const addToast  = useToastStore(s => s.addToast)
  const favorites = useFavorites()
  // useFavorites returns a new object every render; the list must only follow isFav, or every
  // render (a hover, a toast) rebuilds it and the infinite list jumps back to the top.
  const isFav = favorites.isFav

  const [query, setQuery]         = useState('')
  const [range, setRange]         = useState({ min: 0, max: 200 })
  const [sort, setSort]           = useState<SortKey>('level-desc')
  const [setId, setSetId]         = useState('')
  const [type, setType]           = useState('')
  const [stats, setStats]         = useState<string[]>([])
  const [onlyFav, setOnlyFav]     = useState(false)
  const [legendary, setLegendary] = useState(false)
  const [selected, setSelected]   = useState<AppItem | null>(null)
  const [setModal, setSetModal]   = useState<AppSet | null>(null)
  const [continueDofus, setContinueDofus] = useState(true)
  const [showFilters, setShowFilters]     = useState(false)
  const detailRef = useRef<HTMLHeadingElement>(null)
  const lastItem  = useRef<HTMLButtonElement | null>(null)
  const scroller  = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  // "/" jumps back to the search box from anywhere in the catalog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select')) return
      e.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const byId       = useMemo(() => new Map((equipment ?? []).map(it => [it.ankama_id, it])), [equipment])
  const setById    = useMemo(() => new Map((sets ?? []).map(s => [s.ankama_id, s])), [sets])
  const candidates = useMemo(() => (equipment ?? []).filter(it => matchesSlot(it, slot)), [equipment, slot])
  const options = useMemo(() => ({
    types: [...new Set(candidates.map(it => it.type))].sort(),
    stats: [...new Set(candidates.flatMap(it => it.effects.filter(e => !isAttackEffect(e) && !isIgnored(e.stat)).map(e => e.stat)))].sort(),
    sets: (sets ?? []).filter(s => candidates.some(it => it.set_id === s.ankama_id)).sort((a, b) => a.name.localeCompare(b.name)),
    legendary: candidates.some(it => it.legendary === true),
  }), [candidates, sets])

  // Only one Prysmaradite is worn, always in the first Dofus slot: the other
  // slots stop offering them once one is on.
  const prysmaWorn = Object.entries(equipped).some(([s, id]) => s.startsWith('dofus') && id != null && byId.get(id)?.type === 'Prysmaradite')
  const hidePrysma = slotId.startsWith('dofus') && slotId !== PRYSMA_SLOT && prysmaWorn
  const list = useMemo(() => candidates
    .filter(it =>
      !(hidePrysma && it.type === 'Prysmaradite') &&
      it.level >= range.min && it.level <= levelCap(range.max) &&
      (!setId || String(it.set_id) === setId) &&
      matchesStatFilter(it, stats) &&
      (!onlyFav || isFav(it.ankama_id)) &&
      (!legendary || it.legendary === true) &&
      (!query || normalizeSearch(it.name).includes(normalizeSearch(query))) &&
      // A name search looks across every type of the slot.
      (query || !type || it.type === type))
    .sort((a, b) => sort === 'name-az' ? a.name.localeCompare(b.name) : sort === 'level-asc' ? a.level - b.level : b.level - a.level),
  [candidates, query, range, sort, setId, type, stats, onlyFav, legendary, isFav, hidePrysma])
  const { visible, sentinel, more } = useInfiniteList(list, scroller, PAGE_SIZE)

  const worn    = byId.get(equipped[slotId] ?? -1)
  const block   = selected ? catalogBlock(selected, slotId, equipped, byId) : null
  const current = selected != null && equipped[slotId] === selected.ankama_id
  const preview = useMemo(() => {
    if (!selected) return null
    const b = useBuildStore.getState()
    const nextEquipped = { ...b.equipped, [slotId]: selected.ankama_id }
    // Changing the piece drops the runes of that slot.
    const runes = b.equipped[slotId] === selected.ankama_id ? b.runes : { ...b.runes, [slotId]: {} }
    return recompute(b.selectedClass, b.level, b.allocated, b.scrolled, nextEquipped, b._equipment, b._sets, runes)
  }, [selected, slotId])

  useEffect(() => { if (selected && innerWidth <= 700) detailRef.current?.focus() }, [selected])
  const hover = useHoverIntent<AppItem>(setSelected)

  const slotName  = t(`slot_${slotId}`)
  const typeLabel = (v: string) => t(`item_type_${v}`, { defaultValue: v })
  const blockedIn = (item: AppItem) => {
    const b = catalogBlock(item, slotId, equipped, byId)
    return b ? t(`slot_${b.slot}`) : null
  }

  function equip(item: AppItem) {
    if (equipped[slotId] === item.ankama_id) return
    if (catalogBlock(item, slotId, equipped, byId)) { playDenied(); return }
    playEquip()
    addToast(t('toast_equipped', { slot: slotName, item: item.name }), item.image_url ?? slotToastIcon(slotId))
    if (onAfterEquip && (continueDofus || !slotId.startsWith('dofus'))) onAfterEquip(slotId)
    else onClose()
    // Equipping recomputes the whole build and re-renders every panel; as a
    // transition the catalog closes first instead of the click blocking on it.
    startTransition(() => { equipItem(slotId, item.ankama_id) })
    track('equip_item', { slot: slotId })
  }
  function inspect(item: AppItem, button: HTMLButtonElement) {
    lastItem.current = button
    setSelected(item)
  }
  function back() {
    setSelected(null)
    requestAnimationFrame(() => lastItem.current?.focus())
  }
  function clear() {
    setQuery(''); setRange({ min: 0, max: 200 }); setSetId(''); setType(''); setStats([]); setOnlyFav(false); setLegendary(false)
  }
  const favCount = candidates.filter(it => favorites.isFav(it.ankama_id)).length
  const activeFilters = Number(range.min > 0 || range.max !== 200) + Number(!!setId) + stats.length + Number(onlyFav) + Number(legendary)

  return (
    <Modal open onClose={() => { if (!setModal) onClose() }} title={t('catalog_title', { slot: slotName.toLocaleLowerCase() })} size="full" className="catalog-dialog">
      <div className={'catalog-composition' + (selected ? ' has-selection' : '')}>
        <div className={'catalog-toolbar has-toggle' + (showFilters ? ' filters-open' : '')}>
          <div className="catalog-toolbar-main">
            <label className="catalog-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">{t('catalog_search_label')}</span>
              <input ref={searchRef} type="search" autoFocus placeholder={t('search_items')} value={query} onChange={e => setQuery(e.target.value)} aria-keyshortcuts="/" />
            </label>
            <button type="button" className="catalog-filter-toggle" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal size={16} aria-hidden="true" />
              {t('catalog_filters')}
              {activeFilters > 0 && <span className="catalog-flag-count">{activeFilters}</span>}
            </button>
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
              <select value={sort} onChange={e => setSort(e.target.value as SortKey)}>
                <option value="level-desc">{t('sort_level_desc')}</option>
                <option value="level-asc">{t('sort_level_asc')}</option>
                <option value="name-az">{t('sort_name_az')}</option>
              </select>
            </label>
            <label className="catalog-filter-wide">
              {t('catalog_set')}
              <select value={setId} onChange={e => setSetId(e.target.value)}>
                <option value="">{t('elem_all')}</option>
                {options.sets.map(s => <option key={s.ankama_id} value={s.ankama_id}>{s.name}</option>)}
              </select>
            </label>
          </div>
          <div className="catalog-flags">
            <button type="button" aria-pressed={onlyFav} aria-label={t('a11y_favorites_only')} onClick={() => setOnlyFav(!onlyFav)}>
              <Star size={15} aria-hidden="true" />
              {t('catalog_favorites')}
              {favCount > 0 && <span className="catalog-flag-count">{favCount}</span>}
            </button>
            {options.legendary && (
              <button type="button" aria-pressed={legendary} onClick={() => setLegendary(!legendary)}>
                <Crown size={14} aria-hidden="true" />
                {t('catalog_legendary_only')}
              </button>
            )}
            <StatFilter stats={options.stats} selected={stats} onSelect={setStats} />
            <button type="button" onClick={clear}>{t('catalog_reset_filters')}</button>
          </div>
          {options.types.length > 1 && (
            <div className="catalog-types" role="group" aria-label={t('catalog_item_type')}>
              <button type="button" aria-pressed={!type} onClick={() => setType('')}>{t('elem_all')}</button>
              {options.types.map(v => (
                <button type="button" key={v} aria-pressed={type === v} onClick={() => setType(type === v ? '' : v)}>{typeLabel(v)}</button>
              ))}
              {query && type && <span>{t('catalog_name_all_types')}</span>}
            </div>
          )}
        </div>

        <section className="catalog-browse" aria-label={t('catalog_results')} ref={scroller}>
          <div className="catalog-results-heading">
            <span>{t('item_count', { count: list.length })}</span>
            <span>{t('catalog_items_hint')}</span>
          </div>
          <div className="catalog-grid">
            {visible.map(it => {
              const blocked = blockedIn(it)
              const isWorn  = equipped[slotId] === it.ankama_id
              const active  = selected?.ankama_id === it.ankama_id
              const set     = it.set_id != null ? setById.get(it.set_id) : undefined
              const fav     = favorites.isFav(it.ankama_id)
              return (
                <article
                  key={it.ankama_id}
                  className={'catalog-card' + (active ? ' is-selected' : '') + (isWorn ? ' is-equipped' : '') + (blocked ? ' is-blocked' : '')}
                  onMouseEnter={() => hover.enter(it)}
                  onMouseLeave={hover.leave}
                >
                  <header className="catalog-card-head">
                    <span className="catalog-card-art">
                      {it.image_url && <img src={it.image_url} alt="" loading="lazy" />}
                    </span>
                    <div>
                      <button
                        type="button"
                        className="catalog-result-open"
                        aria-label={isWorn ? t('catalog_card_equipped', { name: it.name }) : blocked ? t('catalog_card_in', { name: it.name, slot: blocked }) : t('catalog_card_equip', { name: it.name })}
                        aria-disabled={isWorn || !!blocked}
                        onClick={() => equip(it)}
                        onFocus={e => { if (e.currentTarget.matches(':focus-visible')) setSelected(it) }}
                      >
                        {it.name}
                      </button>
                      <small>{t('catalog_level_short', { level: it.level })} · {typeLabel(it.type)}</small>
                      {set && (
                        <button type="button" className="catalog-set-link" onClick={() => setSetModal(set)}>
                          {set.name}
                          <ArrowRight size={12} aria-hidden="true" />
                        </button>
                      )}
                      {(isWorn || blocked) && (
                        <span className="catalog-card-status">
                          <Check size={12} aria-hidden="true" />
                          {isWorn ? t('catalog_equipped') : t('catalog_already_in', { slot: blocked })}
                        </span>
                      )}
                    </div>
                    <span className="catalog-card-tools">
                      <button type="button" className="catalog-favorite" aria-label={t('a11y_favorite', { name: it.name })} aria-pressed={fav}
                        onClick={() => favorites.toggle(it.ankama_id)}>
                        <Star size={16} />
                      </button>
                      <button type="button" className="catalog-card-inspect" aria-label={t('catalog_see_change', { name: it.name })}
                        title={t('catalog_see_change_title')} onClick={e => inspect(it, e.currentTarget)}>
                        <ChartNoAxesColumn size={16} />
                      </button>
                    </span>
                  </header>
                  <div className="catalog-card-facts"><ItemFactsList item={it} /></div>
                  <footer className="catalog-card-cta" aria-hidden="true">
                    {isWorn ? t('catalog_equipped') : blocked ? t('catalog_already_equipped_in', { slot: blocked }) : <>{t('equip_item')} <ArrowRight size={13} /></>}
                  </footer>
                </article>
              )
            })}
          </div>
          {!list.length && (
            <div className="catalog-empty">
              <h3>{t('no_items')}</h3>
              <p>{t('catalog_empty_hint')}</p>
              <button type="button" onClick={clear}>{t('catalog_reset_filters')}</button>
            </div>
          )}
          {more && <div ref={sentinel} className="catalog-sentinel" aria-hidden="true" />}
        </section>

        <aside className="catalog-inspection" aria-label={t('catalog_build_change')}>
          {!selected ? (
            <div className="catalog-now">
              <span className="catalog-kicker">{t('catalog_now_in', { slot: slotName.toLowerCase() })}</span>
              {worn ? (
                <div className="catalog-item-heading is-small">
                  {worn.image_url && <img src={worn.image_url} alt="" />}
                  <div>
                    <span>{t('catalog_level_upper', { level: worn.level })}</span>
                    <h3>{worn.name}</h3>
                    <p>{typeLabel(worn.type)}</p>
                  </div>
                </div>
              ) : <p className="catalog-now-empty">{t('catalog_empty_slot')}</p>}
              <p>{t('catalog_intro')}</p>
            </div>
          ) : (
            <>
              <button type="button" className="catalog-back" onClick={back}>
                <ArrowLeft size={17} />
                {t('catalog_back')}
              </button>
              <div className="catalog-item-heading">
                {selected.image_url && <img src={selected.image_url} alt="" />}
                <div>
                  <span>{t('catalog_level_upper', { level: selected.level })}</span>
                  <h3 tabIndex={-1} ref={detailRef}>{selected.name}</h3>
                  <p>{typeLabel(selected.type)}</p>
                </div>
              </div>
              <p className={'catalog-replaces' + (!current && worn ? ' is-replacing' : '')}>
                {!current && worn?.image_url && <img src={worn.image_url} alt="" width={22} height={22} />}
                <span>{current ? t('catalog_is_worn') : worn ? t('catalog_replaces', { name: worn.name }) : t('catalog_fills_empty')}</span>
              </p>
              {selected.set_id != null && setById.get(selected.set_id) && (
                <button type="button" className="catalog-panel-set" onClick={() => setSetModal(setById.get(selected.set_id!)!)}>
                  {t('catalog_set_named', { name: setById.get(selected.set_id)!.name })}
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              )}
              <div className="catalog-mobile-facts"><ItemFactsList item={selected} /></div>
              <h4>{t('catalog_in_build')} <span>{t('catalog_now_with_piece')}</span></h4>
              {preview && <ImpactDeltas preview={preview} />}
              <p className="catalog-footnote">{t('catalog_footnote')}</p>
              {!!selected.conditions?.length && (
                <div className="catalog-conditions">
                  <h4>{t('catalog_conditions')}</h4>
                  {selected.conditions.map((c, i) => (
                    <p key={i}>{STAT_META[c.stat] ? t(STAT_META[c.stat].tKey) : c.stat} {c.operator} {c.value}</p>
                  ))}
                </div>
              )}
              <div className="catalog-equip">
                <p>
                  {current ? t('catalog_already_equipped')
                    : block ? t('catalog_occupied_in', { slot: t(`slot_${block.slot}`) })
                    : selected.level > level ? t('catalog_level_over')
                    : t('catalog_replaces_slot', { slot: slotName.toLowerCase() })}
                </p>
                {slotId.startsWith('dofus') && onAfterEquip && (
                  <label>
                    <input type="checkbox" checked={continueDofus} onChange={e => setContinueDofus(e.target.checked)} />
                    {t('catalog_continue_next')}
                  </label>
                )}
                <button type="button" className="site-primary" disabled={!!block || current} onClick={() => equip(selected)}>
                  {current ? t('catalog_equipped') : t('catalog_equip_in', { slot: slotName.toLowerCase() })}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
      {setModal && <SetDetailModal set={setModal} onClose={() => setSetModal(null)} onEquipAll={onClose} />}
    </Modal>
  )
}
