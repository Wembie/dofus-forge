import type { StatBlock } from './types.ts'

// Relative imports only: the share-link codec (and so the Worker) use this.

/**
 * Combat passives of Dofus, Prysmaradites and legendary items (their
 * `ability` text in the item data). Only what changes a stat is modelled;
 * shields, heals, states and effects on other fighters stay as the item's
 * text. The player says how much of each passive is active (a toggle, a
 * number of stacks, or one of several mutually exclusive cases) and the
 * bonus is added on top of the gear stats as a separate combat state.
 */

export type PassiveStat =
  | 'ap' | 'mp' | 'power' | 'damage' | 'critChance' | 'pushbackDamage' | 'dodge' | 'lock'
  | 'apReduction' | 'mpReduction' | 'apParry' | 'mpParry'
  | 'meleeDamagePercent' | 'rangedDamagePercent' | 'spellDamagePercent' | 'finalDamagePercent'
  | 'strength' | 'intelligence' | 'chance' | 'agility'
  | 'neutralResPercent' | 'earthResPercent' | 'fireResPercent' | 'waterResPercent' | 'airResPercent'

export type PassiveBonus = Partial<Record<PassiveStat, number>>

export type PassiveControl =
  /** 0…max stacks of the same bonus. */
  | { id: string; kind: 'stacks'; max: number; perStack: PassiveBonus }
  /** Off, or one of the options (a single option is a plain toggle; `turn` labels Prysmaradite turns). */
  | { id: string; kind: 'choice'; options: { bonus: PassiveBonus; turn?: number }[] }

const RES_KEYS = ['neutralResPercent', 'earthResPercent', 'fireResPercent', 'waterResPercent', 'airResPercent'] as const
const allRes = (n: number): PassiveBonus => Object.fromEntries(RES_KEYS.map(k => [k, n]))

type Spec =
  | { stacks: number; per: PassiveBonus }
  | { options: PassiveBonus[] }
  | { turns: PassiveBonus[] }

