import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore, type SlotId, type WeaponTransform } from '@/store/buildStore.ts'
import type { AppItem } from '@/data/loaders.ts'
import { STAT_META, statIconUrl, runeIconUrl, runeKeyIconUrl, runeIconFallback, transcendenceIconUrl } from './statDisplay.ts'
import { exoticOf, isExoticKey, runeStat } from '@/engine/runes.ts'
import { TRANSCENDENCE, FORGEABLE_SLOTS, rankOptions, bestRank, lineWeight } from './transcendence.ts'
import { normalizeSearch } from '@/ui/normalize.ts'

type RuneSection = { labelKey: string; stats: string[] }

const RUNE_SECTIONS: RuneSection[] = [
  {
    labelKey: 'rune_section_primary',
    stats: ['Vitality', 'Strength', 'Intelligence', 'Chance', 'Agility', 'Wisdom', 'Power', 'AP', 'MP', 'Range', 'Summons', '% Critical'],
  },
  {
    labelKey: 'rune_section_damage',
    stats: [
      'Damage', 'Earth Damage', 'Fire Damage', 'Water Damage', 'Air Damage', 'Neutral Damage',
      '% Spell Damage', '% Weapon Damage', '% Melee Damage', '% Ranged Damage',
      'Critical Damage', 'Pushback Damage', 'Trap Damage', 'Power (traps)',
    ],
  },
  {
    labelKey: 'rune_section_resistance',
    stats: [
      'Earth Resistance', 'Fire Resistance', 'Water Resistance', 'Air Resistance', 'Neutral Resistance',
      'Critical Resistance', 'Pushback Resistance',
    ],
  },
  {
    labelKey: 'rune_section_pct_resistance',
    stats: [
      '% Earth Resistance', '% Fire Resistance', '% Water Resistance', '% Air Resistance', '% Neutral Resistance',
      '% Melee Resistance', '% Ranged Resistance',
    ],
  },
  {
    labelKey: 'rune_section_secondary',
    stats: [
      'Initiative', 'Lock', 'Dodge', 'Heal', 'Prospecting', 'Pod',
      'AP Reduction', 'MP Reduction', 'AP Parry', 'MP Parry', 'reflected damage',
    ],
  },
]

const ALL_RUNES = RUNE_SECTIONS.flatMap(s => s.stats)

const PCT_RUNES = new Set([
  '% Earth Resistance', '% Fire Resistance', '% Water Resistance', '% Air Resistance', '% Neutral Resistance',
  '% Spell Damage', '% Weapon Damage', '% Melee Damage', '% Ranged Damage',
  '% Melee Resistance', '% Ranged Resistance', '% Critical',
])
const UNIT_RUNES = new Set(['AP', 'MP', 'Range'])

function quickValuesFor(stat: string): number[] {
  if (PCT_RUNES.has(stat))  return [1, 2, 3, 4, 5]
  if (UNIT_RUNES.has(stat)) return [1]
  return [1, 5, 10, 25, 50, 100]
}

const exoticFirst = ([a]: [string, number], [b]: [string, number]) => Number(isExoticKey(b)) - Number(isExoticKey(a))

function RuneIcon({ stat, size, color, dim, transcendence }: { stat: string; size: number; color: string; dim?: boolean; transcendence?: boolean }) {
  const meta = STAT_META[stat]
  const rUrl = (transcendence && transcendenceIconUrl(stat)) || runeIconUrl(stat)
  const filter = dim ? 'brightness(0.65) saturate(0.5)' : `drop-shadow(0 0 5px color-mix(in srgb, ${color} 60%, transparent)) brightness(1.15)`
  if (rUrl) return <img src={rUrl} onError={runeIconFallback(stat)} alt="" width={size} height={size} className="object-contain flex-shrink-0" style={{ filter }} />
  if (meta?.icon) return <img src={statIconUrl(meta.icon)} alt="" width={Math.round(size * 0.65)} height={Math.round(size * 0.65)} className="object-contain flex-shrink-0" style={{ filter }} />
  return null
}

type TransformElem = 'fire' | 'earth' | 'water' | 'air'
const TRANSFORM_ELEMENTS: { elem: TransformElem; color: string }[] = [
  { elem: 'fire',  color: 'var(--fire)'  },
  { elem: 'earth', color: 'var(--earth)' },
  { elem: 'water', color: 'var(--water)' },
  { elem: 'air',   color: 'var(--air)'   },
]
const TRANSFORM_RATIOS: (85 | 68 | 50)[] = [85, 68, 50]

