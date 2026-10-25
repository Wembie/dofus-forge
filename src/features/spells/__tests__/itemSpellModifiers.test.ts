import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { AppItem } from '@/data/loaders.ts'
import type { AppSpell, AppSpellLevel } from '@/data/spellLoaders.ts'
import { SPELL_ITEM_EFFECT_IDS } from '@/data/effectIds.ts'
import { applyItemSpellModifiers, getItemSpellModifiers } from '../itemSpellModifiers.ts'

const equipment = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/en/equipment.json'), 'utf8'),
) as AppItem[]
describe('item spell modifiers', () => {
  it('applies the Prince of Thieves Hat effects to the matching Cra spells', () => {
    const hat = equipment.find(item => item.ankama_id === 8636)!
    const level: AppSpellLevel = {
      grade: 1,
      ap: 4,
      minRange: 1,
      maxRange: 6,
      maxPerTurn: 2,
      critChance: 10,
      effects: [{ element: 'earth', min: 20, max: 24, kind: 'damage' }],
    }

    const adjusted = applyItemSpellModifiers(level, getItemSpellModifiers(hat.effects, 32439))

    expect(adjusted.effects[0]).toMatchObject({ min: 26, max: 30 })
    expect(applyItemSpellModifiers(level, getItemSpellModifiers(hat.effects, 32433))).toMatchObject({ ap: 3 })
    expect(applyItemSpellModifiers(level, getItemSpellModifiers(hat.effects, 32448))).toMatchObject({ maxRange: 9 })
    expect(applyItemSpellModifiers(level, getItemSpellModifiers(hat.effects, 99999))).toBe(level)
  })

  it('supports range, critical, AP, minimum range and cast modifiers across effect types', () => {
    const effects = [
      { stat: ': modifiable Range', min: 900, max: 0, effect_id: 204 },
      { stat: ': - AP', min: 900, max: 0, effect_id: 207, formatted: 'Spell: -1 AP' },
      { stat: ': + Maximum Range', min: 900, max: 0, effect_id: 208, formatted: 'Spell: +3 Maximum Range' },
      { stat: ': +% Critical', min: 900, max: 0, effect_id: 226, formatted: 'Spell: +35% Critical' },
      { stat: ': - Minimum Range', min: 900, max: 0, effect_id: 274, formatted: 'Spell: -2 Minimum Range' },
      { stat: ': + cast per turn', min: 900, max: 0, effect_id: 276, formatted: 'Spell: +1 casts per turn' },
    ]
    const level: AppSpellLevel = {
      grade: 1,
      ap: 4,
      minRange: 2,
      maxRange: 6,
      maxPerTurn: 2,
      critChance: 10,
      rangeModifiable: false,
      effects: [{ element: 'fire', min: 10, max: 12, kind: 'damage' }],
    }

    expect(applyItemSpellModifiers(level, getItemSpellModifiers(effects, 900))).toMatchObject({
      ap: 3,
      minRange: 0,
      maxRange: 9,
      maxPerTurn: 3,
      critChance: 45,
      rangeModifiable: true,
    })
  })

  it('keeps fixed damage values represented by a zero max after applying the bonus', () => {
    const level: AppSpellLevel = {
      grade: 1,
      ap: 3,
      minRange: 1,
      maxRange: 4,
      maxPerTurn: 1,
      critChance: 0,
      effects: [{ element: 'neutral', min: 5, max: 0, kind: 'damage' }],
    }
    const modifiers = getItemSpellModifiers([
      { stat: ': + base damage', min: 42, max: 0, effect_id: 243, formatted: 'Spell: +6 base damage' },
    ], 42)

    expect(applyItemSpellModifiers(level, modifiers).effects[0]).toMatchObject({ min: 11, max: 0 })
  })

  it('matches special item effects to spell IDs for every class catalog', () => {
    const targetSpellIds = new Set(
      equipment.flatMap(item => item.effects
        .filter(effect => SPELL_ITEM_EFFECT_IDS.has(effect.effect_id ?? -1) && effect.min > 0)
        .map(effect => effect.min)),
    )
    const classesBySpell = new Map<number, string[]>()
    const spellFiles = readdirSync(resolve(process.cwd(), 'public/data/en/spells')).filter(file => file.endsWith('.json'))

    for (const file of spellFiles) {
      const { classSlug, spells } = JSON.parse(
        readFileSync(resolve(process.cwd(), 'public/data/en/spells', file), 'utf8'),
      ) as { classSlug: string; spells: AppSpell[] }
      for (const spell of spells) {
        const classes = classesBySpell.get(spell.id) ?? []
        classes.push(classSlug)
        classesBySpell.set(spell.id, classes)
      }
    }

    const matchedClasses = new Set<string>()
    for (const spellId of targetSpellIds) {
      const classes = classesBySpell.get(spellId) ?? []
      expect(classes, `spell ID ${spellId}`).toHaveLength(1)
      matchedClasses.add(classes[0])
    }

    expect(matchedClasses.size).toBe(19)
  })
})
