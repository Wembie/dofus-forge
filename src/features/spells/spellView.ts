import type { AppSpell, AppSpellCondition, AppSpellEffect, AppSpellLevel } from '@/data/spellLoaders.ts'
import type { AppEffect, AppItem } from '@/data/loaders.ts'
import type { StatBlock } from '@/engine/types.ts'
import type { WeaponTransform } from '@/store/buildStore.ts'
import { calcEffects, NO_MODS, type CalcedEffect, type DamageMods } from './spellDamage.ts'
import {
  dedupEffects, spellMods, weaponMods, hasDescargaPattern, hasTieredOutcomes,
  conditionKey, sameCondition, WEAPON_ATTACK_STAT,
} from './spellCalc.ts'
import { applyItemSpellModifiers, getItemSpellModifiers } from './itemSpellModifiers.ts'
import { weaponAttackEffects, weaponDamageRows } from './weaponRows.ts'

// What a spell or the weapon attack shows, computed once and shared by every
// presentation: rows in display order, totals, life steal, charges, pushback.

type Range = [number, number]

const isDmgOrSteal = (e: { kind: string }) => e.kind === 'damage' || e.kind === 'steal' || e.kind === 'poison'
const half = (min: number, max: number): Range => [Math.floor(min / 2), Math.floor(max / 2)]
/** Roll range before any bonus; a fixed value (max 0) is min..min, as in calcEffects. */
export const rollOf = (e: { min: number; max: number }): Range => [e.min, e.max > 0 ? e.max : e.min]

/** A damage, steal or poison line (or any line without its own kind of row), with its critical twin. */
export type SpellHit = {
  effect: CalcedEffect
  crit: CalcedEffect | undefined
  /** Life stolen heals half the damage dealt. */
  heal: Range | null
  critHeal: Range | null
}

export type SpellEntry =
  | { kind: 'section'; section: 'discharge' }
  | { kind: 'section'; section: 'poison'; turns: number }
  | { kind: 'push'; index: number; cells: number; collision: number | null }
  | { kind: 'ap' | 'mp' | 'ap_gain' | 'mp_gain'; index: number; effect: CalcedEffect }
  | { kind: 'erosion'; index: number; pct: number; turns: number }
  | { kind: 'heal_mod'; index: number; pct: number }
  | { kind: 'spell_buff'; index: number; spellId: number | undefined; base: number; turns: number; deathReset: boolean }
  | ({ kind: 'hit'; index: number } & SpellHit)

export type SpellTotals = {
  normal: Range
  crit: Range
  /** Only when the group steals life. */
  heal: { normal: Range; crit: Range } | null
}

export type SpellGroup = {
  /** undefined for the base group; otherwise the condition every line of the group needs. */
  condition: AppSpellCondition | undefined
  hasDamage: boolean
  showCritColumn: boolean
  entries: SpellEntry[]
  /** Each charge level of a self-charging spell (base group only). */
  charges: { label: number; hits: SpellHit[] }[]
  /** Σ: sum of the simultaneous hits, when they really add up. */
  total: SpellTotals | null
  /** Σ with the pushback collision damage added. */
  pushTotal: { normal: Range; crit: Range } | null
}

export type SpellBuff = { text: string; icon: string | null; tone: 'negative' | 'positive' | 'neutral' }

export type SpellView = {
  /** The grade's level after item spell modifiers; undefined when the spell has no level. */
  level: AppSpellLevel | undefined
  mods: DamageMods
  /** True when damage is computed from the build's stats. */
  calculated: boolean
  ap: number
  range: { melee: true } | { melee: false; min: number; max: number }
  /** Base critical plus the build's, only for spells that can crit. */
  crit: number
  maxPerTurn: number
  groups: SpellGroup[]
  /** No damage or effect lines at all: a support spell. */
  support: boolean
  buffs: SpellBuff[]
  itemEffects: AppEffect[]
  description: string | undefined
}

