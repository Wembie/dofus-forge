# Spell Effects Sum-vs-Dedupe Audit

Date: 2026-11-13
Scope: `src/features/spells/spellCalc.ts`, `spellDamage.ts`, `SpellsPanel.tsx`,
`itemSpellModifiers.ts`, `src/data/spellLoaders.ts`, `src/data/effectIds.ts`,
`scripts/fetch-spells.ts`, and the real spell data in `public/data/en/spells/*.json`
across all 19 classes + `common.json`.
Trigger: user request to audit "cuándo sumar, cuándo no" (when to sum vs. not)
for spell effects, charges, and stacking buffs.
This is a **diagnostic-only pass — no code was changed.**

## Executive summary

The damage pipeline has two independent dedup/merge passes that were never
reconciled against each other or against real multi-effect spells:

1. **Build time** (`scripts/fetch-spells.ts:211-231`, `deduplicateConditional`)
   — only merges effects that are *exact* value duplicates AND where every
   duplicate in the group carries an explicit mutually-exclusive state mask
   (`*e<id>`/`*E<id>`). Anything that doesn't match that exact shape (different
   values representing the same underlying "pick one" mechanic, or duplicates
   without a detectable state mask) passes straight through to the JSON files
   that ship to the client.
2. **Runtime** (`src/features/spells/spellCalc.ts:59-68`, `dedupEffects`) —
   collapses *any* two effects that collide on
   `condition+element+kind+min+max`, with a single hardcoded exception for
   `spell_buff`. This correctly handles the "same value hits N cells" case it
   was written for, but it has no concept of "these values are mutually
   exclusive outcomes of the same roll" when the values differ, and no concept
   of "this is a per-turn DoT tick, not an instant hit" when deciding what to
   sum into the on-screen total (`Σ`, `SpellsPanel.tsx:251-254`).

Scanning all 19 classes' `spells.json` (English data, same shape in es/fr/pt)
turned up concrete spells where this produces a wrong total on screen, not
just a theoretical edge case. The most important one: **Σ on spells that
combine an instant hit with a poison (DoT) tick adds the two together as if
they land in the same instant** (Finding 2) — this is a common pattern (43
spells across 9+ classes have `damage`+`poison` in the same level) and the bug
is structural, not a one-off typo. The second most important: **Ecaflip
dice/card spells with several same-element, different-value "draws" get
summed as if all values land at once**, when the spell text says only one
random value fires per cast (Finding 1). Both are display-layer calculation
bugs — the underlying `calcDamage` math (`spellDamage.ts`) itself is correct
and already has one historical double-count fix on record (line 16-17).

No raw "non-cumulable" / stacking-limit field is read anywhere in the ETL
outside the single `spell_buff` extraction path (see Finding 7) — this is a
potential blind spot but **could not be confirmed with certainty**, since the
raw upstream `spell_levels.json` schema is fetched at build time from GitHub
releases and is not present in this repo to inspect directly.

Confidence throughout is stated per-finding. Where I could not cross-check
against an actual in-game combat log, I say so explicitly — the evidence here
is: the exact effect arrays as shipped to the client, the ETL code that
produced them, the display code that consumes them, and the English spell
*description* text bundled with each spell (which is Ankama's own text, not a
guess).

## Methodology

1. Read `spellCalc.ts`, `spellDamage.ts`, `SpellsPanel.tsx` (full file, 576+
   lines), `spellLoaders.ts`, `scripts/fetch-spells.ts` (full file, 798
   lines), `itemSpellModifiers.ts`, `effectIds.ts` end to end.
2. Wrote a one-off Node script (not committed — scratch only) that loaded
   every `public/data/en/spells/{class}.json` (19 classes + common), and for
   every spell level's `effects`/`critEffects` array:
   - grouped effects by the exact `dedupEffects` key
     (`condition+element+kind+min+max`) to find every real collision group
     (291 hits across the roster),
   - flagged every level mixing `damage`+`poison` kinds (43 hits),
   - flagged every level mixing `steal`+`damage` kinds (75 hits),
   - collected every `spell_buff` effect and split self-referencing
     (charge-on-self, 82) vs. other-referencing (2) instances.
