import { LINEAGES, ULTIMATES, type BellaphoneRules, type BetaEffect } from '../../tools/beta/bellaphone.ts'
import type { AppSpell } from '../fetch-spells.ts'
import type { PassiveBonus } from '../../src/engine/passives.ts'

type Raw = Record<string, unknown>
const array = (value: unknown): Raw[] => (value as { Array?: Raw[] })?.Array ?? []

export function bellaphoneRules(
  gameVersion: string, spells: Map<number, Raw>, levels: Map<number, Raw>, states: Map<number, Raw>,
  entries: Record<string, string>, ultimates: AppSpell[], labels: (effect: Raw) => string | null,
): BellaphoneRules {
  const bySpell = new Map<number, Raw[]>()
  for (const level of levels.values()) {
    const id = Number(level.spellId)
    if (!bySpell.has(id)) bySpell.set(id, [])
    bySpell.get(id)!.push(level)
  }
  const pack = (e: Raw): BetaEffect => ({ action: Number(e.actionId), element: Number(e.effectElement), min: Number(e.diceNum), max: Number(e.diceSide), value: Number(e.value), mask: String(e.targetMask ?? ''), trigger: String(e.triggers ?? ''), turns: Number(e.effectTriggerDuration ?? 0), delay: Number(e.delay ?? 0) })
  const rules: BellaphoneRules = { schema: 1, gameVersion, ultimates, levels: {}, auras: [], states: [] }
  // 33311 contains preview copies without radius criteria. Its 2160 trigger
  // references 33319, whose real effects retain the mutually exclusive masks.
  for (const [id] of spells) if ((id >= 33197 && id <= 33241) || (id >= 33308 && id <= 33339)) {
    rules.levels[id] = (bySpell.get(id === 33311 ? 33319 : id) ?? []).map(level => ({
      grade: Number(level.grade),
      effects: array(level.effects).map(pack),
      critEffects: array(level.criticalEffect).map(pack),
      handledBuffs: [...new Set(array(level.effects).filter(e => Number(e.actionId) === 2828).flatMap(e => labels(e) ?? []))],
    }))
  }
  const bonusFor = (effects: Raw[]): PassiveBonus => {
    const bonus: PassiveBonus = {}
    for (const e of effects) {
      if (e.targetMask !== 'c' || e.triggers !== 'I') continue
      const value = Number(e.diceNum)
      switch (Number(e.actionId)) {
        case 752: bonus.dodge = value; break
        case 138: bonus.power = value; break
        case 111: bonus.ap = value; break
        case 115: bonus.critChance = value; break
        case 1076:
          for (const key of ['earthResPercent', 'fireResPercent', 'waterResPercent', 'airResPercent', 'neutralResPercent'] as const) bonus[key] = value
          break
      }
    }
    return bonus
  }
  for (const [i, lineage] of LINEAGES.entries()) {
    const id = 33270 + i, spell = spells.get(id)
    if (!spell) throw new Error(`Missing beta aura spell ${id}`)
    const effects = array(bySpell.get(id)?.[0]?.effects)
    rules.auras.push({ lineage, name: entries[String(spell.nameId)] ?? String(id), description: entries[String(spell.descriptionId)] ?? '', bonus: bonusFor(effects), effects: [...new Set(effects.flatMap(e => labels(e) ?? []))] })
  }
  for (const id of [7, 7291, 7300]) {
    const state = states.get(id)
    rules.states.push({ id, name: state ? entries[String(state.nameId)] ?? `#${id}` : `#${id}` })
  }
  if (ultimates.length !== ULTIMATES.length) throw new Error('Incomplete beta lineage ultimates')
  return rules
}
