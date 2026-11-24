import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, Sword } from "lucide-react";
import { ALL_SLOTS, useBuildStore } from "@/store/buildStore.ts";
import { useDataStore } from "@/store/dataStore.ts";
import { useCombatStats } from "@/store/useCombatStats.ts";
import type { AppSpell, AppSpellCondition, AppSpellElement } from "@/data/spellLoaders.ts";
import type { AppEffect } from "@/data/loaders.ts";
import type { StatBlock } from "@/engine/types.ts";
import { SPELL_ITEM_EFFECT_IDS } from "@/data/effectIds.ts";
import { DamageHover } from "@/features/spells/DamageHover.tsx";
import { fmtRange, spellGrade, conditionKey } from "@/features/spells/spellCalc.ts";
import {
  rollOf,
  spellView,
  weaponView,
  type SpellGroup,
  type SpellHit,
  type SpellView,
} from "@/features/spells/spellView.ts";
import { runeIconUrl, statIconUrl } from "@/features/equipment/statDisplay.ts";
import "./spells.css";

type Filter = AppSpellElement | "all";
const FILTERS: [Filter, string][] = [
  ["all", "elem_all"],
  ["earth", "elem_earth"],
  ["fire", "elem_fire"],
  ["water", "elem_water"],
  ["air", "elem_air"],
  ["neutral", "elem_neutral"],
];
const ELEMENT_NAME: Record<string, string> = {
  earth: "elem_earth",
  fire: "elem_fire",
  water: "elem_water",
  air: "elem_air",
  neutral: "elem_neutral",
  mixed: "elem_mixed",
};
const range = (r: [number, number]) => fmtRange(r[0], r[1]);

function conditionLabel(
  t: (key: string, opts?: Record<string, unknown>) => string,
  condition: AppSpellCondition,
) {
  if (condition.kind === "shield") return t("spell_condition_shield");
  if (condition.kind === "low_target_hp")
    return t("spell_condition_low_target_hp", { threshold: condition.threshold });
  return condition.label;
}

/** Normal and critical value of one line, each with its step-by-step breakdown on hover. */
function Values({
  hit,
  view,
  stats,
  showCrit,
}: {
  hit: SpellHit;
  view: SpellView;
  stats: StatBlock | null;
  showCrit: boolean;
}) {
  const { t } = useTranslation(),
    { effect, crit } = hit;
  return (
    <>
      <div className="sp-line">
        <i className={"sp-dot " + effect.element} aria-hidden="true" />
        <span className="sp-label">
          {ELEMENT_NAME[effect.element] ? t(ELEMENT_NAME[effect.element]) : effect.element}
        </span>
        <span className="sp-normal">
          <DamageHover roll={rollOf(effect)} elem={effect.element} stats={stats} mods={view.mods} kind="spell">
            {fmtRange(effect.calcMin, effect.calcMax)}
          </DamageHover>
        </span>
        {showCrit && (
          <span className="sp-crit">
            {crit ? (
              <DamageHover
                roll={rollOf(crit)}
                elem={crit.element}
                stats={stats}
                mods={view.mods}
                extraFlat={stats?.critDamage ?? 0}
                kind="spell"
                crit
              >
                {fmtRange(crit.calcMin, crit.calcMax)}
              </DamageHover>
            ) : (
              "—"
            )}
          </span>
        )}
      </div>
      {hit.heal && (
        <div className="sp-line is-heal">
          <img src={statIconUrl("heals")} alt="" />
          <span className="sp-label">{t("spells_heal")}</span>
          <span className="sp-normal">{range(hit.heal)}</span>
          {showCrit && <span className="sp-crit">{hit.critHeal ? range(hit.critHeal) : "—"}</span>}
        </div>
      )}
    </>
  );
}

