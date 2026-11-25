import { useState, useMemo, useCallback, useRef, useEffect, useSyncExternalStore, lazy, Suspense } from 'react'
import { ArrowLeftRight, Pin, X } from 'lucide-react'
import { useForgePicks } from '@/features/optimizer/forgePicks.ts'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { useBuildStore, ALL_SLOTS, PRYSMA_SLOT } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { SLOT_CONFIGS, type SlotConfig } from './slotConfig.ts'
import { SetBonusesPanel } from './SetBonusesPanel.tsx'
import { ItemSheet } from './ItemSheet.tsx'
import { OPEN_SLOT_EVENT } from './openSlot.ts'
import { ItemCard } from './ItemCard.tsx'
import { isExoticKey } from '@/engine/runes.ts'
import { legendaryBonusOf, legendaryEligible } from '@/engine/petLegendary.ts'

// Lazy: these only mount once the user opens them (catalog, runes, set
// detail), so they don't need to be in the eager bundle — combined
// ~90 KB moved out of the initial payload.
const ItemCatalog    = lazy(() => import('./ItemCatalog.tsx').then(m => ({ default: m.ItemCatalog })))
const RuneModal      = lazy(() => import('./RuneModal.tsx').then(m => ({ default: m.RuneModal })))
const SetDetailModal = lazy(() => import('./SetDetailModal.tsx').then(m => ({ default: m.SetDetailModal })))
const CharacterStage = lazy(() => import('@/components/CharacterStage.tsx').then(m => ({ default: m.CharacterStage })))
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { ClassGrid, GenderToggle, LevelStepper } from '@/features/class-picker/ClassPicker.tsx'
import type { SlotId } from '@/store/buildStore.ts'
import type { AppItem } from '@/data/loaders.ts'
import { runeKeyIconUrl, runeIconFallback } from './statDisplay.ts'
import { Modal, SlotIcon } from '@/ui'
import { playUnequip, playEquip } from '@/lib/sound.ts'
import { useCharacterStage } from '@/components/useCharacterStage.ts'
import { PassivesPanel } from '@/features/passives/PassivesPanel.tsx'

// ── Layout groups — exported so read-only build views can mirror this exact
// character-centered arrangement instead of a generic list/grid ───────────
export const LEFT_SLOTS:   SlotId[] = ['hat', 'cape', 'weapon', 'shield', 'companion']
export const RIGHT_SLOTS:  SlotId[] = ['amulet', 'ring1', 'ring2', 'belt', 'boots']
export const EXTRAS_SLOTS: SlotId[] = ['sidekick']
export const DOFUS_SLOTS:  SlotId[] = ['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6']

const NO_RUNE_SLOTS = new Set<SlotId>(['dofus1','dofus2','dofus3','dofus4','dofus5','dofus6','sidekick'])

/** Companion's "rune" action is the legendary bonus picker — only a real
 * use for a Pet/Petsmount companion; a Dragoturkey/Seemyool/Rhineetle mount
 * can't go legendary at all. */
function noRuneAction(id: SlotId, item: AppItem | null | undefined): boolean {
  if (NO_RUNE_SLOTS.has(id)) return true
  return id === 'companion' && !legendaryEligible(item?.type)
}

const SLOT_MAP = Object.fromEntries(SLOT_CONFIGS.map(s => [s.id, s])) as Record<SlotId, SlotConfig>

const DOFUS_ADVANCE: Partial<Record<SlotId, SlotId>> = {
  dofus1: 'dofus2', dofus2: 'dofus3', dofus3: 'dofus4',
  dofus4: 'dofus5', dofus5: 'dofus6',
}

/** The companion's picked legendary bonus, resolved to display text — stands
 * in for `item.ability`, which fetched companion data never carries. */
function legendaryAbility(t: (key: string) => string, pick: { id: string; value: number } | null): { name: string; text: string } | null {
  const bonus = pick && legendaryBonusOf(pick.id)
  return bonus ? { name: t(bonus.nameKey), text: t(bonus.textKey) } : null
}

function slotTKey(id: SlotId): string {
  if (id.startsWith('ring'))  return 'slot_ring'
  if (id.startsWith('dofus')) return 'slot_dofus'
  return `slot_${id}`
}