// When the item text gives no cap ("for each MP used", "for each enemy"),
// the max is a safe bound — 8 MP × 2 turns, 8 enemies × 2 checks — since
// the player picks the real count and a high max costs nothing.
// ankama_id → the stat-changing parts of its passive, in the order the
// item text lists them. Ids are `${ankamaId}.${index}`, so reordering an
// entry would remap saved builds: only append.
const SPECS: Record<number, Spec[]> = {
  // ── Dofus ──
  18043: [{ options: [{ mp: 1 }, { ap: 1 }] }],                                 // Abyssal: no adjacent enemy / adjacent enemy
  7112:  [{ options: [{ damage: 20 }] }],                                       // Black-Spotted: dealt damage this turn
  972:   [{ options: [{ apParry: 25 }, { mpParry: 25 }] }],                     // Cawwot: AP / MP reduction attempted
  8698:  [{ options: [{ finalDamagePercent: 20 }, { finalDamagePercent: -10 }] }], // Cloudy: odd / even turn
  694:   [{ stacks: 10, per: { finalDamagePercent: 1 } }],                      // Crimson: attacked
  31794: [{ stacks: 10, per: { finalDamagePercent: 1 } }],                      // Dofzzbz: summon attacked
  23237: [{ stacks: 4, per: { damage: 16 } }],                                  // Domakuro: turns without attacking (first 4)
  7114:  [{ stacks: 5, per: { rangedDamagePercent: 2 } }, { stacks: 5, per: { meleeDamagePercent: 2 } }], // Ebony
  26066: [{ options: [{ power: 100 }] }, { options: [{ finalDamagePercent: 10 }] }], // Nightmare: pushback / both effects
  7754:  [{ options: [{ ap: 1 }, { dodge: 20 }] }],                             // Ochre: not attacked / attacked
  20286: [{ options: [{ finalDamagePercent: 20 }] }],                           // Sparkling Silver: after dropping below 20%
  29136: [{ stacks: 16, per: { power: 8 } }],                                   // Sylvan: per MP used, lasts 2 turns
  739:   [{ stacks: 10, per: { finalDamagePercent: 1 } }],                      // Turquoise: critical hits
  6980:  [{ options: [{ finalDamagePercent: 10 }, { lock: 20 }] }],             // Vulbis: not attacked / attacked

  // ── Legendary gear ──
  22368: [{ stacks: 5, per: { mp: 1 } }],                                       // War's Halbaxe: enemies finished off
  20365: [{ options: [{ mp: 1, critChance: 10 }, { dodge: 40, pushbackDamage: 40 }] }], // Dodge's Audacity: moved / not moved
  20366: [{ stacks: 4, per: { spellDamagePercent: 1 } }],                       // Lady Jhessica's Courage: enemies hit
  32121: [{ stacks: 8, per: { mpReduction: 5 } }, { stacks: 8, per: { apReduction: 5 } }], // Meriana: Earth/Water, Fire/Air hits (8 shared)
  20363: [{ options: [{ mp: 2 }] }],                                            // Thousand-League Boots: odd turn
  20356: [{ options: [{ pushbackDamage: 10 }] }],                               // Buhorado Feather: after a critical hit
  958:   [{ options: [{ chance: 400 }, { strength: 400 }, { agility: 400 }, { intelligence: 400 }] }], // Dofusteuse: rotation
  20362: RES_KEYS.map(k => ({ stacks: 5, per: { [k]: 4 } })),                   // Jahash Jurgen: per element hit (5 shared)
  20361: [{ stacks: 11, per: { rangedDamagePercent: -1 } }],                    // Rykke Errel: cells from a ranged attacker
  20354: [{ stacks: 8, per: { lock: 10 } }],                                    // Scissors of Destiny: enemies hit
  20359: [{ stacks: 5, per: { finalDamagePercent: 2 } }],                       // Bram Worldbeard: AP/MP removals
  20360: [{ options: [{ ap: 2 }, { ap: -1, mp: -1 }] }],                        // Ganymede: even / odd turn
  32114: [{ stacks: 4, per: { finalDamagePercent: 1 } }],                       // Oto Mustam: enemies alive
  32116: [{ stacks: 16, per: { pushbackDamage: 6 } }],                          // Menalt: per MP used, lasts 2 turns
  32163: [{ stacks: 4, per: allRes(1) }],                                       // Amayiro: enemies alive
  32117: [{ options: [{ finalDamagePercent: 10 }] }],                           // Thanatena: after finishing off an enemy
  20358: [{ options: [{ finalDamagePercent: 7 }] }],                            // Death-Defying: above 50% health
  22444: [{ stacks: 4, per: allRes(2) }],                                       // Misery's Flail-Scale: reductions attempted
  20355: [{ stacks: 2, per: { ap: 1 } }],                                       // Brumaire's Shiver: enemies finished off
  32119: [{ options: [{ ap: 1 }] }],                                            // Henual: teleported / switched places

  // ── Prysmaradites ──
  22001: [{ turns: [{ critChance: 100 }, { critChance: 35 }, { critChance: 15 }] }],                         // Surpryz
  22015: [{ turns: [{ apParry: 200, mpParry: 200 }, { apParry: 100, mpParry: 100 }, { apParry: 50, mpParry: 50 }] }], // Prysical
  22014: [{ turns: [{ apReduction: 100, mpReduction: 100 }, { apReduction: 50, mpReduction: 50 }, { apReduction: 25, mpReduction: 25 }] }], // Spryritual
  22004: [{ turns: [{ ...allRes(-10), finalDamagePercent: 10 }, { ...allRes(3), finalDamagePercent: 3 }, { ...allRes(10), finalDamagePercent: -10 }] }], // Prynyang
  22013: [{ turns: [{ ap: 4, mp: -4 }] }],                                      // Iridescent Prysipitate
  21998: [{ options: [{ ap: 3, finalDamagePercent: -50 }] }],                   // Iridescent Pryssure
  22011: [{ turns: [{ ap: 2 }] }],                                              // Prysipitate-O-Mat
  21996: [{ options: [{ ap: 1, finalDamagePercent: -10 }] }],                   // Pryssure-O-Mat
  22012: [{ turns: [{ ap: 3, mp: -2 }] }],                                      // Shiny Prysipitate
  21997: [{ options: [{ ap: 2, finalDamagePercent: -35 }] }],                   // Shiny Pryssure
  22007: [{ stacks: 3, per: { mp: 1 } }],                                       // Prycapture: enemies more than 9 cells away
  22023: [{ stacks: 16, per: { meleeDamagePercent: 2 } }],                      // Pryximity: enemies within 3 cells, start + end of turn
}

/**
 * Real passives with no stat to add (shields, heals, states, effects on
 * other fighters): shown as their item text only. Titles and sidekick
 * signals are not passives and are left out.
 */
export const TEXT_ONLY_PASSIVES: ReadonlySet<number> = new Set([
  20987, 17078, 23408, 737, 7115, 19398, 19629, 16061,                          // Dofus
  32118, 22429, 20364, 22412, 20353, 32115, 20357,                              // legendary gear
  22021, 22018, 22019, 22025, 21453, 22010, 22024, 22022, 22020, 21995, 21451, 21452, 32164, // Prysmaradites
])