function Group({
  group,
  view,
  stats,
  names,
}: {
  group: SpellGroup;
  view: SpellView;
  stats: StatBlock | null;
  names: Map<number, string>;
}) {
  const { t } = useTranslation();
  const showCrit = group.showCritColumn;
  const note = (key: string, icon: string, text: ReactNode) => (
    <p key={key} className="sp-note">
      <img src={statIconUrl(icon)} alt="" />
      {text}
    </p>
  );
  const rows: ReactNode[] = [];
  for (const entry of group.entries) {
    switch (entry.kind) {
      case "section":
        rows.push(
          <p className="sp-sub" key={entry.section}>
            {entry.section === "discharge"
              ? t("spell_discharge")
              : t("spell_poison", { turns: entry.turns })}
          </p>,
        );
        break;
      case "push":
        rows.push(
          note(
            `p${entry.index}`,
            "push_damage",
            <>
              {t("spell_push", { cells: entry.cells })}
              {entry.collision != null && (
                <small> {t("spell_push_collision", { dmg: String(entry.collision) })}</small>
              )}
            </>,
          ),
        );
        break;
      case "ap":
        rows.push(note(`a${entry.index}`, "ap_reduction", t("spell_steal_ap", { n: fmtRange(entry.effect.calcMin, entry.effect.calcMax) })));
        break;
      case "mp":
        rows.push(note(`m${entry.index}`, "mp_reduction", t("spell_steal_mp", { n: fmtRange(entry.effect.calcMin, entry.effect.calcMax) })));
        break;
      case "ap_gain":
        rows.push(note(`ag${entry.index}`, "ap", t("spell_gain_ap", { n: fmtRange(entry.effect.calcMin, entry.effect.calcMax) })));
        break;
      case "mp_gain":
        rows.push(note(`mg${entry.index}`, "mp", t("spell_gain_mp", { n: fmtRange(entry.effect.calcMin, entry.effect.calcMax) })));
        break;
      case "erosion":
        rows.push(note(`er${entry.index}`, "erosion", t("spell_erosion", { pct: entry.pct, turns: entry.turns })));
        break;
      case "heal_mod":
        rows.push(note(`hm${entry.index}`, "heals", t("spell_heal_mod", { pct: entry.pct })));
        break;
      case "spell_buff":
        rows.push(
          <p key={`sb${entry.index}`} className="sp-note">
            <span aria-hidden="true">★</span>
            {t("spells_buff_base", {
              name: names.get(entry.spellId ?? 0) ?? `#${entry.spellId ?? "?"}`,
              base: entry.base,
            })}
            {entry.turns > 0 && " · " + t("spells_buff_turns", { count: entry.turns })}
            {entry.deathReset && " · " + t("spells_death_reset")}
          </p>,
        );
        break;
      case "hit":
        rows.push(<Values key={`e${entry.index}`} hit={entry} view={view} stats={stats} showCrit={showCrit} />);
        break;
    }
  }
  return (
    <div className={"sp-group" + (showCrit ? " has-crit" : "")}>
      {group.condition && <h4>{conditionLabel(t, group.condition)}</h4>}
      {group.hasDamage && (
        <div className="sp-line is-head" aria-hidden="true">
          <span />
          <span />
          <span className="sp-normal">{t("weapon_normal")}</span>
          {showCrit && <span className="sp-crit">{t("weapon_crit_col")}</span>}
        </div>
      )}
      {rows}
      {group.charges.map(({ label, hits }) => (
        <div key={label} className="sp-charge">
          <p className="sp-sub">{t("spell_charge_n", { n: label })}</p>
          {hits.map((hit, i) => (
            <Values key={i} hit={hit} view={view} stats={stats} showCrit={showCrit} />
          ))}
        </div>
      ))}
      {group.total && (
        <div className="sp-line is-total">
          <span />
          <span className="sp-label">{t("weapon_total")}</span>
          <span className="sp-normal">{range(group.total.normal)}</span>
          {showCrit && <span className="sp-crit">{range(group.total.crit)}</span>}
        </div>
      )}
      {group.total?.heal && (
        <div className="sp-line is-heal">
          <img src={statIconUrl("heals")} alt="" />
          <span className="sp-label">{t("spells_total_heal")}</span>
          <span className="sp-normal">{range(group.total.heal.normal)}</span>
          {showCrit && <span className="sp-crit">{range(group.total.heal.crit)}</span>}
        </div>
      )}
      {group.pushTotal && (
        <div className="sp-line is-total">
          <span />
          <span className="sp-label">{t("spells_total_collision")}</span>
          <span className="sp-normal">{range(group.pushTotal.normal)}</span>
          {showCrit && <span className="sp-crit">{range(group.pushTotal.crit)}</span>}
        </div>
      )}
    </div>
  );
}