// ── Slot button ──────────────────────────────────────────────────────────────
type SlotButtonProps = {
  slotId:       SlotId
  item:         AppItem | undefined
  onOpen:       () => void
  onUnequip:    () => void
  /** Straight to the catalog (double click, C). */
  onChangeItem?: () => void
  /** Magesmithy (R); absent where runes don't apply. */
  onRune?:      () => void
  onViewSet?:   () => void
  slotRunes?:   Record<string, number>
  small?:       boolean
  size?:        number   // explicit pixel override (bypasses small ? 62 : 80)
  /** Tile width: the slot shows its art, the slot name and the item name side by side. */
  wide?:        number
  setName?:     string
  setCount?:    number
  setMax?:      number
  nextBonus?:   string
  tooltipSide?: 'right' | 'left' | 'top'
  isDragOver?:  boolean
  onDragStart?: React.DragEventHandler<HTMLDivElement>
  onDragEnd?:   React.DragEventHandler<HTMLDivElement>
  onDragOver?:  React.DragEventHandler<HTMLDivElement>
  onDragLeave?: React.DragEventHandler<HTMLDivElement>
  onDrop?:      React.DragEventHandler<HTMLDivElement>
}

function SlotButton({ slotId, item, onOpen, onUnequip, onChangeItem, onRune, slotRunes, small, size: sizeProp, wide, setName, setCount, setMax, nextBonus, tooltipSide = 'top', isDragOver, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop }: SlotButtonProps) {
  const { t }         = useTranslation()
  const forjamagoName   = useBuildStore(s => s.forjamagoNames[slotId] ?? '')
  const weaponTransform = useBuildStore(s => s.weaponTransforms[slotId] ?? null)
  const legendaryBonus  = useBuildStore(s => slotId === 'companion' ? s.legendaryBonus : null)
  const legendary       = useMemo(() => legendaryAbility(t, legendaryBonus), [t, legendaryBonus])
  const forgePinned     = useForgePicks(s => item != null && s.required.includes(item.ankama_id))

  const [hovered, setHovered]   = useState(false)
  const [animating, setAnimating] = useState(false)
  const leaveRef                = useRef<ReturnType<typeof setTimeout>>(undefined)
  const prevItemRef             = useRef(item)
  const enter = () => { clearTimeout(leaveRef.current); setHovered(true) }

  // Shortcuts on a worn piece, with the pointer on it or the slot focused:
  // C change, R magesmithy, P pin for The Forger, Delete/Backspace remove.
  const shortcut = useRef<(e: KeyboardEvent | React.KeyboardEvent) => void>(() => {})
  shortcut.current = e => {
    if (!item || e.ctrlKey || e.metaKey || e.altKey) return
    const key = e.key.toLowerCase()
    if (key === 'c' && onChangeItem) onChangeItem()
    else if (key === 'r' && onRune) onRune()
    else if (key === 'p') useForgePicks.getState().toggleRequired(item.ankama_id)
    else if (key === 'delete' || key === 'backspace') onUnequip()
    else return
    e.preventDefault()
  }
  useEffect(() => {
    if (!hovered || !item) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || document.querySelector('[role="dialog"]')) return
      if ((e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable="true"]')) return
      shortcut.current(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hovered, item])

  // A single click opens the item sheet a beat later, so a double click can go
  // straight to the catalog instead.
  const clickTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(clickTimer.current), [])
  const click = () => {
    if (!item || !onChangeItem) return onOpen()
    clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(onOpen, 220)
  }
  const doubleClick = () => {
    if (!item || !onChangeItem) return
    clearTimeout(clickTimer.current)
    onChangeItem()
  }
  const leave = () => { clearTimeout(leaveRef.current); setHovered(false) }
  const px      = sizeProp ?? (small ? 62 : 80)
  const activeRunes = Object.entries(slotRunes ?? {}).filter(([, v]) => v > 0).sort(([a], [b]) => Number(isExoticKey(b)) - Number(isExoticKey(a)))
  const slotLabel = t(slotTKey(slotId))

  useEffect(() => {
    if (item && !prevItemRef.current) {
      setAnimating(true)
      const tid = setTimeout(() => setAnimating(false), 240)
      return () => clearTimeout(tid)
    }
    prevItemRef.current = item
  }, [item])

  return (
    <div
      className="relative flex flex-col items-center gap-0.5"
      onMouseEnter={enter} onMouseLeave={leave}
      draggable={!!item && !!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{ cursor: item && onDragStart ? 'grab' : undefined }}
    >
      <button
        onClick={click}
        onDoubleClick={doubleClick}
        onKeyDown={e => shortcut.current(e)}
        onContextMenu={e => {
          if (!item) return
          e.preventDefault()
          useForgePicks.getState().toggleRequired(item.ankama_id)
        }}
        aria-label={`${slotLabel}${item ? `: ${item.name}` : ` (${t('empty_slot')})`}`}
        className={['workshop-slot', wide && 'is-wide', item ? 'has-item' : 'is-empty', item && setName && 'in-set', isDragOver && 'is-dragover', animating && 'item-equip'].filter(Boolean).join(' ')}
        style={{ width: wide ?? px, height: px }}
      >
        {wide ? (
          <>
            <span className="slot-art" style={{ width: px - 14, height: px - 14 }}>
              {item?.image_url
                ? <img src={item.image_url} alt="" className="w-full h-full object-contain" loading="lazy" />
                : <span className="slot-icon"><SlotIcon slot={slotId} /></span>}
            </span>
            <span className="slot-copy">
              <small>{slotLabel}</small>
              <span className={activeRunes.length > 0 ? 'has-runes' : undefined}>{item ? item.name : t('empty_slot')}</span>
              {item && activeRunes.length > 0 && (
                <span className="slot-runes" aria-hidden="true">
                  {activeRunes.slice(0, 5).map(([stat]) => {
                    const url = runeKeyIconUrl(stat)
                    return url ? <img key={stat} src={url} onError={runeIconFallback(stat)} alt="" width={14} height={14} className={isExoticKey(stat) ? 'is-exotic' : undefined} /> : null
                  })}
                  {activeRunes.length > 5 && <em>+{activeRunes.length - 5}</em>}
                </span>
              )}
            </span>
          </>
        ) : item?.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-1.5" loading="lazy" />
        ) : (
          <span className="slot-icon"><SlotIcon slot={slotId} /></span>
        )}
      </button>

      {!small && !wide && <span className="slot-under">{slotLabel}</span>}

      {/* Quick actions in the tile's corners: unequip on hover or keyboard
          focus, the pin only while pinned. Everything else is in the item sheet. */}
      {item && (
        <div className={'slot-actions' + (hovered ? ' is-open' : '')} style={{ width: wide ?? px, height: px }}>
          {forgePinned && <button type="button" className="slot-action is-pin is-on"
            onClick={e => { e.stopPropagation(); useForgePicks.getState().toggleRequired(item.ankama_id) }}
            aria-pressed={forgePinned}
            aria-label={`${t(forgePinned ? 'slot_unpin_forge' : 'slot_pin_forge')}: ${item.name}`}
            title={t(forgePinned ? 'slot_unpin_forge' : 'slot_pin_forge')}>
            <Pin size={11} aria-hidden="true" />
          </button>}
          <button type="button" className="slot-action is-remove"
            onClick={e => { e.stopPropagation(); onUnequip() }}
            aria-label={t('unequip', { name: item.name })} title={t('unequip', { name: item.name })}>
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Tooltip — game-faithful style, side chosen per column */}
      {item && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            width: 288,
            visibility: hovered ? 'visible' : 'hidden',
            animation: hovered ? 'tooltip-in 140ms var(--ease-out) forwards' : 'none',
            ...(tooltipSide === 'right'
              ? { left: '100%', marginLeft: 8, top: 0 }
              : tooltipSide === 'left'
              ? { right: '100%', marginRight: 8, top: 0 }
              : { left: '50%', transform: 'translateX(-50%)', bottom: '100%', marginBottom: 8 })
          }}
        >
          <ItemCard item={item} runes={slotRunes} forjamagoName={forjamagoName} weaponTransform={weaponTransform}
            set={setName ? { name: setName, count: setCount ?? 0, max: setMax ?? 0, nextBonus } : undefined}
            legendary={legendary} />
        </div>
      )}
    </div>
  )
}