// TODO icons needed (add file to public/data/stats/ then map here):
//   shield.webp      → shield/barrier effects ("Bouclier:", "escudo", "X% of level to shield")
//   move.webp        → movement/positioning (Advances N cell, Moves back, Teleports) — "Attracts" now uses pull.png
//   glyph.webp       → glyph / trap placement
//   steal_elem.webp  → best-element steal (no element-agnostic steal icon)
/** Stat icon for a buff line written in any of the four languages, or null for a plain marker. */
export function spellBuffIcon(text: string): string | null {
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
  if (/cr[ií]t/i.test(t)) return 'crit'  // "crit(ical)" (en/fr) vs "crít(ico/ica)" (es/pt, accented í)
  // Best-element steal/damage (uses the same 'power' icon as the item-effect version)
  if (/best-element (steal|damage)|vol du meilleur élément|dommages? du meilleur élément|robo del mejor elemento|daño del mejor elemento|roubo do melhor elemento|dano do melhor elemento/i.test(t)) return 'power'
  // Shield → no icon yet
  if (/shield|escudo|bouclier/i.test(t)) return null
  // Pushback damage
  if (/pushback|recul\b|empuje/i.test(t)) return 'push_damage'
  // Attracts by cell (pull towards caster/target)
  if (/\battracts?\b|\batrae\b|\battire\b|\batrai\b/i.test(t)) return 'pull'
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
  if (/intelligence|intelig[eê]ncia/i.test(t))                  return 'intelligence'  // pt: "inteligência" (ê, not the final i)
  if (/\bchance\b|\bsuerte\b|\bsorte\b/i.test(t))              return 'chance'  // pt: "sorte"
  if (/wisdom|sagesse|sabiduría|sabedoria/i.test(t))            return 'wisdom'
  // Vitality / HP
  if (/vital|\bhp\b|\bpv\b|\bpdv\b|\bvida\b/i.test(t)) return 'vitality'  // es/pt life-transfer buffs say "vida"
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

const asCalced = (effects: AppSpellEffect[]): CalcedEffect[] => effects.map(e => ({ ...e, calcMin: e.min, calcMax: e.max }))

function hitOf(effect: CalcedEffect, crit: CalcedEffect | undefined): SpellHit {
  return {
    effect,
    crit,
    heal: effect.kind === 'steal' ? half(effect.calcMin, effect.calcMax) : null,
    critHeal: effect.kind === 'steal' && crit ? half(crit.calcMin, crit.calcMax) : null,
  }
}

/**
 * Everything a spell card shows at a grade, for a build's stats (null: base
 * values only), its equipped item spell modifiers and the character level.
 */
export function spellView({ spell, grade, stats, itemEffects, characterLevel }: {
  spell: AppSpell
  grade: number
  stats: StatBlock | null
  itemEffects: AppEffect[]
  characterLevel: number
}): SpellView {
  const baseLevel = spell.levels.find(l => l.grade === grade) ?? spell.levels.at(-1)
  const lvl = baseLevel ? applyItemSpellModifiers(baseLevel, getItemSpellModifiers(itemEffects, spell.id)) : undefined
  const matchingItemEffects = itemEffects.filter(effect => effect.min === spell.id && effect.formatted)
  const isMixed = spell.element === 'mixed'
  const mods = stats && lvl ? spellMods(stats, lvl.minRange, lvl.maxRange) : NO_MODS

  // Self-charge buffs: spell_buff pointing to this spell itself (charge mechanic)
  const selfChargeBuffs = lvl
    ? lvl.effects
      .filter(e => e.kind === 'spell_buff' && e.spellId === spell.id)
      .sort((a, b) => (a.stack ?? 0) - (b.stack ?? 0))
    : []

  let displayEffects: CalcedEffect[] = []
  if (lvl) {
    const raw = selfChargeBuffs.length > 0
      ? lvl.effects.filter(e => !(e.kind === 'spell_buff' && e.spellId === spell.id))
      : lvl.effects
    const effects = dedupEffects(raw)
    displayEffects = stats && effects.length > 0 ? calcEffects(effects, stats, mods) : asCalced(effects)
  }

  let critDisplayEffects: CalcedEffect[] = []
  if (lvl?.critEffects && lvl.critEffects.length > 0) {
    const effects = dedupEffects(lvl.critEffects)
    critDisplayEffects = stats ? calcEffects(effects, stats, mods, stats.critDamage) : asCalced(effects)
  }

  // Charge damage sets: one entry per charge level with pre-computed calced+crit effects
  const chargeSets: { label: number; calced: CalcedEffect[]; calcedCrit: CalcedEffect[] }[] = []
  if (lvl && selfChargeBuffs.length > 0) {
    const applyBonus = (effects: AppSpellEffect[], bonus: number): AppSpellEffect[] =>
      effects.map(e => {
        if (e.kind !== 'damage' && e.kind !== 'steal' && e.kind !== 'poison') return e
        return { ...e, min: e.min + bonus, max: (e.max > 0 ? e.max : e.min) + bonus }
      })
    const calcSet = (bonus: number) => {
      const baseFx     = lvl.effects.filter(e => !(e.kind === 'spell_buff' && e.spellId === spell.id))
      const chargedFx  = applyBonus(baseFx, bonus)
      const chargedCFx = applyBonus(lvl.critEffects ?? [], bonus)
      const calced     = stats ? calcEffects(chargedFx, stats, mods) : asCalced(chargedFx)
      // Same crit flat bonus (stats.critDamage) as the base (uncharged) crit row —
      // missing this made every charge level's crit LOWER than the base crit hit.
      const calcedCrit = stats ? calcEffects(chargedCFx, stats, mods, stats.critDamage) : asCalced(chargedCFx)
      return { calced, calcedCrit }
    }
    if (selfChargeBuffs.some(b => (b.stack ?? 0) >= 1)) {
      // Explicit stack levels (e.g., Punitive Arrow: stack=1, stack=2)
      const explicitBuffs = selfChargeBuffs.filter(b => (b.stack ?? 0) >= 1)
      // When all buffs share the same min, it's a per-stack bonus (e.g. Expiation Arrow:
      // API stores "36 per 2-stack unit" → at stack=4 the actual bonus is 36×2=72).
      const allSameMin = explicitBuffs.every(b => b.min === explicitBuffs[0].min)
      const baseStack  = allSameMin ? Math.min(...explicitBuffs.map(b => b.stack ?? 1)) : 1
      explicitBuffs.forEach((buff, i) => chargeSets.push({
        label: i + 1,
        ...calcSet(allSameMin ? buff.min * ((buff.stack ?? 1) / baseStack) : buff.min),
      }))
    } else {
      // Cumulative per-cast (stack=0, e.g., Frozen Arrow): show up to min(turns, 3) rows
      const buff = selfChargeBuffs[0]
      const maxN = buff.turns && buff.turns > 0 ? Math.min(buff.turns, 3) : 3
      for (let i = 0; i < maxN; i++) chargeSets.push({ label: i + 1, ...calcSet(buff.min * (i + 1)) })
    }
  }

  // Every distinct condition present (shield, a target-HP threshold, a named combat state),
  // each its own labeled group below the base (no-condition) one.
  const byKey = new Map<string, AppSpellCondition>()
  for (const e of displayEffects) if (e.condition) byKey.set(conditionKey(e.condition), e.condition)
  const conditions = [...byKey.values()]

  // Crit effects in same order as normal: map display-index → crit effect by damage-slot index
  const critDmgEffects = critDisplayEffects.filter(isDmgOrSteal)
  const critByDisplayIdx = new Map<number, CalcedEffect>()
  let dmgIdx = 0
  displayEffects.forEach((e, i) => {
    if (isDmgOrSteal(e)) {
      if (dmgIdx < critDmgEffects.length) critByDisplayIdx.set(i, critDmgEffects[dmgIdx])
      dmgIdx++
    }
  })

  // Push collision damage: floor(level/6 + pushbackDamage×0.25) per cell
  // floor(200/6)=33 at lv200; observed in-game: 99 for 3 cells = 33/cell ✓
  const pushDmgPerCell = stats
    ? Math.floor(characterLevel / 6 + stats.pushbackDamage * 0.25)
    : Math.floor(characterLevel / 6)
  const pushTotalDmg = displayEffects.filter(e => e.kind === 'push').reduce((s, e) => s + e.calcMin, 0) * pushDmgPerCell
  const hasPush = displayEffects.some(e => e.kind === 'push')

  function group(condition: AppSpellCondition | undefined): SpellGroup {
    const inThisGroup = (e: { condition?: AppSpellCondition }) => sameCondition(e.condition, condition)
    const groupDmgEffects = displayEffects.filter(e => isDmgOrSteal(e) && inThisGroup(e))
    const critGroup = displayEffects.flatMap((e, i) => (!inThisGroup(e) || !isDmgOrSteal(e) ? [] : [critByDisplayIdx.get(i)]))
    const showCritColumn = critGroup.some(c => c != null) && critDmgEffects.length > 0
    const isBaseGroup = condition === undefined
    // Descarga detection must come before Σ totals so we can exclude the steal (charge) phase
    const groupEffectsInOrder = displayEffects.filter(e => inThisGroup(e) && isDmgOrSteal(e))
    const hasDescarga = isBaseGroup && hasDescargaPattern(groupEffectsInOrder)
    // Descarga spells: Σ only sums the discharge (damage-kind) phase — the steal phase is
    // charging, not additive. Poison is a per-turn tick, never an instant hit, so it is
    // never folded into the instant Σ either.
    const inSigma        = (e: { kind: string }) => e.kind !== 'poison' && (!hasDescarga || e.kind === 'damage')
    const sigmaEffects   = groupDmgEffects.filter(inSigma)
    const sigmaCritGroup = critGroup.filter((_, i) => inSigma(groupDmgEffects[i] ?? { kind: '' }))
    const normal: Range  = [sigmaEffects.reduce((s, e) => s + e.calcMin, 0), sigmaEffects.reduce((s, e) => s + e.calcMax, 0)]
    const crit: Range    = [sigmaCritGroup.reduce((s, c) => s + (c?.calcMin ?? 0), 0), sigmaCritGroup.reduce((s, c) => s + (c?.calcMax ?? 0), 0)]
    const steals         = groupDmgEffects.filter(e => e.kind === 'steal')
    const hasStealGroup  = !hasDescarga && steals.length > 0
    const heal = {
      normal: [steals.reduce((s, e) => s + Math.floor(e.calcMin / 2), 0), steals.reduce((s, e) => s + Math.floor(e.calcMax / 2), 0)] as Range,
      crit: [
        critGroup.reduce((s, c) => s + (c?.kind === 'steal' ? Math.floor(c.calcMin / 2) : 0), 0),
        critGroup.reduce((s, c) => s + (c?.kind === 'steal' ? Math.floor(c.calcMax / 2) : 0), 0),
      ] as Range,
    }
    // Two+ distinct values of the same kind in the sum (a charge tier, a dice/card draw) are
    // mutually exclusive outcomes, not simultaneous hits — never add them into one total.
    const hasTiers       = hasTieredOutcomes(sigmaEffects)
    const showTotal      = isBaseGroup && !hasDescarga && !isMixed && !hasTiers && sigmaEffects.length >= 2
    const showPushTotal  = isBaseGroup && !hasDescarga && !isMixed && hasPush && stats != null

    const entries: SpellEntry[] = []
    let descargaShown = false
    const hasNonPoison = groupEffectsInOrder.some(e => e.kind !== 'poison')
    let poisonLabelShown = false
    displayEffects.forEach((e, index) => {
      if (!inThisGroup(e)) return
      // Descarga separator before the first damage effect of charge+discharge spells
      if (hasDescarga && !descargaShown && e.kind === 'damage') {
        descargaShown = true
        entries.push({ kind: 'section', section: 'discharge' })
      }
      switch (e.kind) {
        case 'push':
          entries.push({ kind: 'push', index, cells: e.calcMin, collision: stats ? pushDmgPerCell * e.calcMin : null })
          return
        case 'ap':
        case 'mp':
        case 'ap_gain':
        case 'mp_gain':
          entries.push({ kind: e.kind, index, effect: e })
          return
        case 'erosion':
          entries.push({ kind: 'erosion', index, pct: e.calcMin, turns: e.turns ?? 0 })
          return
        case 'heal_mod':
          entries.push({ kind: 'heal_mod', index, pct: e.calcMin })
          return
        case 'spell_buff':
          entries.push({ kind: 'spell_buff', index, spellId: e.spellId, base: e.calcMin, turns: e.turns ?? 0, deathReset: Boolean(e.deathReset) })
          return
      }
      // Poison label before the first poison when there are also instant hits
      if (hasNonPoison && !poisonLabelShown && e.kind === 'poison') {
        poisonLabelShown = true
        entries.push({ kind: 'section', section: 'poison', turns: e.turns ?? 1 })
      }
      entries.push({ kind: 'hit', index, ...hitOf(e, critByDisplayIdx.get(index)) })
    })

    return {
      condition,
      hasDamage: groupDmgEffects.length > 0,
      showCritColumn,
      entries,
      charges: isBaseGroup
        ? chargeSets.map(({ label, calced, calcedCrit }) => {
          const crits = calcedCrit.filter(isDmgOrSteal)
          return { label, hits: calced.filter(isDmgOrSteal).map((e, i) => hitOf(e, crits[i])) }
        })
        : [],
      total: showTotal ? { normal, crit, heal: hasStealGroup ? heal : null } : null,
      pushTotal: showPushTotal
        ? { normal: [normal[0] + pushTotalDmg, normal[1] + pushTotalDmg], crit: [crit[0] + pushTotalDmg, crit[1] + pushTotalDmg] }
        : null,
    }
  }

  // Effective range: apply stats.range bonus to non-melee spells
  const effectiveMaxRange = lvl && lvl.maxRange > 0 && lvl.rangeModifiable !== false && stats?.range
    ? lvl.maxRange + stats.range
    : (lvl?.maxRange ?? 0)

  return {
    level: lvl,
    mods,
    calculated: Boolean(stats),
    ap: lvl?.ap ?? 0,
    range: !lvl || lvl.maxRange === 0 ? { melee: true } : { melee: false, min: lvl.minRange, max: effectiveMaxRange },
    crit: lvl && lvl.critChance > 0 ? lvl.critChance + (stats?.critChance ?? 0) : 0,
    maxPerTurn: lvl?.maxPerTurn ?? 0,
    groups: displayEffects.length > 0 ? [group(undefined), ...conditions.map(group)] : [],
    support: displayEffects.length === 0,
    buffs: (lvl?.buffs ?? []).map(text => {
      const negative = text.startsWith('-')
      const positive = !negative && (text.startsWith('+') || /^\d/.test(text))
      return { text, icon: spellBuffIcon(text), tone: negative ? 'negative' : positive ? 'positive' : 'neutral' }
    }),
    itemEffects: matchingItemEffects,
    description: spell.description,
  }
}

export type WeaponRowView = ReturnType<typeof weaponDamageRows>[number] & { heal: Range | null; critHeal: Range | null }

export type WeaponView = {
  ap: number
  range: { melee: true } | { melee: false; min: number; max: number }
  /** Base critical plus the build's, capped at 100; 0 when the weapon cannot crit. */
  crit: number
  critBonus: number
  level: number
  /** The transform is shown only on weapons that have a neutral line to convert. */
  transform: WeaponTransform | null
  /** Critical column: the weapon can crit and damage is computed from the build. */
  hasCrit: boolean
  normalMods: DamageMods
  critMods: DamageMods
  damage: WeaponRowView[]
  steal: WeaponRowView[]
  /** MP removed on hit (effect_id 238): a flat value, not elemental damage. */
  mpRemoval: Range[]
  total: { normal: Range; crit: Range; heal: { normal: Range; crit: Range } | null } | null
}

/**
 * The weapon attack for a build's stats. Weapon Mastery adds power to this
 * weapon's hits (its own value on normal and on critical hits), not a % multiplier.
 */
export function weaponView({ weapon, stats, transform, mastery }: {
  weapon: AppItem
  stats: StatBlock | null
  transform: WeaponTransform | null
  mastery: { active: boolean; normal: number; crit: number }
}): WeaponView {
  const minR = weapon.min_range ?? 0
  const maxR = weapon.max_range ?? 0
  const crit = weapon.crit_chance ?? 0
  const critBonus = weapon.crit_bonus ?? 0
  const attackEffects = weaponAttackEffects(weapon, transform)
  const baseMods   = stats ? weaponMods(stats, minR, maxR) : NO_MODS
  const normalMods = { ...baseMods, power: mastery.active ? mastery.normal : 0 }
  const critMods   = { ...baseMods, power: mastery.active ? mastery.crit : 0 }
  // AP cost (179), heals (261) and "Steals MP" (233) never become damage rows.
  const rows = weaponDamageRows(attackEffects, stats, critBonus, normalMods, critMods).map(r => ({
    ...r,
    heal: r.steal ? half(r.low, r.high) : null,
    critHeal: r.steal ? half(r.critLow, r.critHigh) : null,
  }))
  const steal = rows.filter(r => r.steal)
  const hasNeutral = weapon.effects.some(e => WEAPON_ATTACK_STAT[e.stat] === 'neutral')
  return {
    ap: weapon.ap_cost ?? 0,
    range: maxR === 0 ? { melee: true } : { melee: false, min: minR, max: maxR },
    crit: crit > 0 ? Math.min(100, crit + (stats?.critChance ?? 0)) : 0,
    critBonus,
    level: weapon.level ?? 0,
    transform: transform && hasNeutral ? transform : null,
    hasCrit: crit > 0 && stats != null,
    normalMods,
    critMods,
    damage: rows.filter(r => !r.steal),
    steal,
    mpRemoval: attackEffects.filter(e => e.stat === 'MP').map(e => [e.min, e.max !== 0 ? e.max : e.min] as Range),
    total: rows.length >= 2
      ? {
        normal: [rows.reduce((s, e) => s + e.low, 0), rows.reduce((s, e) => s + e.high, 0)],
        crit: [rows.reduce((s, e) => s + e.critLow, 0), rows.reduce((s, e) => s + e.critHigh, 0)],
        heal: steal.length > 0
          ? {
            normal: [steal.reduce((s, e) => s + Math.floor(e.low / 2), 0), steal.reduce((s, e) => s + Math.floor(e.high / 2), 0)],
            crit: [steal.reduce((s, e) => s + Math.floor(e.critLow / 2), 0), steal.reduce((s, e) => s + Math.floor(e.critHigh / 2), 0)],
          }
          : null,
      }
      : null,
  }
}