3. Pulled the real English `description` text for every flagged spell to
   determine, from Ankama's own wording, whether the mechanic is "one random
   outcome", "N simultaneous hits", or "charge now, pay out later" — since the
   processed `AppSpellEffect` data has no field that states this directly.
4. Ran `pnpm vitest run src/features/spells` — all 5 test files / 38 tests
   pass. Searched for any test referencing `dedupEffects`, `hasDescarga`, or
   `showGroupTotal` by name — none exist (see Finding 8).

## Findings

### Finding 1 — Same-element, multi-value "draw a card/dice" spells get summed as if all outcomes land at once

**Confidence: high** (structural evidence + Ankama's own description text;
not verified against a live combat log).

`SpellsPanel.tsx:260` (`showGroupTotal`) suppresses the `Σ` total only when
`isMixed` is true (`spell.element === 'mixed'`, set in
`scripts/fetch-spells.ts:147-152` `dominantElement` whenever a spell's effects
span **more than one** element). That guard correctly protects multi-element
"pick one" spells (Finding 6), but it does nothing when every possible
outcome happens to be the *same* element — which is exactly the shape of
Ecaflip's dice/card spells.

Example: **Topkaj** (Ecaflip, id `12846`), grade 1. Raw `effects` array:
```
fire damage 7 (×2), fire damage 10 (×2), fire damage 13 (×2)
```
Description (`public/data/en/spells/ecaflip.json`): *"Inflicts Fire damage on
enemies or heals allies. Draws a Jack of Hearts."* — this is a random-outcome
draw, not three simultaneous hits. After `dedupEffects` removes the literal
duplicates (3 of the 6 entries, correctly — that's the duplicate-ally/duplicate-enemy
copy of the same card value), three *distinct* values remain: 7, 10, 13, all
`fire`/`damage`. `isMixed` is false (single element), `sigmaEffects.length`
is 3 (`≥2`), so `showGroupTotal` is true and the UI renders **Σ ≈ 30** (7+10+13,
scaled) as "total damage" for a spell that deals *one* of 7, 10, or 13 per
cast — never the sum. Same shape (all-same-element, multiple surviving
distinct values after dedup) also appears for **Nine Lives** (Ecaflip,
id `12874`, 3× identical neutral "damage" 9 after dedup collapses to 1 — see
Finding 3 for why that collapse is itself suspect) and smaller-scale "draws a
card" spells on the same roster (`Rough Tongue`, id `12855`, happens to only
have one surviving distinct value so it is *not* affected — a coincidence of
its particular dice values, not evidence the mechanism is safe in general).

### Finding 2 — Σ silently adds an instant hit to a poison (DoT) tick as if both land in the same moment

**Confidence: high** for the mechanical bug (the code unambiguously does
this); **medium** for how misleading it is in practice, since I cannot
confirm the exact combat-log wording Ankama uses for the total shown.

`SpellsPanel.tsx:186` defines `isDmgOrSteal = kind === 'damage' || kind ===
'steal' || kind === 'poison'`. `groupDmgEffects` (line 219-221) and therefore
`sigmaEffects` (line 246, when not a "Descarga" spell — see Finding 3) are
built from `isDmgOrSteal`, so a `poison` effect (a per-turn DoT tick,
`turns` field set) is added into the same `Σ` bucket as an instant `damage`
effect, with no distinction between "this lands now" and "this lands once per
turn for N turns."

Concretely, the UI already visually *separates* poison into its own labeled
section (`t('spell_poison', …)` header inserted at line 406-415, "Veneno"/the
poison label, with its own border) — so the display itself communicates "this
is a different kind of thing" — but the `Σ` total computed above that section
(lines 251-254) still adds the poison tick's value into the same sum as the
instant hit, contradicting the section split the UI just drew.

