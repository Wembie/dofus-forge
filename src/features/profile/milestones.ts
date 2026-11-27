// M188 — daily login streak. Tiers are a pure function of the one
// permanent high-water mark the server returns (login_streak_best) — no
// tier is itself stored, so adding a new one is a client-only change, no
// migration (see docs/brand/streak-rank-rewards-brief.md).

export type StreakFrameTier = 'bronze' | 'silver' | 'gold' | 'molten'

const STREAK_TIERS: { days: number; tier: StreakFrameTier }[] = [
  { days: 365, tier: 'molten' },
  { days: 100, tier: 'gold' },
  { days: 30,  tier: 'silver' },
  { days: 7,   tier: 'bronze' },
]

/** The avatar frame tier earned by the best streak ever reached, or null below 7 days. */
export function streakFrameTier(loginStreakBest: number): StreakFrameTier | null {
  return STREAK_TIERS.find(t => loginStreakBest >= t.days)?.tier ?? null
}
