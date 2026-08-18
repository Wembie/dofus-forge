import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sword } from 'lucide-react'
import { useBuildStore } from '@/store/buildStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import type { AppSpell, AppSpellElement, AppSpellEffect } from '@/data/spellLoaders.ts'
import type { AppItem } from '@/data/loaders.ts'
import { calcEffects, calcDamage, type CalcedEffect } from './spellDamage.ts'
import type { StatBlock } from '@/engine/types.ts'
import { statIconUrl } from '../equipment/statDisplay.ts'

function spellGrade(level: number): number {
  if (level >= 200) return 6
  if (level >= 150) return 5
  if (level >= 125) return 4
  if (level >= 100) return 3
  if (level >= 50)  return 2
  return 1
}

const ELEM_COLOR: Record<AppSpellElement, string> = {
  earth:   'var(--earth)',
  fire:    'var(--fire)',
  water:   'var(--water)',
  air:     'var(--air)',
  neutral: 'var(--neutral)',
  mixed:   'var(--gold)',
}

const WEAPON_ATTACK_STAT: Record<string, Exclude<AppSpellElement, 'mixed'>> = {
  'Neutral damage': 'neutral',
  'Earth damage':   'earth',
  'Fire damage':    'fire',
  'Water damage':   'water',
  'Air damage':     'air',
  'Earth steal':    'earth',
  'Fire steal':     'fire',
  'Water steal':    'water',
  'Air steal':      'air',
  'Neutral steal':  'neutral',
}
const IS_STEAL = (stat: string) => stat.includes('steal') || stat.includes('Steal')

function fmtRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`
}

// TODO icons needed (add file to public/data/stats/ then map here):
//   shield.webp      → shield/barrier effects ("Bouclier:", "escudo", "X% of level to shield")
//   move.webp        → movement/positioning (Advances N cell, Moves back, Attracts, Teleports)
//   glyph.webp       → glyph / trap placement
//   steal_elem.webp  → best-element steal (no element-agnostic steal icon)
function buffIcon(text: string): string | null {
  const t = text.toLowerCase()
  const neg = text.trimStart().startsWith('-')
  // AP/MP parry must come before generic AP/MP
  if (/esquive?\s*(de\s*)?pa\b|esquiva.*pa\b|ap parry/i.test(t))   return 'ap_parry'
  if (/esquive?\s*(de\s*)?pm\b|esquiva.*pm\b|mp parry/i.test(t))   return 'mp_parry'
  // AP/MP reduction (steal) must come before generic AP/MP
  if (/retrait\s*pa\b|supresión\s*pa|retirada\s*de\s*pa|ap reduction/i.test(t)) return 'ap_reduction'
  if (/retrait\s*pm\b|supresión\s*pm|retirada\s*de\s*pm|mp reduction/i.test(t)) return 'mp_reduction'
  if (/\bap\b|\bpa\b/.test(t)) return neg ? 'ap_reduction' : 'ap'
  if (/\bmp\b|\bpm\b/.test(t)) return neg ? 'mp_reduction' : 'mp'
  // Elemental & combat resistances (specific before generic)
  if (/air resistance|resistencia al aire|résistance.*air|resistência ao ar/i.test(t))             return 'air_resistance'
  if (/earth resistance|resistencia a la tierra|résistance.*terre|resistência à terra/i.test(t))   return 'earth_resistance'
  if (/fire resistance|resistencia al fuego|résistance.*feu|resistência ao fogo/i.test(t))         return 'fire_resistance'
  if (/neutral resistance|resistencia neutral|résistance.*neutre|resistência neutr/i.test(t))       return 'neutral_resistance'
  if (/water resistance|resistencia al agua|résistance.*eau|resistência à água/i.test(t))           return 'water_resistance'
  if (/pushback resistance|resistencia al empuje|résistance.*repouss|resistência.*empurrão/i.test(t)) return 'push_resistance'
  if (/melee resistance|résistance.*mêlée|resistencia.*cac|resistência.*corpo/i.test(t))            return 'melee_resistance'
  if (/ranged resistance|résistance.*distance|resistencia.*distancia|resistência.*distância/i.test(t)) return 'ranged_resistance'
  if (/critical resistance|résistance.*critique|resistencia.*crítico|resistência.*crítico/i.test(t))   return 'crit_res'
  if (/resistance|résistance|resistencia|resistência/i.test(t)) return null  // unmapped resistance → dot
  // Critical subtypes
  if (/critical damage|dommages?\s*critiques?|daño crítico|dano crítico/i.test(t)) return 'crit_damage'
  if (/crit/i.test(t)) return 'crit'
  // Shield → no icon yet
  if (/shield|escudo|bouclier/i.test(t)) return null
  // Pushback damage
  if (/pushback|recul\b|empuje/i.test(t)) return 'push_damage'
  // Damage subtypes (specific before generic)
  if (/melee damage|dommage.*mêlée|daño.*cuerpo|dano.*corpo/i.test(t))             return 'melee_damage'
  if (/ranged damage|dommage.*distance|daño.*distancia|dano.*distância/i.test(t))   return 'ranged_damage'
  if (/spell damage|dommage.*sort|daño.*hechizo|dano.*feitiço/i.test(t))            return 'spell_damage'
  if (/weapon damage|dommages.*armes?|daños.*armas?|danos.*armas?/i.test(t))        return 'weapon_damage'
  if (/final damage|dommages finaux|daños finales|danos finais/i.test(t))            return 'damage'
  // Summons
  if (/summon|invoc/i.test(t)) return 'summons'
  // Primary stats
  if (/agility|agilidad|agilité|agilidade/i.test(t))           return 'agility'
  if (/\bstrength\b|\bfuerza\b|\bforce\b|\bforça\b/i.test(t))  return 'strength'
  if (/intelligence|inteligencia/i.test(t))                     return 'intelligence'
  if (/\bchance\b|\bsuerte\b/i.test(t))                        return 'chance'
  if (/wisdom|sagesse|sabiduría|sabedoria/i.test(t))            return 'wisdom'
  // Vitality / HP
  if (/vital|\bhp\b|\bpv\b|\bpdv\b/i.test(t)) return 'vitality'
  // Range
  if (/\brange\b|\brango\b|portée|alcance/i.test(t)) return 'range'
  // Power — ES: potencia, PT: potência, FR: puissance
  if (/power|puissance|potenci[ao]|potência/i.test(t)) return 'power'
  // Dodge — FR: fuite, ES: huida, PT: fuga
  if (/\bdodge\b|\bfuite\b|\bhuida\b|\bfuga\b/i.test(t)) return 'dodge'
  // Lock — FR: tacle, ES: placaje/traba, PT: bloqueio
  if (/\block\b|\btacle\b|\btraba\b|\bplacaje\b|\bbloqueio\b/i.test(t)) return 'lock'
  // Heals before generic damage
  if (/heal|soin|cura/i.test(t)) return 'heals'
  // Generic damage — FR: dommage/dégât
  if (/damage|dommage|dégât|daño|dano/i.test(t)) return 'damage'
  return null
}

function rangePct(minRange: number, maxRange: number, stats: StatBlock): number {
  if (maxRange === 0) return 0
  if (maxRange <= 1)  return stats.meleeDamagePercent  // range 0-1 or 1-1 = melee weapon
  return minRange === 0 ? stats.meleeDamagePercent : stats.rangedDamagePercent
}

// Keep first occurrence of each (element+kind+min+max) group.
// Removes duplicates that arise from multi-hit AoE (same value applied to N cells)
// and from charge mechanics where the same hit repeats (e.g. Tyrannical Arrow).
function dedupEffects(effects: AppSpellEffect[]): AppSpellEffect[] {
  const seen = new Set<string>()
  return effects.filter(e => {
    if (e.kind === 'spell_buff') return true
    const key = `${e.condition ?? ''}|${e.element}|${e.kind}|${e.min}|${e.max}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

