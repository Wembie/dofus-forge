import { computeStats } from './stats.ts'
import { STAT_MAP, WEAPON_ATTACK_IDS } from './statMap.ts'
import { CHARACTERISTICS } from './types.ts'
import type { EquippedItem, SetData, ItemEffect, ScrolledCharacteristics } from './types.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import type { OptimizerConfig, OptimizerBuildBase, BuildResult, OptimizerProgress, OptimizerStatKey } from '@/features/optimizer/types.ts'
import { ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'

// ── Build optimizer ──────────────────────────────────────────────────────────
//
// Replaces an earlier beam-search version whose scoring only ever looked at
// one item at a time — so it could never "see" the value of a set bonus
// (which only materializes once 2+ specific pieces are equipped together)
// until after the search already threw those pieces away. Dofus itemization
// routinely puts mediocre standalone stats on set pieces specifically because
// the set bonus is the point, so a search blind to sets misses exactly the
// combinations a human theorycrafter would reach for first.
//
// Design (deliberately NOT a black-box metaheuristic — every step below is
// either exhaustive or provably locally optimal, so results are deterministic
// and explainable):
//
// 1. EXHAUSTIVE SET SEARCH — every single set (hundreds) AND every pair of
//    sets is tried explicitly: equip that set's/pair's available pieces, fill
//    every other slot with the single best-scoring item for it, score the
//    whole thing with the real computeStats() (already set-bonus- and cap-
//    aware). This is the dimension the old search was structurally blind to,
//    so it gets full, not sampled, coverage. (Triples and beyond are not
//    exhaustively enumerated — 940-choose-3 is ~140M combinations, not
//    tractable — but phase 2 below can still land on them opportunistically.)
// 2. COORDINATE-ASCENT POLISH — the best candidates from step 1 are each
//    refined by repeatedly sweeping every open slot and replacing it with
//    whichever candidate item (tried against the real scorer) improves the
//    build, until a full sweep makes no further improvement. This is what
//    catches the OTHER nonlinearity a simple greedy fill can't see: hard
//    caps (AP/MP/Range, %resistances) mean a second item adding "+1 AP" can
//    be worthless once AP is already capped elsewhere, so the right choice
//    for that slot depends on the rest of the build, not on the item alone.
// 3. Every build actually evaluated along the way is kept in a "hall of
//    fame"; the final results are the best of those, picked to differ from
//    each other by several slots so they're genuinely different options
//    rather than near-duplicates.

const WEAPON_ATK_STAT_NAMES = new Set([
  'Earth damage', 'Fire damage', 'Water damage', 'Air damage', 'Neutral damage',
])

// Items the public API carries that were never meant to be worn by a real
// character — Game Master / QA-only items with wildly inflated stats (seen:
// a level-1 ring granting +300 to every characteristic) or outright test
// fixtures. None of these have a dedicated "obtainable" flag in the data, so
// this matches the actual naming patterns found in the English item list —
// "(MJ)" is the equivalent French marker some other locales use.
const NON_OBTAINABLE_NAME_RE = /\((?:MJ|GM|Gms?\s*Only)\)|\bGms?\s*Only\b|^Hide Effect Test$/i

const HILL_CLIMB_POOL      = 150   // candidates tried per slot during polish — generous, not a hard correctness cut
const HILL_CLIMB_SEEDS     = 24    // how many phase-1 results get polished
const HILL_CLIMB_MAX_SWEEPS = 5
const TIME_BUDGET_MS       = 15000 // hard safety cap regardless of how far through the search we are
// Phases 1-2 (set/pair search) get only a FRACTION of the total budget, not
// all of it — a cold Worker with no JIT warm-up on a slower machine can run
// those phases noticeably slower than a warm Node benchmark, and if they ate
// the whole budget, phase 3 (coordinate-ascent polish) used to be skipped
// entirely via an all-or-nothing gate. Hill-climbing is the ONLY phase that
// goes beyond "single best item per slot" when optimizing for one or two
// dominant stats, so skipping it outright (not just shortening it) is what
// actually caused results to plateau well below an achievable stat total —
// confirmed by reproducing it with an artificially small budget. Reserving
// this slice means phase 3 always gets to run at least a little, regardless
// of how long phases 1-2 took.
const SET_SEARCH_DEADLINE_MS = TIME_BUDGET_MS * 0.7
const RESULT_COUNT         = 5
const DIVERSITY_MIN_DIFF   = 3     // prefer returned builds to differ by at least this many slots

const DOFUS_SLOT_IDS = ['dofus1', 'dofus2', 'dofus3', 'dofus4', 'dofus5', 'dofus6'] as SlotId[]
const COMPANION_TYPES = new Set(['Pet', 'Petsmount', 'Dragoturkey', 'Seemyool', 'Rhineetle'])

function filterItemsForSlot(items: AppItem[], slot: SlotId, maxLevel: number): AppItem[] {
  const leveled = items.filter(it => it.level <= maxLevel && !NON_OBTAINABLE_NAME_RE.test(it.name))
  if (slot === 'ring1' || slot === 'ring2') return leveled.filter(it => it.slot === 'ring')
  if (DOFUS_SLOT_IDS.includes(slot))        return leveled.filter(it => it.slot === 'dofus')
  if (slot === 'companion')                 return leveled.filter(it => it.slot === 'pet' || (it.slot === 'other' && COMPANION_TYPES.has(it.type)))
  if (slot === 'sidekick')                  return leveled.filter(it => it.slot === 'other' && it.type === 'Sidekick')
  return leveled.filter(it => it.slot === slot)
}

// Which concrete slot IDs could hold this item (generic categories like
// "ring"/"dofus" expand to every sub-slot of that category).
function candidateSlotsFor(item: AppItem): SlotId[] {
  if (item.slot === 'ring') return ['ring1', 'ring2']
  if (item.slot === 'dofus') return DOFUS_SLOT_IDS
  if (item.slot === 'pet' || (item.slot === 'other' && COMPANION_TYPES.has(item.type))) return ['companion']
  if (item.slot === 'other' && item.type === 'Sidekick') return ['sidekick']
  return [item.slot as SlotId]
}

function canEquip(equipped: Partial<Record<SlotId, number>>, slot: SlotId, itemId: number): boolean {
  if (slot === 'ring2' && equipped.ring1 === itemId) return false
  if (slot === 'ring1' && equipped.ring2 === itemId) return false
  if (DOFUS_SLOT_IDS.includes(slot) && DOFUS_SLOT_IDS.some(ds => ds !== slot && equipped[ds] === itemId)) return false
  return true
}

function effectValue(eff: ItemEffect): number {
  return (eff.max !== 0 && eff.max > eff.min) ? eff.max : eff.min
}

function compareOp(actual: number, operator: string, value: number): boolean {
  switch (operator) {
    case '>':  return actual > value
    case '>=': return actual >= value
    case '<':  return actual < value
    case '<=': return actual <= value
    case '=':
    case '==': return actual === value
    default:   return true
  }
}

type ConditionContext = {
  statsNums:       Record<string, number>
  characterLevel:  number
  maxSetPieceCount: number  // most pieces the build has equipped from any single set
  hasSubscription: boolean
}

// Equip conditions (e.g. "Strength > 100") were never validated anywhere in
// the app — the optimizer could (and did) recommend items the build doesn't
// actually qualify to wear. Most gate on a characteristic (evaluated against
// the build's OWN final computed totals — in practice more gear can only
// help reach them). A few condition "stats" in the real data aren't
// characteristics at all and need special handling:
// - "Be level {0} or higher" is a templated character-level gate (not an
//   item-level one — that's already covered by maxLevel), so it compares
//   against the build's chosen level directly.
// - "Be subscribed" gates on having an active Dofus subscription, which this
//   app has no way to verify — handled by excluding such items from the
//   search entirely unless the user opts in (see hasSubscription below), but
//   checked again here too as a second line of defense.
// - "Set bonus" is the condition actual Trophy items carry ("Obstructor",
//   "Deserter", etc.) — Trophies are explicitly incompatible with having a
//   multi-piece set bonus active anywhere in the build, so this compares
//   against the largest number of equipped pieces sharing a single set.
// A condition on something this app still doesn't track at all (e.g.
// alignment, Kamas) is left unvalidated rather than wrongly rejecting the
// build.
function meetsItemConditions(item: AppItem, ctx: ConditionContext): boolean {
  if (!item.conditions || item.conditions.length === 0) return true
  return item.conditions.every(c => {
    if (c.stat === 'Be level {0} or higher') return compareOp(ctx.characterLevel, c.operator, c.value)
    if (c.stat === 'Set bonus')               return compareOp(ctx.maxSetPieceCount, c.operator, c.value)
    if (c.stat === 'Be subscribed')           return ctx.hasSubscription
    const key = (STAT_MAP as Readonly<Record<string, string | undefined>>)[c.stat]
    if (!key) return true
    return compareOp(ctx.statsNums[key] ?? 0, c.operator, c.value)
  })
}

// Rough per-item score used only to rank/seed candidate pools (which items a
// slot even gets to try) — never the actual fitness (that's always real
// computeStats(), see evaluate() below), so it doesn't need to be exact.
function itemPartialScore(item: AppItem, stats: OptimizerConfig['stats']): number {
  let s = item.level * 0.1
  for (const eff of item.effects) {
    if (eff.effect_id != null && WEAPON_ATTACK_IDS.has(eff.effect_id)) continue
    if (item.slot === 'weapon' && WEAPON_ATK_STAT_NAMES.has(eff.stat)) continue
    const key = (STAT_MAP as Readonly<Record<string, string | undefined>>)[eff.stat] as OptimizerStatKey | undefined
    if (!key) continue
    const cfg = stats.find(c => c.stat === key)
    const weight = cfg && (cfg.weight > 0 || cfg.minVal > 0) ? (cfg.weight > 0 ? cfg.weight : 5) : 0.3
    s += effectValue(eff) * weight
  }
  return s
}

function equippedFingerprint(eq: Partial<Record<SlotId, number>>): string {
  return ALL_SLOTS.map(s => eq[s] ?? 0).join(',')
}

type Individual = Partial<Record<SlotId, number>>  // only slotsToOptimize — locked slots merged in separately

export function runOptimizer(
  config:     OptimizerConfig,
  items:      AppItem[],
  sets:       AppSet[],
  base:       OptimizerBuildBase,
  onProgress: (p: OptimizerProgress) => void,
  cancelRef:  { cancelled: boolean },
): BuildResult[] {
  const { stats, maxLevel, lockedSlots, exo, hasSubscription, assumeFullyScrolled } = config
  const startTime = Date.now()

  // Lets the user ask "what if every characteristic were scrolled" without
  // first going to set that up on the sheet itself — overrides the sheet's
  // current rune state for this run only, it isn't written back anywhere.
  const scrolled: ScrolledCharacteristics = assumeFullyScrolled
    ? Object.fromEntries(CHARACTERISTICS.map(c => [c, true])) as ScrolledCharacteristics
    : base.scrolled

  const slotsToOptimize = ALL_SLOTS.filter(s => !lockedSlots.has(s))
  const lockedEquipped: Partial<Record<SlotId, number>> = {}
  for (const slot of ALL_SLOTS) {
    if (lockedSlots.has(slot) && base.equipped[slot] != null) lockedEquipped[slot] = base.equipped[slot]
  }

  // Items that require an active Dofus subscription ("Be subscribed") can't
  // be verified by this app, so they're dropped from the candidate pool
  // entirely unless the user confirms they have one — stripping them here,
  // before pools/sets are built, means both the per-slot filter and the
  // set-item mapping below automatically never see them.
  const usableItems = hasSubscription
    ? items
    : items.filter(it => !it.conditions?.some(c => c.stat === 'Be subscribed'))

  const itemMap = new Map(usableItems.map(it => [it.ankama_id, it]))
  const setData: SetData[] = sets.map(s => ({
    ankama_id: s.ankama_id,
    items:     s.items,
    bonuses:   Object.fromEntries(Object.entries(s.bonuses).map(([k, v]) => [Number(k), v as EquippedItem['effects']])),
  }))

  // Hard constraints: user-set minimums, plus the "exo" checkboxes — those
  // exist specifically to say "I want this stat capped out", so they're
  // folded in as automatic AP>=12 / MP>=6 / Range>=6 floors (previously this
  // checkbox was captured in the UI and silently never used anywhere).
  const minByStat = new Map<OptimizerStatKey, number>()
  for (const cfg of stats) if (cfg.minVal > 0) minByStat.set(cfg.stat, cfg.minVal)
  if (exo.ap)    minByStat.set('ap',    Math.max(12, minByStat.get('ap') ?? 0))
  if (exo.mp)    minByStat.set('mp',    Math.max(6,  minByStat.get('mp') ?? 0))
  if (exo.range) minByStat.set('range', Math.max(6,  minByStat.get('range') ?? 0))
  const hardConstraints = [...minByStat.entries()].map(([stat, minVal]) => ({ stat, minVal }))

  function fullEquipped(ind: Individual): Partial<Record<SlotId, number>> {
    return { ...lockedEquipped, ...ind }
  }

  function buildEquippedItems(equipped: Partial<Record<SlotId, number>>): EquippedItem[] {
    const out: EquippedItem[] = []
    for (const slot of ALL_SLOTS) {
      const id = equipped[slot]
      if (id == null) continue
      const it = itemMap.get(id)
      if (it) out.push({ ankama_id: it.ankama_id, effects: it.effects, set_id: it.set_id, slot: it.slot })
    }
    return out
  }

  // Most pieces this build has equipped from any single set — the gate real
  // Trophy items carry ("Set bonus" < 2): Trophies are explicitly
  // incompatible with having a multi-piece set bonus active anywhere else in
  // the build.
  function maxSetPieceCount(equipped: Partial<Record<SlotId, number>>): number {
    const counts = new Map<number, number>()
    for (const slot of ALL_SLOTS) {
      const id = equipped[slot]
      if (id == null) continue
      const it = itemMap.get(id)
      if (it && it.set_id != null) counts.set(it.set_id, (counts.get(it.set_id) ?? 0) + 1)
    }
    let max = 0
    for (const c of counts.values()) if (c > max) max = c
    return max
  }

  function meetsAllConditions(equipped: Partial<Record<SlotId, number>>, statsNums: Record<string, number>): boolean {
    const ctx: ConditionContext = {
      statsNums, hasSubscription,
      characterLevel:   base.level,
      maxSetPieceCount: maxSetPieceCount(equipped),
    }
    for (const slot of ALL_SLOTS) {
      const id = equipped[slot]
      if (id == null) continue
      const it = itemMap.get(id)
      if (it && !meetsItemConditions(it, ctx)) return false
    }
    return true
  }

  function evaluate(ind: Individual): BuildResult {
    const equipped = fullEquipped(ind)
    const computedStats = computeStats({
      class: base.selectedClass, level: base.level, allocated: base.allocated, scrolled,
      items: buildEquippedItems(equipped), sets: setData,
    })
    const statsNums = computedStats as unknown as Record<string, number>

    let score = 0
    for (const cfg of stats) {
      if (cfg.weight > 0 || cfg.minVal > 0) score += (statsNums[cfg.stat] ?? 0) * (cfg.weight > 0 ? cfg.weight : 5)
    }
    // A build whose items' own equip conditions aren't met is not just
    // suboptimal, it's not actually assemblable in-game — tracked separately
    // from the user's requested minimums so rank() (below) can treat it as an
    // absolute disqualifier regardless of how close the stats are.
    const conditionsOk  = meetsAllConditions(equipped, statsNums)
    const meetsRequired = hardConstraints.every(c => (statsNums[c.stat] ?? 0) >= c.minVal) && conditionsOk

    return { equipped, stats: computedStats, score, meetsRequired, conditionsOk }
  }

  // Ranking score used to choose between tied/near builds, to sort the hall
  // of fame, AND to drive hill-climbing's slot-by-slot comparisons. This used
  // to be all-or-nothing (meetsRequired ? +1e12 : +0), which gave the search
  // zero gradient toward satisfying hard constraints whenever no candidate
  // fully met every one of them yet — the EXO AP/MP/Range floors in
  // particular carry no `weight` in `stats`, so raw score never rewarded
  // moving toward them, and hill-climbing had no reason to ever try (this was
  // the real cause behind results looking "stuck" on the same picks
  // regardless of target: increasing AP/MP/Range never improved `score`, and
  // the +1e12 bonus never kicked in unless EVERYTHING lined up at once).
  // Replaced with a continuous 0..1 satisfaction ratio — the average of each
  // hard constraint's fulfillment, each capped at 1 — so a build that's 90%
  // of the way to every floor always outranks one at 60%, giving the search
  // an actual gradient to climb instead of only ever falling off a cliff.
  // Equip-condition failures stay an absolute disqualifier (an illegal build
  // can't be "partially" worn), never competing with score at all.
  function constraintSatisfaction(statsNums: Record<string, number>): number {
    if (hardConstraints.length === 0) return 1
    let sum = 0
    for (const c of hardConstraints) sum += c.minVal > 0 ? Math.min(1, (statsNums[c.stat] ?? 0) / c.minVal) : 1
    return sum / hardConstraints.length
  }
  function rank(r: BuildResult): number {
    if (!r.conditionsOk) return r.score - 1e15
    return constraintSatisfaction(r.stats as unknown as Record<string, number>) * 1e12 + r.score
  }

  if (slotsToOptimize.length === 0) {
    onProgress({ phase: 'evaluating', slotIndex: 1, totalSlots: 1, percent: 100 })
    return [evaluate({})]
  }

  // ── Candidate pools per slot (soft cap — generous; most slots have far
  // fewer items than this anyway) and a full, uncapped, sorted list used for
  // "the single best item for this slot" lookups during greedy fill. ──────
  const pools = new Map<SlotId, AppItem[]>()
  for (const slot of slotsToOptimize) {
    const filtered = filterItemsForSlot(usableItems, slot, maxLevel)
    const ranked = [...filtered].sort((a, b) => itemPartialScore(b, stats) - itemPartialScore(a, stats))
    pools.set(slot, ranked)
  }

  function bestItemForSlot(slot: SlotId, exclude: Individual): AppItem | undefined {
    const pool = pools.get(slot)
    if (!pool) return undefined
    return pool.find(it => canEquip(exclude, slot, it.ankama_id))
  }

  function greedyFillRemaining(base: Individual, openSlots: SlotId[]): Individual {
    const ind = { ...base }
    for (const slot of openSlots) {
      if (ind[slot] != null) continue
      const pick = bestItemForSlot(slot, ind)
      if (pick) ind[slot] = pick.ankama_id
    }
    return ind
  }

  // Assigns as many of `setItems` as fit into `availableSlots` (not already
  // used by `claimed`), returns the assignment plus which slots it used.
  function applySet(setItems: AppItem[], availableSlots: Set<SlotId>, claimed: Individual): { assigned: Individual; used: Set<SlotId> } {
    const assigned: Individual = {}
    const used = new Set<SlotId>()
    for (const item of setItems) {
      const target = candidateSlotsFor(item).find(s => availableSlots.has(s) && !used.has(s) && claimed[s] == null)
      if (target) { assigned[target] = item.ankama_id; used.add(target) }
    }
    return { assigned, used }
  }

  const hallOfFame = new Map<string, BuildResult>()
  function remember(r: BuildResult) {
    const fp = equippedFingerprint(r.equipped)
    const existing = hallOfFame.get(fp)
    if (!existing || r.score > existing.score) hallOfFame.set(fp, r)
  }

  const openSlotsSet = new Set(slotsToOptimize)

  // ── Phase 0: the pure "best item per slot, no sets" baseline ───────────
  remember(evaluate(greedyFillRemaining({}, slotsToOptimize)))

  // ── Phase 1: every single set, standalone ───────────────────────────────
  type SetEntry = { set: AppSet; setItems: AppItem[]; standaloneScore: number }
  const setEntries: SetEntry[] = []
  const totalSetWork = sets.length
  let setWorkDone = 0

  for (const set of sets) {
    if (cancelRef.cancelled) return []
    setWorkDone++
    if (setWorkDone % 40 === 0) {
      onProgress({ phase: 'prefilter', slotIndex: setWorkDone, totalSlots: totalSetWork, percent: Math.round((setWorkDone / totalSetWork) * 25) })
      if (Date.now() - startTime > SET_SEARCH_DEADLINE_MS) break
    }

    const setItems = set.items.map(id => itemMap.get(id)).filter((it): it is AppItem => it != null && it.level <= maxLevel && !NON_OBTAINABLE_NAME_RE.test(it.name))
    if (setItems.length < 2) continue

    const { assigned, used } = applySet(setItems, openSlotsSet, {})
    if (used.size < 2) continue  // can't actually reach even the lowest real tier

    const remaining = slotsToOptimize.filter(s => !used.has(s))
    const result = evaluate(greedyFillRemaining(assigned, remaining))
    remember(result)
    setEntries.push({ set, setItems, standaloneScore: result.score })
  }

  // ── Phase 2: every PAIR of sets — full O(n²), not sampled. Slot conflicts
  // (both sets wanting the same slot) are resolved by giving priority to
  // whichever set scored higher standalone — a single deterministic pass per
  // pair, so this stays linear in pair count rather than doubling it. ─────
  setEntries.sort((a, b) => b.standaloneScore - a.standaloneScore)
  const totalPairs = (setEntries.length * (setEntries.length - 1)) / 2
  let pairsDone = 0

  outer:
  for (let i = 0; i < setEntries.length; i++) {
    for (let j = i + 1; j < setEntries.length; j++) {
      pairsDone++
      if (pairsDone % 2000 === 0) {
        if (cancelRef.cancelled) return []
        onProgress({ phase: 'search', slotIndex: pairsDone, totalSlots: totalPairs, percent: 25 + Math.round((pairsDone / totalPairs) * 55) })
        if (Date.now() - startTime > SET_SEARCH_DEADLINE_MS) break outer
      }

      const a = setEntries[i], b = setEntries[j]
      const { assigned: assignedA, used: usedA } = applySet(a.setItems, openSlotsSet, {})
      const { assigned: assignedB, used: usedB } = applySet(b.setItems, openSlotsSet, assignedA)
      if (usedB.size === 0) continue  // b got nothing once a's slots were taken — no real combination here, phase 1 already covers "just a"

      const combined = { ...assignedA, ...assignedB }
      const usedSlots = new Set([...usedA, ...usedB])
      const remaining = slotsToOptimize.filter(s => !usedSlots.has(s))
      remember(evaluate(greedyFillRemaining(combined, remaining)))
    }
  }

  if (cancelRef.cancelled) return []
  onProgress({ phase: 'search', slotIndex: totalPairs, totalSlots: totalPairs, percent: 80 })

  // ── Phase 3: coordinate-ascent polish on the best candidates so far ─────
  // Catches the other nonlinearity sets alone don't cover: hard stat caps.
  // An item adding "+1 AP" can be worthless if AP is already capped from
  // elsewhere, so the right pick for a slot depends on the rest of the
  // build — a plain greedy fill (scoring each item in isolation) can't see
  // that, but re-trying every option against the real computed stats can.
  // Always attempted, even if phases 1-2 ran all the way to their deadline —
  // this used to be skipped outright whenever that happened (an all-or-
  // nothing gate), which meant a slow machine got literally zero benefit
  // from the one phase that actually improves on "single best item per
  // slot" for single/few-stat objectives. It has its own per-seed time
  // check against the full TIME_BUDGET_MS below, so it naturally does less
  // (but never nothing) when little time is left.
  {
    const seeds = [...hallOfFame.values()].sort((a, b) => rank(b) - rank(a)).slice(0, HILL_CLIMB_SEEDS)
    const hillPool = new Map<SlotId, AppItem[]>()
    for (const slot of slotsToOptimize) hillPool.set(slot, (pools.get(slot) ?? []).slice(0, HILL_CLIMB_POOL))

    for (const [seedIdx, seed] of seeds.entries()) {
      if (cancelRef.cancelled) return []
      if (Date.now() - startTime > TIME_BUDGET_MS) break
      onProgress({ phase: 'evaluating', slotIndex: seedIdx + 1, totalSlots: seeds.length, percent: 80 + Math.round(((seedIdx + 1) / seeds.length) * 18) })

      let current: Individual = {}
      for (const slot of slotsToOptimize) {
        const id = seed.equipped[slot]
        if (id != null) current[slot] = id
      }
      let currentResult = evaluate(current)

      for (let sweep = 0; sweep < HILL_CLIMB_MAX_SWEEPS; sweep++) {
        let improved = false
        for (const slot of slotsToOptimize) {
          const candidates = hillPool.get(slot) ?? []
          let bestForSlot = currentResult
          let bestId = current[slot]
          for (const item of candidates) {
            if (item.ankama_id === current[slot]) continue
            const trial = { ...current, [slot]: item.ankama_id }
            if (!canEquip(trial, slot, item.ankama_id)) continue
            const trialResult = evaluate(trial)
            if (rank(trialResult) > rank(bestForSlot)) { bestForSlot = trialResult; bestId = item.ankama_id }
          }
          if (bestId !== current[slot]) {
            current = { ...current, [slot]: bestId }
            currentResult = bestForSlot
            improved = true
          }
        }
        remember(currentResult)
        if (!improved) break
      }
    }
  }

  onProgress({ phase: 'evaluating', slotIndex: 1, totalSlots: 1, percent: 98 })

  // ── Pick diverse top results from everything ever evaluated ────────────
  const ranked = [...hallOfFame.values()].sort((a, b) => rank(b) - rank(a))

  function slotDiff(a: Partial<Record<SlotId, number>>, b: Partial<Record<SlotId, number>>): number {
    return ALL_SLOTS.reduce((n, s) => n + ((a[s] ?? 0) !== (b[s] ?? 0) ? 1 : 0), 0)
  }

  function pickDiverse(minDiff: number): BuildResult[] {
    const picked: BuildResult[] = []
    for (const r of ranked) {
      if (picked.every(p => slotDiff(p.equipped, r.equipped) >= minDiff)) picked.push(r)
      if (picked.length >= RESULT_COUNT) break
    }
    return picked
  }

  let finalResults = pickDiverse(DIVERSITY_MIN_DIFF)
  if (finalResults.length < Math.min(RESULT_COUNT, ranked.length)) finalResults = pickDiverse(1)
  if (finalResults.length < Math.min(RESULT_COUNT, ranked.length)) finalResults = ranked.slice(0, RESULT_COUNT)

  onProgress({ phase: 'evaluating', slotIndex: 1, totalSlots: 1, percent: 100 })

  return finalResults
}
