import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CreatureStage, type CreatureStageHandle } from "@/components/CreatureStage.tsx";
import { useCharacterStage } from "@/components/useCharacterStage.ts";
import { useBuildStore } from "@/store/buildStore.ts";
import { useDataStore } from "@/store/dataStore.ts";
import { usePvpStore, type PvpElement } from "@/store/pvpStore.ts";
import { useCombatStats } from "@/store/useCombatStats.ts";
import {
  dedupEffects,
  spellGrade,
  spellMods,
} from "@/features/spells/spellCalc.ts";
import {
  simulateSpellHits,
  simulateWeaponHit,
  type HitResult,
} from "@/features/pvp/simulate.ts";
import { statIconUrl } from "@/features/equipment/statDisplay.ts";
import type { AppSpell } from "@/data/spellLoaders.ts";
import "./pvp.css";

const ELEMENTS: [PvpElement, string][] = [
  ["neutral", "elem_neutral"],
  ["earth", "elem_earth"],
  ["fire", "elem_fire"],
  ["water", "elem_water"],
  ["air", "elem_air"],
];
/** Mirrors the production picker: effects that hit a plain target, without a condition. */
const HITS = new Set(["damage", "steal", "poison"]);

interface Row {
  key: string;
  name: string;
  art: string | null;
  hit: HitResult;
  /** Chance of a critical hit, in percent; 0 when the attack cannot crit. */
  crit: number;
}
/** As production resolves it: the attack's own critical plus the build's, capped at 100. */
const critChance = (base: number, bonus: number) =>
  base > 0 ? Math.min(100, base + bonus) : 0;
const span = (lo: number, hi: number) => (hi > lo ? `${lo} – ${hi}` : String(lo));

/** Every attack of the build against one target: the normal and critical range, side by side. */
// The Poutch Ingball's bone in the character assets (creatures.json).
const POUTCH_BONE = "431";

