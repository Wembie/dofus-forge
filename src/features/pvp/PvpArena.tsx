import { Fragment, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sword } from 'lucide-react'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { usePvpStore, type PvpElement } from '@/store/pvpStore.ts'
import type { AppSpell } from '@/data/spellLoaders.ts'
import type { AppItem } from '@/data/loaders.ts'
import { spellGrade, dedupEffects, rangePct } from '../spells/spellCalc.ts'
import { simulateSpellHit, simulateWeaponHit, type HitResult } from './simulate.ts'
import { statIconUrl } from '../equipment/statDisplay.ts'

const DMG_KINDS = new Set(['damage', 'steal', 'poison'])

const RESIST_ELEMENTS: { key: PvpElement; icon: string; color: string; tKey: string }[] = [
  { key: 'neutral', icon: 'neutral_resistance', color: 'var(--neutral)', tKey: 'elem_neutral' },
  { key: 'earth',   icon: 'earth_resistance',   color: 'var(--earth)',   tKey: 'elem_earth'   },
  { key: 'fire',    icon: 'fire_resistance',    color: 'var(--fire)',    tKey: 'elem_fire'    },
  { key: 'water',   icon: 'water_resistance',   color: 'var(--water)',   tKey: 'elem_water'   },
  { key: 'air',     icon: 'air_resistance',     color: 'var(--air)',     tKey: 'elem_air'     },
]

type Attack = { kind: 'weapon' } | { kind: 'spell'; spell: AppSpell }

let hitSeq = 0

function TargetGlyph({ shake }: { shake: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={64}
      height={64}
      style={{
        display: 'block',
        animation: shake ? 'dummy-hit 260ms ease-out' : 'none',
      }}
    >
      <circle cx="32" cy="32" r="30" fill="color-mix(in srgb, var(--metal-edge) 40%, transparent)" stroke="var(--metal-edge)" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="21" fill="color-mix(in srgb, var(--crit) 12%, transparent)" stroke="var(--crit)" strokeWidth="1" opacity="0.6" />
      <circle cx="32" cy="32" r="11" fill="color-mix(in srgb, var(--gold) 30%, transparent)" stroke="var(--gold)" strokeWidth="1" />
      <circle cx="32" cy="32" r="3.5" fill="var(--gold)" />
    </svg>
  )
}

/**
 * PvP arena — a dedicated section (not scattered per-row math) where you
 * pick one spell or the weapon attack, type a target's resistances, and
 * click the attack's icon to "fire" at a dummy target: rolls one random
 * value in the resisted damage range and pops it up like a real hit.
 */