Example: **Tyrannical Arrow** (Cra, variant, id `32448`), grade 1. After
dedup, effects are `fire damage 28-32` + `fire poison 20-22 (2 turns)`.
Description: *"Inflicts damage and applies an end-of-turn Fire poison on the
target… Inflicts Fire damage prematurely… if the target suffers pushback
damage."* This confirms the duplicate `damage 28-32` entry in the raw data
(correctly deduped to 1 by `dedupEffects` — this matches the dedup function's
own code comment citing this exact spell) is an alternate-trigger copy of the
*same* single instant hit, not a second hit. But the *poison* is a genuinely
separate, later-arriving DoT, and the component's `Σ` (`48-54` total) blends
"you deal 28-32 now" with "and separately, 20-22/turn for 2 turns" into one
number that reads as a single combat-log hit.

Second example: **Warpaint** (Eniripsa, id `25868`), grade 1 — same shape
after dedup: `earth poison 6-7 (2t)` + `earth damage 6-7`, Σ = 12-14.
Description confirms the poison is the ongoing "Paint" tick on enemies
(separate from the on-cast damage), not part of the same instant.

This pattern recurs on **43 spell levels across 9 classes** (cra, eliotrope,
eniripsa, enutrof, foggernaut, iop, pandawa, sadida, sram, xelor — full list
captured in the scan, not reproduced here) — it is a systemic gap in the `Σ`
logic, not a single mis-tagged spell.

### Finding 3 — Multi-tier charge/discharge spells without a `spell_buff` marker get every tier summed by the "Descarga" heuristic

**Confidence: medium-high.** This is the strongest-evidence but least
directly-verifiable finding — I could not check it against a live combat log,
only against the spell's own description text and its raw effect shape.

Not every charge mechanic in the data is encoded via `kind: 'spell_buff'`
(which `SpellsPanel.tsx:123-128` `selfChargeBuffs` and the dedicated
`chargeSets` UI at lines 148-184 are built to handle). Some are encoded as
flat lists of **multiple distinct-value `steal`/`damage` effects at ascending
tiers**, with no buff/stack metadata attached at all.

Example: **Devouring Arrow** (Cra, id `32446`), grade 1. Description:
*"Steals HP in the Fire element… The health steal increases after each
casting on the same enemy… Also inflicts Fire damage… or delayed damage if
the spell is not recast. The damage increases based on the number of
castings on the same enemy."* Raw `effects` (12 entries before dedup): three
distinct `steal` tiers (9-11, 19-22, 27-31 — 9-11 and 27-31 each duplicated,
dedup correctly collapses those to 1 copy each) and three distinct `damage`
tiers (27-31, 42-46, 56-60 — the latter two duplicated, same correct
collapse). After dedup: **6 surviving effects**, all `fire`, same element so
`isMixed` is false.

`SpellsPanel.tsx:242-243` (`hasDescarga`) detects this as a charge/discharge
pattern (steal effects precede damage effects, both kinds present) and
excludes the `steal` phase from `Σ` — this part is correct and matches the
dedicated "Descarga" UI section (line 292-301). But `sigmaEffects` after that
filter is **still 3 damage values** (27-31, 42-46, 56-60), and `Σ` adds all
three (`125-137`). Per the description, these three values are the
delayed-damage payout at charge tiers 1, 2, and 3 — mutually exclusive
outcomes depending on how many times you cast it before it discharges, not
three simultaneous hits. The UI's "Descarga" header correctly signals
"this is a charge phase," but then shows a `Σ` that adds up all three charge
tiers' payouts as if you get all of them on one discharge.

I flag this below high-confidence on the *mechanical description reading*
(the text explicitly says "increases based on the number of castings," i.e.
tiered-not-additive), but I have not seen this spell played in-game to
confirm the UI's literal number is wrong by the amount I calculated — hence
medium-high, not high.

### Finding 4 — The "Descarga" (charge/discharge) heuristic can false-positive on ordinary steal-and-damage dual-target spells