type ElemFilter = AppSpellElement | 'all'
const FILTERS: ElemFilter[] = ['all', 'earth', 'fire', 'water', 'air', 'neutral']

function SpellCard({ spell, grade, stats, spellNameMap }: { spell: AppSpell; grade: number; stats: StatBlock | null; spellNameMap: Map<number, string> }) {
  const { t }         = useTranslation()
  const charLevel     = useBuildStore(s => s.level)
  const lvl           = spell.levels.find(l => l.grade === grade) ?? spell.levels.at(-1)
  const color         = ELEM_COLOR[spell.element]
  const isMixed       = spell.element === 'mixed'
  const showCalc      = Boolean(stats)

  const spellPct = stats && lvl
    ? stats.spellDamagePercent + rangePct(lvl.minRange, lvl.maxRange, stats)
    : 0

  // Self-charge buffs: spell_buff pointing to this spell itself (charge mechanic)
  const selfChargeBuffs = useMemo(() => {
    if (!lvl) return []
    return lvl.effects
      .filter(e => e.kind === 'spell_buff' && e.spellId === spell.id)
      .sort((a, b) => (a.stack ?? 0) - (b.stack ?? 0))
  }, [lvl, spell.id])

  const displayEffects = useMemo(() => {
    if (!lvl) return []
    const raw = selfChargeBuffs.length > 0
      ? lvl.effects.filter(e => !(e.kind === 'spell_buff' && e.spellId === spell.id))
      : lvl.effects
    const effects = dedupEffects(raw)
    if (stats && effects.length > 0) return calcEffects(effects, stats, spellPct)
    return effects.map(e => ({ ...e, calcMin: e.min, calcMax: e.max }))
  }, [lvl, stats, spellPct, selfChargeBuffs, spell.id])

  const critDisplayEffects = useMemo(() => {
    if (!lvl?.critEffects || lvl.critEffects.length === 0) return []
    const effects = dedupEffects(lvl.critEffects)
    if (stats) return calcEffects(effects, stats, spellPct, stats.critDamage)
    return effects.map(e => ({ ...e, calcMin: e.min, calcMax: e.max }))
  }, [lvl, stats, spellPct])

  // Charge damage sets: one entry per charge level with pre-computed calced+crit effects
  const chargeSets = useMemo((): { label: number; calced: CalcedEffect[]; calcedCrit: CalcedEffect[] }[] => {
    if (!lvl || selfChargeBuffs.length === 0) return []

    const applyBonus = (effects: AppSpellEffect[], bonus: number): AppSpellEffect[] =>
      effects.map(e => {
        if (e.kind !== 'damage' && e.kind !== 'steal' && e.kind !== 'poison') return e
        return { ...e, min: e.min + bonus, max: (e.max > 0 ? e.max : e.min) + bonus }
      })

    const calcSet = (bonus: number) => {
      const baseFx     = lvl.effects.filter(e => !(e.kind === 'spell_buff' && e.spellId === spell.id))
      const chargedFx  = applyBonus(baseFx, bonus)
      const chargedCFx = applyBonus(lvl.critEffects ?? [], bonus)
      const calced     = stats ? calcEffects(chargedFx, stats, spellPct) : chargedFx.map(e => ({ ...e, calcMin: e.min, calcMax: e.max }))
      const calcedCrit = stats ? calcEffects(chargedCFx, stats, spellPct) : chargedCFx.map(e => ({ ...e, calcMin: e.min, calcMax: e.max }))
      return { calced, calcedCrit }
    }

    // Explicit stack levels (e.g., Punitive Arrow: stack=1, stack=2)
    if (selfChargeBuffs.some(b => (b.stack ?? 0) >= 1)) {
      const explicitBuffs = selfChargeBuffs.filter(b => (b.stack ?? 0) >= 1)
      // When all buffs share the same min, it's a per-stack bonus (e.g. Expiation Arrow:
      // API stores "36 per 2-stack unit" → at stack=4 the actual bonus is 36×2=72).
      const allSameMin = explicitBuffs.every(b => b.min === explicitBuffs[0].min)
      const baseStack  = allSameMin ? Math.min(...explicitBuffs.map(b => b.stack ?? 1)) : 1
      return explicitBuffs.map((buff, i) => ({
        label: i + 1,
        ...calcSet(allSameMin ? buff.min * ((buff.stack ?? 1) / baseStack) : buff.min),
      }))
    }
    // Cumulative per-cast (stack=0, e.g., Frozen Arrow): show up to min(turns, 3) rows
    const buff = selfChargeBuffs[0]
    const maxN = buff.turns && buff.turns > 0 ? Math.min(buff.turns, 3) : 3
    return Array.from({ length: maxN }, (_, i) => ({ label: i + 1, ...calcSet(buff.min * (i + 1)) }))
  }, [lvl, selfChargeBuffs, stats, spellPct, spell.id])

  const isDmgOrSteal = (e: { kind: string }) => e.kind === 'damage' || e.kind === 'steal' || e.kind === 'poison'

  // Separate effects by condition (shield = effects only on shielded targets)
  const shieldDisplayEffects = displayEffects.filter(e => e.condition === 'shield')
  const hasShieldGroup       = shieldDisplayEffects.length > 0

  // Crit effects in same order as normal: base first, shield second
  const critDmgEffects = critDisplayEffects.filter(isDmgOrSteal)

  // Map display-index → crit effect by ordered damage-slot index
  const critByDisplayIdx = useMemo(() => {
    const map = new Map<number, (typeof critDmgEffects)[0]>()
    let dmgIdx = 0
    displayEffects.forEach((e, i) => {
      if (isDmgOrSteal(e)) {
        if (dmgIdx < critDmgEffects.length) map.set(i, critDmgEffects[dmgIdx])
        dmgIdx++
      }
    })
    return map
  }, [displayEffects, critDmgEffects])

  // Push collision damage: floor(level/6 + pushbackDamage×0.25) per cell
  // floor(200/6)=33 at lv200; observed in-game: 99 for 3 cells = 33/cell ✓
  const pushDmgPerCell = stats
    ? Math.floor(charLevel / 6 + stats.pushbackDamage * 0.25)
    : Math.floor(charLevel / 6)
  const pushEffects    = displayEffects.filter(e => e.kind === 'push')
  const pushTotalCells = pushEffects.reduce((s, e) => s + e.calcMin, 0)
  const pushTotalDmg   = pushTotalCells * pushDmgPerCell
  const hasPush        = pushEffects.length > 0

  function renderEffectGroup(shieldGroup: boolean) {
    const groupDmgEffects = displayEffects.filter(e =>
      isDmgOrSteal(e) && (shieldGroup ? e.condition === 'shield' : e.condition !== 'shield')
    )
    const critGroup = displayEffects.flatMap((e, i) => {
      const inGroup = shieldGroup ? e.condition === 'shield' : e.condition !== 'shield'
      if (!inGroup || !isDmgOrSteal(e)) return []
      return [critByDisplayIdx.get(i)]
    })
    const hasCritGroup   = critGroup.some(c => c != null)
    const showCritCol    = hasCritGroup && critDmgEffects.length > 0
    const hasDmgRows     = groupDmgEffects.length > 0
    const dmgCols        = showCritCol ? '13px 1fr 1fr' : '13px 1fr'

    // Descarga detection must come before Σ totals so we can exclude the steal (charge) phase
    const groupEffectsInOrder = displayEffects.filter(e =>
      (shieldGroup ? e.condition === 'shield' : e.condition !== 'shield') && isDmgOrSteal(e)
    )
    const stealCount  = groupEffectsInOrder.filter(e => e.kind === 'steal').length
    const damageCount = groupEffectsInOrder.filter(e => e.kind === 'damage').length
    const hasDescarga = !shieldGroup && stealCount >= 1 && damageCount >= 1
      && groupEffectsInOrder.findIndex(e => e.kind === 'damage') > groupEffectsInOrder.findIndex(e => e.kind === 'steal')

    // Descarga spells: Σ only sums discharge (damage-kind) phase — steal phase is charging, not additive
    const sigmaEffects   = hasDescarga ? groupDmgEffects.filter(e => e.kind === 'damage') : groupDmgEffects
    const sigmaCritGroup = hasDescarga
      ? critGroup.filter((_, i) => groupDmgEffects[i]?.kind === 'damage')
      : critGroup

    const totalNormMin   = sigmaEffects.reduce((s, e) => s + e.calcMin, 0)
    const totalNormMax   = sigmaEffects.reduce((s, e) => s + e.calcMax, 0)
    const critTotalMin   = sigmaCritGroup.reduce((s, c) => s + (c?.calcMin ?? 0), 0)
    const critTotalMax   = sigmaCritGroup.reduce((s, c) => s + (c?.calcMax ?? 0), 0)
    const hasStealGroup  = !hasDescarga && groupDmgEffects.some(e => e.kind === 'steal')
    const totalHealMin   = groupDmgEffects.filter(e => e.kind === 'steal').reduce((s, e) => s + Math.floor(e.calcMin / 2), 0)
    const totalHealMax   = groupDmgEffects.filter(e => e.kind === 'steal').reduce((s, e) => s + Math.floor(e.calcMax / 2), 0)
    const critHealMin    = critGroup.reduce((s, c) => s + (c?.kind === 'steal' ? Math.floor(c.calcMin / 2) : 0), 0)
    const critHealMax    = critGroup.reduce((s, c) => s + (c?.kind === 'steal' ? Math.floor(c.calcMax / 2) : 0), 0)
    const showGroupTotal = !shieldGroup && !hasDescarga && !isMixed && sigmaEffects.length >= 2
    const showPushSigma  = !shieldGroup && !hasDescarga && !isMixed && hasPush && stats != null

    const rows: React.ReactNode[] = []

    // Column headers — only when there are damage rows
    if (hasDmgRows) {
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

    let descargaShown = false
    const hasNonPoison = groupEffectsInOrder.some(e => e.kind !== 'poison')
    let poisonLabelShown = false

    displayEffects.forEach((e, i) => {
      const inGroup = shieldGroup ? e.condition === 'shield' : e.condition !== 'shield'
      if (!inGroup) return
      const c = ELEM_COLOR[e.element]

      // Insert Descarga separator before first damage effect in charge+discharge spells
      if (hasDescarga && !descargaShown && e.kind === 'damage') {
        descargaShown = true
        rows.push(
          <div key="descarga" className="pt-0.5" style={{ borderTop: '1px solid color-mix(in srgb, var(--fire) 20%, transparent)' }}>
            <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: 'color-mix(in srgb, var(--fire) 70%, var(--gold))' }}>
              {t('spell_discharge')}
            </span>
          </div>
        )
      }

      if (e.kind === 'push') {
        const cells = e.calcMin
        const clr = 'var(--ink-muted)'
        rows.push(
          <div key={`p${i}`} className="flex items-center gap-1 flex-wrap">
            <span className="rounded px-1.5 py-px text-[10px] font-mono leading-snug inline-flex items-center gap-1"
              style={{ background: 'color-mix(in srgb, var(--ink-muted) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--ink-muted) 25%, transparent)', color: clr }}>
              <img src={statIconUrl('push_damage')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
              {t('spell_push', { cells })}
              {stats && <span style={{ color: 'var(--ink-faint)' }}>{t('spell_push_collision', { dmg: String(pushDmgPerCell * cells) })}</span>}
            </span>
          </div>
        )
        return
      }
      if (e.kind === 'ap') {
        rows.push(
          <div key={`a${i}`}>
            <span className="rounded px-1.5 py-px text-[10px] font-mono leading-snug inline-flex items-center gap-1"
              style={{ background: 'color-mix(in srgb, var(--gold) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 25%, transparent)', color: 'var(--gold)' }}>
              <img src={statIconUrl('ap_reduction')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
              {t('spell_steal_ap', { n: fmtRange(e.calcMin, e.calcMax) })}
            </span>
          </div>
        )
        return
      }
      if (e.kind === 'mp') {
        rows.push(
          <div key={`m${i}`}>
            <span className="rounded px-1.5 py-px text-[10px] font-mono leading-snug inline-flex items-center gap-1"
              style={{ background: 'color-mix(in srgb, var(--air) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--air) 25%, transparent)', color: 'var(--air)' }}>
              <img src={statIconUrl('mp_reduction')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
              {t('spell_steal_mp', { n: fmtRange(e.calcMin, e.calcMax) })}
            </span>
          </div>
        )
        return
      }
      if (e.kind === 'ap_gain') {
        rows.push(
          <div key={`ag${i}`}>
            <span className="rounded px-1.5 py-px text-[10px] font-mono leading-snug inline-flex items-center gap-1"
              style={{ background: 'color-mix(in srgb, var(--gold) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 25%, transparent)', color: 'var(--gold)' }}>
              <img src={statIconUrl('ap')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
              {t('spell_gain_ap', { n: fmtRange(e.calcMin, e.calcMax) })}
            </span>
          </div>
        )
        return
      }
      if (e.kind === 'mp_gain') {
        rows.push(
          <div key={`mg${i}`}>
            <span className="rounded px-1.5 py-px text-[10px] font-mono leading-snug inline-flex items-center gap-1"
              style={{ background: 'color-mix(in srgb, var(--air) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--air) 25%, transparent)', color: 'var(--air)' }}>
              <img src={statIconUrl('mp')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
              {t('spell_gain_mp', { n: fmtRange(e.calcMin, e.calcMax) })}
            </span>
          </div>
        )
        return
      }
      if (e.kind === 'erosion') {
        rows.push(
          <div key={`er${i}`}>
            <span className="rounded px-1.5 py-px text-[10px] font-mono leading-snug inline-flex items-center gap-1"
              style={{ background: 'color-mix(in srgb, var(--fire) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--fire) 25%, transparent)', color: 'var(--fire)' }}>
              <img src={statIconUrl('damage_reflect')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
              {t('spell_erosion', { pct: e.calcMin, turns: e.turns ?? 0 })}
            </span>
          </div>
        )
        return
      }
      if (e.kind === 'heal_mod') {
        rows.push(
          <div key={`hm${i}`}>
            <span className="rounded px-1.5 py-px text-[10px] font-mono leading-snug inline-flex items-center gap-1"
              style={{ background: 'color-mix(in srgb, var(--vitality) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--vitality) 25%, transparent)', color: 'var(--vitality)' }}>
              <img src={statIconUrl('heals')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
              {t('spell_heal_mod', { pct: e.calcMin })}
            </span>
          </div>
        )
        return
      }
      if (e.kind === 'spell_buff') {
        const spellName = spellNameMap.get(e.spellId ?? 0) ?? `#${e.spellId ?? '?'}`
        const turnsStr  = e.turns && e.turns > 0 ? ` · ${e.turns}t` : ''
        const deathStr  = e.deathReset ? ' 💀' : ''
        rows.push(
          <div key={`sb${i}`}>
            <span className="rounded px-1.5 py-px text-[10px] font-mono leading-snug inline-flex items-center gap-1"
              style={{ background: 'color-mix(in srgb, var(--gold-deep) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--gold-deep) 25%, transparent)', color: 'var(--gold-deep)' }}>
              ⭐ {spellName}: +{e.calcMin} base{turnsStr}{deathStr}
            </span>
          </div>
        )
        return
      }

      // Insert Veneno label before first poison effect when there are also normal damage effects
      if (hasNonPoison && !poisonLabelShown && e.kind === 'poison') {
        poisonLabelShown = true
        rows.push(
          <div key="poison-lbl" className="pt-0.5" style={{ borderTop: '1px solid color-mix(in srgb, var(--fire) 20%, transparent)' }}>
            <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: 'color-mix(in srgb, var(--fire) 70%, var(--gold))' }}>
              {t('spell_poison', { turns: e.turns ?? 1 })}
            </span>
          </div>
        )
      }

      const crit = critByDisplayIdx.get(i)
      rows.push(
        <div key={`e${i}`} className="space-y-px">
          <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0 justify-self-center" style={{ background: c }} />
            <span
              className={`text-[13px] font-mono tabular-nums text-right${showCalc ? ' font-bold' : ''}`}
              style={{ color: showCalc ? c : 'var(--ink-muted)' }}
            >
              {fmtRange(e.calcMin, e.calcMax)}
            </span>
            {showCritCol && (
              <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: crit ? 'var(--crit)' : 'var(--ink-faint)' }}>
                {crit ? fmtRange(crit.calcMin, crit.calcMax) : '—'}
              </span>
            )}
          </div>
          {e.kind === 'steal' && (
            <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
              <span className="flex items-center justify-center">
                <img src={statIconUrl('heals')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
              </span>
              <span className="text-[10px] font-mono tabular-nums text-right" style={{ color: 'var(--vitality)' }}>
                {fmtRange(Math.floor(e.calcMin / 2), Math.floor(e.calcMax / 2))}
              </span>
              {showCritCol && (
                <span className="text-[10px] font-mono tabular-nums text-right" style={{ color: 'var(--vitality)' }}>
                  {crit ? fmtRange(Math.floor(crit.calcMin / 2), Math.floor(crit.calcMax / 2)) : '—'}
                </span>
              )}
            </div>
          )}
        </div>
      )
    })

    if (!shieldGroup && chargeSets.length > 0) {
      chargeSets.forEach(({ label, calced, calcedCrit }) => {
        const cdmg  = calced.filter(isDmgOrSteal)
        const ccrit = calcedCrit.filter(isDmgOrSteal)
        rows.push(
          <div key={`cs-${label}`} className="pt-0.5" style={{ borderTop: '1px solid color-mix(in srgb, var(--gold) 18%, transparent)' }}>
            <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: 'var(--gold-deep)' }}>
              {t('spell_charge_n', { n: label })}
            </span>
          </div>
        )
        cdmg.forEach((e, i) => {
          const crit = ccrit[i]
          const c    = ELEM_COLOR[e.element]
          rows.push(
            <div key={`cd-${label}-${i}`} className="space-y-px">
              <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0 justify-self-center" style={{ background: c }} />
                <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: showCalc ? c : 'var(--ink-muted)' }}>
                  {fmtRange(e.calcMin, e.calcMax)}
                </span>
                {showCritCol && (
                  <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: crit ? 'var(--crit)' : 'var(--ink-faint)' }}>
                    {crit ? fmtRange(crit.calcMin, crit.calcMax) : '—'}
                  </span>
                )}
              </div>
              {e.kind === 'steal' && (
                <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
                  <span className="flex items-center justify-center">
                    <img src={statIconUrl('heals')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-right" style={{ color: 'var(--vitality)' }}>
                    {fmtRange(Math.floor(e.calcMin / 2), Math.floor(e.calcMax / 2))}
                  </span>
                  {showCritCol && (
                    <span className="text-[10px] font-mono tabular-nums text-right" style={{ color: 'var(--vitality)' }}>
                      {crit ? fmtRange(Math.floor(crit.calcMin / 2), Math.floor(crit.calcMax / 2)) : '—'}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })
      })
    }

    if (showGroupTotal || showPushSigma) {
      rows.push(
        <div key="sigma" className="pt-0.5 space-y-px" style={{ borderTop: '1px solid var(--metal-edge)' }}>
          {showGroupTotal && (
            <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
              <span className="text-[9px] font-bold leading-none justify-self-center" style={{ color: 'var(--ink-faint)' }}>Σ</span>
              <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: 'var(--ink-muted)' }}>
                {fmtRange(totalNormMin, totalNormMax)}
              </span>
              {showCritCol && (
                <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: 'var(--crit)' }}>
                  {fmtRange(critTotalMin, critTotalMax)}
                </span>
              )}
            </div>
          )}
          {showGroupTotal && hasStealGroup && (
            <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
              <span className="flex items-center justify-center">
                <img src={statIconUrl('heals')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
              </span>
              <span className="text-[10px] font-mono tabular-nums text-right" style={{ color: 'var(--vitality)' }}>
                {fmtRange(totalHealMin, totalHealMax)}
              </span>
              {showCritCol && (
                <span className="text-[10px] font-mono tabular-nums text-right" style={{ color: 'var(--vitality)' }}>
                  {fmtRange(critHealMin, critHealMax)}
                </span>
              )}
            </div>
          )}
          {showPushSigma && (
            <div className="grid items-center" style={{ gridTemplateColumns: dmgCols, gap: 4 }}>
              <span className="text-[9px] font-bold leading-none justify-self-center" style={{ color: 'var(--ink-faint)' }}>Σ↷</span>
              <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: 'var(--ink-muted)' }}>
                {fmtRange(totalNormMin + pushTotalDmg, totalNormMax + pushTotalDmg)}
              </span>
              {showCritCol && (
                <span className="text-[13px] font-mono tabular-nums font-bold text-right" style={{ color: 'var(--crit)' }}>
                  {fmtRange(critTotalMin + pushTotalDmg, critTotalMax + pushTotalDmg)}
                </span>
              )}
            </div>
          )}
        </div>
      )
    }

    return rows
  }

  // Effective range: apply stats.range bonus to non-melee spells
  const effectiveMaxRange = lvl && lvl.maxRange > 0 && stats?.range
    ? lvl.maxRange + stats.range
    : (lvl?.maxRange ?? 0)

  const rangeStr = !lvl || lvl.maxRange === 0
    ? t('spell_melee')
    : lvl.minRange === effectiveMaxRange
      ? String(effectiveMaxRange)
      : `${lvl.minRange}–${effectiveMaxRange}`

  // Effective crit: base spell crit + gear crit bonus (only shown when base crit > 0)
  const effectiveCrit = lvl && lvl.critChance > 0
    ? lvl.critChance + (stats?.critChance ?? 0)
    : 0

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
        <p className="text-[13px] font-semibold truncate leading-tight mb-1" style={{ color, textShadow: `0 0 12px color-mix(in srgb, ${color} 40%, transparent)` }}>
          {spell.name}
        </p>

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

        {displayEffects.length > 0 ? (
          <div className="space-y-0.5">
            {renderEffectGroup(false)}
            {hasShieldGroup && (
              <>
                <div className="pt-0.5 mt-0.5" style={{ borderTop: '1px solid var(--metal-edge)' }}>
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-faint)' }}>
                    {t('spell_condition_shield')}
                  </span>
                </div>
                {renderEffectGroup(true)}
              </>
            )}
          </div>
        ) : (
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-faint)' }}>
            {t('spell_support')}
          </span>
        )}

        {lvl?.buffs && lvl.buffs.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {lvl.buffs.map((buff, i) => {
              const neg  = buff.startsWith('-')
              const pos  = !neg && (buff.startsWith('+') || /^\d/.test(buff))
              const icon = buffIcon(buff)
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

        {spell.description && (
          <div className="mt-1.5 text-[9px] leading-snug italic" style={{ color: 'var(--ink-faint)', opacity: 0.7 }}>
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

  const attackEffects = useMemo(() => {
    if (!weapon) return []
    const base = weapon.effects.filter(e => Object.prototype.hasOwnProperty.call(WEAPON_ATTACK_STAT, e.stat))
    if (!weaponTransform) return base
    const elemStat = `${weaponTransform.element.charAt(0).toUpperCase()}${weaponTransform.element.slice(1)} damage`
    const r = weaponTransform.ratio / 100
    return base.map(e => {
      if (e.stat !== 'Neutral damage') return e
      const newMin = Math.ceil(e.min * r)
      const newMax = e.max > 0 ? Math.ceil(e.max * r) : newMin
      return { ...e, stat: elemStat, min: newMin, max: newMax }
    })
  }, [weapon, weaponTransform])

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

  const ap      = weapon.ap_cost     ?? 0
  const minR    = weapon.min_range   ?? 0
  const maxR    = weapon.max_range   ?? 0
  const crit    = weapon.crit_chance ?? 0
  const critBon = weapon.crit_bonus  ?? 0
  const wLevel  = weapon.level       ?? 0

  const effectiveCrit = crit > 0 ? Math.min(100, crit + (stats?.critChance ?? 0)) : 0
  const rangeStr = maxR === 0
    ? t('spell_melee')
    : minR === maxR ? String(minR) : `${minR}–${maxR}`

  const hasCrit = crit > 0 && stats != null

  const baseWeaponPct = stats ? stats.weaponDamagePercent + rangePct(minR, maxR, stats) : 0
  const normalPct     = baseWeaponPct + (dominioActive ? dominioNorm : 0)
  const critWeaponPct = baseWeaponPct + (dominioActive ? dominioCrit : 0)


  const dmgEffects   = attackEffects.filter(e => !IS_STEAL(e.stat))
  const stealEffects = attackEffects.filter(e =>  IS_STEAL(e.stat))

  function computeRow(e: typeof attackEffects[0]) {
    const elem    = WEAPON_ATTACK_STAT[e.stat]!
    const c       = ELEM_COLOR[elem]
    const baseMax = e.max > 0 ? e.max : e.min
    const low      = stats ? calcDamage(e.min,            elem, stats, normalPct)     : e.min
    const high     = stats ? calcDamage(baseMax,           elem, stats, normalPct)     : baseMax
    // crit_bonus is an additional base damage amplified by the mastery formula (not flat)
    const critLow  = stats ? calcDamage(e.min   + critBon, elem, stats, critWeaponPct) + stats.critDamage : e.min
    const critHigh = stats ? calcDamage(baseMax + critBon, elem, stats, critWeaponPct) + stats.critDamage : baseMax
    return { elem, c, low, high, critLow, critHigh }
  }

  const dmgRows   = dmgEffects.map(computeRow)
  const stealRows = stealEffects.map(computeRow)
  const allRows   = [...dmgRows, ...stealRows]

  const totalNormMin = allRows.reduce((s, e) => s + e.low,      0)
  const totalNormMax = allRows.reduce((s, e) => s + e.high,     0)
  const totalCritMin = allRows.reduce((s, e) => s + e.critLow,  0)
  const totalCritMax = allRows.reduce((s, e) => s + e.critHigh, 0)

  const healMin     = stealRows.reduce((s, e) => s + Math.floor(e.low      / 2), 0)
  const healMax     = stealRows.reduce((s, e) => s + Math.floor(e.high     / 2), 0)
  const healCritMin = stealRows.reduce((s, e) => s + Math.floor(e.critLow  / 2), 0)
  const healCritMax = stealRows.reduce((s, e) => s + Math.floor(e.critHigh / 2), 0)

  const hasSteal   = stealRows.length > 0
  const showTotal  = allRows.length >= 2
  const cols       = hasCrit ? '1fr 1fr 1fr' : '1fr 1fr'

  const RangeCell = ({ min, max, color, bold = false }: { min: number; max: number; color: string; bold?: boolean }) => (
    <span className="text-[11px] font-mono tabular-nums" style={{ color, fontWeight: bold ? 700 : 400 }}>
      {fmtRange(min, max)}
    </span>
  )

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5" style={{ borderBottom: '1px solid var(--metal-edge)', background: 'var(--surface-stone)' }}>
        <div
          className="flex-shrink-0 rounded overflow-hidden flex items-center justify-center"
          style={{ width: 44, height: 44, background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)' }}
        >
          {weapon.image_url
            ? <img src={weapon.image_url} alt="" width={44} height={44} loading="lazy" className="object-contain" />
            : <Sword size={20} style={{ color: 'var(--ink-faint)' }} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{weapon.name}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {weaponTransform && (() => {
                const elemColor = ELEM_COLOR[weaponTransform.element]
                return (
                  <span
                    className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: `color-mix(in srgb, ${elemColor} 15%, transparent)`,
                      border:     `1px solid color-mix(in srgb, ${elemColor} 40%, transparent)`,
                      color:       elemColor,
                    }}
                  >
                    {t(`elem_${weaponTransform.element}`)} {weaponTransform.ratio}%
                  </span>
                )
              })()}
              {wLevel > 0 && <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>{t('level_range')}.{wLevel}</span>}
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-x-3 mt-0.5">
            {ap > 0 && <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--gold)' }}>{t('badge_ap')} {ap}</span>}
            <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>{t('weapon_range_label')} {rangeStr}</span>
            {effectiveCrit > 0 && (
              <span className="text-[10px] font-mono" style={{ color: 'var(--crit)' }}>
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
              onChange={e => setDominioCrit(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-14 text-center text-[11px] font-mono font-bold rounded px-1 py-0.5 focus:outline-none border"
              style={{ background: 'var(--surface-panel)', border: '1px solid color-mix(in srgb, var(--crit) 40%, transparent)', color: 'var(--crit)' }}
            />
          </div>
        )}
      </div>

      {/* Damage table */}
      {allRows.length > 0 && (
        <div className="px-3 py-2.5 space-y-1">
          {/* Column headers */}
          <div className="grid mb-1.5" style={{ gridTemplateColumns: cols, gap: 8 }}>
            <span />
            <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-faint)' }}>{t('weapon_normal')}</span>
            {hasCrit && <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--crit)' }}>{t('weapon_crit_col')}</span>}
          </div>

          {/* Damage rows */}
          {dmgRows.map(({ c, low, high, critLow, critHigh }, i) => (
            <div key={`d${i}`} className="grid items-center" style={{ gridTemplateColumns: cols, gap: 8 }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                <span className="text-[10px] font-medium" style={{ color: c }}>{t(`elem_${dmgEffects[i].stat.split(' ')[0].toLowerCase()}`)}</span>
              </span>
              <RangeCell min={low} max={high} color={c} bold={Boolean(stats)} />
              {hasCrit && <RangeCell min={critLow} max={critHigh} color="var(--crit)" bold />}
            </div>
          ))}

          {/* Steal rows */}
          {stealRows.map(({ c, low, high, critLow, critHigh }, i) => (
            <div key={`s${i}`} className="space-y-0.5">
              <div className="grid items-center" style={{ gridTemplateColumns: cols, gap: 8 }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                  <span className="text-[10px] font-medium" style={{ color: c }}>{t('weapon_steal_label')}</span>
                </span>
                <RangeCell min={low} max={high} color={c} bold={Boolean(stats)} />
                {hasCrit && <RangeCell min={critLow} max={critHigh} color="var(--crit)" bold />}
              </div>
              <div className="grid items-center" style={{ gridTemplateColumns: cols, gap: 8 }}>
                <span className="pl-3 flex items-center">
                  <img src={statIconUrl('heals')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
                </span>
                <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--vitality)' }}>
                  {fmtRange(Math.floor(low / 2), Math.floor(high / 2))}
                </span>
                {hasCrit && (
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--vitality)' }}>
                    {fmtRange(Math.floor(critLow / 2), Math.floor(critHigh / 2))}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Total row */}
          {showTotal && (
            <div className="pt-1.5 space-y-0.5" style={{ borderTop: '1px solid var(--metal-edge)' }}>
              <div className="grid items-center" style={{ gridTemplateColumns: cols, gap: 8 }}>
                <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-faint)' }}>{t('weapon_total')}</span>
                <span className="text-[11px] font-mono tabular-nums font-bold" style={{ color: 'var(--ink-muted)' }}>{fmtRange(totalNormMin, totalNormMax)}</span>
                {hasCrit && <span className="text-[11px] font-mono tabular-nums font-bold" style={{ color: 'var(--crit)' }}>{fmtRange(totalCritMin, totalCritMax)}</span>}
              </div>
              {hasSteal && (
                <div className="grid items-center" style={{ gridTemplateColumns: cols, gap: 8 }}>
                  <span className="flex items-center">
                    <img src={statIconUrl('heals')} alt="" width={11} height={11} className="object-contain flex-shrink-0" />
                  </span>
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--vitality)' }}>{fmtRange(healMin, healMax)}</span>
                  {hasCrit && <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--vitality)' }}>{fmtRange(healCritMin, healCritMax)}</span>}
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
  const stats         = useBuildStore(s => s.stats)
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
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5,6].map(g => {
            const isAuto   = g === autoGrade && manualGrade == null
            const isActive = g === grade
            return (
              <button
                key={g}
                onClick={() => setManual(g === autoGrade && manualGrade === g ? null : g)}
                title={`${t('spell_grade', { grade: g })}${g === autoGrade ? ' (auto)' : ''}`}
                className="w-5 h-5 rounded text-[10px] font-bold font-mono transition-colors"
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

      {/* Weapon attack */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div style={{ width: 2, height: 10, background: 'var(--gold-deep)', borderRadius: 1, flexShrink: 0 }} />
          <p className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: 'var(--gold-deep)' }}>
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
          <div className="grid grid-cols-2 gap-x-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <div style={{ width: 2, height: 10, background: 'var(--gold-deep)', borderRadius: 1 }} />
                <p className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: 'var(--gold-deep)' }}>
                  {t('spell_col_normal')}
                </p>
              </div>
              {normalSpells.length === 0 ? (
                <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('no_spells_filter')}</p>
              ) : normalSpells.map(spell => (
                <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} spellNameMap={spellNameMap} />
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <div style={{ width: 2, height: 10, background: 'var(--gold-deep)', borderRadius: 1 }} />
                <p className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: 'var(--gold-deep)' }}>
                  {t('spell_col_variant')}
                </p>
              </div>
              {variantSpells.length === 0 ? (
                <p className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('no_spells_filter')}</p>
              ) : variantSpells.map(spell => (
                <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} spellNameMap={spellNameMap} />
              ))}
            </div>
          </div>
        )
      )}

      {/* Common spells */}
      {commonData && (normalCommon.length > 0 || variantCommon.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
            <div style={{ width: 2, height: 10, background: 'var(--gold-deep)', borderRadius: 1 }} />
            <p className="text-[12px] uppercase tracking-widest font-semibold" style={{ color: 'var(--gold-deep)' }}>
              {t('common_spells')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
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
                <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} spellNameMap={spellNameMap} />
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
                <SpellCard key={spell.id} spell={spell} grade={grade} stats={stats} spellNameMap={spellNameMap} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
