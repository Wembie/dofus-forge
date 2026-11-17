import { useEffect, useState, useMemo, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Sword } from 'lucide-react'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { AppSpell, AppSpellElement, AppSpellCondition } from '@/data/spellLoaders.ts'
import type { AppEffect, AppItem } from '@/data/loaders.ts'
import { DamageHover } from './DamageHover.tsx'
import { useCombatStats } from '@/store/useCombatStats.ts'
import type { StatBlock } from '@/engine/types.ts'
import { statIconUrl, runeIconUrl } from '../equipment/statDisplay.ts'
import { spellGrade, ELEM_COLOR, fmtRange, conditionKey } from './spellCalc.ts'
import { spellView, weaponView, rollOf, type SpellGroup, type SpellHit } from './spellView.ts'
import { PvpArena } from '../pvp/PvpArena.tsx'
import { SPELL_ITEM_EFFECT_IDS } from '@/data/effectIds.ts'

/** Human label for a condition group's header. `state` already carries its own real,
 * per-language name (resolved at build time from the game's own data) — everything else
 * routes through `t()` like any other UI string. */
function conditionLabel(t: (key: string, opts?: Record<string, unknown>) => string, condition: AppSpellCondition): string {
  if (condition.kind === 'shield') return t('spell_condition_shield')
  if (condition.kind === 'low_target_hp') return t('spell_condition_low_target_hp', { threshold: condition.threshold })
  return condition.label
}

type ElemFilter = AppSpellElement | 'all'

const FILTERS: ElemFilter[] = ['all', 'earth', 'fire', 'water', 'air', 'neutral']