// ── Character center ─────────────────────────────────────────────────────────

const DESKTOP_QUERY       = '(min-width: 1024px)' // Tailwind lg

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

// The prerendered page assumes desktop; on a phone React re-renders with the
// real value right after hydrating.
function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_QUERY).matches, () => true)
}

// One stage for both layouts, so a single WebGL context runs.
function CharacterCenter({ compact }: { compact: boolean }) {
  const { t } = useTranslation()
  const stage = useCharacterStage()
  const companion = useBuildStore(s => s.equipped.companion)
  const hat = useBuildStore(s => s.equipped.hat)
  const cape = useBuildStore(s => s.equipped.cape)
  const shield = useBuildStore(s => s.equipped.shield)
  const gear = useMemo(() => [hat, cape, shield].filter((id): id is number => id != null), [hat, cape, shield])
  const selectedClass = useBuildStore(s => s.selectedClass)
  const gender = useBuildStore(s => s.gender)
  const [picking, setPicking] = useState(false)
  const info = CLASS_DATA.find(c => c.id === selectedClass)
  const name = useClassName(selectedClass)
  const width = compact ? 150 : 220
  const height = compact ? 230 : 320
  return (
    <div className="workshop-character" style={{ width }}>
      <div className="workshop-figure" style={{ minHeight: height + 28 }}>
        <div className="workshop-arch" aria-hidden="true" />
        {stage.show && info ? (
          <Suspense fallback={<div style={{ width, height: height + 28 }} />}>
            <CharacterStage breed={info.breed} gender={gender} companion={companion} gear={gear}
              width={width} height={height} onError={stage.fail} />
          </Suspense>
        ) : info ? (
          <img className="workshop-portrait" src={gender === 'female' ? info.imageFUrl : info.imageUrl} alt={name} draggable={false} />
        ) : (
          <p className="workshop-character-prompt">{t('select_class_prompt')}</p>
        )}
      </div>
      {info && (
        <div className="workshop-character-controls">
          <button type="button" className="workshop-class-button" onClick={() => setPicking(true)}>
            <span className="workshop-class-name">{name}</span>
            <span className="workshop-class-change"><ArrowLeftRight size={13} aria-hidden="true" />{t('change')}</span>
          </button>
          <div className="workshop-character-row">
            <GenderToggle iconOnly />
            <LevelStepper />
          </div>
        </div>
      )}
      {picking && (
        <Modal open onClose={() => setPicking(false)} title={t('class_pick_title')} size="3xl">
          <div className="cp-modal"><ClassGrid onPicked={() => setPicking(false)} /></div>
        </Modal>
      )}
    </div>
  )
}