function Spell({
  spell,
  grade,
  stats,
  itemEffects,
  names,
}: {
  spell: AppSpell;
  grade: number;
  stats: StatBlock | null;
  itemEffects: AppEffect[];
  names: Map<number, string>;
}) {
  const { t } = useTranslation(),
    level = useBuildStore((s) => s.level);
  const view = useMemo(
    () => spellView({ spell, grade, stats, itemEffects, characterLevel: level }),
    [spell, grade, stats, itemEffects, level],
  );
  const [base, ...conditions] = view.groups;
  return (
    <article className={"sp-spell " + spell.element} aria-label={spell.name}>
      <header>
        {spell.image_url ? <img src={spell.image_url} alt="" loading="lazy" /> : <i />}
        <div>
          <h3>
            {spell.name}
            {spell.is_variant && <small>{t("spell_variant_badge")}</small>}
          </h3>
          {view.level && (
            <p className="sp-meta">
              <span>
                <img src={statIconUrl("ap")} alt="" />
                <b>{view.ap}</b> {t("badge_ap")}
              </span>
              <span>
                <img src={statIconUrl("range")} alt="" />
                {view.range.melee
                  ? t("spell_melee")
                  : view.range.min === view.range.max
                    ? view.range.max
                    : `${view.range.min}–${view.range.max}`}
              </span>
              {view.crit > 0 && (
                <span>
                  <img src={statIconUrl("crit")} alt="" />
                  {view.crit} %
                </span>
              )}
              {view.maxPerTurn > 0 && <span>{t("spells_per_turn", { n: view.maxPerTurn })}</span>}
            </p>
          )}
        </div>
      </header>
      {base ? (
        <>
          <Group group={base} view={view} stats={stats} names={names} />
          {conditions.map((group) => (
            <Group key={conditionKey(group.condition!)} group={group} view={view} stats={stats} names={names} />
          ))}
        </>
      ) : (
        <p className="sp-support">{t("spell_support")}</p>
      )}
      {view.buffs.length > 0 && (
        <ul className="sp-buffs">
          {view.buffs.map((buff, i) => (
            <li key={i} className={buff.tone}>
              {buff.icon ? (
                <img src={statIconUrl(buff.icon)} alt="" />
              ) : (
                <span aria-hidden="true">{buff.tone === "negative" ? "▼" : buff.tone === "positive" ? "▲" : "◆"}</span>
              )}
              {buff.text}
            </li>
          ))}
        </ul>
      )}
      {view.itemEffects.length > 0 && (
        <div className="sp-items">
          <p className="sp-sub">{t("spells_gear_effects")}</p>
          {view.itemEffects.map((effect, i) => (
            <p key={`${effect.effect_id}-${i}`}>{effect.formatted}</p>
          ))}
        </div>
      )}
      {view.description && <p className="sp-description">{view.description}</p>}
    </article>
  );
}