function SpellCard({ spell, grade, stats, spellNameMap, itemEffects }: {
  spell: AppSpell
  grade: number
  stats: StatBlock | null
  spellNameMap: Map<number, string>
  itemEffects: AppEffect[]
}) {
  const { t }     = useTranslation()
  const charLevel = useBuildStore(s => s.level)
  const view      = useMemo(
    () => spellView({ spell, grade, stats, itemEffects, characterLevel: charLevel }),
    [spell, grade, stats, itemEffects, charLevel],
  )
  const { level: lvl, mods } = view
  const color    = ELEM_COLOR[spell.element]
  const showCalc = view.calculated

  function hitRows(key: string, hit: SpellHit, dmgCols: string, showCritCol: boolean) {
    const { effect: e, crit } = hit
    const c = ELEM_COLOR[e.element]
    return (
      <div key={key} className="space-y-px">
        <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0 justify-self-center" style={{ background: c }} />
          <span
            className={`text-[13px] font-mono tabular-nums text-right${showCalc ? ' font-bold' : ''}`}
            style={{ color: showCalc ? c : 'var(--ink-muted)' }}
          >
            <DamageHover roll={rollOf(e)} elem={e.element} stats={stats} mods={mods} kind="spell">
              {fmtRange(e.calcMin, e.calcMax)}
            </DamageHover>
          </span>
          {showCritCol && (
            <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: crit ? 'var(--crit)' : 'var(--ink-faint)' }}>
              {crit
                ? <DamageHover roll={rollOf(crit)} elem={crit.element} stats={stats} mods={mods} extraFlat={stats?.critDamage ?? 0} kind="spell" crit>{fmtRange(crit.calcMin, crit.calcMax)}</DamageHover>
                : '—'}
            </span>
          )}
        </div>
        {hit.heal && (
          <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
            <span className="flex items-center justify-center">
              <img src={statIconUrl('heals')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
            </span>
            <span className="text-[10px] font-mono tabular-nums text-right" style={{ color: 'var(--vitality)' }}>
              {fmtRange(hit.heal[0], hit.heal[1])}
            </span>
            {showCritCol && (
              <span className="text-[10px] font-mono tabular-nums text-right" style={{ color: 'var(--vitality)' }}>
                {hit.critHeal ? fmtRange(hit.critHeal[0], hit.critHeal[1]) : '—'}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderEffectGroup(group: SpellGroup) {
    const showCritCol = group.showCritColumn
    // Fixed widths (not 1fr) — with only short numbers in these columns, fr
    // tracks stretched to the row's full width, pushing Normal and Crítico
    // apart with a lot of dead space between them instead of sitting close
    // together like a real table.
    const dmgCols = showCritCol ? '13px 56px 56px' : '13px 56px'
    const rows: React.ReactNode[] = []

    // Column headers — only when there are damage rows
    if (group.hasDamage) {
      rows.push(
        <div key="col-hdr" className="grid mb-0.5" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
          <span />
          <span className="text-[9px] uppercase tracking-wider font-semibold text-right" style={{ color: 'var(--ink-faint)' }}>
            {t('weapon_normal')}
          </span>
          {showCritCol && (
            <span className="text-[9px] uppercase tracking-wider font-semibold text-right" style={{ color: 'var(--crit)' }}>
              {t('weapon_crit_col')} ✦
            </span>
          )}
        </div>
      )
    }

    const chip = (key: string, tone: string, icon: string, text: React.ReactNode) => (
      <div key={key}>
        <span className="rounded px-1.5 py-px text-[10px] font-mono leading-snug inline-flex items-center gap-1"
          style={{ background: `color-mix(in srgb, ${tone} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${tone} 25%, transparent)`, color: tone }}>
          <img src={statIconUrl(icon)} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
          {text}
        </span>
      </div>
    )

    for (const entry of group.entries) {
      switch (entry.kind) {
        case 'section':
          rows.push(
            <div key={entry.section === 'discharge' ? 'descarga' : 'poison-lbl'} className="pt-0.5" style={{ borderTop: '1px solid color-mix(in srgb, var(--fire) 20%, transparent)' }}>
              <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: 'color-mix(in srgb, var(--fire) 70%, var(--gold))' }}>
                {entry.section === 'discharge' ? t('spell_discharge') : t('spell_poison', { turns: entry.turns })}
              </span>
            </div>
          )
          break
        case 'push':
          rows.push(
            <div key={`p${entry.index}`} className="flex items-center gap-1 flex-wrap">
              <span className="rounded px-1.5 py-px text-[10px] font-mono leading-snug inline-flex items-center gap-1"
                style={{ background: 'color-mix(in srgb, var(--ink-muted) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--ink-muted) 25%, transparent)', color: 'var(--ink-muted)' }}>
                <img src={statIconUrl('push_damage')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
                {t('spell_push', { cells: entry.cells })}
                {entry.collision != null && <span style={{ color: 'var(--ink-faint)' }}>{t('spell_push_collision', { dmg: String(entry.collision) })}</span>}
              </span>
            </div>
          )
          break
        case 'ap':
          rows.push(chip(`a${entry.index}`, 'var(--gold)', 'ap_reduction', t('spell_steal_ap', { n: fmtRange(entry.effect.calcMin, entry.effect.calcMax) })))
          break
        case 'mp':
          rows.push(chip(`m${entry.index}`, 'var(--air)', 'mp_reduction', t('spell_steal_mp', { n: fmtRange(entry.effect.calcMin, entry.effect.calcMax) })))
          break
        case 'ap_gain':
          rows.push(chip(`ag${entry.index}`, 'var(--gold)', 'ap', t('spell_gain_ap', { n: fmtRange(entry.effect.calcMin, entry.effect.calcMax) })))
          break
        case 'mp_gain':
          rows.push(chip(`mg${entry.index}`, 'var(--air)', 'mp', t('spell_gain_mp', { n: fmtRange(entry.effect.calcMin, entry.effect.calcMax) })))
          break
        case 'erosion':
          rows.push(chip(`er${entry.index}`, 'var(--fire)', 'erosion', t('spell_erosion', { pct: entry.pct, turns: entry.turns })))
          break
        case 'heal_mod':
          rows.push(chip(`hm${entry.index}`, 'var(--vitality)', 'heals', t('spell_heal_mod', { pct: entry.pct })))
          break
        case 'spell_buff': {
          const spellName = spellNameMap.get(entry.spellId ?? 0) ?? `#${entry.spellId ?? '?'}`
          const turnsStr  = entry.turns > 0 ? ` · ${entry.turns}t` : ''
          const deathStr  = entry.deathReset ? ' 💀' : ''
          rows.push(
            <div key={`sb${entry.index}`}>
              <span className="rounded px-1.5 py-px text-[10px] font-mono leading-snug inline-flex items-center gap-1"
                style={{ background: 'color-mix(in srgb, var(--gold-deep) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--gold-deep) 25%, transparent)', color: 'var(--gold-muted)' }}>
                ⭐ {spellName}: +{entry.base} base{turnsStr}{deathStr}
              </span>
            </div>
          )
          break
        }
        case 'hit':
          rows.push(hitRows(`e${entry.index}`, entry, dmgCols, showCritCol))
          break
      }
    }

    for (const { label, hits } of group.charges) {
      rows.push(
        <div key={`cs-${label}`} className="pt-0.5" style={{ borderTop: '1px solid color-mix(in srgb, var(--gold) 18%, transparent)' }}>
          <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: 'var(--gold-muted)' }}>
            {t('spell_charge_n', { n: label })}
          </span>
        </div>
      )
      hits.forEach((hit, i) => {
        const c = ELEM_COLOR[hit.effect.element]
        const { effect: e, crit } = hit
        rows.push(
          <div key={`cd-${label}-${i}`} className="space-y-px">
            <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0 justify-self-center" style={{ background: c }} />
              <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: showCalc ? c : 'var(--ink-muted)' }}>
                <DamageHover roll={rollOf(e)} elem={e.element} stats={stats} mods={mods} kind="spell">
                  {fmtRange(e.calcMin, e.calcMax)}
                </DamageHover>
              </span>
              {showCritCol && (
                <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: crit ? 'var(--crit)' : 'var(--ink-faint)' }}>
                  {crit
                    ? <DamageHover roll={rollOf(crit)} elem={crit.element} stats={stats} mods={mods} extraFlat={stats?.critDamage ?? 0} kind="spell" crit>{fmtRange(crit.calcMin, crit.calcMax)}</DamageHover>
                    : '—'}
                </span>
              )}
            </div>
            {hit.heal && (
              <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
                <span className="flex items-center justify-center">
                  <img src={statIconUrl('heals')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
                </span>
                <span className="text-[10px] font-mono tabular-nums text-right" style={{ color: 'var(--vitality)' }}>
                  {fmtRange(hit.heal[0], hit.heal[1])}
                </span>
                {showCritCol && (
                  <span className="text-[10px] font-mono tabular-nums text-right" style={{ color: 'var(--vitality)' }}>
                    {hit.critHeal ? fmtRange(hit.critHeal[0], hit.critHeal[1]) : '—'}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })
    }

    if (group.total || group.pushTotal) {
      rows.push(
        <div key="sigma" className="pt-0.5 space-y-px" style={{ borderTop: '1px solid var(--metal-edge)' }}>
          {group.total && (
            <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
              <span className="text-[9px] font-bold leading-none justify-self-center" style={{ color: 'var(--ink-faint)' }}>Σ</span>
              <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: 'var(--ink-muted)' }}>
                {fmtRange(group.total.normal[0], group.total.normal[1])}
              </span>
              {showCritCol && (
                <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: 'var(--crit)' }}>
                  {fmtRange(group.total.crit[0], group.total.crit[1])}
                </span>
              )}
            </div>
          )}
          {group.total?.heal && (
            <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
              <span className="flex items-center justify-center">
                <img src={statIconUrl('heals')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
              </span>
              <span className="text-[10px] font-mono tabular-nums text-right" style={{ color: 'var(--vitality)' }}>
                {fmtRange(group.total.heal.normal[0], group.total.heal.normal[1])}
              </span>
              {showCritCol && (
                <span className="text-[10px] font-mono tabular-nums text-right" style={{ color: 'var(--vitality)' }}>
                  {fmtRange(group.total.heal.crit[0], group.total.heal.crit[1])}
                </span>
              )}
            </div>
          )}
          {group.pushTotal && (
            <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
              <span className="text-[9px] font-bold leading-none justify-self-center" style={{ color: 'var(--ink-faint)' }}>Σ↷</span>
              <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: 'var(--ink-muted)' }}>
                {fmtRange(group.pushTotal.normal[0], group.pushTotal.normal[1])}
              </span>
              {showCritCol && (
                <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: 'var(--crit)' }}>
                  {fmtRange(group.pushTotal.crit[0], group.pushTotal.crit[1])}
                </span>
              )}
            </div>
          )}
        </div>
      )
    }

    return rows
  }

  const rangeStr = view.range.melee
    ? t('spell_melee')
    : view.range.min === view.range.max
      ? String(view.range.max)
      : `${view.range.min}–${view.range.max}`
  const effectiveCrit = view.crit
  const [baseGroup, ...conditionGroups] = view.groups

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background:  `color-mix(in srgb, ${color} 6%, var(--surface-void))`,
        border:      `1px solid color-mix(in srgb, ${color} 18%, transparent)`,
        borderLeft:  `3px solid color-mix(in srgb, ${color} 75%, transparent)`,
        transition:  'transform 140ms var(--ease-out), box-shadow 140ms var(--ease-out)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform   = 'translateY(-1px)'
        el.style.boxShadow   = `0 4px 16px rgba(0,0,0,.5), 0 0 0 1px color-mix(in srgb, ${color} 25%, transparent)`
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform   = ''
        el.style.boxShadow   = ''
      }}
    >
      <div className="flex gap-3 p-3">
      <div
        className="flex-shrink-0 rounded-md overflow-hidden flex items-center justify-center"
        style={{
          width: 52, height: 52,
          background: 'linear-gradient(145deg, var(--surface-parchment), var(--surface-void))',
          border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
        }}
      >
        {spell.image_url
          ? <img src={spell.image_url} alt="" width={52} height={52} loading="lazy" className="object-contain" />
          : <span className="text-xl" style={{ color }}>✦</span>
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-[13px] font-semibold truncate leading-tight" style={{ color, textShadow: `0 0 12px color-mix(in srgb, ${color} 40%, transparent)` }}>
            {spell.name}
          </p>
          {spell.is_variant && (
            <span
              className="sm:hidden flex-shrink-0 px-1 py-px rounded text-[8px] uppercase tracking-wider font-semibold"
              style={{ background: 'var(--surface-void)', border: '1px solid color-mix(in srgb, var(--gold) 45%, transparent)', color: 'var(--gold)' }}
            >
              {t('spell_variant_badge')}
            </span>
          )}
        </div>

        {lvl && (
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-1">
            <span className="flex items-center gap-0.5">
              <img src={statIconUrl('ap')} alt="" width={13} height={13} className="object-contain flex-shrink-0" />
              <span className="text-[12px] font-bold font-mono" style={{ color: 'var(--gold)' }}>{lvl.ap}</span>
            </span>
            <span className="flex items-center gap-0.5">
              <img src={statIconUrl('range')} alt="" width={13} height={13} className="object-contain flex-shrink-0" />
              <span className="text-[12px] font-mono" style={{ color: lvl.maxRange === 0 ? 'var(--ink-faint)' : 'var(--ink-muted)' }}>
                {rangeStr}
              </span>
            </span>
            {effectiveCrit > 0 && (
              <span className="flex items-center gap-0.5">
                <img src={statIconUrl('crit')} alt="" width={13} height={13} className="object-contain flex-shrink-0" />
                <span className="text-[12px]" style={{ color: 'var(--crit)' }}>{effectiveCrit}%</span>
              </span>
            )}
            {lvl.maxPerTurn > 0 && (
              <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                {t('spell_max_per_turn', { count: lvl.maxPerTurn })}
              </span>
            )}
          </div>
        )}

        {baseGroup ? (
          <div className="space-y-0.5">
            {renderEffectGroup(baseGroup)}
            {conditionGroups.map(group => (
              <Fragment key={conditionKey(group.condition!)}>
                <div className="pt-0.5 mt-0.5" style={{ borderTop: '1px solid var(--metal-edge)' }}>
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-faint)' }}>
                    {conditionLabel(t, group.condition!)}
                  </span>
                </div>
                {renderEffectGroup(group)}
              </Fragment>
            ))}
          </div>
        ) : (
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-faint)' }}>
            {t('spell_support')}
          </span>
        )}

        {view.buffs.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {view.buffs.map(({ text: buff, icon, tone }, i) => {
              const neg  = tone === 'negative'
              const pos  = tone === 'positive'
              const clr  = neg ? 'var(--fire)' : pos ? 'var(--air)' : 'var(--gold)'
              return (
                <div key={i} className="flex items-center gap-1 flex-wrap">
                  <span
                    className="rounded px-1 py-px text-[10px] font-mono leading-snug flex items-center gap-1"
                    style={{
                      background: `color-mix(in srgb, ${clr} 10%, transparent)`,
                      border:     `1px solid color-mix(in srgb, ${clr} 25%, transparent)`,
                      color:      clr,
                    }}
                  >
                    {icon
                      ? <img src={statIconUrl(icon)} alt="" width={10} height={10} className="object-contain flex-shrink-0" />
                      : <span style={{ fontSize: 8 }}>{neg ? '▼' : pos ? '▲' : '◆'}</span>
                    }
                    {buff}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {view.itemEffects.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'var(--gold)' }}>
              {t('item_spell_effects')}
            </p>
            {view.itemEffects.map((effect, i) => (
              <p key={`${effect.effect_id}-${i}`} className="text-[10px] leading-snug" style={{ color: 'var(--gold)' }}>
                {effect.formatted}
              </p>
            ))}
          </div>
        )}

        {spell.description && (
          <div className="mt-1.5 text-[9px] leading-snug italic" style={{ color: 'var(--ink-faint)' }}>
            {spell.description}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

function WeaponCard({ weapon, stats }: { weapon: AppItem | null; stats: StatBlock | null }) {
  const { t } = useTranslation()
  const [dominioActive, setDominioActive] = useState(false)
  const [dominioNorm, setDominioNorm]     = useState(300)
  const [dominioCrit, setDominioCrit]     = useState(360)

  const weaponTransform = useBuildStore(s => s.weaponTransforms['weapon'] ?? null)

  if (!weapon) {
    return (
      <div
        className="rounded-lg p-2.5 flex gap-2.5"
        style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
      >
        <div
          className="flex-shrink-0 rounded flex items-center justify-center"
          style={{ width: 44, height: 44, background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)' }}
        >
          <Sword size={20} style={{ color: 'var(--ink-faint)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate leading-tight mb-1" style={{ color: 'var(--ink-faint)' }}>
            {t('weapon_fist')}
          </p>
          <div className="flex items-center gap-x-2">
            <span className="text-[10px] font-bold font-mono px-1 rounded" style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)' }}>1AP</span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>{t('spell_melee')}</span>
          </div>
        </div>
      </div>
    )
  }

  const view = weaponView({
    weapon,
    stats,
    transform: weaponTransform,
    mastery: { active: dominioActive, normal: dominioNorm, crit: dominioCrit },
  })
  const { ap, crit: effectiveCrit, critBonus: critBon, level: wLevel, hasCrit, normalMods, critMods } = view
  const rangeStr = view.range.melee
    ? t('spell_melee')
    : view.range.min === view.range.max ? String(view.range.min) : `${view.range.min}–${view.range.max}`
  const withColor = <T extends { elem?: AppSpellElement | null }>(r: T) => ({ ...r, c: r.elem ? ELEM_COLOR[r.elem] : ELEM_COLOR.mixed })
  const dmgRows   = view.damage.map(withColor)
  const stealRows = view.steal.map(withColor)
  const rows      = [...dmgRows, ...stealRows]
  const cols      = hasCrit ? '1fr 1fr 1fr' : '1fr 1fr'
  const shownTransform = view.transform

  const RangeCell = ({ min, max, color, bold = false }: { min: number; max: number; color: string; bold?: boolean }) => (
    <span className="text-[11px] font-mono tabular-nums" style={{ color, fontWeight: bold ? 700 : 400 }}>
      {fmtRange(min, max)}
    </span>
  )
  const WeaponCells = ({ row, color }: { row: (typeof rows)[number]; color: string }) => (
    <>
      <span className="text-[11px] font-mono tabular-nums" style={{ color, fontWeight: stats ? 700 : 400 }}>
        <DamageHover roll={[row.baseLow, row.baseHigh]} elem={row.elem} stats={stats} mods={normalMods} kind="weapon">
          {fmtRange(row.low, row.high)}
        </DamageHover>
      </span>
      {hasCrit && (
        <span className="text-[11px] font-mono tabular-nums font-bold" style={{ color: 'var(--crit)' }}>
          <DamageHover roll={[row.baseLow + critBon, row.baseHigh + critBon]} elem={row.elem} stats={stats} mods={critMods} extraFlat={stats?.critDamage ?? 0} kind="weapon" crit>
            {fmtRange(row.critLow, row.critHigh)}
          </DamageHover>
        </span>
      )}
    </>
  )

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5" style={{ borderBottom: '1px solid var(--metal-edge)', background: 'var(--surface-stone)' }}>
        <div className="relative flex-shrink-0" style={{ width: 44, height: 44 }}>
          <div
            className="rounded overflow-hidden flex items-center justify-center w-full h-full"
            style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)' }}
          >
            {weapon.image_url
              ? <img src={weapon.image_url} alt="" width={44} height={44} loading="lazy" className="object-contain" />
              : <Sword size={20} style={{ color: 'var(--ink-faint)' }} />
            }
          </div>
          {shownTransform && (() => {
            const potionUrl = runeIconUrl(`transform_${shownTransform.element}`)
            const elemColor = ELEM_COLOR[shownTransform.element]
            return potionUrl ? (
              <div
                className="absolute bottom-0 right-0 rounded-tl"
                style={{
                  background: `color-mix(in srgb, var(--surface-void) 80%, ${elemColor} 20%)`,
                  border: `1px solid color-mix(in srgb, ${elemColor} 50%, transparent)`,
                  padding: 2,
                }}
              >
                <img src={potionUrl} alt="" width={18} height={18} className="object-contain" />
              </div>
            ) : null
          })()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{weapon.name}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {shownTransform && (() => {
                const elemColor = ELEM_COLOR[shownTransform.element]
                return (
                  <span
                    className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: `color-mix(in srgb, ${elemColor} 15%, transparent)`,
                      border:     `1px solid color-mix(in srgb, ${elemColor} 40%, transparent)`,
                      color:       elemColor,
                    }}
                  >
                    {t(`elem_${shownTransform.element}`)} {shownTransform.ratio}%
                  </span>
                )
              })()}
              {wLevel > 0 && <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>{t('level_range')}.{wLevel}</span>}
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-x-3 mt-0.5">
            {ap > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold font-mono" style={{ color: 'var(--gold)' }}>
                <img src={statIconUrl('ap')} alt="" aria-hidden="true" width={12} height={12} className="object-contain" />
                {t('badge_ap')} {ap}
              </span>
            )}
            <span className="flex items-center gap-0.5 text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>
              <img src={statIconUrl('range')} alt="" aria-hidden="true" width={12} height={12} className="object-contain" />
              {t('weapon_range_label')} {rangeStr}
            </span>
            {effectiveCrit > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-mono" style={{ color: 'var(--crit)' }}>
                <img src={statIconUrl('crit')} alt="" aria-hidden="true" width={12} height={12} className="object-contain" />
                {t('weapon_crit_label')} {effectiveCrit}%{critBon > 0 ? ` (+${critBon})` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dominio del Arma toggle */}
      <div
        className="flex items-center gap-2 px-3 py-1.5"
        style={{ borderBottom: '1px solid var(--metal-edge)', background: 'var(--surface-void)' }}
      >
        <input
          type="checkbox"
          id="dominio-toggle"
          checked={dominioActive}
          onChange={e => setDominioActive(e.target.checked)}
          className="flex-shrink-0 cursor-pointer"
          style={{ width: 13, height: 13, accentColor: 'var(--gold)' }}
        />
        <label
          htmlFor="dominio-toggle"
          className="text-[10px] font-medium flex-shrink-0 cursor-pointer"
          style={{ color: dominioActive ? 'var(--gold)' : 'var(--ink-faint)' }}
          title={t('weapon_mastery_tip')}
        >
          {t('weapon_mastery')}
        </label>

        {dominioActive && (
          <div className="flex items-center gap-1.5 ml-1">
            <input
              type="number"
              min={0}
              value={dominioNorm}
              aria-label={t('weapon_mastery')}
              onChange={e => setDominioNorm(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-14 text-center text-[11px] font-mono font-bold rounded px-1 py-0.5 focus:outline-none border"
              style={{ background: 'var(--surface-panel)', border: '1px solid color-mix(in srgb, var(--gold) 40%, transparent)', color: 'var(--gold)' }}
            />
            <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>/</span>
            <span className="text-[9px]" style={{ color: 'var(--crit)' }}>✦</span>
            <input
              type="number"
              min={0}
              value={dominioCrit}
              aria-label={`${t('weapon_mastery')} (${t('weapon_crit_col')})`}
              onChange={e => setDominioCrit(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-14 text-center text-[11px] font-mono font-bold rounded px-1 py-0.5 focus:outline-none border"
              style={{ background: 'var(--surface-panel)', border: '1px solid color-mix(in srgb, var(--crit) 40%, transparent)', color: 'var(--crit)' }}
            />
          </div>
        )}
      </div>

      {/* Damage table */}
      {(rows.length > 0 || view.mpRemoval.length > 0) && (
        <div className="px-3 py-2.5 space-y-1">
          {/* Column headers */}
          <div className="grid mb-1.5" style={{ gridTemplateColumns: cols, gap: 8 }}>
            <span />
            <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-faint)' }}>{t('weapon_normal')}</span>
            {hasCrit && <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--crit)' }}>{t('weapon_crit_col')}</span>}
          </div>

          {/* Damage rows */}
          {dmgRows.map((row, i) => (
            <div key={`d${i}`} className="grid items-center" style={{ gridTemplateColumns: cols, gap: 8 }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.c }} />
                <span className="text-[10px] font-medium" style={{ color: row.c }}>{row.best ? t('stat_best_elem_dmg') : t(`elem_${row.elem}`)}</span>
              </span>
              <WeaponCells row={row} color={row.c} />
            </div>
          ))}

          {/* MP removed on hit (effect_id 238) — flat value, not elemental damage, no crit/heal math */}
          {view.mpRemoval.map(([min, max], i) => (
            <div key={`mp${i}`} className="grid items-center" style={{ gridTemplateColumns: cols, gap: 8 }}>
              <span className="flex items-center gap-1.5">
                <img src={statIconUrl('mp_reduction')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
                <span className="text-[10px] font-medium" style={{ color: 'var(--wisdom)' }}>{t('stat_mp_removal')}</span>
              </span>
              <RangeCell min={min} max={max} color="var(--wisdom)" />
              {hasCrit && <span />}
            </div>
          ))}

          {/* Steal rows */}
          {stealRows.map((row, i) => {
            const { c, heal, critHeal } = row
            return (
            <div key={`s${i}`} className="space-y-0.5">
              <div className="grid items-center" style={{ gridTemplateColumns: cols, gap: 8 }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                  <span className="text-[10px] font-medium" style={{ color: c }}>{t('weapon_steal_label')}</span>
                </span>
                <WeaponCells row={row} color={c} />
              </div>
              <div className="grid items-center" style={{ gridTemplateColumns: cols, gap: 8 }}>
                <span className="pl-3 flex items-center">
                  <img src={statIconUrl('heals')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
                </span>
                <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--vitality)' }}>
                  {fmtRange(heal![0], heal![1])}
                </span>
                {hasCrit && (
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--vitality)' }}>
                    {fmtRange(critHeal![0], critHeal![1])}
                  </span>
                )}
              </div>
            </div>
            )
          })}

          {/* Total row */}
          {view.total && (
            <div className="pt-1.5 space-y-0.5" style={{ borderTop: '1px solid var(--metal-edge)' }}>
              <div className="grid items-center" style={{ gridTemplateColumns: cols, gap: 8 }}>
                <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-faint)' }}>{t('weapon_total')}</span>
                <span className="text-[11px] font-mono tabular-nums font-bold" style={{ color: 'var(--ink-muted)' }}>{fmtRange(view.total.normal[0], view.total.normal[1])}</span>
                {hasCrit && <span className="text-[11px] font-mono tabular-nums font-bold" style={{ color: 'var(--crit)' }}>{fmtRange(view.total.crit[0], view.total.crit[1])}</span>}
              </div>
              {view.total.heal && (
                <div className="grid items-center" style={{ gridTemplateColumns: cols, gap: 8 }}>
                  <span className="flex items-center">
                    <img src={statIconUrl('heals')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
                  </span>
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--vitality)' }}>{fmtRange(view.total.heal.normal[0], view.total.heal.normal[1])}</span>
                  {hasCrit && <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--vitality)' }}>{fmtRange(view.total.heal.crit[0], view.total.heal.crit[1])}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SpellsPanel() {
  const { t }         = useTranslation()
  const selectedClass = useBuildStore(s => s.selectedClass)
  const level         = useBuildStore(s => s.level)
  // Damage uses the in-combat stats: gear plus the active item passives.
  const stats         = useCombatStats()
  const equipped      = useBuildStore(s => s.equipped)
  const _equipment    = useBuildStore(s => s._equipment)
  const lang          = useDataStore(s => s.lang)
  const loadSpells    = useDataStore(s => s.loadSpells)
  const spells        = useDataStore(s => s.spells)

  const autoGrade                = spellGrade(level)
  const [manualGrade, setManual] = useState<number | null>(null)
  const grade                    = manualGrade ?? autoGrade
  const [elemFilter, setElemFilter] = useState<ElemFilter>('all')

  useEffect(() => { setManual(null) }, [selectedClass])

  useEffect(() => {
    if (selectedClass) loadSpells(lang, selectedClass)
  }, [loadSpells, lang, selectedClass])

  const equippedWeapon = useMemo((): AppItem | null => {
    const weaponId = equipped.weapon
    if (weaponId == null) return null
    return _equipment.find(it => it.ankama_id === weaponId) ?? null
  }, [equipped.weapon, _equipment])

  const equippedSpellEffects = useMemo(() => {
    const equippedIds = new Set(Object.values(equipped).filter((id): id is number => id != null))
    return _equipment
      .filter(item => equippedIds.has(item.ankama_id))
      .flatMap(item => item.effects.filter(effect =>
        effect.formatted && SPELL_ITEM_EFFECT_IDS.has(effect.effect_id ?? -1)
      ))
  }, [equipped, _equipment])

  const classData      = selectedClass ? spells.get(selectedClass) : null
  const commonData     = spells.get('common')
  const allClassSpells = classData?.spells ?? []
  const allCommonSpells = commonData?.spells ?? []

  const spellNameMap = useMemo((): Map<number, string> => {
    const map = new Map<number, string>()
    for (const cs of spells.values()) {
      for (const sp of cs.spells) map.set(sp.id, sp.name)
    }
    return map
  }, [spells])

  const normalSpells  = allClassSpells.filter(sp => !sp.is_variant && (elemFilter === 'all' || sp.element === elemFilter))
  const variantSpells = allClassSpells.filter(sp =>  sp.is_variant && (elemFilter === 'all' || sp.element === elemFilter))
  const normalCommon  = allCommonSpells.filter(sp => !sp.is_variant && (elemFilter === 'all' || sp.element === elemFilter))
  const variantCommon = allCommonSpells.filter(sp =>  sp.is_variant && (elemFilter === 'all' || sp.element === elemFilter))
  // Narrow screens: one column, spell immediately followed by its own variant
  // (source data is always ordered normal,variant,normal,variant…) instead of
  // two side-by-side columns that squeeze each card's content.
  const classSpellsOrdered  = allClassSpells.filter(sp => elemFilter === 'all' || sp.element === elemFilter)
  const commonSpellsOrdered = allCommonSpells.filter(sp => elemFilter === 'all' || sp.element === elemFilter)

  const ELEM_KEYS: Record<AppSpellElement, string> = {
    earth:   'elem_earth',
    fire:    'elem_fire',
    water:   'elem_water',
    air:     'elem_air',
    neutral: 'elem_neutral',
    mixed:   'elem_mixed',
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
          {t('spells')}
        </h3>

        {/* Grade selector */}
        <div className="flex items-center gap-0.5" role="group" aria-label={t('a11y_spell_grade')}>
          {[1,2,3,4,5,6].map(g => {
            const isAuto   = g === autoGrade && manualGrade == null
            const isActive = g === grade
            return (
              <button
                key={g}
                onClick={() => setManual(g === autoGrade && manualGrade === g ? null : g)}
                title={`${t('spell_grade', { grade: g })}${g === autoGrade ? ` ${t('spell_grade_auto')}` : ''}`}
                aria-label={`${t('spell_grade', { grade: g })}${g === autoGrade ? ` ${t('spell_grade_auto')}` : ''}`}
                aria-pressed={isActive}
                className="w-6 h-6 rounded text-[10px] font-bold font-mono transition-colors"
                style={{
                  background:  isActive ? 'var(--gold)' : isAuto ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
                  color:       isActive ? 'var(--ink-invert)' : isAuto ? 'var(--gold)' : 'var(--ink-faint)',
                  border:      isActive ? '1px solid var(--gold)' : '1px solid var(--metal-edge)',
                }}
              >{g}</button>
            )
          })}
          {manualGrade != null && (
            <button
              onClick={() => setManual(null)}
              className="ml-0.5 text-[9px] transition-colors"
              style={{ color: 'var(--ink-faint)' }}
              title={t('spell_reset_grade')}
              aria-label={t('spell_reset_grade')}
            >↺</button>
          )}
        </div>
      </div>

      {/* Element filter */}
      <div className="flex flex-wrap gap-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setElemFilter(f)}
            className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors border"
            style={elemFilter === f ? {
              background:  f === 'all' ? 'var(--metal-edge)' : `color-mix(in srgb, ${ELEM_COLOR[f as AppSpellElement]} 13%, transparent)`,
              borderColor: f === 'all' ? 'var(--ink-muted)' : ELEM_COLOR[f as AppSpellElement],
              color:       f === 'all' ? 'var(--ink)' : ELEM_COLOR[f as AppSpellElement],
            } : {
              background:  'transparent',
              borderColor: 'var(--metal-edge)',
              color:       'var(--ink-faint)',
            }}
          >
            {f === 'all' ? t('elem_all') : t(ELEM_KEYS[f as AppSpellElement])}
          </button>
        ))}
      </div>

      {stats && (
        <p className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>
          ★ {t('spell_calculated')}
        </p>
      )}

      <PvpArena />

      {/* Weapon attack */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div style={{ width: 2, height: 10, background: 'var(--gold-deep)', borderRadius: 1, flexShrink: 0 }} />
          <p className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: 'var(--gold-muted)' }}>
            {t('weapon_attack')}
          </p>
        </div>
        <WeaponCard weapon={equippedWeapon} stats={stats} />
      </div>

      {/* Class spells */}
      {selectedClass && (
        !classData ? (
          <p className="text-forge-muted text-xs animate-pulse py-2">{t('loading_data')}</p>
        ) : (
          <>
            <div className="sm:hidden space-y-2">
              {classSpellsOrdered.length === 0 ? (
                <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('no_spells_filter')}</p>
              ) : classSpellsOrdered.map(spell => (
                <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} spellNameMap={spellNameMap} itemEffects={equippedSpellEffects} />
              ))}
            </div>
            <div className="hidden sm:grid grid-cols-2 gap-x-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <div style={{ width: 2, height: 10, background: 'var(--gold-deep)', borderRadius: 1 }} />
                  <p className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: 'var(--gold-muted)' }}>
                    {t('spell_col_normal')}
                  </p>
                </div>
                {normalSpells.length === 0 ? (
                  <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('no_spells_filter')}</p>
                ) : normalSpells.map(spell => (
                  <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} spellNameMap={spellNameMap} itemEffects={equippedSpellEffects} />
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <div style={{ width: 2, height: 10, background: 'var(--gold-deep)', borderRadius: 1 }} />
                  <p className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: 'var(--gold-muted)' }}>
                    {t('spell_col_variant')}
                  </p>
                </div>
                {variantSpells.length === 0 ? (
                  <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('no_spells_filter')}</p>
                ) : variantSpells.map(spell => (
                  <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} spellNameMap={spellNameMap} itemEffects={equippedSpellEffects} />
                ))}
              </div>
            </div>
          </>
        )
      )}

      {/* Common spells */}
      {commonData && (normalCommon.length > 0 || variantCommon.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
            <div style={{ width: 2, height: 10, background: 'var(--gold-deep)', borderRadius: 1 }} />
            <p className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: 'var(--gold-muted)' }}>
              {t('common_spells')}
            </p>
          </div>
          <div className="sm:hidden space-y-2">
            {commonSpellsOrdered.length === 0 ? (
              <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('no_spells_filter')}</p>
            ) : commonSpellsOrdered.map(spell => (
              <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} spellNameMap={spellNameMap} itemEffects={equippedSpellEffects} />
            ))}
          </div>
          <div className="hidden sm:grid grid-cols-2 gap-x-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <div style={{ width: 2, height: 10, background: 'color-mix(in srgb, var(--gold-deep) 50%, transparent)', borderRadius: 1 }} />
                <p className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-faint)' }}>
                  {t('spell_col_normal')}
                </p>
              </div>
              {normalCommon.length === 0 ? (
                <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('no_spells_filter')}</p>
              ) : normalCommon.map(spell => (
                <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} spellNameMap={spellNameMap} itemEffects={equippedSpellEffects} />
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <div style={{ width: 2, height: 10, background: 'color-mix(in srgb, var(--gold-deep) 50%, transparent)', borderRadius: 1 }} />
                <p className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-faint)' }}>
                  {t('spell_col_variant')}
                </p>
              </div>
              {variantCommon.length === 0 ? (
                <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('no_spells_filter')}</p>
              ) : variantCommon.map(spell => (
                <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} spellNameMap={spellNameMap} itemEffects={equippedSpellEffects} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