/** Item has a combat passive (with or without stats to model). */
export const hasPassive = (ankamaId: number) => ITEM_PASSIVES.has(ankamaId) || TEXT_ONLY_PASSIVES.has(ankamaId)

function toControls(ankamaId: number, specs: Spec[]): PassiveControl[] {
  return specs.map((spec, i) => {
    const id = `${ankamaId}.${i}`
    if ('stacks' in spec) return { id, kind: 'stacks', max: spec.stacks, perStack: spec.per }
    if ('turns' in spec) return { id, kind: 'choice', options: spec.turns.map((bonus, t) => ({ bonus, turn: t + 1 })) }
    return { id, kind: 'choice', options: spec.options.map(bonus => ({ bonus })) }
  })
}

export const ITEM_PASSIVES: ReadonlyMap<number, PassiveControl[]> = new Map(
  Object.entries(SPECS).map(([id, specs]) => [Number(id), toControls(Number(id), specs)]),
)

const CONTROL_BY_ID = new Map([...ITEM_PASSIVES.values()].flat().map(c => [c.id, c]))

/** Highest value a control takes: its stacks, or its number of options. */
export const controlMax = (c: PassiveControl) => (c.kind === 'stacks' ? c.max : c.options.length)

/** Player's passive settings: control id → stacks, or option number (0 = off). */
export type PassiveState = Record<string, number>

/** Keeps known controls with in-range integer values (untrusted input: links, DB rows). */
export function sanitizePassiveState(raw: unknown): PassiveState {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).flatMap(([id, v]) => {
    const control = CONTROL_BY_ID.get(id)
    if (!control || typeof v !== 'number' || !Number.isFinite(v)) return []
    const n = Math.min(controlMax(control), Math.max(0, Math.trunc(v)))
    return n > 0 ? [[id, n] as const] : []
  }))
}

function addBonus(into: PassiveBonus, bonus: PassiveBonus, times = 1) {
  for (const [k, v] of Object.entries(bonus) as [PassiveStat, number][]) {
    into[k] = (into[k] ?? 0) + v * times
  }
}

/** Value one control adds at the given setting. */
export function controlBonus(control: PassiveControl, value: number): PassiveBonus {
  const out: PassiveBonus = {}
  if (value <= 0) return out
  if (control.kind === 'stacks') addBonus(out, control.perStack, Math.min(value, control.max))
  else if (control.options[value - 1]) addBonus(out, control.options[value - 1].bonus)
  return out
}

/** Total bonus of the passives of the equipped items (unequipped items count nothing). */
export function passiveBonus(equippedIds: Iterable<number | null | undefined>, state: PassiveState): PassiveBonus {
  const out: PassiveBonus = {}
  const seen = new Set<number>()
  for (const id of equippedIds) {
    if (id == null || seen.has(id)) continue
    seen.add(id)
    for (const control of ITEM_PASSIVES.get(id) ?? []) addBonus(out, controlBonus(control, state[control.id] ?? 0))
  }
  for (const k of Object.keys(out) as PassiveStat[]) if (out[k] === 0) delete out[k]
  return out
}

const ELEMENT_DAMAGE = ['neutralDamage', 'earthDamage', 'fireDamage', 'waterDamage', 'airDamage'] as const
const RES_CAP = 50

/**
 * Gear stats plus a passive bonus: the in-combat stats used for damage and
 * the PvP arena. Generic Damage also goes into every element (as in
 * computeStats); % resistances keep the 50% cap. AP/MP/Range are combat
 * buffs, so the gear caps do not apply to them.
 */
export function withPassives(stats: StatBlock, bonus: PassiveBonus): StatBlock {
  if (Object.keys(bonus).length === 0) return stats
  const next: StatBlock = { ...stats }
  const rec = next as unknown as Record<string, number>
  for (const [k, v] of Object.entries(bonus) as [PassiveStat, number][]) rec[k] = (rec[k] ?? 0) + v
  if (bonus.damage) for (const k of ELEMENT_DAMAGE) next[k] += bonus.damage
  for (const k of RES_KEYS) {
    if (bonus[k]) {
      const raw = `${k}Raw` as keyof StatBlock
      ;(next as unknown as Record<string, number>)[raw] = (stats[raw] as number) + bonus[k]!
      next[k] = Math.min(RES_CAP, (stats[raw] as number) + bonus[k]!)
    }
  }
  return next
}