**Confidence: medium.**

`hasDescarga` (`SpellsPanel.tsx:242-243`) triggers on *any* level where a
`steal` effect precedes a `damage` effect, with no check that the spell is
actually a charge mechanic. This heuristic was presumably written for
genuine charge spells (Devouring Arrow, Persecuting Arrow), but it also
matches spells whose `steal`+`damage` pair is really just "heals allies / damage
enemies" duality (the same ally/enemy-duplicate pattern discussed in Finding
6), which has nothing to do with charging.

Example: **Crobak Call** (Osamodas, id `31110`), grade 1: `air steal 8-10` +
`air damage 8-10` (identical values) + `mp_gain 1`. Description: *"Steals HP
from enemies or heals allies in the Air element. Also increases the caster's
and targeted ally's MP. Heals do not affect the caster."* There is no mention
of a charge/recast mechanic here at all — unlike Devouring Arrow's
explicit "increases after each casting" language. `hasDescarga` still
evaluates true (steal precedes damage), so the UI inserts a "Spell
Discharge" separator and label for a spell that is not a discharge spell.
Because `steal` and `damage` happen to carry the same value here, the `Σ`
total is numerically correct by coincidence (`Σ` = the damage-only value,
which also equals the steal value) — but the UI mislabels the mechanic, and
the heuristic would produce a wrong `Σ` on any future/other spell with the
same `steal`-before-`damage` shape but *different* steal/damage values that
isn't actually a charge spell.

### Finding 5 — `SPELL_ITEM_EFFECT_IDS` recognizes 5 item-effect IDs that `getItemSpellModifiers` never applies

**Confidence: high** (verified directly from code + real equipped-item data).

`src/data/effectIds.ts:1-3` lists 13 ids in `SPELL_ITEM_EFFECT_IDS`:
`204, 205, 207, 208, 209, 226, 227, 240, 243, 245, 274, 276, 279`.