export function EquipmentGrid() {
  const { t }       = useTranslation()
  const stageOn     = useCharacterStage().show
  const isDesktop   = useIsDesktop()
  const equipped    = useBuildStore(s => s.equipped)
  const legendaryBonus = useBuildStore(s => s.legendaryBonus)
  const _sets       = useBuildStore(s => s._sets)
  const runes       = useBuildStore(s => s.runes)
  const unequipItem = useBuildStore(s => s.unequipItem)
  const swapSlots   = useBuildStore(s => s.swapSlots)
  const equipment   = useDataStore(s => s.equipment)
  const loading     = useDataStore(s => s.loading)

  const [openSlot, setOpenSlot] = useState<{ config: SlotConfig; id: SlotId } | null>(null)
  const [runeSlot, setRuneSlot] = useState<SlotId | null>(null)
  const [sheetSlot, setSheetSlot] = useState<SlotId | null>(null)
  // A slot opened from outside (number keys): its sheet, or the catalog when empty.
  const openRef = useRef<(id: SlotId) => void>(() => {})
  useEffect(() => {
    const onOpen = (e: Event) => openRef.current((e as CustomEvent<SlotId>).detail)
    window.addEventListener(OPEN_SLOT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_SLOT_EVENT, onOpen)
  }, [])
  const [openSetId, setOpenSetId] = useState<number | null>(null)
  const [dragSlot, setDragSlot]         = useState<SlotId | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<SlotId | null>(null)

  const equipMap = useMemo(
    () => new Map((equipment ?? []).map(it => [it.ankama_id, it])),
    [equipment],
  )

  // Set count map: setId → number of pieces equipped
  const setCountMap = useMemo(() => {
    const m = new Map<number, number>()
    for (const id of Object.values(equipped)) {
      if (id == null) continue
      const it = equipMap.get(id)
      if (it?.set_id != null) m.set(it.set_id, (m.get(it.set_id) ?? 0) + 1)
    }
    return m
  }, [equipped, equipMap])

  const setDataMap = useMemo(
    () => new Map(_sets.map(s => [s.ankama_id, s])),
    [_sets],
  )

  const getItem = useCallback((id: SlotId) => {
    const ankId = equipped[id]
    return ankId != null ? equipMap.get(ankId) : undefined
  }, [equipped, equipMap])

  function getSetProps(id: SlotId) {
    const item = getItem(id)
    if (!item?.set_id) return {}
    const s = setDataMap.get(item.set_id)
    if (!s) return {}
    const count = setCountMap.get(s.ankama_id) ?? 0
    const tiers = Object.keys(s.bonuses).map(Number).sort((a, b) => a - b)
    const maxPieces = tiers.at(-1) ?? 0
    const nextTier  = tiers.find(t => t > count)
    const nextBonus = nextTier != null ? `${nextTier}pc` : undefined
    return { setName: s.name, setCount: count, setMax: maxPieces, nextBonus, onViewSet: () => setOpenSetId(s.ankama_id) }
  }

  const openCatalog = useCallback((id: SlotId) => {
    setOpenSlot({ config: SLOT_MAP[id], id })
  }, [])
  openRef.current = id => (getItem(id) ? setSheetSlot(id) : openCatalog(id))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 text-sm font-display tracking-widest"
        style={{ background: 'var(--surface-void)', color: 'var(--ink-faint)' }}>
        {t('loading_data')}
      </div>
    )
  }

  function slotsCompatible(a: SlotId, b: SlotId): boolean {
    if (a === b) return false
    // A Prysmaradite only lives in the first Dofus slot.
    const prysma = (id: SlotId) => getItem(id)?.type === 'Prysmaradite'
    if ((prysma(a) && b !== PRYSMA_SLOT) || (prysma(b) && a !== PRYSMA_SLOT)) return false
    return a.replace(/\d+$/, '') === b.replace(/\d+$/, '')
  }

  // Helper to render a SlotButton with shared handlers
  const makeSlot = (id: SlotId, extraProps: Partial<SlotButtonProps> = {}) => {
    const hasItem = getItem(id) != null
    const isValidTarget = dragSlot !== null && dragSlot !== id && slotsCompatible(dragSlot, id)
    return (
      <SlotButton
        key={id} slotId={id}
        item={getItem(id)}
        onOpen={() => (getItem(id) ? setSheetSlot(id) : openCatalog(id))}
        onChangeItem={() => openCatalog(id)}
        onRune={noRuneAction(id, getItem(id)) ? undefined : () => setRuneSlot(id)}
        onUnequip={() => { unequipItem(id); playUnequip() }}
        slotRunes={runes[id]}
        isDragOver={dragOverSlot === id && isValidTarget}
        onDragStart={hasItem ? (e) => { e.dataTransfer.effectAllowed = 'move'; setDragSlot(id) } : undefined}
        onDragEnd={hasItem ? () => { setDragSlot(null); setDragOverSlot(null) } : undefined}
        onDragOver={isValidTarget ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverSlot(id) } : undefined}
        onDragLeave={isValidTarget ? () => setDragOverSlot(s => s === id ? null : s) : undefined}
        onDrop={isValidTarget ? (e) => { e.preventDefault(); if (dragSlot) { swapSlots(dragSlot, id); playEquip() } setDragSlot(null); setDragOverSlot(null) } : undefined}
        {...getSetProps(id)}
        {...extraProps}
      />
    )
  }

  const dofusWorn = DOFUS_SLOTS.filter(id => equipped[id] != null).length
  const worn = ALL_SLOTS.filter(id => equipped[id] != null).length
  const gear = (id: SlotId, side: 'right' | 'left') =>
    makeSlot(id, isDesktop ? { size: 64, wide: 156, tooltipSide: side } : { small: true, size: 48, tooltipSide: side })

  return (
    <div className="workshop-equipment-surface">
      <header className="workshop-panel-head">
        <h2>{t('equipment')}</h2>
        <span>{t('workshop_slots_count', { worn, total: ALL_SLOTS.length })}</span>
      </header>
      <div className="workshop-gear-stage">
        <div className="workshop-gear-column">{LEFT_SLOTS.map(id => gear(id, 'right'))}</div>
        <CharacterCenter compact={!isDesktop} />
        <div className="workshop-gear-column">{RIGHT_SLOTS.map(id => gear(id, 'left'))}</div>
      </div>
      <section className="workshop-dofus" aria-labelledby="workshop-dofus-title">
        <header>
          <h3 id="workshop-dofus-title">{t('dofus_trophies')}</h3>
          <span>{t('dofus_trophies_count', { worn: dofusWorn, total: DOFUS_SLOTS.length })}</span>
        </header>
        <div className="workshop-dofus-row">
          {DOFUS_SLOTS.map(id => makeSlot(id, { small: true, size: isDesktop ? 76 : 44, tooltipSide: 'top' }))}
        </div>
      </section>
      <div className="workshop-gear-footer">
        {EXTRAS_SLOTS.map(id => makeSlot(id, isDesktop ? { size: 48, wide: 210, tooltipSide: 'top' } : { size: 48, wide: 190, tooltipSide: 'top' }))}
        <span className="workshop-stage-state"><i aria-hidden="true" />{t(stageOn ? 'workshop_animation_on' : 'workshop_animation_off')}</span>
      </div>

      <div data-tool="bonuses"><SetBonusesPanel /></div>
      <BuilderPassivesPanel />

      {openSlot && createPortal(
        <Suspense fallback={null}>
          <ItemCatalog
            slot={openSlot.config}
            slotId={openSlot.id}
            onClose={() => setOpenSlot(null)}
            onAfterEquip={(slotId) => {
              const next = DOFUS_ADVANCE[slotId]
              if (next) setOpenSlot({ config: SLOT_MAP[next], id: next })
              else setOpenSlot(null)
            }}
          />
        </Suspense>,
        document.body
      )}

      {sheetSlot && getItem(sheetSlot) && (() => {
        const id = sheetSlot
        const set = getSetProps(id)
        return (
          <ItemSheet
            slotLabel={t(slotTKey(id))}
            slotRunes={runes[id]}
            item={getItem(id)!}
            set={set.setName ? { name: set.setName, count: set.setCount!, max: set.setMax! } : undefined}
            onClose={() => setSheetSlot(null)}
            onChange={() => { setSheetSlot(null); openCatalog(id) }}
            onRunes={noRuneAction(id, getItem(id)) ? undefined : () => { setSheetSlot(null); setRuneSlot(id) }}
            isCompanion={id === 'companion' && legendaryEligible(getItem(id)?.type)}
            legendary={id === 'companion' ? legendaryAbility(t, legendaryBonus) : null}
            onViewSet={set.onViewSet ? () => { setSheetSlot(null); set.onViewSet!() } : undefined}
            onUnequip={() => { setSheetSlot(null); unequipItem(id); playUnequip() }}
          />
        )
      })()}

      {runeSlot && getItem(runeSlot) && (
        <Suspense fallback={null}>
          <RuneModal
            slotId={runeSlot}
            item={getItem(runeSlot)!}
            onClose={() => setRuneSlot(null)}
          />
        </Suspense>
      )}

      {openSetId != null && setDataMap.get(openSetId) && (
        <Suspense fallback={null}>
          <SetDetailModal
            set={setDataMap.get(openSetId)!}
            onClose={() => setOpenSetId(null)}
          />
        </Suspense>
      )}
    </div>
  )
}

/** Combat passives of the equipped items, wired to the build store. */
function BuilderPassivesPanel() {
  const equipped   = useBuildStore(s => s.equipped)
  const equipment  = useBuildStore(s => s._equipment)
  const passives   = useBuildStore(s => s.passives)
  const setPassive = useBuildStore(s => s.setPassive)
  const legendary  = useBuildStore(s => s.legendaryBonus)
  const setLegendaryBonus = useBuildStore(s => s.setLegendaryBonus)
  const items = useMemo(() => {
    const byId = new Map(equipment.map(it => [it.ankama_id, it]))
    return ALL_SLOTS.flatMap(slot => {
      const item = equipped[slot] != null ? byId.get(equipped[slot]!) : undefined
      return item ? [item] : []
    })
  }, [equipped, equipment])
  // One store update, so turning everything off is a single undo step.
  const reset = () => useBuildStore.setState({ passives: {} })
  return (
    <div className="px-3 pb-4" data-tool="passives">
      <PassivesPanel
        items={items} state={passives} onChange={setPassive} onReset={reset}
        legendary={equipped.companion ? legendary : null}
        onLegendaryChange={(id, value) => setLegendaryBonus(id, value)}
      />
    </div>
  )
}