function Weapon({ stats }: { stats: StatBlock | null }) {
  const { t } = useTranslation(),
    equipped = useBuildStore((s) => s.equipped.weapon),
    transform = useBuildStore((s) => s.weaponTransforms.weapon ?? null),
    items = useBuildStore((s) => s._equipment),
    weapon = (items ?? []).find((it) => it.ankama_id === equipped) ?? null;
  const [mastery, setMastery] = useState({ active: false, normal: 300, crit: 360 });
  if (!weapon)
    return (
      <article className="sp-spell sp-weapon">
        <header>
          <i className="sp-fist">
            <Sword size={20} />
          </i>
          <div>
            <h3>{t("weapon_fist")}</h3>
            <p className="sp-meta">
              <span>
                <b>1</b> {t("badge_ap")}
              </span>
              <span>{t("spell_melee")}</span>
            </p>
          </div>
        </header>
      </article>
    );
  const view = weaponView({ weapon, stats, transform, mastery });
  const showCrit = view.hasCrit;
  const line = (
    key: string,
    label: string,
    elem: string | null,
    row: (typeof view.damage)[number],
  ) => (
    <div key={key}>
      <div className="sp-line">
        <i className={"sp-dot " + (elem ?? "mixed")} aria-hidden="true" />
        <span className="sp-label">{label}</span>
        <span className="sp-normal">
          <DamageHover roll={[row.baseLow, row.baseHigh]} elem={row.elem} stats={stats} mods={view.normalMods} kind="weapon">
            {fmtRange(row.low, row.high)}
          </DamageHover>
        </span>
        {showCrit && (
          <span className="sp-crit">
            <DamageHover
              roll={[row.baseLow + view.critBonus, row.baseHigh + view.critBonus]}
              elem={row.elem}
              stats={stats}
              mods={view.critMods}
              extraFlat={stats?.critDamage ?? 0}
              kind="weapon"
              crit
            >
              {fmtRange(row.critLow, row.critHigh)}
            </DamageHover>
          </span>
        )}
      </div>
      {row.heal && (
        <div className="sp-line is-heal">
          <img src={statIconUrl("heals")} alt="" />
          <span className="sp-label">{t("spells_heal")}</span>
          <span className="sp-normal">{range(row.heal)}</span>
          {showCrit && <span className="sp-crit">{row.critHeal ? range(row.critHeal) : "—"}</span>}
        </div>
      )}
    </div>
  );
  return (
    <article className="sp-spell sp-weapon" aria-label={weapon.name}>
      <header>
        <span className="sp-weapon-art">
          {weapon.image_url ? <img src={weapon.image_url} alt="" /> : <Sword size={20} />}
          {view.transform && (
            <img className="sp-potion" src={runeIconUrl(`transform_${view.transform.element}`) ?? ""} alt="" />
          )}
        </span>
        <div>
          <h3>
            {weapon.name}
            {view.level > 0 && <small>{t("level")} {view.level}</small>}
          </h3>
          <p className="sp-meta">
            {view.ap > 0 && (
              <span>
                <img src={statIconUrl("ap")} alt="" />
                <b>{view.ap}</b> {t("badge_ap")}
              </span>
            )}
            <span>
              <img src={statIconUrl("range")} alt="" />
              {view.range.melee
                ? t("spell_melee")
                : view.range.min === view.range.max
                  ? view.range.min
                  : `${view.range.min}–${view.range.max}`}
            </span>
            {view.crit > 0 && (
              <span>
                <img src={statIconUrl("crit")} alt="" />
                {view.crit} %{view.critBonus > 0 && ` (+${view.critBonus})`}
              </span>
            )}
            {view.transform && (
              <span className={"sp-transform " + view.transform.element}>
                {t(ELEMENT_NAME[view.transform.element])} {view.transform.ratio} %
              </span>
            )}
          </p>
        </div>
      </header>
      <div className="sp-mastery">
        <label>
          <input
            type="checkbox"
            checked={mastery.active}
            onChange={(e) => setMastery({ ...mastery, active: e.target.checked })}
          />
          {t("spells_mastery")}
        </label>
        {mastery.active && (
          <>
            <label>
              {t("spells_mastery_normal")}
              <input
                inputMode="numeric"
                value={mastery.normal}
                onChange={(e) => setMastery({ ...mastery, normal: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              />
            </label>
            <label>
              {t("spells_mastery_crit")}
              <input
                inputMode="numeric"
                value={mastery.crit}
                onChange={(e) => setMastery({ ...mastery, crit: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              />
            </label>
          </>
        )}
      </div>
      {(view.damage.length > 0 || view.mpRemoval.length > 0 || view.steal.length > 0) && (
        <div className={"sp-group" + (showCrit ? " has-crit" : "")}>
          <div className="sp-line is-head" aria-hidden="true">
            <span />
            <span />
            <span className="sp-normal">{t("weapon_normal")}</span>
            {showCrit && <span className="sp-crit">{t("weapon_crit_col")}</span>}
          </div>
          {view.damage.map((row, i) =>
            line(
              `d${i}`,
              row.best ? t("spells_best_element") : t(ELEMENT_NAME[row.elem ?? "mixed"]),
              row.elem,
              row,
            ),
          )}
          {view.mpRemoval.map((r, i) => (
            <div key={`mp${i}`} className="sp-line">
              <img src={statIconUrl("mp_reduction")} alt="" />
              <span className="sp-label">{t("stat_mp_removal")}</span>
              <span className="sp-normal">{range(r)}</span>
              {showCrit && <span className="sp-crit" />}
            </div>
          ))}
          {view.steal.map((row, i) =>
            line(
              `s${i}`,
              t("spells_steal", {
                element: t(ELEMENT_NAME[row.elem ?? "mixed"]).toLowerCase(),
              }),
              row.elem,
              row,
            ),
          )}
          {view.total && (
            <div className="sp-line is-total">
              <span />
              <span className="sp-label">{t("weapon_total")}</span>
              <span className="sp-normal">{range(view.total.normal)}</span>
              {showCrit && <span className="sp-crit">{range(view.total.crit)}</span>}
            </div>
          )}
          {view.total?.heal && (
            <div className="sp-line is-heal">
              <img src={statIconUrl("heals")} alt="" />
              <span className="sp-label">{t("spells_total_heal")}</span>
              <span className="sp-normal">{range(view.total.heal.normal)}</span>
              {showCrit && <span className="sp-crit">{range(view.total.heal.crit)}</span>}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/** Pairs each spell with the variant that replaces it; the data lists them in that order. */
function pairs(list: AppSpell[]) {
  const out: [AppSpell | null, AppSpell | null][] = [];
  for (const spell of list) {
    if (!spell.is_variant) out.push([spell, null]);
    else if (out.length && !out[out.length - 1][1]) out[out.length - 1][1] = spell;
    else out.push([null, spell]);
  }
  return out;
}

/** The weapon attack, then each spell next to its variant, with damage for the build's stats. */
export function SpellsPanel({ heading = true }: { heading?: boolean } = {}) {
  const { t } = useTranslation(),
    b = useBuildStore(),
    stats = useCombatStats(),
    spells = useDataStore((s) => s.spells),
    lang = useDataStore((s) => s.lang),
    loadSpells = useDataStore((s) => s.loadSpells),
    items = useBuildStore((s) => s._equipment);
  const auto = spellGrade(b.level),
    [manual, setManual] = useState<number | null>(null),
    grade = manual ?? auto,
    [filter, setFilter] = useState<Filter>("all");
  useEffect(() => setManual(null), [b.selectedClass]);
  useEffect(() => {
    if (b.selectedClass) loadSpells(lang, b.selectedClass);
  }, [loadSpells, lang, b.selectedClass]);
  const itemEffects = useMemo(
    () =>
      ALL_SLOTS.flatMap((slot) =>
        ((items ?? []).find((it) => it.ankama_id === b.equipped[slot])?.effects ?? []).filter(
          (e) => e.formatted && SPELL_ITEM_EFFECT_IDS.has(e.effect_id ?? -1),
        ),
      ),
    [b.equipped, items],
  );
  const names = useMemo(() => {
    const map = new Map<number, string>();
    for (const set of spells.values()) for (const sp of set.spells) map.set(sp.id, sp.name);
    return map;
  }, [spells]);
  const own = b.selectedClass ? spells.get(b.selectedClass) : null,
    common = spells.get("common");
  const keep = (sp: AppSpell | null) => sp && (filter === "all" || sp.element === filter) ? sp : null;
  const section = (title: string, list: AppSpell[]) => {
    const shown = pairs(list)
      .map(([a, z]) => [keep(a), keep(z)] as const)
      .filter(([a, z]) => a || z);
    return (
      <section className="sp-section" aria-label={title}>
        <h3 className="sp-section-title">
          {title}
          <span>{t("spells_section_cols")}</span>
        </h3>
        {!shown.length && <p className="sp-empty">{t("spells_none_element")}</p>}
        {shown.map(([a, z], i) => (
          <div className="sp-pair" key={(a ?? z)!.id + "-" + i}>
            {a ? <Spell spell={a} grade={grade} stats={stats} itemEffects={itemEffects} names={names} /> : <div />}
            {z ? <Spell spell={z} grade={grade} stats={stats} itemEffects={itemEffects} names={names} /> : <div />}
          </div>
        ))}
      </section>
    );
  };
  return (
    <div className="sp">
      {heading && <h2 className="sp-title">{t("tool_spells")}</h2>}
      <div className="sp-controls">
        <div role="group" aria-label={t("spells_grades")} className="sp-grades">
          <span>{t("spells_grade")}</span>
          {[1, 2, 3, 4, 5, 6].map((g) => (
            <button
              key={g}
              aria-pressed={g === grade}
              className={g === auto ? "is-auto" : ""}
              aria-label={
                t("spells_grade_n", { grade: g }) +
                (g === auto ? " " + t("spells_grade_yours") : "")
              }
              onClick={() => setManual(g === auto ? null : g)}
            >
              {g}
            </button>
          ))}
          {manual != null && (
            <button className="sp-reset" aria-label={t("spells_grade_reset")} onClick={() => setManual(null)}>
              <RotateCcw size={14} />
            </button>
          )}
        </div>
        <div role="radiogroup" aria-label={t("element_header")} className="sp-filters">
          {FILTERS.map(([key, labelKey]) => (
            <button
              key={key}
              role="radio"
              aria-checked={filter === key}
              className={key}
              onClick={() => setFilter(key)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>
      <p className="sp-hint">
        {stats
          ? t("spells_hint_stats")
          : t("spells_hint_base")}{" "}
        {t("spells_hint_simulation")}
      </p>
      <section className="sp-section" aria-label={t("spells_weapon_attack")}>
        <h3 className="sp-section-title">{t("spells_weapon_attack")}</h3>
        <Weapon stats={stats} />
      </section>
      {b.selectedClass &&
        (own ? (
          section(t("spells_class"), own.spells)
        ) : (
          <p className="sp-empty">{t("spells_loading")}</p>
        ))}
      {common && common.spells.length > 0 && section(t("spells_common"), common.spells)}
    </div>
  );
}
