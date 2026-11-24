import type { PassiveBonus, PassiveControl } from './passives.ts'
import { controlBonus, controlMax } from './passives.ts'

// Relative imports only: the share-link codec (and so the Worker) use this.

/**
 * A pet or mount reaches "Légendaire" status (level 100 + a Reflet de
 * Bébémoth), then a Quintessence feeds it a Croquette Infusée that rolls
 * one of its pool's bonuses at random — the player can't choose which,
 * and it doesn't depend on which pet/mount species carries it. This picker
 * just lets the player say which one their own companion landed on.
 *
 * Numbers aren't in any fetched game data (dofusdu.de doesn't expose this
 * system), so this list (33 bonuses, four pools) is hand-kept from the game
 * itself. Half the pool
 * buffs allies, heals or shields instead of the bearer's own stats — those
 * have no `control` and show as text only, same as TEXT_ONLY_PASSIVES.
 */
export type LegendaryPool = 'bakushana' | 'poukachi' | 'kwakarticho' | 'magicrabe'
export const LEGENDARY_POOLS: LegendaryPool[] = ['bakushana', 'poukachi', 'kwakarticho', 'magicrabe']

export type LegendaryBonus = {
  id:   string
  pool: LegendaryPool
  nameKey: string
  textKey: string
  /** Present when (part of) the effect adds to the bearer's own modeled stats. */
  control?: PassiveControl
}

