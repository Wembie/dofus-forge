/**
 * Worn items empty some of the head's optional slots (hair under a hat, ears
 * under a hood…). Each item skin carries rules, from the most general to the
 * most specific; the most specific one that applies replaces the others.
 */

/** Optional slot names by rule slot id; a part is `<name><facing file>`. */
export const OPTIONAL_SLOTS = [
  'Bandeau_', 'BandeauB_', 'Barbe_', 'Chapeau_', 'ChapeauB_', 'cheveux_', 'Frange_', 'Custo_',
  'Oreille_d_', 'Oreille_g_', 'Oreille_', 'Oreille_b_', 'Masque_', 'MasqueB_', 'NatteHaute_', 'Natte_',
  'NatteB_', 'Natte_Basse_', 'Patte_d_', 'Patte_g_', 'Patte_', 'Tete_OL_',
]

/** Rule kinds: 0 default, 1 breed, 2 breed and sex, 3 one head skin. */
const BREED = 1
const BREED_AND_SEX = 2
const HEAD = 3

/** [kind, info, [slot id, facing mask][]] — info: breed, breed·2+sex, or head skin id */
export type SlotRule = [number, number, [number, number][]]

/** Facing files that have their own drawings, in mask bit order (bit 0 unused). */
const FILES = [0, 1, 2, 5, 6]

export interface Wearer {
  breed: number
  female: boolean
  head: number
}

export function pickRule(rules: SlotRule[], who: Wearer): SlotRule | undefined {
  const rank = ([kind, info]: SlotRule) => {
    if (kind === HEAD) return info === who.head ? 3 : -1
    if (kind === BREED_AND_SEX) return info === who.breed * 2 + (who.female ? 1 : 0) ? 2 : -1
    if (kind === BREED) return info === who.breed ? 1 : -1
    return 0
  }
  let best: SlotRule | undefined
  let bestRank = -1
  for (const rule of rules) {
    const r = rank(rule)
    if (r > bestRank) {
      best = rule
      bestRank = r
    }
  }
  return best
}

/** Part names the worn skins hide on this wearer, for one facing file. */
export function hiddenParts(worn: (SlotRule[] | undefined)[], who: Wearer, file: number): Set<string> {
  const bit = 1 << (1 + FILES.indexOf(file))
  const hidden = new Set<string>()
  for (const rules of worn) {
    const rule = rules && pickRule(rules, who)
    if (!rule) continue
    for (const [slot, mask] of rule[2]) {
      const name = OPTIONAL_SLOTS[slot]
      if (name && mask & bit) hidden.add(name + file)
    }
  }
  return hidden
}
