import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { SLOT_CONFIGS, type SlotConfig } from './slotConfig.ts'
import { ItemCatalog } from './ItemCatalog.tsx'
import { SetBonusesPanel } from './SetBonusesPanel.tsx'
import { RuneModal } from './RuneModal.tsx'
import { SetDetailModal } from './SetDetailModal.tsx'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import type { SlotId } from '@/store/buildStore.ts'
import type { AppItem } from '@/data/loaders.ts'
import { STAT_META, isIgnored, statIconUrl, runeIconUrl, signatureRuneUrl } from './statDisplay.ts'
import { WEAPON_ATTACK_IDS, IGNORED_EFFECT_IDS } from '@/engine/statMap.ts'
import { ElementGem } from '@/ui'

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
  hat:       HatIcon,
  cape:      CapeIcon,
  amulet:    AmuletIcon,
  ring1:     RingIcon,
  ring2:     RingIcon,
  weapon:    WeaponIcon,
  shield:    ShieldIcon,
  belt:      BeltIcon,
  boots:     BootsIcon,
  companion: PetIcon,
  dofus1: DofusIcon, dofus2: DofusIcon, dofus3: DofusIcon,
  dofus4: DofusIcon, dofus5: DofusIcon, dofus6: DofusIcon,
}

// ── Layout groups ────────────────────────────────────────────────────────────
const LEFT_SLOTS:   SlotId[] = ['hat', 'cape', 'weapon', 'shield', 'companion']
const RIGHT_SLOTS:  SlotId[] = ['amulet', 'ring1', 'ring2', 'belt', 'boots']
const EXTRAS_SLOTS: SlotId[] = ['sidekick']
const DOFUS_SLOTS:  SlotId[] = ['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6']

const NO_RUNE_SLOTS = new Set<SlotId>(['dofus1','dofus2','dofus3','dofus4','dofus5','dofus6','companion','sidekick'])

const SLOT_MAP = Object.fromEntries(SLOT_CONFIGS.map(s => [s.id, s])) as Record<SlotId, SlotConfig>

const DOFUS_ADVANCE: Partial<Record<SlotId, SlotId>> = {
  dofus1: 'dofus2', dofus2: 'dofus3', dofus3: 'dofus4',
  dofus4: 'dofus5', dofus5: 'dofus6',
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
  onRune?:      () => void
  onViewSet?:   () => void
  runeCount?:   number
  slotRunes?:   Record<string, number>
  small?:       boolean
  setName?:     string
  setCount?:    number
  setMax?:      number
  nextBonus?:   string
  tooltipSide?: 'right' | 'left' | 'top'
}

