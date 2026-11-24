import type { PassiveBonus, PassiveControl } from './passives.ts'
import { controlBonus, controlMax } from './passives.ts'

// Relative imports only: the share-link codec (and so the Worker) use this.

/**
 * A pet or mount reaches "Légendaire" status (level 100 + a Reflet de
 * Bébémoth), then the player crafts one specific "Croquette infusée" (one
 * of 8 per family: Bakushana, Poukachi, Kwakarticho, Magicrabe) and feeds it
 * to the companion — that croquette always grants the SAME fixed spell, no
 * randomness; feeding a different one later replaces it. This picker just
 * lets the player say which croquette they fed theirs.
 *
 * Names, families and effect text verified against the game's own client
 * data (DofusDB, game version 3.7.14.18) — 32 bonuses, 8 per family. Most
 * buff allies, heal or shield instead of the bearer's own tracked stats;
 * those have no `control` and show as text only, same as TEXT_ONLY_PASSIVES.
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
  // ── Bakushana ──
  { id: 'bakushana.moskito',   pool: 'bakushana', nameKey: 'petleg_moskito_name',   textKey: 'petleg_moskito_text' },
  { id: 'bakushana.chafer',    pool: 'bakushana', nameKey: 'petleg_chafer_name',    textKey: 'petleg_chafer_text' },
  { id: 'bakushana.domoizelle', pool: 'bakushana', nameKey: 'petleg_domoizelle_name', textKey: 'petleg_domoizelle_text' },
  { id: 'bakushana.koalak',    pool: 'bakushana', nameKey: 'petleg_koalak_name',    textKey: 'petleg_koalak_text',
    control: { id: 'bakushana.koalak', kind: 'choice', options: [{ bonus: { ap: 1 } }] } },
  { id: 'bakushana.champa',    pool: 'bakushana', nameKey: 'petleg_champa_name',    textKey: 'petleg_champa_text' },
  { id: 'bakushana.boursoin',  pool: 'bakushana', nameKey: 'petleg_boursoin_name',  textKey: 'petleg_boursoin_text' },
  { id: 'bakushana.dragoeuf',  pool: 'bakushana', nameKey: 'petleg_dragoeuf_name',  textKey: 'petleg_dragoeuf_text' },
  { id: 'bakushana.timansot',  pool: 'bakushana', nameKey: 'petleg_timansot_name',  textKey: 'petleg_timansot_text' },

  // ── Kwakarticho ──
  { id: 'kwakarticho.wabbit',  pool: 'kwakarticho', nameKey: 'petleg_wabbit_name',  textKey: 'petleg_wabbit_text' },
  { id: 'kwakarticho.trool',   pool: 'kwakarticho', nameKey: 'petleg_trool_name',   textKey: 'petleg_trool_text' },
  { id: 'kwakarticho.boufette', pool: 'kwakarticho', nameKey: 'petleg_boufette_name', textKey: 'petleg_boufette_text' },
  { id: 'kwakarticho.krokille', pool: 'kwakarticho', nameKey: 'petleg_krokille_name', textKey: 'petleg_krokille_text' },
  { id: 'kwakarticho.piou',    pool: 'kwakarticho', nameKey: 'petleg_piou_name',    textKey: 'petleg_piou_text',
    control: { id: 'kwakarticho.piou', kind: 'choice', options: [{ bonus: { mp: 1 } }] } },
  { id: 'kwakarticho.kitsou',  pool: 'kwakarticho', nameKey: 'petleg_kitsou_name',  textKey: 'petleg_kitsou_text' },
  { id: 'kwakarticho.scorbute', pool: 'kwakarticho', nameKey: 'petleg_scorbute_name', textKey: 'petleg_scorbute_text' },
  { id: 'kwakarticho.leolhyene', pool: 'kwakarticho', nameKey: 'petleg_leolhyene_name', textKey: 'petleg_leolhyene_text',
    control: { id: 'kwakarticho.leolhyene', kind: 'choice', options: [{ bonus: { ap: 1 } }] } },

  // ── Magicrabe ──
  { id: 'magicrabe.bwork',     pool: 'magicrabe', nameKey: 'petleg_bwork_name',     textKey: 'petleg_bwork_text',
    control: { id: 'magicrabe.bwork', kind: 'choice', options: [{ bonus: { rangedDamagePercent: 3 } }, { bonus: { meleeDamagePercent: 3 } }] } },
  { id: 'magicrabe.kanig',     pool: 'magicrabe', nameKey: 'petleg_kanig_name',     textKey: 'petleg_kanig_text',
    control: { id: 'magicrabe.kanig', kind: 'stacks', max: 3, perStack: { finalDamagePercent: 5 } } },
  { id: 'magicrabe.gloutoblop', pool: 'magicrabe', nameKey: 'petleg_gloutoblop_name', textKey: 'petleg_gloutoblop_text' },
  { id: 'magicrabe.craqueleur', pool: 'magicrabe', nameKey: 'petleg_craqueleur_name', textKey: 'petleg_craqueleur_text' },
  { id: 'magicrabe.truche',    pool: 'magicrabe', nameKey: 'petleg_truche_name',    textKey: 'petleg_truche_text',
    control: { id: 'magicrabe.truche', kind: 'choice', options: [{ bonus: { lock: 10 } }, { bonus: { dodge: 10 } }] } },
  { id: 'magicrabe.kozaru',    pool: 'magicrabe', nameKey: 'petleg_kozaru_name',    textKey: 'petleg_kozaru_text',
    control: { id: 'magicrabe.kozaru', kind: 'choice', options: [{ bonus: { lock: 7, dodge: 7 } }] } },
  { id: 'magicrabe.pandore',   pool: 'magicrabe', nameKey: 'petleg_pandore_name',   textKey: 'petleg_pandore_text' },
  { id: 'magicrabe.bambouto',  pool: 'magicrabe', nameKey: 'petleg_bambouto_name',  textKey: 'petleg_bambouto_text',
    control: { id: 'magicrabe.bambouto', kind: 'choice', options: [{ bonus: { range: 3 } }] } },

  // ── Poukachi ──
  { id: 'poukachi.mulou',      pool: 'poukachi', nameKey: 'petleg_mulou_name',      textKey: 'petleg_mulou_text',
    control: { id: 'poukachi.mulou', kind: 'stacks', max: 3, perStack: { finalDamagePercent: 5 } } },
  { id: 'poukachi.abraknyde',  pool: 'poukachi', nameKey: 'petleg_abraknyde_name',  textKey: 'petleg_abraknyde_text' },
  { id: 'poukachi.arakne',     pool: 'poukachi', nameKey: 'petleg_arakne_name',     textKey: 'petleg_arakne_text' },
  { id: 'poukachi.noeul',      pool: 'poukachi', nameKey: 'petleg_noeul_name',      textKey: 'petleg_noeul_text',
    control: { id: 'poukachi.noeul', kind: 'choice', options: [{ bonus: { range: 3 } }] } },
  { id: 'poukachi.tofoune',    pool: 'poukachi', nameKey: 'petleg_tofoune_name',    textKey: 'petleg_tofoune_text' },
  { id: 'poukachi.bwak',       pool: 'poukachi', nameKey: 'petleg_bwak_name',       textKey: 'petleg_bwak_text' },
  { id: 'poukachi.scarafeuille', pool: 'poukachi', nameKey: 'petleg_scarafeuille_name', textKey: 'petleg_scarafeuille_text' },
  { id: 'poukachi.thomondor',  pool: 'poukachi', nameKey: 'petleg_thomondor_name',  textKey: 'petleg_thomondor_text',
    control: { id: 'poukachi.thomondor', kind: 'choice', options: [{ bonus: { mp: 2 } }] } },
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