export function PvpArena() {
  const { t }           = useTranslation()
  const selectedClass   = useBuildStore(s => s.selectedClass)
  const level           = useBuildStore(s => s.level)
  const stats           = useBuildStore(s => s.stats)
  const equipped        = useBuildStore(s => s.equipped)
  const _equipment      = useBuildStore(s => s._equipment)
  const weaponTransform = useBuildStore(s => s.weaponTransforms['weapon'] ?? null)
  const lang            = useDataStore(s => s.lang)
  const loadSpells      = useDataStore(s => s.loadSpells)
  const spells          = useDataStore(s => s.spells)
  const resist          = usePvpStore(s => s.resist)
  const setResist       = usePvpStore(s => s.setResist)
  const resetResist     = usePvpStore(s => s.reset)

  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<Attack | null>(null)
  const [hits, setHits]         = useState<{ id: number; text: string; crit: boolean }[]>([])
  const [shake, setShake]       = useState(false)

  useEffect(() => {
    if (selectedClass) loadSpells(lang, selectedClass)
  }, [loadSpells, lang, selectedClass])

  const equippedWeapon = useMemo((): AppItem | null => {
    const weaponId = equipped.weapon
    if (weaponId == null) return null
    return _equipment.find(it => it.ankama_id === weaponId) ?? null
  }, [equipped.weapon, _equipment])

  const grade = spellGrade(level)

  // Only spells that actually deal damage/steal/poison on a plain target —
  // pure utility/buff spells wouldn't do anything against a dummy anyway.
  const attackSpells = useMemo(() => {
    if (!selectedClass) return []
    const classData  = spells.get(selectedClass)
    const commonData = spells.get('common')
    const all = [...(classData?.spells ?? []), ...(commonData?.spells ?? [])]
    return all.filter(sp => {
      const lvl = sp.levels.find(l => l.grade === grade) ?? sp.levels.at(-1)
      if (!lvl) return false
      return dedupEffects(lvl.effects).some(e => DMG_KINDS.has(e.kind) && e.condition !== 'shield')
    })
  }, [spells, selectedClass, grade])

  function fire(atk: Attack) {
    if (!stats) return
    setSelected(atk)

    let result: HitResult
    let effectiveCrit = 0

    if (atk.kind === 'weapon') {
      if (!equippedWeapon) return
      result = simulateWeaponHit(equippedWeapon, stats, resist, weaponTransform)
      const base = equippedWeapon.crit_chance ?? 0
      effectiveCrit = base > 0 ? Math.min(100, base + stats.critChance) : 0
    } else {
      const lvl = atk.spell.levels.find(l => l.grade === grade) ?? atk.spell.levels.at(-1)
      if (!lvl) return
      const spellPct = stats.spellDamagePercent + rangePct(lvl.minRange, lvl.maxRange, stats)
      result = simulateSpellHit(lvl, stats, spellPct, resist)
      effectiveCrit = lvl.critChance > 0 ? Math.min(100, lvl.critChance + stats.critChance) : 0
    }

    const isCrit = result.hasCrit && effectiveCrit > 0 && Math.random() * 100 < effectiveCrit
    const lo = isCrit ? result.critMin : result.min
    const hi = isCrit ? result.critMax : result.max
    const roll = hi > lo ? lo + Math.floor(Math.random() * (hi - lo + 1)) : lo

    const id = ++hitSeq
    setHits(h => [...h, { id, text: String(roll), crit: isCrit }])
    setTimeout(() => setHits(h => h.filter(x => x.id !== id)), 900)
    setShake(true)
    setTimeout(() => setShake(false), 260)
  }

  if (!selectedClass) return null

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        style={{ borderBottom: expanded ? '1px solid var(--metal-edge)' : 'none', background: 'var(--surface-stone)' }}
      >
        <div style={{ width: 2, height: 10, background: 'var(--gold-deep)', borderRadius: 1, flexShrink: 0 }} />
        <p className="text-[12px] uppercase tracking-widest font-semibold flex-1" style={{ color: 'var(--gold-deep)' }}>
          {t('pvp_dummy_title')}
        </p>
        {expanded && (
          <span
            onClick={e => { e.stopPropagation(); resetResist() }}
            className="text-[9px] hover:underline"
            style={{ color: 'var(--ink-faint)' }}
          >
            {t('pvp_dummy_reset')}
          </span>
        )}
        <span className="text-[10px]" style={{ color: 'var(--ink-faint)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>▾</span>
      </button>

      {expanded && (
      <div className="p-3 space-y-3">
        {/* Resistances */}
        <div className="grid gap-y-1 items-center" style={{ gridTemplateColumns: '18px 1fr 54px 54px', columnGap: 8 }}>
          <span /><span />
          <span className="text-[9px] uppercase tracking-wider text-right" style={{ color: 'var(--ink-faint)' }}>{t('pvp_dummy_fixed')}</span>
          <span className="text-[9px] uppercase tracking-wider text-right" style={{ color: 'var(--ink-faint)' }}>%</span>
          {RESIST_ELEMENTS.map(el => {
            const r = resist[el.key]
            return (
              <Fragment key={el.key}>
                <img src={statIconUrl(el.icon)} alt="" width={16} height={16} className="object-contain flex-shrink-0" />
                <span className="text-[11px] truncate" style={{ color: el.color }}>{t(el.tKey)}</span>
                <input
                  type="number"
                  min={0}
                  value={r.fixed}
                  onChange={e => setResist(el.key, 'fixed', Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full text-center text-[11px] font-mono rounded px-1 py-0.5 focus:outline-none border"
                  style={{ background: 'var(--surface-panel)', borderColor: 'var(--metal-edge)', color: 'var(--ink)' }}
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={r.percent}
                  onChange={e => setResist(el.key, 'percent', Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                  className="w-full text-center text-[11px] font-mono rounded px-1 py-0.5 focus:outline-none border"
                  style={{ background: 'var(--surface-panel)', borderColor: 'var(--metal-edge)', color: 'var(--ink)' }}
                />
              </Fragment>
            )
          })}
        </div>

        {/* Target + result */}
        <div className="flex flex-col items-center gap-1.5 py-1">
          <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
            {hits.map(h => (
              <span
                key={h.id}
                className="absolute left-1/2 -translate-x-1/2 font-mono font-bold whitespace-nowrap pointer-events-none"
                style={{
                  top: -4,
                  color: h.crit ? 'var(--crit)' : 'var(--ink)',
                  fontSize: h.crit ? 15 : 13,
                  animation: 'float-delta 850ms ease-out forwards',
                  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                }}
              >
                {h.crit && '✦ '}{h.text}
              </span>
            ))}
            <TargetGlyph shake={shake} />
          </div>
          <p className="text-[10px] text-center min-h-[12px]" style={{ color: 'var(--ink-faint)' }}>
            {selected
              ? (selected.kind === 'weapon' ? equippedWeapon?.name : selected.spell.name)
              : t('pvp_arena_select_hint')}
          </p>
        </div>

        {/* Picker */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {equippedWeapon && (
            <button
              onClick={() => fire({ kind: 'weapon' })}
              title={equippedWeapon.name}
              className="flex-shrink-0 rounded-lg overflow-hidden transition-transform hover:scale-105 flex items-center justify-center"
              style={{
                width: 40, height: 40,
                background: 'var(--surface-panel)',
                border: selected?.kind === 'weapon' ? '2px solid var(--gold)' : '1px solid var(--metal-edge)',
              }}
            >
              {equippedWeapon.image_url
                ? <img src={equippedWeapon.image_url} alt="" className="w-full h-full object-contain p-0.5" />
                : <Sword size={18} style={{ color: 'var(--ink-faint)' }} />
              }
            </button>
          )}
          {attackSpells.map(sp => (
            <button
              key={sp.id}
              onClick={() => fire({ kind: 'spell', spell: sp })}
              title={sp.name}
              className="flex-shrink-0 rounded-lg overflow-hidden transition-transform hover:scale-105 flex items-center justify-center"
              style={{
                width: 40, height: 40,
                background: 'var(--surface-panel)',
                border: selected?.kind === 'spell' && selected.spell.id === sp.id ? '2px solid var(--gold)' : '1px solid var(--metal-edge)',
              }}
            >
              {sp.image_url
                ? <img src={sp.image_url} alt="" className="w-full h-full object-contain" />
                : <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{sp.name.slice(0, 2)}</span>
              }
            </button>
          ))}
        </div>
      </div>
      )}
    </div>
  )
}
