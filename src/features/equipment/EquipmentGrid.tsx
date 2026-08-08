import { useState, useMemo, useCallback } from 'react'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { SLOT_CONFIGS, type SlotConfig } from './slotConfig.ts'
import { ItemCatalog } from './ItemCatalog.tsx'
import { SetBonusesPanel } from './SetBonusesPanel.tsx'
import { RuneModal } from './RuneModal.tsx'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import type { SlotId } from '@/store/buildStore.ts'
import type { AppItem } from '@/data/loaders.ts'
import { STAT_META, isIgnored, fmtValue, statIconUrl } from './statDisplay.ts'

// ── SVG slot icons ──────────────────────────────────────────────────────────

function HatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 3C8.5 3 6 6.5 6 9.5h12C18 6.5 15.5 3 12 3z"/>
      <rect x="3" y="11" width="18" height="4" rx="2"/>
    </svg>
  )
}
function CapeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 1.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"/>
      <path d="M12 6.5L5 22l3.5-1.5L12 23l3.5-2.5L19 22 12 6.5z"/>
    </svg>
  )
}
function AmuletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="7" r="3"/>
      <path d="M9 7C6.5 8.5 6 13 7.5 17L12 23l4.5-6c1.5-4 1-8.5-1.5-10" strokeLinejoin="round"/>
    </svg>
  )
}
function RingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 3.5a6.5 6.5 0 010 13 6.5 6.5 0 010-13z"/>
      <circle cx="12" cy="12" r="2.5"/>
    </svg>
  )
}
function WeaponIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M19.5 3.5l1 1L8 17l-4 1 1-4L19.5 3.5zM4 19l1.5 1.5-2 .5z"/>
      <path d="M16 5l3 3"/>
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2L4 6v7c0 5.5 3.5 9 8 10.5C16.5 22 20 18.5 20 13V6L12 2z"/>
    </svg>
  )
}
function BeltIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <rect x="2" y="9" width="20" height="6" rx="2"/>
      <path d="M10 7h4v10h-4z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="1.5"/>
    </svg>
  )
}
function BootsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M9 2v14H6c-2 0-3 1.5-3 3v3h14v-3.5C17 17 15.5 16 14 16h-3V2H9z"/>
    </svg>
  )
}
function PetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <circle cx="8.5" cy="6" r="2.5"/>
      <circle cx="15.5" cy="6" r="2.5"/>
      <circle cx="5.5" cy="11" r="2"/>
      <circle cx="18.5" cy="11" r="2"/>
      <ellipse cx="12" cy="18" rx="6" ry="5"/>
    </svg>
  )
}
function DofusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <ellipse cx="12" cy="12" rx="7" ry="10"/>
      <ellipse cx="9.5" cy="9" rx="1.5" ry="1" fill="rgba(255,255,255,0.15)"/>
      <ellipse cx="14" cy="11" rx="1" ry="0.8" fill="rgba(255,255,255,0.1)"/>
    </svg>
  )
}

const SLOT_ICON: Record<string, () => JSX.Element> = {
  hat:    HatIcon,
  cape:   CapeIcon,
  amulet: AmuletIcon,
  ring1:  RingIcon,
  ring2:  RingIcon,
  weapon: WeaponIcon,
  shield: ShieldIcon,
  belt:   BeltIcon,
  boots:  BootsIcon,
  pet:    PetIcon,
  dofus1: DofusIcon, dofus2: DofusIcon, dofus3: DofusIcon,
  dofus4: DofusIcon, dofus5: DofusIcon, dofus6: DofusIcon,
}

// ── Layout groups ────────────────────────────────────────────────────────────
const LEFT_SLOTS:  SlotId[] = ['hat', 'cape', 'weapon', 'shield', 'pet']
const RIGHT_SLOTS: SlotId[] = ['amulet', 'ring1', 'ring2', 'belt', 'boots']
const DOFUS_SLOTS: SlotId[] = ['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6']

const SLOT_MAP = Object.fromEntries(SLOT_CONFIGS.map(s => [s.id, s])) as Record<SlotId, SlotConfig>

// ── Slot button ──────────────────────────────────────────────────────────────
type SlotButtonProps = {
  slotId:       SlotId
  item:         AppItem | undefined
  onOpen:       () => void
  onUnequip:    () => void
  onRune?:      () => void
  runeCount?:   number
  small?:       boolean
  setName?:     string
  setCount?:    number
  setMax?:      number
  nextBonus?:   string
  tooltipSide?: 'right' | 'left' | 'top'
}