type Props = {
  slotId:  SlotId
  item:    AppItem
  onClose: () => void
}

// Shared fallback: a fresh `{}` per selector call would make zustand see a
// new value on every store change and re-render the open modal each time.
const EMPTY_RUNES: Record<string, number> = {}

export function RuneModal({ slotId, item, onClose }: Props) {
  const { t } = useTranslation()
  const runes              = useBuildStore(s => s.runes[slotId] ?? EMPTY_RUNES)
  const setRune            = useBuildStore(s => s.setRune)
  const clearRune          = useBuildStore(s => s.clearRune)
  const clearAllRunes      = useBuildStore(s => s.clearAllRunes)
  const forjamagoName      = useBuildStore(s => s.forjamagoNames[slotId] ?? '')
  const setForjamagoName   = useBuildStore(s => s.setForjamagoName)
  const weaponTransform    = useBuildStore(s => s.weaponTransforms[slotId] ?? null)
  const setWeaponTransform = useBuildStore(s => s.setWeaponTransform)
  const setExotic          = useBuildStore(s => s.setExotic)
  const clearExotic        = useBuildStore(s => s.clearExotic)

  const isWeaponSlot     = slotId === 'weapon'
  const hasNeutralDamage = isWeaponSlot && item.effects.some(e => e.stat === 'Neutral damage')

  const [selected, setSelected] = useState(ALL_RUNES[0])
  const [addValue, setAddValue] = useState<number | ''>(10)
  const addValueNum = addValue === '' ? 0 : addValue

  const forgeable = FORGEABLE_SLOTS.has(slotId)
  const exotic    = exoticOf(runes)
  const [mode, setMode]       = useState<'normal' | 'exotic'>('normal')
  const [trFocus, setTrFocus] = useState<string | null>(exotic ? exotic.stat : null)
  const [runeSearch, setRuneSearch] = useState('')

  const runeEntries   = Object.entries(runes).filter(([, v]) => v > 0).sort(exoticFirst)
  const normalCount   = runeEntries.filter(([k]) => k !== exotic?.key).length
  const exoticRank    = exotic ? rankOptions(item, exotic.stat).find(o => o.value === exotic.value)?.rank : undefined
  const exoticColor   = exotic ? STAT_META[exotic.stat]?.color ?? 'var(--gold)' : 'var(--gold)'
  const focusOptions  = trFocus ? rankOptions(item, trFocus) : []
  const selMeta     = STAT_META[selected]
  const selColor    = selMeta?.color ?? 'var(--gold)'
  const quickVals   = quickValuesFor(selected)

  function selectRune(stat: string) {
    setSelected(stat)
    const vals = quickValuesFor(stat)
    setAddValue(vals[0])
  }

  function addRune() {
    if (addValueNum <= 0) return
    setRune(slotId, selected, (runes[selected] ?? 0) + addValueNum)
  }

  function pickTranscendence(stat: string) {
    setTrFocus(stat)
    const best = bestRank(item, stat)
    if (best) setExotic(slotId, stat, best.value)
  }

  const statLabel = (stat: string) => (STAT_META[stat] ? t(STAT_META[stat].tKey) : stat)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,4,14,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{
          maxWidth:   640,
          maxHeight:  '90vh',
          background: 'var(--surface-void)',
          border:     '1px solid var(--metal-edge)',
          boxShadow:  `0 0 60px rgba(0,0,0,0.9), 0 0 0 1px color-mix(in srgb, var(--gold) 8%, transparent) inset`,
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--metal-edge)' }}
        >
          {item.image_url && (
            <div
              className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
              style={{
                width: 48, height: 48,
                background: 'linear-gradient(145deg, var(--surface-parchment), var(--surface-void))',
                border:     `1.5px solid color-mix(in srgb, var(--gold) 40%, transparent)`,
                boxShadow:  `color-mix(in srgb, var(--gold) 10%, transparent) 0 0 12px inset`,
              }}
            >
              <img src={item.image_url} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold truncate leading-tight" style={{ color: 'var(--gold)', fontSize: 13 }}>
              {item.name}
            </p>
            <p className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--ink-faint)' }}>
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: 'color-mix(in srgb, var(--gold) 9%, transparent)',
                  border:     '1px solid color-mix(in srgb, var(--gold) 13%, transparent)',
                  color:      'var(--gold)',
                  opacity:    0.8,
                }}
              >✦ {t('magesmithy')}</span>
              <span>{t('level_range')} {item.level}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-base transition-colors text-ink-muted hover:text-ink"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--metal-edge)' }}
            aria-label={t('modal_close')}
          >×</button>
        </div>

        {/* ── Normal runes / exotic effect ───────────────────────────── */}
        {forgeable && (
          <div className="flex-shrink-0 px-4 pt-3 pb-2" style={{ background: 'var(--surface-panel)' }}>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" role="tablist" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
              {(['normal', 'exotic'] as const).map(m => {
                const active = mode === m
                const clr    = m === 'exotic' ? 'var(--gold)' : 'var(--ap)'
                const count  = m === 'exotic' ? (exotic ? '1/1' : '0/1') : String(normalCount)
                return (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMode(m)}
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                    style={{
                      background: active ? `color-mix(in srgb, ${clr} 14%, transparent)` : 'transparent',
                      border:     active ? `1px solid color-mix(in srgb, ${clr} 50%, transparent)` : '1px solid transparent',
                      color:      active ? clr : 'var(--ink-faint)',
                    }}
                  >
                    <span>{m === 'exotic' ? '◆' : '✦'}</span>
                    {t(m === 'exotic' ? 'rune_tab_transcendence' : 'rune_tab_normal')}
                    <span className="text-[9px] font-mono rounded px-1" style={{ background: 'var(--surface-raised)', color: active ? clr : 'var(--ink-faint)' }}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {mode === 'exotic' && (
          <div
            className="flex-shrink-0 px-4 py-3"
            style={{
              background:   `color-mix(in srgb, ${exoticColor} 6%, var(--surface-panel))`,
              borderBottom: `1px solid color-mix(in srgb, ${exoticColor} 25%, var(--metal-edge))`,
              transition:   'background 200ms, border-color 200ms',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                key={exotic ? `${exotic.key}:${exotic.value}` : 'empty'}
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 forge-pop"
                style={exotic ? {
                  background: `color-mix(in srgb, ${exoticColor} 12%, var(--surface-void))`,
                  border:     '1.5px solid var(--gold)',
                  boxShadow:  `0 0 14px color-mix(in srgb, var(--gold) 35%, transparent)`,
                } : {
                  background: 'var(--surface-void)',
                  border:     '1.5px dashed var(--metal-edge)',
                }}
              >
                {exotic
                  ? <RuneIcon stat={exotic.stat} size={30} color={exoticColor} transcendence />
                  : <span className="text-lg" style={{ color: 'var(--ink-faint)', opacity: 0.5 }}>◆</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--gold)' }}>{t('rune_tr_slot')}</p>
                {exotic ? (
                  <p className="text-sm font-bold truncate" style={{ color: exoticColor }}>
                    +{exotic.value} {statLabel(exotic.stat)}
                    <span className="text-[10px] font-normal ml-1.5" style={{ color: 'var(--ink-faint)' }}>
                      · {exoticRank ? t('rune_rank', { rank: exoticRank }) : t('optimizer_transcendence')}
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] leading-snug" style={{ color: 'var(--ink-faint)' }}>{t('rune_tr_empty')}</p>
                )}
              </div>
              {exotic && (
                <button
                  onClick={() => clearExotic(slotId)}
                  className="flex-shrink-0 text-[10px] px-2 py-1 rounded transition-colors"
                  style={{
                    background: 'color-mix(in srgb, var(--negative) 10%, transparent)',
                    border:     '1px solid color-mix(in srgb, var(--negative) 25%, transparent)',
                    color:      'var(--negative)',
                  }}
                >
                  {t('rune_tr_remove')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Add controls — always visible, never needs scrolling ─────── */}
        {mode === 'normal' && <div
          className="flex-shrink-0 px-4 py-3 space-y-2"
          style={{
            background:   `color-mix(in srgb, ${selColor} 5%, var(--surface-panel))`,
            borderBottom: `1px solid color-mix(in srgb, ${selColor} 22%, var(--metal-edge))`,
            transition:   'background 200ms, border-color 200ms',
          }}
        >
          {/* Row 1: selected rune info + current val */}
          <div className="flex items-center gap-2">
            {(() => {
              const rUrl = runeIconUrl(selected)
              if (rUrl) return (
                <img src={rUrl} alt="" width={26} height={26} className="object-contain flex-shrink-0"
                  style={{ filter: `drop-shadow(0 0 5px color-mix(in srgb, ${selColor} 67%, transparent))` }}
                />
              )
              if (selMeta?.icon) return (
                <img src={statIconUrl(selMeta.icon)} alt="" width={18} height={18} className="object-contain flex-shrink-0"
                  style={{ filter: `drop-shadow(0 0 4px color-mix(in srgb, ${selColor} 60%, transparent))` }}
                />
              )
              return null
            })()}
            <span className="font-semibold text-sm flex-1" style={{ color: selColor }}>
              {selMeta ? t(selMeta.tKey) : selected}
            </span>
            {(runes[selected] ?? 0) > 0 && (
              <span className="text-[11px] font-mono rounded px-1.5 py-0.5"
                style={{
                  background: `color-mix(in srgb, ${selColor} 10%, transparent)`,
                  border:     `1px solid color-mix(in srgb, ${selColor} 22%, transparent)`,
                  color:      selColor,
                }}
              >
                {t('rune_current', { value: runes[selected] })}
              </span>
            )}
          </div>

          {/* Row 2: quick vals + input + Add */}
          <div className="flex gap-1.5 items-center">
            {/* Quick presets */}
            <div className="flex gap-1 flex-shrink-0">
              {quickVals.map(v => (
                <button
                  key={v}
                  onClick={() => setAddValue(v)}
                  className="px-2 py-1 rounded text-[11px] font-mono font-bold transition-all"
                  style={{
                    background: addValue === v ? `color-mix(in srgb, ${selColor} 15%, transparent)` : 'transparent',
                    border:     addValue === v ? `1.5px solid color-mix(in srgb, ${selColor} 55%, transparent)` : '1px solid var(--metal-edge)',
                    color:      addValue === v ? selColor : 'var(--ink-faint)',
                  }}
                >+{v}</button>
              ))}
            </div>

            {/* Custom input */}
            <div
              className="flex items-center gap-0.5 rounded px-1 flex-1 min-w-0"
              style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
            >
              <button
                onClick={() => setAddValue(v => Math.max(0, (v === '' ? 0 : v) - 1))}
                className="w-5 h-6 flex items-center justify-center text-sm font-bold select-none transition-colors"
                style={{ color: 'var(--ink-faint)' }}
              >−</button>
              <input
                type="number"
                value={addValue}
                min={0}
                max={9999}
                onChange={e => {
                  const raw = e.target.value
                  if (raw === '') { setAddValue(''); return }
                  const n = parseInt(raw)
                  setAddValue(Number.isNaN(n) ? '' : Math.max(0, n))
                }}
                className="flex-1 bg-transparent text-center text-xs py-1 font-mono tabular-nums"
                style={{ color: selColor, outline: 'none', minWidth: 0 }}
              />
              <button
                onClick={() => setAddValue(v => (v === '' ? 0 : v) + 1)}
                className="w-5 h-6 flex items-center justify-center text-sm font-bold select-none transition-colors"
                style={{ color: 'var(--ink-faint)' }}
              >+</button>
            </div>

            {/* Add button */}
            <button
              onClick={addRune}
              disabled={addValueNum <= 0}
              className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={addValueNum <= 0 ? {
                background: 'var(--surface-void)',
                border:     '1.5px solid var(--metal-edge)',
                color:      'var(--ink-faint)',
              } : {
                background: `linear-gradient(135deg, color-mix(in srgb, ${selColor} 15%, transparent), color-mix(in srgb, ${selColor} 8%, transparent))`,
                border:     `1.5px solid color-mix(in srgb, ${selColor} 50%, transparent)`,
                color:      selColor,
                boxShadow:  `0 0 10px color-mix(in srgb, ${selColor} 13%, transparent)`,
              }}
              onMouseEnter={e => {
                if (addValueNum <= 0) return
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = `linear-gradient(135deg, color-mix(in srgb, ${selColor} 22%, transparent), color-mix(in srgb, ${selColor} 14%, transparent))`
                el.style.boxShadow  = `0 0 16px color-mix(in srgb, ${selColor} 27%, transparent)`
              }}
              onMouseLeave={e => {
                if (addValueNum <= 0) return
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = `linear-gradient(135deg, color-mix(in srgb, ${selColor} 15%, transparent), color-mix(in srgb, ${selColor} 8%, transparent))`
                el.style.boxShadow  = `0 0 10px color-mix(in srgb, ${selColor} 13%, transparent)`
              }}
            >
              {t('rune_add_btn')}
            </button>
          </div>
        </div>}

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">
          {/* Elemental weapon transform */}
          {isWeaponSlot && mode === 'normal' && (
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--metal-edge)' }}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-faint)' }}>
                  {t('weapon_transform')}
                </span>
                {weaponTransform && hasNeutralDamage && (
                  <button
                    onClick={() => setWeaponTransform(slotId, null)}
                    className="text-[10px] px-2 py-0.5 rounded transition-colors"
                    style={{
                      background: 'color-mix(in srgb, var(--negative) 12%, transparent)',
                      border:     '1px solid color-mix(in srgb, var(--negative) 27%, transparent)',
                      color:      'var(--negative)',
                    }}
                  >
                    {t('weapon_transform_clear')}
                  </button>
                )}
              </div>

              {!hasNeutralDamage ? (
                <div
                  className="rounded-xl flex items-center justify-center py-3 text-[11px] text-center px-2"
                  style={{ background: 'var(--surface-void)', border: '1px dashed var(--metal-edge)', color: 'var(--ink-faint)', opacity: 0.5 }}
                >
                  {t('weapon_transform_no_neutral')}
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-2">
                    {TRANSFORM_ELEMENTS.map(({ elem, color }) => {
                      const active  = weaponTransform?.element === elem
                      const iconUrl = runeIconUrl(`transform_${elem}`) ?? ''
                      return (
                        <button
                          key={elem}
                          onClick={() => setWeaponTransform(slotId, { element: elem, ratio: weaponTransform?.ratio ?? 85 } as WeaponTransform)}
                          title={t(`elem_${elem}`)}
                          className="flex-1 flex flex-col items-center gap-1 rounded-xl py-2 transition-all"
                          style={{
                            background: active ? `color-mix(in srgb, ${color} 16%, transparent)` : 'var(--surface-void)',
                            border:     active ? `1.5px solid color-mix(in srgb, ${color} 70%, transparent)` : '1px solid var(--metal-edge)',
                            boxShadow:  active ? `0 0 10px color-mix(in srgb, ${color} 20%, transparent)` : 'none',
                          }}
                        >
                          <img
                            src={iconUrl}
                            alt={t(`elem_${elem}`)}
                            width={32}
                            height={32}
                            className="object-contain"
                            style={{ filter: active ? `drop-shadow(0 0 6px ${color})` : 'brightness(0.6) saturate(0.5)' }}
                          />
                          <span className="text-[9px] font-semibold" style={{ color: active ? color : 'var(--ink-faint)' }}>
                            {t(`elem_${elem}`)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {weaponTransform && (
                    <div className="flex gap-1.5">
                      {TRANSFORM_RATIOS.map(r => {
                        const active = weaponTransform.ratio === r
                        const color  = TRANSFORM_ELEMENTS.find(e => e.elem === weaponTransform.element)?.color ?? 'var(--gold)'
                        return (
                          <button
                            key={r}
                            onClick={() => setWeaponTransform(slotId, { element: weaponTransform.element, ratio: r })}
                            className="flex-1 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all"
                            style={{
                              background: active ? `color-mix(in srgb, ${color} 16%, transparent)` : 'var(--surface-void)',
                              border:     active ? `1.5px solid color-mix(in srgb, ${color} 60%, transparent)` : '1px solid var(--metal-edge)',
                              color:      active ? color : 'var(--ink-faint)',
                            }}
                          >
                            {r}%
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Active runes */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-faint)' }}>
                {t('active_runes')}
              </span>
              {runeEntries.length > 0 && (
                <span
                  className="text-[10px] font-mono rounded px-1.5 py-0.5"
                  style={{
                    background: 'color-mix(in srgb, var(--gold) 9%, transparent)',
                    color:      'color-mix(in srgb, var(--gold) 55%, transparent)',
                    border:     '1px solid color-mix(in srgb, var(--gold) 13%, transparent)',
                  }}
                >
                  {runeEntries.length}
                </span>
              )}
              {runeEntries.length > 0 && (
                <button
                  onClick={() => clearAllRunes(slotId)}
                  className="ml-auto text-[10px] px-2 py-0.5 rounded transition-colors"
                  style={{
                    background: 'color-mix(in srgb, var(--negative) 10%, transparent)',
                    border:     '1px solid color-mix(in srgb, var(--negative) 25%, transparent)',
                    color:      'var(--negative)',
                  }}
                >
                  {t('rune_clear_all')}
                </button>
              )}
            </div>

            {runeEntries.length === 0 ? (
              <div
                className="rounded-xl flex items-center justify-center py-4 text-[11px]"
                style={{ background: 'var(--surface-void)', border: '1px dashed var(--metal-edge)', color: 'var(--ink-faint)', opacity: 0.5 }}
              >
                {t('no_runes')}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {runeEntries.map(([key, val]) => {
                  const stat  = runeStat(key)
                  const isTr = key === exotic?.key
                  const meta  = STAT_META[stat]
                  const clr   = meta?.color ?? 'var(--gold)'
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-1.5 rounded-full pl-1 pr-1 py-0.5 transition-all"
                      style={{
                        background: `color-mix(in srgb, ${clr} 9%, transparent)`,
                        border:     isTr ? '1px solid color-mix(in srgb, var(--gold) 70%, transparent)' : `1px solid color-mix(in srgb, ${clr} 27%, transparent)`,
                        boxShadow:  isTr ? '0 0 8px color-mix(in srgb, var(--gold) 22%, transparent)' : 'none',
                      }}
                    >
                      {isTr && <span className="text-[10px] pl-0.5" style={{ color: 'var(--gold)' }}>◆</span>}
                      {(() => {
                        const rUrl = runeKeyIconUrl(key)
                        if (rUrl) return (
                          <img src={rUrl} onError={runeIconFallback(key)} alt="" width={20} height={20}
                            className="object-contain flex-shrink-0"
                            style={{ filter: `drop-shadow(0 0 4px color-mix(in srgb, ${clr} 53%, transparent))` }}
                          />
                        )
                        if (meta?.icon) return (
                          <img src={statIconUrl(meta.icon)} alt="" width={14} height={14}
                            className="object-contain flex-shrink-0"
                            style={{ filter: `drop-shadow(0 0 4px color-mix(in srgb, ${clr} 53%, transparent))` }}
                          />
                        )
                        return null
                      })()}
                      <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: clr }}>
                        +{val}
                      </span>
                      <span className="text-[10px] pr-0.5" style={{ color: clr, opacity: 0.6 }}>
                        {meta ? t(meta.tKey) : stat}
                      </span>
                      <button
                        onClick={() => clearRune(slotId, key)}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] leading-none transition-colors flex-shrink-0"
                        style={{ background: 'var(--surface-void)', color: 'var(--ink-faint)', border: '1px solid var(--metal-edge)' }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--negative)'
                          ;(e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--negative) 15%, var(--surface-void))'
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)'
                          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-void)'
                        }}
                        aria-label={t('rune_remove', { stat })}
                      >×</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {mode === 'exotic' ? (
            <div className="px-4 pb-4">
              {/* Transcendence runes */}
              <div>
                <p className="text-[10px] italic mb-2 px-0.5" style={{ color: 'var(--ink-faint)' }}>{t('rune_tr_hint')}</p>
                <div
                  className="grid gap-1.5 p-2 rounded-xl"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))', background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
                >
                  {TRANSCENDENCE.map(({ stat }) => {
                    const clr     = STAT_META[stat]?.color ?? 'var(--gold)'
                    const best    = bestRank(item, stat)
                    const applied = exotic?.stat === stat
                    const focused = trFocus === stat
                    return (
                      <button
                        key={stat}
                        onClick={() => pickTranscendence(stat)}
                        title={best ? `${statLabel(stat)} +${best.value}` : `${statLabel(stat)} — ${t('rune_rank_none')}`}
                        className="relative flex flex-col items-center justify-center rounded-lg transition-all"
                        style={{
                          aspectRatio: '1',
                          opacity:     best ? 1 : 0.35,
                          background:  applied ? `color-mix(in srgb, ${clr} 15%, transparent)` : focused ? `color-mix(in srgb, ${clr} 8%, transparent)` : 'var(--surface-void)',
                          border:      applied ? '1.5px solid var(--gold)' : focused ? `1px solid color-mix(in srgb, ${clr} 60%, transparent)` : '1px solid var(--metal-edge)',
                          boxShadow:   applied ? '0 0 10px color-mix(in srgb, var(--gold) 30%, transparent)' : 'none',
                        }}
                      >
                        <RuneIcon stat={stat} size={24} color={clr} dim={!applied && !focused} transcendence />
                        <span className="text-[8px] font-mono font-bold leading-none mt-0.5" style={{ color: applied ? clr : 'var(--ink-faint)' }}>
                          {best ? `+${best.value}` : '—'}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {trFocus && focusOptions.length > 0 && (
                  <div
                    key={trFocus}
                    className="mt-2 rounded-xl p-2.5 forge-log-in"
                    style={{ background: 'var(--surface-void)', border: `1px solid color-mix(in srgb, ${STAT_META[trFocus]?.color ?? 'var(--gold)'} 30%, var(--metal-edge))` }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold" style={{ color: STAT_META[trFocus]?.color ?? 'var(--gold)' }}>{statLabel(trFocus)}</span>
                      <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('rune_line_weight', { weight: lineWeight(item, trFocus) })}</span>
                    </div>
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${focusOptions.length}, minmax(0, 1fr))` }}>
                      {focusOptions.map(o => {
                        const clr    = STAT_META[trFocus]?.color ?? 'var(--gold)'
                        const active = exotic?.stat === trFocus && exotic.value === o.value
                        return (
                          <button
                            key={o.rank}
                            disabled={!o.allowed}
                            onClick={() => setExotic(slotId, trFocus, o.value)}
                            title={o.allowed ? undefined : t('rune_rank_blocked', { weight: lineWeight(item, trFocus), limit: o.limit })}
                            className="flex flex-col items-center py-1.5 rounded-lg transition-all disabled:cursor-not-allowed"
                            style={{
                              opacity:    o.allowed ? 1 : 0.35,
                              background: active ? `color-mix(in srgb, ${clr} 16%, transparent)` : 'transparent',
                              border:     active ? '1.5px solid var(--gold)' : '1px solid var(--metal-edge)',
                              color:      active ? clr : 'var(--ink-muted)',
                            }}
                          >
                            <span className="text-xs font-mono font-bold">+{o.value}</span>
                            <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{t('rune_rank', { rank: o.rank })}</span>
                          </button>
                        )
                      })}
                    </div>
                    {!focusOptions.some(o => o.allowed) && (
                      <p className="text-[10px] mt-2" style={{ color: 'var(--negative)' }}>
                        {t('rune_rank_blocked', { weight: lineWeight(item, trFocus), limit: focusOptions[0].limit })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (<>
          {/* Divider */}
          <div className="flex items-center gap-3 px-4 mt-1 mb-3">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--metal-edge))' }} />
            <span className="text-[10px] uppercase tracking-widest font-semibold flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>
              {t('rune_picker')}
            </span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, var(--metal-edge))' }} />
          </div>

          {/* Search by name — most players only ever use a handful of stats
              and don't want to scroll all 51 to find them */}
          <div className="px-4 mb-2.5">
            <input
              type="search"
              value={runeSearch}
              onChange={e => setRuneSearch(e.target.value)}
              placeholder={t('rune_search')}
              className="w-full rounded-lg px-3 py-2 text-sm text-forge-text placeholder:text-ink-faint focus:outline-none transition-colors"
              style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')}
            />
          </div>

          {/* Rune grid — click to select */}
          <div className="px-4 space-y-2.5 pb-4">
            {(() => {
              const query = normalizeSearch(runeSearch.trim())
              const bySection = RUNE_SECTIONS.map(section => ({
                section,
                stats: query
                  ? section.stats.filter(stat => normalizeSearch(t(STAT_META[stat]?.tKey ?? stat)).includes(query) || normalizeSearch(stat).includes(query))
                  : section.stats,
              }))
              if (query && bySection.every(({ stats }) => stats.length === 0)) {
                return <p className="text-xs text-center py-4" style={{ color: 'var(--ink-faint)' }}>{t('rune_search_empty')}</p>
              }
              return bySection.map(({ section, stats }) => {
              if (stats.length === 0) return null
              return (
              <div key={section.labelKey}>
                <div
                  className="text-[9px] uppercase tracking-[0.12em] font-semibold mb-1 px-0.5"
                  style={{ color: 'var(--ink-faint)' }}
                >
                  {t(section.labelKey)}
                </div>
                <div
                  className="grid gap-1.5 p-2 rounded-xl"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))', background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
                >
                  {stats.map(stat => {
                    const meta    = STAT_META[stat]
                    const clr     = meta?.color ?? 'var(--gold)'
                    const active  = stat === selected
                    const hasRune = (runes[stat] ?? 0) > 0
                    return (
                      <button
                        key={stat}
                        onClick={() => selectRune(stat)}
                        title={meta ? t(meta.tKey) : stat}
                        className="relative flex items-center justify-center rounded-lg transition-all"
                        style={{
                          aspectRatio: '1',
                          background: active
                            ? `color-mix(in srgb, ${clr} 13%, transparent)`
                            : hasRune
                            ? `color-mix(in srgb, ${clr} 6%, transparent)`
                            : 'var(--surface-void)',
                          border: active
                            ? `1.5px solid color-mix(in srgb, ${clr} 80%, transparent)`
                            : hasRune
                            ? `1px solid color-mix(in srgb, ${clr} 33%, transparent)`
                            : '1px solid var(--metal-edge)',
                          boxShadow: active ? `0 0 8px color-mix(in srgb, ${clr} 27%, transparent)` : 'none',
                        }}
                        onMouseEnter={e => {
                          if (!active) {
                            const el = e.currentTarget as HTMLButtonElement
                            el.style.background  = `color-mix(in srgb, ${clr} 9%, transparent)`
                            el.style.borderColor = `color-mix(in srgb, ${clr} 53%, transparent)`
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            const el = e.currentTarget as HTMLButtonElement
                            el.style.background  = hasRune ? `color-mix(in srgb, ${clr} 6%, transparent)` : 'var(--surface-void)'
                            el.style.borderColor = hasRune ? `color-mix(in srgb, ${clr} 33%, transparent)` : 'var(--metal-edge)'
                          }
                        }}
                      >
                        {(() => {
                          const rUrl = runeIconUrl(stat)
                          if (rUrl) return (
                            <img src={rUrl} alt={meta ? t(meta.tKey) : stat} width={28} height={28} className="object-contain"
                              style={{ filter: active ? `drop-shadow(0 0 6px color-mix(in srgb, ${clr} 80%, transparent)) brightness(1.25)` : hasRune ? `drop-shadow(0 0 5px color-mix(in srgb, ${clr} 60%, transparent)) brightness(1.2)` : 'brightness(0.65) saturate(0.5)' }}
                            />
                          )
                          if (meta?.icon) return (
                            <img src={statIconUrl(meta.icon)} alt={t(meta.tKey)} width={18} height={18} className="object-contain"
                              style={{ filter: active ? `drop-shadow(0 0 5px color-mix(in srgb, ${clr} 73%, transparent)) brightness(1.2)` : hasRune ? `drop-shadow(0 0 3px color-mix(in srgb, ${clr} 47%, transparent)) brightness(0.9)` : 'brightness(0.55)' }}
                            />
                          )
                          return <span className="text-[9px] font-bold" style={{ color: active ? 'var(--gold)' : 'var(--ink-faint)' }}>{(meta ? t(meta.tKey) : stat).slice(0, 3)}</span>
                        })()}
                        {hasRune && !active && (
                          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: clr, boxShadow: `0 0 4px ${clr}` }} />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
              )
              })
            })()}
          </div>
          </>)}

          {/* Forjamago signature */}
          <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--metal-edge)', paddingTop: 12 }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-faint)' }}>
                {t('forjamago_name_label')}
              </span>
            </div>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
            >
              <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--ap)', opacity: 0.6 }}>✦</span>
              <input
                type="text"
                value={forjamagoName}
                onChange={e => setForjamagoName(slotId, e.target.value)}
                placeholder={t('forjamago_name_placeholder')}
                className="flex-1 bg-transparent text-[11px] outline-none"
                style={{ color: 'var(--ap)', caretColor: 'var(--ap)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