`itemSpellModifiers.ts:35-51` (`getItemSpellModifiers`'s `switch`) only
handles `204, 207, 208, 226, 243, 245, 274, 276`. IDs **205, 209, 227, 240,
279** pass the `effect.min === spellId` filter (so they're correctly matched
to the right spell) but fall through the switch doing nothing — their bonus
is silently dropped, never added to `ItemSpellModifiers`, never shown in the
spell card.

Verified these aren't dead/theoretical IDs — they exist on real equipment in
`public/data/en/equipment.json`:
- `205` = "line of sight off" (e.g. Hat Ariutokinabot → Pressure/Intimidation)
- `209` = "straight-line casting off" (e.g. Hat Tsokey → Epidemic)
- `227` = "-1 cooldown" (e.g. Hat Ariutokinabot → Conquest; Cap Ricott → The Block)
- `240` = "occupied cell needed off" (Cape Ytal → Light Speed)
- `279` = "+1 casts per target" (Ukando Hat → Reflex/Yahtzee/**Topkaj**, id `12846`
  — the same dice spell flagged in Finding 1)

These are mostly boolean/targeting-constraint toggles rather than numeric
stat boosts, and `AppSpellLevel` has no field to display most of them (no
`lineOfSight`/`straightLine`/`cooldown` field exists on the type at all, so
even if read, there's nowhere to render "+1 casts per target" or "-1
cooldown" today). So this isn't a double-counting bug — it's a dropped
feature: equipping e.g. Ukando Hat gives no visible change to Topkaj's spell
card despite the item's own tooltip promising "+1 casts per target."
Severity is low-to-medium (affects a handful of specific items/spells, not
the core damage math), but it's a real, verifiable gap in "do item bonuses
apply" rather than "do they double-apply."

### Finding 6 — Confirmed good: mixed-element "pick one of N elements" spells are correctly protected from being summed

See "Confirmed good" section below — documented there since it's the
counter-example that sharpens Finding 1, not a bug.

### Finding 7 — No "non-cumulable" / stacking-limit field is read for anything except `spell_buff`

**Confidence: cannot be fully verified from this repo.**

The only raw-data fields read anywhere in `scripts/fetch-spells.ts` that
relate to stacking/cumulation are `e.delay` (reinterpreted as `stack`) and
`e.dispellable === 2` (reinterpreted as `deathReset`) — both read **only**
inside the single `actionId === SPELL_BUFF_ID` (293) branch
(`fetch-spells.ts:346-357`). No other effect-extraction branch (damage,
steal, poison, push, ap/mp, erosion, heal_mod) reads any field that could
represent "this effect does not stack with itself" or "max N stacks."

I cannot confirm whether the raw upstream `spell_levels.json` (downloaded at
build time from `dofusdude/dofus3-main` GitHub releases, not present in this
repo) actually carries such a field for poison/DoT effects that real Dofus
mechanics are known to cap (e.g. some poisons don't stack past N
applications) — if it does, it is currently unread and would need a new
field on `AppSpellEffect` to preserve and act on. This is flagged as a gap to
check against the live game or the raw JSON schema, not a confirmed bug.

### Finding 8 — No test exercises `dedupEffects`, `hasDescarga`, or the `Σ` total logic against real multi-effect spells

**Confidence: high** (verified by search + test run).

`pnpm vitest run src/features/spells` passes 38/38 tests across 5 files.
`spellCalc.ts` (home of `dedupEffects`) has **no dedicated test file** —
`spellDamage.test.ts` tests `calcDamage`/`calcEffects` (the math), not the
dedup/merge decision. No test file references `dedupEffects`, `hasDescarga`,
or `showGroupTotal` by name. The specific spells in Findings 1-4 (Topkaj,
Tyrannical Arrow, Devouring Arrow, Crobak Call) are not covered by any
regression test, so none of the above would be caught by CI if the
underlying game data or merge logic changes.

## Confirmed good

- **Multi-hit AoE with a single real value is correctly deduped.**
  `Rough Tongue` (Ecaflip, id `12855`): 2× identical `fire damage 24-27`
  (ally-heal/enemy-damage duplicate) → dedup to 1, matches description
  ("inflicts damage... in an area of effect"). Same pattern, same correct
  result: `Stretcher` (Pandawa, id `12811`, 4× identical), `Pandilongation`
  (Pandawa, id `12793`, 4× identical), `Commotion` (Eniripsa, id `25856`,
  5× identical), `Exploding Arrow` (Cra, id `32444`, 2× identical). This is
  exactly the case `dedupEffects`'s own comment (`spellCalc.ts:57-58`)
  describes, and it works as intended for all of these.

- **The `isMixed` guard correctly prevents summing mutually-exclusive
  multi-element outcomes.** `showGroupTotal` (`SpellsPanel.tsx:260`) requires
  `!isMixed`, and `dominantElement` (`fetch-spells.ts:147-152`) sets
  `element: 'mixed'` whenever a spell's surviving effects span more than one
  element. Verified on three different "pick one of several elements"
  spells: `Alchemical Word` (Eniripsa, id `25802`, 4 elements × 10 damage,
  "based on contents" of one flask), `Trickery` (Ecaflip, id `12881`, 4
  elements × 4 random tiers × steal/damage), `Runification`/`Manifestation`
  (Huppermage, ids `13670`/`13710`, 4 elements of identical-value `steal`,
  "triggers **one** of the caster's runes"). In every one of these, `Σ` is
  correctly suppressed. This is the mechanism Finding 1 shows is *missing*
  for the same-element case — it's real, working protection, just
  element-scoped rather than outcome-scoped.

- **`spell_buff` is correctly exempted from dedup even when it collides on
  the dedup key.** `Atonement Arrow` (Cra, id `32438`), grade 1, has two
  `spell_buff` effects that are identical on `element|kind|min` (`neutral`,
  `spell_buff`, `29`) but differ in `stack` (`2` vs `4`) — a field *not*
  included in the dedup key. Without the `kind === 'spell_buff'` early-return
  at `spellCalc.ts:62`, these would wrongly collapse to one, breaking the
  `chargeSets` tier calculation (`SpellsPanel.tsx:168-178`) that depends on
  having both stack tiers present. Confirmed this is load-bearing, not
  incidental.

- **Explicit per-stack charge math matches the description.** For
  `Atonement Arrow`, `chargeSets` (`SpellsPanel.tsx:169-178`) computes
  bonus = `min × (stack / baseStack)` per tier (29×1=29 at stack 2, 29×2=58 at
  stack 4), consistent with "the spell's damage increases for subsequent
  castings." Matches the dedicated code comment's own worked example
  ("Expiation Arrow... 36 per 2-stack unit").

- **Item/rune bonuses on the same spell correctly sum across multiple
  equipped items, for the IDs that are handled.** `equippedSpellEffects`
  (`SpellsPanel.tsx:1070-1077`) flat-maps `effects` across **every** equipped
  item slot, and `getItemSpellModifiers` (`itemSpellModifiers.ts:29-55`)
  accumulates with `+=` inside a loop over that combined array — so two
  different items both boosting, say, the same spell's AP cost correctly add
  rather than overwrite. Verified by the existing test
  (`itemSpellModifiers.test.ts:13-31`, Prince of Thieves Hat) and by reading
  the aggregation site directly. This answers task item 4 for the 8 IDs that
  are actually wired up (Finding 5 covers the 5 that are not).

- **The historical generic-Damage double-count bug is fixed and stays
  fixed.** `spellDamage.ts:16-17`'s comment and `flatBonus` implementation
  confirm `stats.bestElemDamage` is folded in once, not re-added on top of
  the per-element total that `computeStats` already includes it in.

## Recommendations / next steps

1. **Highest priority — fix `Σ` to exclude `poison` from the instant-hit sum
   (Finding 2).** This affects the broadest set of real spells (43 levels,
   9+ classes) and is the most clear-cut case: a per-turn tick should never
   be added to an instant-hit total and displayed as one number. Minimal fix:
   split `sigmaEffects` into an instant-hit sum and a separate DoT-per-turn
   figure (the poison section already renders separately — just stop folding
   its value into the `Σ` above it).
2. **Decide a policy for same-element multi-outcome spells (Finding 1) and
   get it into `dedupEffects`/`showGroupTotal` deliberately**, rather than
   relying on the `isMixed` guard, which only accidentally covers the
   multi-element case. Likely needs a real signal from the raw data (e.g. a
   dice/card marker) rather than inferring it from effect-value shape.
3. **Re-examine `hasDescarga`** (Findings 3 and 4) against a short list of
   known charge spells (Devouring Arrow, Persecuting Arrow, Boomerang Arrow)
   vs. known non-charge dual steal/damage spells (Crobak Call, Misfortune,
   Fate of Ecaflip, Peril) to find a more reliable discriminator than
   "steal appears before damage" — possibly whether the spell's own
   `description` text contains recast/charge language, or whether a real
   `spell_buff`/charge field exists upstream that isn't being read.
4. **Either wire up or remove the 5 dead IDs in `SPELL_ITEM_EFFECT_IDS`**
   (Finding 5) — at minimum, `227` (-1 cooldown) and `279` (+1 cast per
   target) look like they'd need new fields on `AppSpellLevel` to display at
   all, so this may be a deliberate "recognized but not yet modeled" gap
   rather than an oversight — worth confirming with whoever added the set.
5. **Add regression tests** pinning the exact `displayEffects`/`Σ` output for
   the specific spells named in this report (Topkaj, Tyrannical Arrow,
   Devouring Arrow, Atonement Arrow, Crobak Call, Alchemical Word) so future
   data refreshes (`pnpm fetch-spells`) or logic changes can't silently
   regress these without a test failing (Finding 8).
6. **Confirm Finding 7 against an actual combat log or the raw upstream
   schema** before concluding there's nothing to do — this report could not
   settle it either way from the processed data alone.