function SlotButton({ slotId, item, onOpen, onUnequip, onRune, runeCount, small, setName, setCount, setMax, nextBonus, tooltipSide = 'top' }: SlotButtonProps) {
  const cfg     = SLOT_MAP[slotId]
  const IconCmp = SLOT_ICON[slotId]
  const px      = small ? 52 : 66

  return (
    <div className="relative group flex flex-col items-center gap-0.5">
      <button
        onClick={onOpen}
        aria-label={`${cfg.label}${item ? `: ${item.name}` : ' (empty)'}`}
        className="rounded-lg flex items-center justify-center relative overflow-hidden transition-all duration-150 cursor-pointer"
        style={{
          width:  px,
          height: px,
          background: item
            ? 'linear-gradient(145deg, #1c1530, #0d0b1e)'
            : 'linear-gradient(145deg, #0c0c22, #070714)',
          border: item
            ? '1.5px solid rgba(201,168,76,0.55)'
            : '1px solid rgba(35,35,80,0.9)',
          boxShadow: item
            ? '0 0 18px rgba(201,168,76,0.12) inset, 0 2px 6px rgba(0,0,0,0.6)'
            : '0 2px 6px rgba(0,0,0,0.5)',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement
          if (!item) el.style.borderColor = 'rgba(70,70,160,0.8)'
          else       el.style.boxShadow   = '0 0 22px rgba(201,168,76,0.18) inset, 0 2px 6px rgba(0,0,0,0.6)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement
          if (!item) el.style.borderColor = 'rgba(35,35,80,0.9)'
          else       el.style.boxShadow   = '0 0 18px rgba(201,168,76,0.12) inset, 0 2px 6px rgba(0,0,0,0.6)'
        }}
      >
        {item ? (
          item.image_url
            ? <img src={item.image_url} alt={item.name}
                className="w-full h-full object-contain p-1.5" loading="lazy" />
            : <span className="text-[#c9a84c] opacity-80">
                {IconCmp ? <IconCmp /> : cfg.icon}
              </span>
        ) : (
          <span style={{ color: 'rgba(50,50,100,0.7)' }}>
            {IconCmp ? <IconCmp /> : cfg.icon}
          </span>
        )}

        {item && (
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.07) 0%, transparent 55%)' }} />
        )}
      </button>

      {/* Slot label (tiny, below slot) */}
      {!small && (
        <span className="text-[8px] font-medium tracking-wide select-none" style={{ color: 'rgba(60,65,100,0.8)' }}>
          {cfg.label.toUpperCase()}
        </span>
      )}

      {/* Unequip × */}
      {item && (
        <button
          onClick={e => { e.stopPropagation(); onUnequip() }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] leading-none items-center justify-center hidden group-hover:flex transition-colors z-10"
          style={{ background: '#06060f', border: '1px solid #2a3347', color: '#7a8499' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#7a8499' }}
          aria-label={`Unequip ${item.name}`}
        >×</button>
      )}

      {/* Magesmithy rune button */}
      {item && onRune && (
        <button
          onClick={e => { e.stopPropagation(); onRune() }}
          className="absolute -bottom-1.5 -left-1.5 w-4 h-4 rounded-full text-[9px] leading-none items-center justify-center hidden group-hover:flex transition-colors z-10"
          style={{
            background:  (runeCount ?? 0) > 0 ? '#1a1530' : '#06060f',
            border:      (runeCount ?? 0) > 0 ? '1px solid #c9a84c88' : '1px solid #2a3347',
            color:       (runeCount ?? 0) > 0 ? '#c9a84c' : '#4a5268',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#c9a84c'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#c9a84caa'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.color = (runeCount ?? 0) > 0 ? '#c9a84c' : '#4a5268'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = (runeCount ?? 0) > 0 ? '#c9a84c88' : '#2a3347'
          }}
          aria-label={`Magesmithy: ${item.name}`}
          title="Magesmithy (add runes)"
        >✦</button>
      )}

      {/* Tooltip — side determined by column to avoid overflow-hidden clipping */}
      {item && (
        <div
          className="absolute z-30 hidden group-hover:block pointer-events-none w-56"
          style={
            tooltipSide === 'right'
              ? { left: '100%', marginLeft: 8, top: 0 }
              : tooltipSide === 'left'
              ? { right: '100%', marginRight: 8, top: 0 }
              : { left: '50%', transform: 'translateX(-50%)', bottom: '100%', marginBottom: 8 }
          }
        >
          <div className="rounded-xl p-3 shadow-2xl text-xs space-y-1.5"
            style={{ background: '#0b0d18', border: '1px solid #2a3347' }}>
            <p className="font-semibold truncate" style={{ color: '#c9a84c' }}>{item.name}</p>
            <p style={{ color: '#3a4268' }}>Lv {item.level} · {item.type}</p>
            {setName && (
              <div className="flex items-center justify-between gap-2 rounded px-2 py-1" style={{ background: '#0e1020', border: '1px solid #1c2840' }}>
                <span className="truncate font-medium" style={{ color: '#7a6030' }}>{setName}</span>
                <span className="font-mono flex-shrink-0" style={{ color: '#c9a84c' }}>{setCount}/{setMax}</span>
              </div>
            )}
            {nextBonus && (
              <p className="text-[10px]" style={{ color: '#4a5860' }}>▶ next: {nextBonus}</p>
            )}
            <div className="pt-0.5 space-y-0.5" style={{ borderTop: '1px solid #1c2333' }}>
              {item.effects
                .filter(e => !isIgnored(e.stat))
                .map((e, i) => {
                  const meta = STAT_META[e.stat]
                  const val  = fmtValue(e.min, e.max)
                  const clr  = meta?.color ?? '#7a8499'
                  return (
                    <div key={i} className="flex items-center gap-1.5">
                      {meta?.icon
                        ? <img src={statIconUrl(meta.icon)} alt="" width={12} height={12}
                            className="object-contain flex-shrink-0"
                            style={{ filter: `drop-shadow(0 0 3px ${clr}55)` }}
                          />
                        : <span className="w-3 flex-shrink-0" />
                      }
                      <span className="font-mono font-semibold tabular-nums" style={{ color: clr }}>{val}</span>
                      <span className="truncate" style={{ color: '#5a6480' }}>{meta?.label ?? e.stat}</span>
                    </div>
                  )
                })
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Character center ─────────────────────────────────────────────────────────
const ELEM_GLOW: Record<string, string> = {
  earth:   'rgba(184,134,11,0.25)',
  fire:    'rgba(220,78,34,0.25)',
  water:   'rgba(42,143,212,0.25)',
  air:     'rgba(106,176,76,0.25)',
  multi:   'rgba(201,168,76,0.22)',
  neutral: 'rgba(110,110,110,0.18)',
}

function CharacterCenter() {
  const selectedClass = useBuildStore(s => s.selectedClass)
  const gender        = useBuildStore(s => s.gender)
  const classInfo     = selectedClass ? CLASS_DATA.find(c => c.id === selectedClass) : null
  const glow          = classInfo ? (ELEM_GLOW[classInfo.element] ?? ELEM_GLOW.neutral) : 'transparent'
  const portrait      = classInfo ? (gender === 'female' ? classInfo.imageFUrl : classInfo.imageUrl) : null

  return (
    <div
      className="relative flex flex-col items-center justify-end rounded-lg overflow-hidden mx-1 flex-shrink-0"
      style={{
        width:      180,
        height:     360,
        background: `radial-gradient(ellipse at 50% 28%, ${glow} 0%, transparent 60%),
                     linear-gradient(175deg, #0e0e26 0%, #07071a 100%)`,
      }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />

      {/* Class display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pb-20">
        {classInfo ? (
          <>
            {/* Class portrait — large */}
            <div
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{
                width:   88,
                height:  88,
                border:  `2px solid ${ELEM_GLOW[classInfo.element]?.replace('0.25', '0.5') ?? '#2a3347'}`,
                boxShadow: `0 0 24px ${glow}`,
                background: `radial-gradient(ellipse at 50% 30%, ${glow}, transparent 70%)`,
              }}
            >
              {portrait && (
                <img
                  src={portrait}
                  alt={classInfo.name}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              )}
            </div>
            <span className="font-display text-[#c9a84c] text-[11px] tracking-[0.22em] uppercase">
              {classInfo.name}
            </span>
          </>
        ) : (
          <span className="font-display text-[#20204a] text-[10px] tracking-widest">SELECT CLASS</span>
        )}
      </div>

      {/* Stone platform */}
      <div className="w-full">
        <div className="mx-auto rounded-[50%]"
          style={{
            width:      160,
            height:     14,
            background: 'radial-gradient(ellipse at center, #3a2a2a 0%, #1a1212 100%)',
          }} />
        <div className="mx-auto relative"
          style={{
            width:        148,
            height:       56,
            background:   'linear-gradient(to bottom, #211818, #0a0808)',
            borderRadius: '0 0 10px 10px',
          }}>
          <div className="absolute top-2 inset-x-4 h-px opacity-20"
            style={{ background: 'linear-gradient(to right, transparent, #5a4040, transparent)' }} />
          <div className="absolute top-4 inset-x-6 h-px opacity-12"
            style={{ background: 'linear-gradient(to right, transparent, #5a4040, transparent)' }} />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-9">
            {[0, 1].map(i => (
              <div key={i} className="rounded-full"
                style={{ width: 10, height: 6, background: '#b8ff00', boxShadow: '0 0 10px 4px rgba(184,255,0,0.55)' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── EquipmentGrid ─────────────────────────────────────────────────────────────
export function EquipmentGrid() {
  const equipped    = useBuildStore(s => s.equipped)
  const _sets       = useBuildStore(s => s._sets)
  const runes       = useBuildStore(s => s.runes)
  const unequipItem = useBuildStore(s => s.unequipItem)
  const equipment   = useDataStore(s => s.equipment)
  const loading     = useDataStore(s => s.loading)

  const [openSlot, setOpenSlot] = useState<{ config: SlotConfig; id: SlotId } | null>(null)
  const [runeSlot, setRuneSlot] = useState<SlotId | null>(null)

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
    return { setName: s.name, setCount: count, setMax: maxPieces, nextBonus }
  }

  const openCatalog = useCallback((id: SlotId) => {
    setOpenSlot({ config: SLOT_MAP[id], id })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 text-[#3a3a6a] text-sm font-display tracking-widest"
        style={{ background: 'linear-gradient(160deg, #0d0d22, #080818)' }}>
        LOADING…
      </div>
    )
  }

  return (
    <div style={{ background: 'linear-gradient(160deg, #0d0d22 0%, #070718 100%)' }}>

      {/* Main character screen */}
      <div className="flex items-start justify-center pt-5 pb-2 px-3">

        {/* Left column — tooltip to the right to avoid overflow-hidden clip */}
        <div className="flex flex-col gap-2">
          {LEFT_SLOTS.map(id => (
            <SlotButton
              key={id} slotId={id}
              item={getItem(id)}
              onOpen={() => openCatalog(id)}
              onUnequip={() => unequipItem(id)}
              onRune={() => setRuneSlot(id)}
              runeCount={Object.values(runes[id] ?? {}).filter(v => v > 0).length}
              tooltipSide="right"
              {...getSetProps(id)}
            />
          ))}
        </div>

        {/* Character center */}
        <CharacterCenter />

        {/* Right column — tooltip to the left */}
        <div className="flex flex-col gap-2">
          {RIGHT_SLOTS.map(id => (
            <SlotButton
              key={id} slotId={id}
              item={getItem(id)}
              onOpen={() => openCatalog(id)}
              onUnequip={() => unequipItem(id)}
              onRune={() => setRuneSlot(id)}
              runeCount={Object.values(runes[id] ?? {}).filter(v => v > 0).length}
              tooltipSide="left"
              {...getSetProps(id)}
            />
          ))}
        </div>
      </div>

      {/* Dofus row — tooltip above, enough vertical space */}
      <div className="flex justify-center gap-2 pb-5">
        {DOFUS_SLOTS.map(id => (
          <SlotButton
            key={id} slotId={id}
            item={getItem(id)}
            onOpen={() => openCatalog(id)}
            onUnequip={() => unequipItem(id)}
            onRune={() => setRuneSlot(id)}
            runeCount={Object.values(runes[id] ?? {}).filter(v => v > 0).length}
            small
            tooltipSide="top"
            {...getSetProps(id)}
          />
        ))}
      </div>

      <SetBonusesPanel />

      {openSlot && (
        <ItemCatalog
          slot={openSlot.config}
          slotId={openSlot.id}
          onClose={() => setOpenSlot(null)}
        />
      )}

      {runeSlot && getItem(runeSlot) && (
        <RuneModal
          slotId={runeSlot}
          item={getItem(runeSlot)!}
          onClose={() => setRuneSlot(null)}
        />
      )}
    </div>
  )
}