export const LEGENDARY_BONUSES: LegendaryBonus[] = [
  // ── Bakushana (1/8 each) ──
  { id: 'bakushana.prespic',  pool: 'bakushana', nameKey: 'petleg_prespic_name',  textKey: 'petleg_prespic_text' },
  { id: 'bakushana.dragoeuf', pool: 'bakushana', nameKey: 'petleg_dragoeuf_name', textKey: 'petleg_dragoeuf_text' },
  { id: 'bakushana.tofoune',  pool: 'bakushana', nameKey: 'petleg_tofoune_name',  textKey: 'petleg_tofoune_text' },
  { id: 'bakushana.boursoin', pool: 'bakushana', nameKey: 'petleg_boursoin_name', textKey: 'petleg_boursoin_text' },
  { id: 'bakushana.champa',   pool: 'bakushana', nameKey: 'petleg_champa_name',   textKey: 'petleg_champa_text' },
  { id: 'bakushana.noeul',    pool: 'bakushana', nameKey: 'petleg_noeul_name',    textKey: 'petleg_noeul_text',
    control: { id: 'bakushana.noeul', kind: 'choice', options: [{ bonus: { range: 3 } }] } },
  { id: 'bakushana.pandore',  pool: 'bakushana', nameKey: 'petleg_pandore_name',  textKey: 'petleg_pandore_text' },
  { id: 'bakushana.scorbute', pool: 'bakushana', nameKey: 'petleg_scorbute_name', textKey: 'petleg_scorbute_text' },

  // ── Poukachi (1/6 each) ──
  { id: 'poukachi.mulou',   pool: 'poukachi', nameKey: 'petleg_mulou_name',   textKey: 'petleg_mulou_text',
    control: { id: 'poukachi.mulou', kind: 'stacks', max: 2, perStack: { finalDamagePercent: 5 } } },
  { id: 'poukachi.moskito', pool: 'poukachi', nameKey: 'petleg_moskito_name', textKey: 'petleg_moskito_text' },
  { id: 'poukachi.trool',   pool: 'poukachi', nameKey: 'petleg_trool_name',   textKey: 'petleg_trool_text' },
  { id: 'poukachi.kanig',   pool: 'poukachi', nameKey: 'petleg_kanig_name',   textKey: 'petleg_kanig_text',
    control: { id: 'poukachi.kanig', kind: 'stacks', max: 2, perStack: { finalDamagePercent: 4 } } },
  { id: 'poukachi.bwork',   pool: 'poukachi', nameKey: 'petleg_bwork_name',   textKey: 'petleg_bwork_text',
    control: { id: 'poukachi.bwork', kind: 'choice', options: [{ bonus: { rangedDamagePercent: 3 } }, { bonus: { meleeDamagePercent: 3 } }] } },
  { id: 'poukachi.wabbit',  pool: 'poukachi', nameKey: 'petleg_wabbit_name',  textKey: 'petleg_wabbit_text' },

  // ── Kwakarticho (1/9 each) ──
  { id: 'kwakarticho.truche',    pool: 'kwakarticho', nameKey: 'petleg_truche_name',    textKey: 'petleg_truche_text',
    control: { id: 'kwakarticho.truche', kind: 'choice', options: [{ bonus: { lock: 7 } }, { bonus: { dodge: 7 } }] } },
  { id: 'kwakarticho.leolhyene', pool: 'kwakarticho', nameKey: 'petleg_leolhyene_name', textKey: 'petleg_leolhyene_text',
    control: { id: 'kwakarticho.leolhyene', kind: 'choice', options: [{ bonus: { ap: 1 } }] } },
  { id: 'kwakarticho.thomondor', pool: 'kwakarticho', nameKey: 'petleg_thomondor_name', textKey: 'petleg_thomondor_text',
    control: { id: 'kwakarticho.thomondor', kind: 'choice', options: [{ bonus: { mp: 2 } }] } },
  { id: 'kwakarticho.arakne',    pool: 'kwakarticho', nameKey: 'petleg_arakne_name',    textKey: 'petleg_arakne_text',
    control: { id: 'kwakarticho.arakne', kind: 'stacks', max: 4, perStack: { lock: 7 } } },
  { id: 'kwakarticho.koalak',    pool: 'kwakarticho', nameKey: 'petleg_koalak_name',    textKey: 'petleg_koalak_text',
    control: { id: 'kwakarticho.koalak', kind: 'choice', options: [{ bonus: { ap: 1 } }] } },
  { id: 'kwakarticho.kitsou',    pool: 'kwakarticho', nameKey: 'petleg_kitsou_name',    textKey: 'petleg_kitsou_text',
    control: { id: 'kwakarticho.kitsou', kind: 'stacks', max: 4, perStack: { dodge: 7 } } },
  { id: 'kwakarticho.kozaru',    pool: 'kwakarticho', nameKey: 'petleg_kozaru_name',    textKey: 'petleg_kozaru_text',
    control: { id: 'kwakarticho.kozaru', kind: 'choice', options: [{ bonus: { lock: 7, dodge: 7 } }] } },
  { id: 'kwakarticho.piou',      pool: 'kwakarticho', nameKey: 'petleg_piou_name',      textKey: 'petleg_piou_text',
    control: { id: 'kwakarticho.piou', kind: 'choice', options: [{ bonus: { mp: 2 } }] } },
  { id: 'kwakarticho.bambouto',  pool: 'kwakarticho', nameKey: 'petleg_bambouto_name',  textKey: 'petleg_bambouto_text',
    control: { id: 'kwakarticho.bambouto', kind: 'choice', options: [{ bonus: { range: 3 } }] } },

  // ── Magicrabe (1/10 each) — shields, heals and ally transfers: flavor text only ──
  { id: 'magicrabe.abraknyde',   pool: 'magicrabe', nameKey: 'petleg_abraknyde_name',   textKey: 'petleg_abraknyde_text' },
  { id: 'magicrabe.craqueleur',  pool: 'magicrabe', nameKey: 'petleg_craqueleur_name',  textKey: 'petleg_craqueleur_text' },
  { id: 'magicrabe.krokille',    pool: 'magicrabe', nameKey: 'petleg_krokille_name',    textKey: 'petleg_krokille_text' },
  { id: 'magicrabe.bwak',        pool: 'magicrabe', nameKey: 'petleg_bwak_name',        textKey: 'petleg_bwak_text' },
  { id: 'magicrabe.gloutoblop',  pool: 'magicrabe', nameKey: 'petleg_gloutoblop_name',  textKey: 'petleg_gloutoblop_text' },
  { id: 'magicrabe.boufette',    pool: 'magicrabe', nameKey: 'petleg_boufette_name',    textKey: 'petleg_boufette_text' },
  { id: 'magicrabe.chafer',      pool: 'magicrabe', nameKey: 'petleg_chafer_name',      textKey: 'petleg_chafer_text' },
  { id: 'magicrabe.scarafeuille', pool: 'magicrabe', nameKey: 'petleg_scarafeuille_name', textKey: 'petleg_scarafeuille_text' },
  { id: 'magicrabe.timansot',    pool: 'magicrabe', nameKey: 'petleg_timansot_name',    textKey: 'petleg_timansot_text' },
  { id: 'magicrabe.domoizelle',  pool: 'magicrabe', nameKey: 'petleg_domoizelle_name',  textKey: 'petleg_domoizelle_text' },
]

const BY_ID = new Map(LEGENDARY_BONUSES.map(b => [b.id, b]))

export const legendaryBonusOf = (id: string): LegendaryBonus | undefined => BY_ID.get(id)

/** Highest value its control takes (stacks, or option count); 1 for a text-only bonus (plain on/off). */
export function legendaryMax(id: string): number {
  const b = BY_ID.get(id)
  return b?.control ? controlMax(b.control) : 1
}

/** The picked bonus's value on the bearer's own stats; {} when text-only or unset. */
export function legendaryStatBonus(pick: { id: string; value: number } | null): PassiveBonus {
  if (!pick) return {}
  const b = BY_ID.get(pick.id)
  return b?.control ? controlBonus(b.control, pick.value) : {}
}

/** A saved pick kept in range for its bonus (unknown id or a value past its max is dropped/clamped). */
export function sanitizeLegendaryPick(raw: unknown): { id: string; value: number } | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const { id, value } = raw as Record<string, unknown>
  if (typeof id !== 'string') return null
  const bonus = BY_ID.get(id)
  if (!bonus) return null
  const max = legendaryMax(id)
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 1
  return { id, value: Math.min(max, Math.max(bonus.control ? 0 : 1, n)) }
}
