import { useState, useMemo, useCallback } from 'react'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { SLOT_CONFIGS, type SlotConfig } from './slotConfig.ts'
import { ItemCatalog } from './ItemCatalog.tsx'
import { SetBonusesPanel } from './SetBonusesPanel.tsx'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import type { SlotId } from '@/store/buildStore.ts'
import type { AppItem } from '@/data/loaders.ts'

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
  slotId:    SlotId
  item:      AppItem | undefined
  onOpen:    () => void
  onUnequip: () => void
  small?:    boolean
}

function SlotButton({ slotId, item, onOpen, onUnequip, small }: SlotButtonProps) {
  const cfg     = SLOT_MAP[slotId]
  const IconCmp = SLOT_ICON[slotId]
  const size    = small ? 'w-11 h-11' : 'w-[58px] h-[58px]'

  return (
    <div className="relative group">
      <button
        onClick={onOpen}
        aria-label={`${cfg.label}${item ? `: ${item.name}` : ' (empty)'}`}
        className={[
          size,
          'rounded-lg flex items-center justify-center relative overflow-hidden',
          'transition-all duration-150 cursor-pointer',
        ].join(' ')}
        style={{
          background: item
            ? 'linear-gradient(145deg, #1c1530, #0d0b1e)'
            : 'linear-gradient(145deg, #0e0e28, #080818)',
          border: item
            ? '1px solid rgba(201,168,76,0.45)'
            : '1px solid rgba(40,40,90,0.8)',
          boxShadow: item
            ? '0 0 14px rgba(201,168,76,0.08) inset, 0 1px 3px rgba(0,0,0,0.5)'
            : '0 1px 3px rgba(0,0,0,0.5)',
        }}
        onMouseEnter={e => {
          if (!item) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(80,80,180,0.7)'
        }}
        onMouseLeave={e => {
          if (!item) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(40,40,90,0.8)'
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
          <span className="text-[#30306a] opacity-70">
            {IconCmp ? <IconCmp /> : cfg.icon}
          </span>
        )}

        {item && (
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.06) 0%, transparent 55%)' }} />
        )}
      </button>

      {/* Unequip × */}
      {item && (
        <button
          onClick={e => { e.stopPropagation(); onUnequip() }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] leading-none items-center justify-center hidden group-hover:flex transition-colors z-10"
          style={{ background: '#080818', border: '1px solid #2a3347', color: '#7a8499' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#7a8499' }}
          aria-label={`Unequip ${item.name}`}
        >×</button>
      )}

      {/* Tooltip */}
      {item && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-30 hidden group-hover:block pointer-events-none w-48">
          <div className="rounded-lg p-2.5 shadow-2xl text-xs"
            style={{ background: '#0d0f14', border: '1px solid #2a3347' }}>
            <p className="font-medium text-[#e8eaf0] mb-1 truncate">{item.name}</p>
            <p className="text-[#7a8499] mb-1.5">Lv {item.level}</p>
            {item.effects.slice(0, 6).map((e, i) => (
              <p key={i} className="text-[#9aa0b0]">
                {e.min !== e.max ? `${e.min}–${e.max}` : `+${e.min}`} {e.stat}
              </p>
            ))}
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
  const classInfo     = selectedClass ? CLASS_DATA.find(c => c.id === selectedClass) : null
  const glow          = classInfo ? (ELEM_GLOW[classInfo.element] ?? ELEM_GLOW.neutral) : 'transparent'

  return (
    <div
      className="relative flex flex-col items-center justify-end rounded-lg overflow-hidden mx-1"
      style={{
        width:      164,
        height:     322,
        background: `radial-gradient(ellipse at 50% 30%, ${glow} 0%, transparent 65%),
                     linear-gradient(175deg, #0e0e26 0%, #07071a 100%)`,
      }}
    >
      {/* Vertical inner glow lines (decorative) */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5) 100%)',
        }} />

      {/* Class display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pb-16">
        {classInfo ? (
          <>
            <div className="text-6xl drop-shadow-2xl"
              style={{ filter: 'drop-shadow(0 0 16px currentColor)' }}>
              {classInfo.icon}
            </div>
            <span className="font-display text-[#c9a84c] text-[11px] tracking-[0.2em] uppercase">
              {classInfo.name}
            </span>
          </>
        ) : (
          <span className="font-display text-[#252545] text-xs tracking-widest">SELECT CLASS</span>
        )}
      </div>

      {/* Stone platform */}
      <div className="w-full">
        {/* Top surface ellipse */}
        <div className="mx-auto rounded-[50%]"
          style={{
            width:      148,
            height:     14,
            background: 'radial-gradient(ellipse at center, #3c2c2c 0%, #1c1414 100%)',
          }} />
        {/* Platform body */}
        <div className="mx-auto relative"
          style={{
            width:  136,
            height: 52,
            background: 'linear-gradient(to bottom, #241a1a, #0c0a0a)',
            borderRadius: '0 0 8px 8px',
          }}>
          {/* Decorative stone lines */}
          <div className="absolute top-2 inset-x-4 h-px opacity-20"
            style={{ background: 'linear-gradient(to right, transparent, #5a4040, transparent)' }} />
          <div className="absolute top-4 inset-x-6 h-px opacity-15"
            style={{ background: 'linear-gradient(to right, transparent, #5a4040, transparent)' }} />

          {/* Glowing eyes */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-8">
            <div className="rounded-full"
              style={{
                width: 10, height: 6,
                background: '#b8ff00',
                boxShadow: '0 0 10px 4px rgba(184,255,0,0.55)',
              }} />
            <div className="rounded-full"
              style={{
                width: 10, height: 6,
                background: '#b8ff00',
                boxShadow: '0 0 10px 4px rgba(184,255,0,0.55)',
              }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── EquipmentGrid ─────────────────────────────────────────────────────────────
export function EquipmentGrid() {
  const equipped    = useBuildStore(s => s.equipped)
  const unequipItem = useBuildStore(s => s.unequipItem)
  const equipment   = useDataStore(s => s.equipment)
  const loading     = useDataStore(s => s.loading)

  const [openSlot, setOpenSlot] = useState<{ config: SlotConfig; id: SlotId } | null>(null)

  const equipMap = useMemo(
    () => new Map((equipment ?? []).map(it => [it.ankama_id, it])),
    [equipment],
  )

  const getItem = useCallback((id: SlotId) => {
    const ankId = equipped[id]
    return ankId != null ? equipMap.get(ankId) : undefined
  }, [equipped, equipMap])

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

        {/* Left column */}
        <div className="flex flex-col gap-2">
          {LEFT_SLOTS.map(id => (
            <SlotButton
              key={id} slotId={id}
              item={getItem(id)}
              onOpen={() => openCatalog(id)}
              onUnequip={() => unequipItem(id)}
            />
          ))}
        </div>

        {/* Character center */}
        <CharacterCenter />

        {/* Right column */}
        <div className="flex flex-col gap-2">
          {RIGHT_SLOTS.map(id => (
            <SlotButton
              key={id} slotId={id}
              item={getItem(id)}
              onOpen={() => openCatalog(id)}
              onUnequip={() => unequipItem(id)}
            />
          ))}
        </div>
      </div>

      {/* Dofus row */}
      <div className="flex justify-center gap-2 pb-5">
        {DOFUS_SLOTS.map(id => (
          <SlotButton
            key={id} slotId={id}
            item={getItem(id)}
            onOpen={() => openCatalog(id)}
            onUnequip={() => unequipItem(id)}
            small
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
    </div>
  )
}