function SlotButton({ slotId, item, onOpen, onUnequip, onRune, onViewSet, runeCount, slotRunes, small, setName, setCount, setMax, nextBonus, tooltipSide = 'top' }: SlotButtonProps) {
  const { t }         = useTranslation()
  const cfg           = SLOT_MAP[slotId]
  const IconCmp       = SLOT_ICON[slotId]
  const forjamagoName   = useBuildStore(s => s.forjamagoNames[slotId] ?? '')
  const weaponTransform = useBuildStore(s => s.weaponTransforms[slotId] ?? null)

  const [hovered, setHovered]   = useState(false)
  const [animating, setAnimating] = useState(false)
  const leaveRef                = useRef<ReturnType<typeof setTimeout>>()
  const prevItemRef             = useRef(item)
  const enter = () => { clearTimeout(leaveRef.current); setHovered(true) }
  const leave = () => { clearTimeout(leaveRef.current); setHovered(false) }
  const px      = small ? 62 : 80
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
    <div className="relative flex flex-col items-center gap-0.5" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        onClick={onOpen}
        aria-label={`${slotLabel}${item ? `: ${item.name}` : ` (${t('empty_slot')})`}`}
        className={`rounded-lg flex items-center justify-center relative overflow-hidden transition-all duration-150 cursor-pointer${animating ? ' item-equip' : ''}`}
        style={{
          width:  px,
          height: px,
          background: item
            ? 'linear-gradient(145deg, var(--surface-parchment), var(--surface-void))'
            : 'var(--surface-void)',
          border: item
            ? '1.5px solid color-mix(in srgb, var(--gold) 48%, transparent)'
            : '1px dashed rgba(60,80,130,0.55)',
          boxShadow: item
            ? 'inset 0 0 18px color-mix(in srgb, var(--gold) 10%, transparent), 0 2px 8px rgba(0,0,0,0.5)'
            : 'var(--well-inset)',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement
          if (!item) {
            el.style.borderColor = 'var(--gold-deep)'
            el.style.borderStyle = 'solid'
          } else {
            el.style.boxShadow = 'inset 0 0 22px color-mix(in srgb, var(--gold) 18%, transparent), 0 4px 12px rgba(0,0,0,0.6)'
          }
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement
          if (!item) {
            el.style.borderColor = 'rgba(60,80,130,0.55)'
            el.style.borderStyle = 'dashed'
          } else {
            el.style.boxShadow = 'inset 0 0 18px color-mix(in srgb, var(--gold) 10%, transparent), 0 2px 8px rgba(0,0,0,0.5)'
          }
        }}
      >
        {item ? (
          item.image_url
            ? <img src={item.image_url} alt={item.name}
                className="w-full h-full object-contain p-1.5" loading="lazy" />
            : <span className="opacity-80" style={{ color: 'var(--gold)' }}>
                {IconCmp ? <IconCmp /> : cfg.icon}
              </span>
        ) : (
          <span className="opacity-20 scale-110" style={{ color: 'var(--ink-muted)' }}>
            {IconCmp ? <IconCmp /> : cfg.icon}
          </span>
        )}

        {item && (
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--gold) 7%, transparent) 0%, transparent 55%)' }} />
        )}

        {/* Rune mini-strip: up to 3 rune images at bottom when forjamaged */}
        {item && (runeCount ?? 0) > 0 && slotRunes && (
          <div className="absolute bottom-0.5 right-0.5 flex gap-px pointer-events-none">
            {Object.entries(slotRunes).filter(([, v]) => v > 0).slice(0, 3).map(([stat]) => {
              const url = runeIconUrl(stat)
              return url ? (
                <img key={stat} src={url} alt="" width={12} height={12}
                  className="object-contain"
                  style={{ filter: 'brightness(0.9) drop-shadow(0 0 2px #5a8dffaa)' }}
                />
              ) : null
            })}
          </div>
        )}
      </button>

      {/* Slot label (tiny, below slot) */}
      {!small && (
        <span className="text-[8px] font-medium tracking-wide select-none" style={{ color: 'var(--ink-faint)' }}>
          {slotLabel.toUpperCase()}
        </span>
      )}

      {/* Unequip × */}
      {item && (
        <button
          onClick={e => { e.stopPropagation(); onUnequip() }}
          className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] leading-none items-center justify-center transition-colors z-10 text-ink-muted hover:text-red-400 ${hovered ? 'flex' : 'hidden'}`}
          style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
          aria-label={`Unequip ${item.name}`}
        >×</button>
      )}

      {/* Magesmithy button — Signature_Rune when active, ✦ on hover when none */}
      {item && onRune && (
        <button
          onClick={e => { e.stopPropagation(); onRune() }}
          className={`absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full text-[9px] leading-none flex items-center justify-center transition-all z-10 ${(runeCount ?? 0) > 0 ? 'opacity-100' : hovered ? 'opacity-100' : 'opacity-0'}`}
          style={{
            background: (runeCount ?? 0) > 0 ? 'color-mix(in srgb, var(--ap) 12%, var(--surface-void))' : 'var(--surface-void)',
            border:     (runeCount ?? 0) > 0 ? '1px solid color-mix(in srgb, var(--ap) 60%, transparent)' : '1px solid var(--metal-edge)',
            color:      (runeCount ?? 0) > 0 ? 'var(--ap)' : 'var(--ink-faint)',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ap)'
          }}
          onMouseLeave={e => {
            const active = (runeCount ?? 0) > 0
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = active ? 'color-mix(in srgb, var(--ap) 60%, transparent)' : 'var(--metal-edge)'
          }}
          aria-label={`Magesmithy: ${item.name}`}
          title={t('magesmithy_title')}
        >
          {(runeCount ?? 0) > 0
            ? <img src={signatureRuneUrl()} alt="" width={13} height={13} className="object-contain" />
            : '✦'
          }
        </button>
      )}

      {/* Set detail button — bottom-right */}
      {item && onViewSet && (
        <button
          onClick={e => { e.stopPropagation(); onViewSet() }}
          className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all z-10 hover:text-ap ${hovered ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'var(--surface-void)', border: '1px solid var(--water)', color: 'var(--water)' }}
          title={t('view_set')}
        >
          <Eye size={10} />
        </button>
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
          <div className="rounded-xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)', boxShadow: '0 8px 40px rgba(0,0,0,0.85)' }}>

            {/* Item header */}
            <div className="px-3 pt-2.5 pb-2" style={{ background: 'linear-gradient(180deg, var(--surface-parchment) 0%, var(--surface-panel) 100%)', borderBottom: '1px solid var(--metal-edge)' }}>
              <p className="font-bold text-[13px] leading-tight" style={{ color: 'var(--ink)' }}>{item.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                {t('level')} {item.level} · {item.type}
              </p>
              {setName && (
                <p className="text-[11px] mt-1 font-semibold" style={{ color: 'var(--water)' }}>
                  {setName}
                  <span className="ml-1.5 font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{setCount}/{setMax}</span>
                </p>
              )}
            </div>

            {/* Special ability (dofus passive, etc.) */}
            {item.ability && (
              <div className="px-3 pt-2 pb-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
                <div style={{
                  background:   'color-mix(in srgb, var(--gold) 10%, transparent)',
                  border:       '1px solid color-mix(in srgb, var(--gold) 35%, transparent)',
                  borderRadius: 6,
                  padding:      '5px 8px',
                }}>
                  {item.ability.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className="leading-snug" style={{
                      fontSize: 11,
                      color:    i === 0 ? 'var(--gold)' : 'var(--gold-deep)',
                      margin:   i > 0 ? '2px 0 0' : 0,
                    }}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Effects — weapon slots split into attack / stats sections */}
            {(() => {
              const allFx      = item.effects.filter(e =>
                !isIgnored(e.stat) && (e.effect_id == null || !IGNORED_EFFECT_IDS.has(e.effect_id))
              )
              const isWeapon   = item.slot === 'weapon' || item.ap_cost != null
              const isAtk      = (e: typeof allFx[0]) =>
                e.effect_id != null ? WEAPON_ATTACK_IDS.has(e.effect_id) : false
              const rawAtkFx   = isWeapon ? allFx.filter(isAtk)  : []
              const statFx     = isWeapon ? allFx.filter(e => !isAtk(e)) : allFx

              // Apply elemental weapon transform: replace Neutral damage with chosen element
              type AtkEntry = typeof rawAtkFx[0] & { transformed?: boolean }
              const atkFx: AtkEntry[] = (weaponTransform && isWeapon)
                ? rawAtkFx.map(e => {
                    if (e.stat !== 'Neutral damage') return e
                    const cap     = weaponTransform.element.charAt(0).toUpperCase() + weaponTransform.element.slice(1)
                    const r       = weaponTransform.ratio / 100
                    return {
                      ...e,
                      stat:        `${cap} damage`,
                      min:         Math.floor(e.min * r),
                      max:         e.max > 0 ? Math.floor(e.max * r) : 0,
                      transformed: true,
                    }
                  })
                : rawAtkFx

              function StatLine({ e, i }: { e: { stat: string; min: number; max: number }; i: number }) {
                const meta    = STAT_META[e.stat]
                const clr     = meta?.color ?? 'var(--ink-muted)'
                const useMax  = e.max !== 0 && e.max > e.min
                const display = useMax ? e.max : e.min
                return (
                  <div key={i} className="flex items-center gap-1.5 min-w-0">
                    {meta?.icon
                      ? <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain flex-shrink-0" />
                      : <span className="w-3 flex-shrink-0" />
                    }
                    <span className="text-[11px] font-bold tabular-nums flex-shrink-0" style={{ color: clr }}>{display}</span>
                    <span className="text-[11px] flex-shrink-0" style={{ color: clr }}>{meta ? t(meta.tKey) : e.stat}</span>
                    {useMax && (
                      <span className="text-[9px] ml-auto tabular-nums flex-shrink-0 font-mono" style={{ color: 'var(--ink-faint)' }}>
                        [{e.min} {t('range_sep_neg')} {e.max}]
                      </span>
                    )}
                  </div>
                )
              }

              function AtkLine({ e, i }: { e: { stat: string; min: number; max: number; transformed?: boolean }; i: number }) {
                const meta       = STAT_META[e.stat]
                const clr        = meta?.color ?? 'var(--ink-muted)'
                const isPush     = e.stat === 'Pushes back cell'
                const isTransformed = e.transformed === true
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 min-w-0 rounded px-1"
                    style={isTransformed ? {
                      background: `color-mix(in srgb, ${clr} 10%, transparent)`,
                      outline:    `1px solid color-mix(in srgb, ${clr} 25%, transparent)`,
                    } : undefined}
                  >
                    {meta?.icon
                      ? <img src={statIconUrl(meta.icon)} alt="" width={12} height={12} className="object-contain flex-shrink-0" />
                      : <span className="w-3 flex-shrink-0" />
                    }
                    {isPush
                      ? <span className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>{t('spell_push', { cells: e.min })}</span>
                      : <>
                          <span className="text-[11px] font-bold tabular-nums flex-shrink-0" style={{ color: clr, fontWeight: isTransformed ? 800 : 700 }}>
                            {e.min === e.max || e.max === 0 ? e.min : `${e.min} ${t('range_sep_neg')} ${e.max}`}
                          </span>
                          <span className="text-[11px] flex-shrink-0" style={{ color: clr }}>{meta ? t(meta.tKey) : e.stat}</span>
                        </>
                    }
                  </div>
                )
              }

              return (
                <>
                  {atkFx.length > 0 && (
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-[9px] tracking-[0.18em] uppercase font-semibold mb-1.5" style={{ color: 'var(--ink-faint)' }}>
                        {t('weapon_attack')}
                      </p>
                      <div className="space-y-0.5">
                        {atkFx.map((e, i) => <AtkLine key={i} e={e} i={i} />)}
                      </div>
                    </div>
                  )}
                  {statFx.length > 0 && (
                    <div className="px-3 pt-2 pb-1" style={atkFx.length > 0 ? { borderTop: '1px solid var(--metal-edge)' } : undefined}>
                      <p className="text-[9px] tracking-[0.18em] uppercase font-semibold mb-1.5" style={{ color: 'var(--ink-faint)' }}>
                        {t('effects')}
                      </p>
                      <div className="space-y-0.5">
                        {statFx.map((e, i) => <StatLine key={i} e={e} i={i} />)}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}

            {/* FORJAMAGIA section — blue, only if runes exist */}
            {Object.entries(slotRunes ?? {}).some(([, v]) => v > 0) && (
              <div className="px-3 pt-1.5 pb-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
                <p className="text-[9px] tracking-[0.18em] uppercase font-semibold mb-1.5 flex items-center gap-1"
                  style={{ color: 'var(--ink-faint)' }}>
                  <span style={{ color: 'var(--ap)' }}>✦</span> {t('magesmithy')}
                </p>
                <div className="space-y-0.5">
                  {Object.entries(slotRunes ?? {}).filter(([, v]) => v > 0).map(([stat, val]) => {
                    const meta = STAT_META[stat]
                    const rUrl = runeIconUrl(stat)
                    return (
                      <div key={stat} className="flex items-center gap-1.5">
                        {rUrl
                          ? <img src={rUrl} alt="" width={16} height={16}
                              className="object-contain flex-shrink-0"
                              style={{ filter: 'saturate(0.6) hue-rotate(200deg) brightness(1.2)' }}
                            />
                          : meta?.icon
                          ? <img src={statIconUrl(meta.icon)} alt="" width={12} height={12}
                              className="object-contain flex-shrink-0"
                              style={{ filter: 'saturate(0.3) hue-rotate(200deg) brightness(1.4)' }}
                            />
                          : <span className="w-3 flex-shrink-0" />
                        }
                        <span className="text-[11px] font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--ap)' }}>
                          +{val}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--water)' }}>
                          {meta ? t(meta.tKey) : stat}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {forjamagoName && Object.entries(slotRunes ?? {}).some(([, v]) => v > 0) && (
              <div className="px-3 pb-1.5" style={{ borderTop: '1px solid var(--metal-edge)', paddingTop: 6 }}>
                <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--ink-faint)' }}>
                  <span style={{ color: 'var(--water)' }}>✦</span>
                  <span>{t('modified_by')}:</span>
                  <span style={{ color: 'var(--ap)' }}>{forjamagoName}</span>
                </p>
              </div>
            )}

            {nextBonus && (
              <div className="px-3 py-1.5" style={{ borderTop: '1px solid var(--metal-edge)' }}>
                <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>▶ {t('next_bonus')}: {nextBonus}</p>
              </div>
            )}

            {/* Lore description */}
            {item.description && (
              <div className="px-3 pb-2.5" style={{ borderTop: '1px solid var(--metal-edge)', paddingTop: 7 }}>
                <p className="text-[10px] italic leading-snug" style={{ color: 'var(--ink-faint)' }}>
                  {item.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Character center (The Crucible) ──────────────────────────────────────────

// Gem ring at radius 68px from portrait center; earth=top, clockwise
const GEM_RING = [
  { element: 'earth',    dx:   0, dy: -68 },
  { element: 'fire',     dx:  59, dy: -34 },
  { element: 'air',      dx:  59, dy:  34 },
  { element: 'neutral',  dx:   0, dy:  68 },
  { element: 'water',    dx: -59, dy:  34 },
  { element: 'vitality', dx: -59, dy: -34 },
] as const

function elemVar(elem: string | null | undefined): string {
  if (!elem || elem === 'multi') return 'var(--gold)'
  return `var(--${elem})`
}

function CharacterCenter() {
  const { t }         = useTranslation()
  const selectedClass = useBuildStore(s => s.selectedClass)
  const gender        = useBuildStore(s => s.gender)
  const level         = useBuildStore(s => s.level)
  const classInfo     = selectedClass ? CLASS_DATA.find(c => c.id === selectedClass) : null
  const classElem     = classInfo?.element ?? null
  const primaryColor  = elemVar(classElem)

  const portrait = classInfo
    ? (gender === 'female' ? classInfo.imageFUrl : classInfo.imageUrl)
    : null

  function gemIntensity(element: string): number {
    if (!classElem)            return 0.12
    if (classElem === 'multi') return 0.80
    return classElem === element ? 1.0 : 0.20
  }

  return (
    <div
      className="relative flex flex-col items-center flex-shrink-0"
      style={{
        width:     200,
        minHeight: 480,
        background: `radial-gradient(ellipse at 50% 28%, color-mix(in srgb, ${primaryColor} 16%, transparent) 0%, transparent 58%), var(--surface-void)`,
      }}
    >
      {/* Portrait + gem ring */}
      <div
        className="relative flex items-center justify-center mt-6"
        style={{ width: 180, height: 250 }}
      >
        {/* Dashed ring guide */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          viewBox="0 0 180 250"
        >
          <circle
            cx="90" cy="125"
            r="80"
            fill="none"
            stroke={primaryColor}
            strokeOpacity="0.16"
            strokeWidth="1"
            strokeDasharray="3 8"
          />
          <circle
            cx="90" cy="125"
            r="87"
            fill="none"
            stroke={primaryColor}
            strokeOpacity="0.06"
            strokeWidth="1"
          />
        </svg>

        {/* Class portrait */}
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{
            width:        130,
            height:       130,
            position:     'relative',
            zIndex:       1,
            borderRadius: 14,
            border:       `2px solid color-mix(in srgb, ${primaryColor} 45%, transparent)`,
            boxShadow:    `0 0 40px color-mix(in srgb, ${primaryColor} 40%, transparent), 0 0 10px color-mix(in srgb, ${primaryColor} 18%, transparent)`,
            background:   'var(--surface-void)',
          }}
        >
          {portrait ? (
            <img
              src={portrait}
              alt={classInfo?.name ?? ''}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl" style={{ color: 'var(--ink-faint)' }}>?</span>
            </div>
          )}
        </div>

        {/* Gem ring — on top of character viewer (zIndex 2 > viewer zIndex 1) */}
        {GEM_RING.map(({ element, dx, dy }) => (
          <div
            key={element}
            style={{
              position:  'absolute',
              left:      '50%',
              top:       '50%',
              transform: `translate(calc(-50% + ${Math.round(dx * 1.18)}px), calc(-50% + ${Math.round(dy * 1.18)}px))`,
              zIndex:    2,
            }}
          >
            <ElementGem element={element} intensity={gemIntensity(element)} size={15} />
          </div>
        ))}
      </div>

      {/* Class name + level + separator */}
      <div className="flex flex-col items-center gap-1.5 mt-3">
        {classInfo ? (
          <>
            <span
              className="font-display text-[14px] tracking-[0.28em] uppercase"
              style={{ color: 'var(--gold)', textShadow: '0 0 20px rgba(201,162,75,0.45)' }}
            >
              {classInfo.name}
            </span>
            <div className="flex items-center gap-2">
              <div style={{
                width:      40,
                height:     1,
                background: 'linear-gradient(to right, transparent, var(--gold-deep))',
                opacity:    0.7,
              }} />
              <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                {t('level_range')}.{level}
              </span>
              <div style={{
                width:      40,
                height:     1,
                background: 'linear-gradient(to left, transparent, var(--gold-deep))',
                opacity:    0.7,
              }} />
            </div>
          </>
        ) : (
          <>
            <span className="font-display text-[9px] tracking-widest text-center px-4" style={{ color: 'var(--ink-faint)' }}>
              {t('select_class_prompt')}
            </span>
            <div style={{
              width:      100,
              height:     1,
              background: 'linear-gradient(to right, transparent, var(--gold-deep) 15%, var(--gold) 50%, var(--gold-deep) 85%, transparent)',
              opacity:    0.4,
            }} />
          </>
        )}
      </div>
    </div>
  )
}

// ── EquipmentGrid ─────────────────────────────────────────────────────────────
export function EquipmentGrid() {
  const { t }       = useTranslation()
  const equipped    = useBuildStore(s => s.equipped)
  const _sets       = useBuildStore(s => s._sets)
  const runes       = useBuildStore(s => s.runes)
  const unequipItem = useBuildStore(s => s.unequipItem)
  const equipment   = useDataStore(s => s.equipment)
  const loading     = useDataStore(s => s.loading)

  const [openSlot, setOpenSlot] = useState<{ config: SlotConfig; id: SlotId } | null>(null)
  const [runeSlot, setRuneSlot] = useState<SlotId | null>(null)
  const [openSetId, setOpenSetId] = useState<number | null>(null)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 text-sm font-display tracking-widest"
        style={{ background: 'var(--surface-void)', color: 'var(--ink-faint)' }}>
        {t('loading_data')}
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--surface-void)',
      backgroundImage: [
        'radial-gradient(ellipse 72% 50% at 50% 44%, color-mix(in srgb, var(--gold) 7%, transparent) 0%, transparent 65%)',
        'radial-gradient(ellipse 40% 28% at 16% 85%, color-mix(in srgb, var(--water) 5%, transparent) 0%, transparent 70%)',
        'radial-gradient(ellipse 40% 28% at 84% 85%, color-mix(in srgb, var(--earth) 5%, transparent) 0%, transparent 70%)',
      ].join(', '),
    }}>

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
              onRune={NO_RUNE_SLOTS.has(id) ? undefined : () => setRuneSlot(id)}
              runeCount={Object.values(runes[id] ?? {}).filter(v => v > 0).length}
              slotRunes={runes[id]}
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
              onRune={NO_RUNE_SLOTS.has(id) ? undefined : () => setRuneSlot(id)}
              runeCount={Object.values(runes[id] ?? {}).filter(v => v > 0).length}
              slotRunes={runes[id]}
              tooltipSide="left"
              {...getSetProps(id)}
            />
          ))}
        </div>
      </div>

      {/* Extras row: Petsmount, Mount, Sidekick */}
      <div className="flex justify-center gap-2 pb-2">
        {EXTRAS_SLOTS.map(id => (
          <SlotButton
            key={id} slotId={id}
            item={getItem(id)}
            onOpen={() => openCatalog(id)}
            onUnequip={() => unequipItem(id)}
            onRune={NO_RUNE_SLOTS.has(id) ? undefined : () => setRuneSlot(id)}
            runeCount={Object.values(runes[id] ?? {}).filter(v => v > 0).length}
            slotRunes={runes[id]}
            small
            tooltipSide="top"
            {...getSetProps(id)}
          />
        ))}
      </div>

      {/* Dofus row — tooltip above, enough vertical space */}
      <div className="flex justify-center gap-2 pb-5">
        {DOFUS_SLOTS.map(id => (
          <SlotButton
            key={id} slotId={id}
            item={getItem(id)}
            onOpen={() => openCatalog(id)}
            onUnequip={() => unequipItem(id)}
            onRune={NO_RUNE_SLOTS.has(id) ? undefined : () => setRuneSlot(id)}
            runeCount={Object.values(runes[id] ?? {}).filter(v => v > 0).length}
            slotRunes={runes[id]}
            small
            tooltipSide="top"
            {...getSetProps(id)}
          />
        ))}
      </div>

      <SetBonusesPanel />

      {openSlot && createPortal(
        <ItemCatalog
          slot={openSlot.config}
          slotId={openSlot.id}
          onClose={() => setOpenSlot(null)}
          onAfterEquip={(slotId) => {
            const next = DOFUS_ADVANCE[slotId]
            if (next) setOpenSlot({ config: SLOT_MAP[next], id: next })
            else setOpenSlot(null)
          }}
        />,
        document.body
      )}

      {runeSlot && getItem(runeSlot) && (
        <RuneModal
          slotId={runeSlot}
          item={getItem(runeSlot)!}
          onClose={() => setRuneSlot(null)}
        />
      )}

      {openSetId != null && setDataMap.get(openSetId) && (
        <SetDetailModal
          set={setDataMap.get(openSetId)!}
          onClose={() => setOpenSetId(null)}
        />
      )}
    </div>
  )
}