export function PvpArena({ heading = true }: { heading?: boolean } = {}) {
  const poutch = useRef<CreatureStageHandle>(null),
    stage = useCharacterStage();
  const { t } = useTranslation(),
    b = useBuildStore(),
    stats = useCombatStats(),
    spells = useDataStore((s) => s.spells),
    lang = useDataStore((s) => s.lang),
    loadSpells = useDataStore((s) => s.loadSpells),
    items = useBuildStore((s) => s._equipment),
    resist = usePvpStore((s) => s.resist),
    setResist = usePvpStore((s) => s.setResist),
    reset = usePvpStore((s) => s.reset);
  const weapon = items.find((it) => it.ankama_id === b.equipped.weapon),
    transform = b.weaponTransforms.weapon ?? null,
    grade = spellGrade(b.level);
  // Spells load on demand (SpellsPanel's own effect); the arena needs them
  // too, so it can't rely on that panel having been opened first.
  useEffect(() => {
    if (b.selectedClass) loadSpells(lang, b.selectedClass);
  }, [loadSpells, lang, b.selectedClass]);
  const groups = useMemo(() => {
    if (!stats || !b.selectedClass) return [];
    const rows = (list: AppSpell[]) =>
      list.flatMap((spell): Row[] => {
        const level =
          spell.levels.find((l) => l.grade === grade) ?? spell.levels.at(-1);
        if (
          !level ||
          !dedupEffects(level.effects).some(
            (e) => HITS.has(e.kind) && e.condition === undefined,
          )
        )
          return [];
        return simulateSpellHits(
          spell.id,
          level,
          stats,
          spellMods(stats, level.minRange, level.maxRange),
          resist,
        ).map((variant) => ({
          key: "s" + spell.id + (variant.element ? "-" + variant.element : ""),
          name: variant.element ? spell.name + " · " + t(`elem_${variant.element}`) : spell.name,
          art: spell.image_url,
          hit: variant.hit,
          crit: critChance(level.critChance, stats.critChance),
        }));
      });
    const own = spells.get(b.selectedClass)?.spells ?? [],
      common = spells.get("common")?.spells ?? [];
    return [
      {
        titleKey: "slot_weapon",
        rows: weapon
          ? [
              {
                key: "weapon",
                name: weapon.name,
                art: weapon.image_url,
                hit: simulateWeaponHit(weapon, stats, resist, transform),
                crit: critChance(weapon.crit_chance ?? 0, stats.critChance),
              },
            ]
          : [],
      },
      { titleKey: "spells", rows: rows(own.filter((s) => !s.is_variant)) },
      { titleKey: "spell_col_variant", rows: rows(own.filter((s) => s.is_variant)) },
      { titleKey: "spells_common", rows: rows(common) },
    ].filter((g) => g.rows.length);
  }, [stats, spells, resist, weapon, transform, grade, b.selectedClass]);
  const [last, setLast] = useState<{
    key: string;
    name: string;
    value: number;
    crit: boolean;
    id: number;
  } | null>(null);
  /** One hit, as in production: decide whether it crits, then pick a value in that range. */
  function roll(row: Row) {
    const crit =
        row.hit.hasCrit && row.crit > 0 && Math.random() * 100 < row.crit,
      lo = crit ? row.hit.critMin : row.hit.min,
      hi = crit ? row.hit.critMax : row.hit.max;
    poutch.current?.hit();
    setLast((prev) => ({
      key: row.key,
      name: row.name,
      value: hi > lo ? lo + Math.floor(Math.random() * (hi - lo + 1)) : lo,
      crit,
      id: (prev?.id ?? 0) + 1,
    }));
  }
  const untouched = ELEMENTS.every(
    ([el]) => !resist[el].fixed && !resist[el].percent,
  );
  return (
    <div className="combat">
      {heading && <h2 className="combat-title">{t("tool_pvp")}</h2>}
      <div className="combat-layout">
        <div className="combat-side">
          <div className={"combat-stage" + (stage.show ? "" : " is-flat")}>
            {stage.show && (
              <div className="combat-poutch">
                <CreatureStage ref={poutch} bone={POUTCH_BONE} width={150} height={160} onError={stage.fail} />
                {last && (
                  <span key={last.id} className={"combat-pop" + (last.crit ? " is-crit" : "")} aria-hidden="true">
                    −{last.value}
                  </span>
                )}
              </div>
            )}
            <div className="combat-roll" aria-live="polite">
              <span>{t("sim_last_hit")}</span>
              {last ? (
                <>
                  <strong className={last.crit ? "is-crit" : ""}>{last.value}</strong>
                  <small>
                    {last.name} · {last.crit ? t("sim_crit_hit") : t("sim_normal_hit")}
                  </small>
                </>
              ) : (
                <small>{t("sim_roll_hint")}</small>
              )}
            </div>
          </div>
          <section className="combat-target" aria-label={t("sim_target")}>
          <header>
            <h3>{t("sim_target")}</h3>
            <button disabled={untouched} onClick={reset}>
              {t("pvp_dummy_reset")}
            </button>
          </header>
          <div className="combat-resist" role="group" aria-label={t("section_resistances")}>
            <span>{t("sim_resistance")}</span>
            <span>{t("sim_fixed")}</span>
            <span>%</span>
            {ELEMENTS.map(([el, nameKey]) => (
              <div key={el}>
                <span className={el}>
                  <img src={statIconUrl(el + "_resistance")} alt="" />
                  {t(nameKey)}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label={t("sim_fixed_label", { element: t(nameKey) })}
                  value={resist[el].fixed}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setResist(
                      el,
                      "fixed",
                      Math.max(0, parseInt(e.target.value, 10) || 0),
                    )
                  }
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  aria-label={t("sim_percent_label", { element: t(nameKey) })}
                  value={resist[el].percent}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setResist(
                      el,
                      "percent",
                      Math.min(
                        100,
                        Math.max(0, parseInt(e.target.value, 10) || 0),
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <p>
            {untouched
              ? t("sim_untouched")
              : t("sim_applied")}{" "}
            {t("sim_passives")}
          </p>
          </section>
        </div>
        <section className="combat-damage" aria-label={t("sim_damage")}>
          {!groups.length ? (
            <div className="tool-empty">
              <h3>{t("sim_empty_title")}</h3>
              <p>{t("sim_empty_body")}</p>
            </div>
          ) : (
            <table>
              <caption className="sr-only">{t("sim_caption")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("sim_attack")}</th>
                  <th scope="col">{t("sim_normal_col")}</th>
                  <th scope="col">{t("weapon_crit_col")}</th>
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group.titleKey}>
                  <tr className="combat-group">
                    <th scope="colgroup" colSpan={3}>
                      {t(group.titleKey)}
                    </th>
                  </tr>
                  {group.rows.map((row) => (
                    <tr
                      key={row.key}
                      className={"combat-attack" + (last?.key === row.key ? " is-rolled" : "")}
                      onClick={() => roll(row)}
                    >
                      <th scope="row">
                        {/* The whole row rolls on click; this button is its keyboard way in. */}
                        <button type="button" className="combat-cast" title={t("sim_roll_label", { name: row.name })}
                          onClick={(e) => { e.stopPropagation(); roll(row); }}>
                          {row.art ? <img src={row.art} alt="" /> : <i />}
                          {row.name}
                        </button>
                        {last?.key === row.key && (
                          <small className="combat-hit">
                            {t("sim_hit")} <b>{last.value}</b>
                            {last.crit ? " · " + t("sim_crit_lower") : ""}
                          </small>
                        )}
                      </th>
                      <td>{span(row.hit.min, row.hit.max)}</td>
                      <td className={row.hit.hasCrit ? "is-crit" : "is-none"}>
                        {row.hit.hasCrit
                          ? span(row.hit.critMin, row.hit.critMax)
                          : t("sim_no_crit")}
                        {row.hit.hasCrit && row.crit > 0 && (
                          <small>{t("sim_chance", { chance: row.crit })}</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
