import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  Bookmark,
  Compass,
  Eye,
  Flag,
  FolderPlus,
  GitFork,
  Heart,
  History,
  MessageSquare,
  RotateCcw,
  ScrollText,
  Sparkles,
  Star,
  UploadCloud,
  X,
} from "lucide-react";
import { CharacterStage } from "../../../src/components/CharacterStage";
import { CLASS_DATA } from "../../../src/features/class-picker/classData";
import { resolveClassName } from "../../../src/features/class-picker/useClassName";
import { encodeSnapshot } from "../../../src/features/share/codec";
import { computeActiveSets } from "../../../src/features/equipment/SetBonusesPanel";
import {
  STAT_META,
  fmtValue,
  isIgnored,
  statIconUrl,
} from "../../../src/features/equipment/statDisplay";
import {
  ITEM_PASSIVES,
  TEXT_ONLY_PASSIVES,
  type PassiveBonus,
} from "../../../src/engine/passives";
import { bonusParts } from "../../../src/features/passives/passiveLabels";
import { useBuildStore, type SlotId } from "../../../src/store/buildStore";
import type { ReportReason } from "../../../src/features/builds/api";
import type { StatBlock } from "../../../src/engine/types";
import { SlotIcon } from "../../../src/ui/SlotIcon";
import { useAccountLocale } from "./Account";
import { useAccountStudy } from "./account-model";
import { sheetStats, type SheetBuild } from "./BuildSheet";
import { ItemPeek } from "./ItemFacts";
import { librarySnapshot, useLibraryStudy } from "./library-model";
import { equipment } from "./model";
import { Modal } from "./SurfaceModal";
import { Sets } from "./Sets";
import {
  COMMENT_MAX,
  REPORT_DETAIL_MAX,
  STUDY_PLAYER,
  detailFromLibrary,
  detailScenes,
  useBuildDetailStudy,
  type DetailBuild,
  type DetailComment,
  type DetailScene,
  type DetailVersion,
  type ReportTarget,
} from "./build-detail-model";
import "./build-detail.css";

const LEFT: SlotId[] = ["hat", "cape", "weapon", "shield", "companion"];
const RIGHT: SlotId[] = ["amulet", "ring1", "ring2", "belt", "boots"];
const DOFUS: SlotId[] = [
  "dofus1",
  "dofus2",
  "dofus3",
  "dofus4",
  "dofus5",
  "dofus6",
];
const REASONS: ReportReason[] = [
  "spam",
  "incorrect_data",
  "inappropriate",
  "other",
];
const CHARACTERISTICS = [
  ["vitality", "char_vitality", false],
  ["wisdom", "char_wisdom", false],
  ["strength", "char_strength", true],
  ["intelligence", "char_intelligence", true],
  ["chance", "char_chance", true],
  ["agility", "char_agility", true],
] as const;
const ELEMENT_ROWS = [
  ["neutral", "elem_neutral", "neutralDamage", "neutralResFixed", "neutralResPercent"],
  ["earth", "elem_earth", "earthDamage", "earthResFixed", "earthResPercent"],
  ["fire", "elem_fire", "fireDamage", "fireResFixed", "fireResPercent"],
  ["water", "elem_water", "waterDamage", "waterResFixed", "waterResPercent"],
  ["air", "elem_air", "airDamage", "airResFixed", "airResPercent"],
] as const;
const COMBAT = [
  ["initiative", "stat_initiative", "initiative", ""],
  ["dodge", "stat_dodge", "dodge", ""],
  ["lock", "stat_lock", "lock", ""],
  ["heals", "stat_heals", "heals", ""],
  ["power", "stat_power", "power", ""],
  ["crit", "stat_crit_chance", "critChance", "%"],
  ["crit_damage", "stat_crit_damage", "critDamage", ""],
  ["crit_res", "build_v4_crit_res", "critResistance", ""],
  ["push_damage", "build_v4_push_damage", "pushbackDamage", ""],
  ["push_resistance", "build_v4_push_res", "pushbackResist", ""],
  ["prospecting", "stat_prospecting", "prospecting", ""],
  ["summons", "stat_summons", "summons", ""],
  ["pods", "stat_pods", "pods", ""],
  ["ap_parry", "stat_ap_parry", "apParry", ""],
  ["mp_parry", "stat_mp_parry", "mpParry", ""],
  ["ap_reduction", "stat_ap_removal", "apReduction", ""],
  ["mp_reduction", "stat_mp_removal", "mpReduction", ""],
] as const;
const MODIFIERS = [
  ["melee_damage", "stat_melee_dmg", "meleeDamagePercent"],
  ["ranged_damage", "stat_ranged_dmg", "rangedDamagePercent"],
  ["spell_damage", "stat_spell_dmg", "spellDamagePercent"],
  ["weapon_damage", "stat_weapon_dmg", "weaponDamagePercent"],
  ["damage", "stat_final_dmg", "finalDamagePercent"],
  ["damage", "stat_target_vulnerability", "targetVulnerabilityPercent"],
  ["melee_resistance", "stat_melee_res", "meleeResistPercent"],
  ["ranged_resistance", "stat_ranged_res", "rangedResistPercent"],
] as const;

const num = (s: StatBlock, key: string) =>
  Number(s[key as keyof StatBlock] ?? 0) || 0;

function workshopHref(sheet: SheetBuild, build: DetailBuild, own: boolean) {
  const link = own
    ? "&edit=" + build.id
    : build.visibility === "public"
      ? "&fork=" + build.id
      : "";
  return (
    "/?b=" +
    encodeSnapshot({ ...librarySnapshot({ sheet }), n: build.sheet.name }) +
    link
  );
}
function classImage(sheet: SheetBuild) {
  const info = CLASS_DATA.find((c) => c.id === sheet.classId);
  return info
    ? sheet.gender === "female"
      ? info.imageFUrl
      : info.imageUrl
    : "/design-assets/forge-mark.svg";
}
function Initial({ name }: { name: string }) {
  return (
    <span className="detail-initial" aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function DetailReview() {
  const { t, i18n } = useAccountLocale(),
    s = useBuildDetailStudy(),
    account = useAccountStudy();
  return (
    <details className="account-review detail-review">
      <summary>
        {t("build_v4_review")}
        <span>{t("account_v4_local_only")}</span>
      </summary>
      <div>
        <label>
          {t("account_v4_scenario")}
          <select
            value={s.scene}
            onChange={(e) => s.setScene(e.target.value as DetailScene)}
          >
            {detailScenes.map((scene) => (
              <option value={scene} key={scene}>
                {t("build_v4_scene_" + scene)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("account_v4_session")}
          <select
            value={account.signedIn ? (s.admin ? "admin" : "in") : "out"}
            onChange={(e) => {
              account.setSignedIn(e.target.value !== "out");
              s.setAdmin(e.target.value === "admin");
            }}
          >
            <option value="in">{t("account_v4_signed_in")}</option>
            <option value="admin">{t("build_v4_signed_in_admin")}</option>
            <option value="out">{t("account_v4_signed_out")}</option>
          </select>
        </label>
        <label>
          {t("account_v4_language")}
          <select
            value={i18n.language}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
          >
            {["es", "en", "fr", "pt"].map((lang) => (
              <option key={lang}>{lang}</option>
            ))}
          </select>
        </label>
      </div>
    </details>
  );
}

function StarRating({
  value,
  onRate,
}: {
  value: number;
  onRate: (n: number) => void;
}) {
  const { t } = useAccountLocale();
  return (
    <div
      className="detail-stars"
      role="group"
      aria-label={t("build_detail_your_rating")}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onRate(n)}
          aria-label={t("a11y_rate_star", { count: n })}
          aria-pressed={n === value}
          className={n <= value ? "is-on" : ""}
        >
          <Star size={20} />
        </button>
      ))}
    </div>
  );
}

function GearStage({ build }: { build: DetailBuild }) {
  const { t, i18n } = useAccountLocale(),
    info = CLASS_DATA.find((c) => c.id === build.sheet.classId)!,
    [failed, setFailed] = useState(false),
    [narrow, setNarrow] = useState(() => matchMedia("(max-width: 700px)").matches);
  useEffect(() => {
    const q = matchMedia("(max-width: 700px)"),
      on = () => setNarrow(q.matches);
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  const slotName = (slot: SlotId) =>
    slot === "companion"
      ? t("build_v4_slot_companion")
      : slot.startsWith("dofus")
        ? t("build_v4_slot_dofus")
        : t("slot_" + slot);
  const tile = (slot: SlotId) => {
    const item = equipment.get(build.sheet.slots[slot] || 0);
    return item ? (
      <ItemPeek item={item} key={slot}>
        <span
          className="detail-tile"
          tabIndex={0}
        >
          <img
            src={item.image_url || "/design-assets/forge-mark.svg"}
            alt={slotName(slot) + ": " + item.name}
          />
        </span>
      </ItemPeek>
    ) : (
      <span
        key={slot}
        className="detail-tile is-empty"
        role="img"
        aria-label={t("build_v4_slot_empty", { slot: slotName(slot) })}
      >
        <SlotIcon slot={slot} />
      </span>
    );
  };
  const worn = [...LEFT, ...RIGHT, ...DOFUS].filter((slot) =>
      equipment.has(build.sheet.slots[slot] || 0),
    ).length,
    sidekick = equipment.get(build.sheet.slots.sidekick || 0);
  return (
    <section className="detail-gear" aria-labelledby="detail-gear-title">
      <header className="detail-section-head">
        <h2 id="detail-gear-title">{t("build_v4_gear")}</h2>
        <span>{t("build_v4_worn", { count: worn, total: 16 })}</span>
      </header>
      <div className="detail-stage-grid">
        <div className="detail-slots">{LEFT.map(tile)}</div>
        <div className="detail-stage">
          {failed ? (
            <img className="detail-stage-portrait" src={classImage(build.sheet)} alt="" />
          ) : (
            <CharacterStage
              key={info.breed + build.sheet.gender + (build.sheet.slots.companion || 0)}
              breed={info.breed}
              gender={build.sheet.gender}
              companion={build.sheet.slots.companion}
              width={narrow ? 150 : 240}
              height={narrow ? 236 : 330}
              onError={() => setFailed(true)}
            />
          )}
          <p>
            {resolveClassName(build.sheet.classId, i18n.language, null)}
            <span>{t("level_short", { level: build.sheet.level })}</span>
          </p>
          {sidekick && (
            <span className="detail-sidekick">
              <ItemPeek item={sidekick}>
                <span
                  className="detail-tile"
                  tabIndex={0}
                >
                  <img
                    src={sidekick.image_url || ""}
                    alt={t("slot_sidekick") + ": " + sidekick.name}
                  />
                </span>
              </ItemPeek>
            </span>
          )}
        </div>
        <div className="detail-slots">{RIGHT.map(tile)}</div>
        <div className="detail-dofus">{DOFUS.map(tile)}</div>
      </div>
      <p className="detail-gear-hint">{t("build_v4_gear_hint")}</p>
    </section>
  );
}

function StatsColumn({ sheet }: { sheet: SheetBuild }) {
  const { t, i18n } = useAccountLocale(),
    s = useMemo(() => sheetStats(sheet), [sheet]),
    nf = new Intl.NumberFormat(i18n.language);
  if (!s) return null;
  const unknown = Object.entries(s.unknownStats);
  const value = (n: number, suffix = "") => (
    <b className={n < 0 ? "is-negative" : n === 0 ? "is-zero" : ""}>
      {nf.format(n)}
      {suffix}
    </b>
  );
  return (
    <aside className="detail-stats" aria-labelledby="detail-stats-title">
      <header className="detail-section-head">
        <h2 id="detail-stats-title">{t("build_v4_stats")}</h2>
        <span>{t("build_v4_stats_hint")}</span>
      </header>
      <ul className="detail-vitals">
        {(
          [
            ["ap", "badge_ap", s.ap],
            ["mp", "badge_mp", s.mp],
            ["vitality", "badge_hp", s.maxHp],
            ["range", "badge_range", s.range],
          ] as const
        ).map(([icon, key, v]) => (
          <li key={key}>
            <img src={statIconUrl(icon)} alt="" />
            {value(v)}
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
      <section aria-labelledby="detail-chars">
        <h3 id="detail-chars">{t("characteristics")}</h3>
        <ul className="detail-chars">
          {CHARACTERISTICS.map(([key, label, powered]) => {
            const base = num(s, key),
              power = powered ? s.power : 0;
            return (
              <li key={key} data-char={key}>
                <img src={statIconUrl(key)} alt="" />
                <span>
                  {t(label)}
                  <ScrollText
                    size={12}
                    aria-label={t("build_detail_scrolled")}
                    role="img"
                  />
                </span>
                {value(base + power)}
                {power > 0 && (
                  <small>
                    {t("build_detail_power_breakdown", {
                      base: nf.format(base),
                      power: nf.format(power),
                      label: t("stat_power"),
                    })}
                  </small>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-labelledby="detail-elements">
        <h3 id="detail-elements">{t("section_elements")}</h3>
        <table className="detail-elements">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">{t("build_v4_element")}</span>
              </th>
              <th scope="col">{t("build_v4_col_damage")}</th>
              <th scope="col">{t("build_v4_col_res")}</th>
              <th scope="col">{t("build_v4_col_res_pct")}</th>
            </tr>
          </thead>
          <tbody>
            {ELEMENT_ROWS.map(([el, label, dmg, fixed, pct]) => (
              <tr key={el} data-element={el}>
                <th scope="row">
                  <img src={statIconUrl(el + "_resistance")} alt="" />
                  {t(label)}
                </th>
                <td>{value(num(s, dmg))}</td>
                <td>{value(num(s, fixed))}</td>
                <td>{value(num(s, pct), "%")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section aria-labelledby="detail-combat">
        <h3 id="detail-combat">{t("stats_combat")}</h3>
        <dl className="detail-grid">
          {COMBAT.map(([icon, label, key, suffix]) => (
            <div key={key}>
              <dt>
                <img src={statIconUrl(icon)} alt="" />
                {t(label)}
              </dt>
              <dd>{value(num(s, key), suffix)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="detail-mods">
        <h3 id="detail-mods">{t("section_damage_mods")}</h3>
        <dl className="detail-grid">
          {MODIFIERS.map(([icon, label, key]) => (
            <div key={key}>
              <dt>
                <img src={statIconUrl(icon)} alt="" />
                {t(label)}
              </dt>
              <dd>{value(num(s, key), "%")}</dd>
            </div>
          ))}
        </dl>
      </section>
      {unknown.length > 0 && (
        <details className="detail-unknown">
          <summary>{t("unmapped_stats", { count: unknown.length })}</summary>
          <dl>
            {unknown.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>
                  {v > 0 ? "+" : ""}
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </aside>
  );
}

function Bonus({ bonus }: { bonus: PassiveBonus }) {
  const { t } = useAccountLocale();
  return (
    <span className="detail-bonus">
      {bonusParts(bonus).map((p) => (
        <span key={p.key} className={p.negative ? "is-negative" : ""}>
          <img src={statIconUrl(p.icon)} alt="" />
          <b>{p.value}</b> {t(p.tKey)}
        </span>
      ))}
    </span>
  );
}

function SetsAndPassives({ sheet }: { sheet: SheetBuild }) {
  const { t } = useAccountLocale(),
    store = useBuildStore.getState(),
    [open, setOpen] = useState<number | null>(null),
    active = useMemo(
      () => computeActiveSets(sheet.slots, store._equipment, store._sets),
      [sheet],
    ),
    worn = new Set(Object.values(sheet.slots)),
    passives = Object.values(sheet.slots).flatMap((id) => {
      const item = equipment.get(id || 0);
      return item &&
        (ITEM_PASSIVES.has(item.ankama_id) || TEXT_ONLY_PASSIVES.has(item.ankama_id))
        ? [item]
        : [];
    });
  if (!active.length && !passives.length) return null;
  return (
    <div className="detail-extras">
      {active.length > 0 && (
        <section aria-labelledby="detail-sets-title" className="detail-sets">
          <header className="detail-section-head">
            <h2 id="detail-sets-title">{t("active_sets")}</h2>
            <span>{t("build_v4_sets_count", { count: active.length })}</span>
          </header>
          {active.map(({ set, count }) => {
            const pieces = set.items.flatMap((id) => equipment.get(id) ?? []),
              tiers = Object.keys(set.bonuses)
                .map(Number)
                .sort((a, b) => a - b),
              inForce = tiers.filter((n) => n <= count).at(-1);
            return (
              <article key={set.ankama_id}>
                <header>
                  <h3>{set.name}</h3>
                  <p>{t("build_v4_set_pieces", { count, total: pieces.length })}</p>
                  <button onClick={() => setOpen(set.ankama_id)}>
                    {t("build_v4_open_set")}
                    <ArrowUpRight size={14} />
                  </button>
                </header>
                <ul className="detail-set-pieces">
                  {pieces.map((it) => (
                    <li key={it.ankama_id}>
                      <ItemPeek item={it}>
                        <span
                          tabIndex={0}
                          className={worn.has(it.ankama_id) ? "" : "is-missing"}
                        >
                          <img
                            src={it.image_url || "/design-assets/forge-mark.svg"}
                            alt={
                              it.name +
                              ", " +
                              t(worn.has(it.ankama_id) ? "build_v4_worn_piece" : "build_v4_missing_piece")
                            }
                          />
                        </span>
                      </ItemPeek>
                    </li>
                  ))}
                </ul>
                <ol className="detail-tiers">
                  {tiers.map((n) => {
                    const effects = set.bonuses[n].filter((e) => !isIgnored(e.stat));
                    return (
                      <li key={n} className={n === inForce ? "is-reached" : n <= count ? "is-passed" : ""}>
                        <span className="detail-tier-count">
                          {t("build_v4_tier", { count: n })}
                          {n === inForce && <em>{t("build_v4_tier_active")}</em>}
                        </span>
                        <span className="detail-tier-effects">
                          {effects.map((e, i) => {
                            const meta = STAT_META[e.stat];
                            return (
                              <span key={i}>
                                {meta?.icon && <img src={statIconUrl(meta.icon)} alt="" />}
                                <b>{fmtValue(e.min, e.max)}</b> {meta ? t(meta.tKey) : e.stat}
                              </span>
                            );
                          })}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </article>
            );
          })}
        </section>
      )}
      {passives.length > 0 && (
        <section aria-labelledby="detail-passives-title" className="detail-passives">
          <header className="detail-section-head">
            <h2 id="detail-passives-title">
              <Sparkles size={15} aria-hidden="true" /> {t("passives_title")}
            </h2>
            <span>
              {t("passives_active_count", { count: 0, total: passives.length })}
            </span>
          </header>
          <ul>
            {passives.map((item) => {
              const controls = ITEM_PASSIVES.get(item.ankama_id) ?? [];
              return (
                <li key={item.ankama_id}>
                  <img src={item.image_url || "/design-assets/forge-mark.svg"} alt="" />
                  <div>
                    <b>{item.name}</b>
                    <small>{t("build_v4_passive_off")}</small>
                    {controls.map((c) =>
                      c.kind === "stacks" ? (
                        <p key={c.id}>
                          <Bonus bonus={c.perStack} />
                          <span>{t("build_v4_per_stack", { max: c.max })}</span>
                        </p>
                      ) : (
                        c.options.map((o, i) => (
                          <p key={c.id + i}>
                            {o.turn != null && <em>{t("build_v4_turn", { turn: o.turn })}</em>}
                            <Bonus bonus={o.bonus} />
                          </p>
                        ))
                      ),
                    )}
                    {!controls.length && <p className="detail-muted">{t("build_v4_passive_text_only")}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="detail-muted">{t("build_v4_passives_hint")}</p>
        </section>
      )}
      {open != null && <Sets open={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ReportDialog({
  target,
  onClose,
}: {
  target: ReportTarget;
  onClose: () => void;
}) {
  const { t } = useAccountLocale(),
    report = useBuildDetailStudy((s) => s.report),
    id = useId(),
    [reason, setReason] = useState<ReportReason>("spam"),
    [detail, setDetail] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<"sent" | "duplicate" | "error" | null>(null);
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t(target.kind === "comment" ? "report_comment_title" : "report_build_title")}
      className="detail-dialog"
    >
      {result === "sent" || result === "duplicate" ? (
        <div className="detail-dialog-result" role="status">
          <Flag size={26} />
          <p>{t(result === "sent" ? "report_sent" : "report_duplicate")}</p>
          <button className="primary" onClick={onClose}>
            {t("modal_close")}
          </button>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setResult(await report(target, reason, detail));
            setBusy(false);
          }}
        >
          <p className="detail-muted">{t("build_v4_report_intro")}</p>
          <fieldset className="detail-reasons">
            <legend>{t("report_reason_label")}</legend>
            {REASONS.map((r) => (
              <label key={r} className={reason === r ? "is-selected" : ""}>
                <input
                  type="radio"
                  name={id + "-reason"}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                />
                <span>{t("report_reason_" + r)}</span>
              </label>
            ))}
          </fieldset>
          <label className="detail-field" htmlFor={id + "-detail"}>
            {t("report_detail_placeholder")}
          </label>
          <textarea
            id={id + "-detail"}
            rows={3}
            maxLength={REPORT_DETAIL_MAX}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            aria-describedby={id + "-count"}
          />
          <small id={id + "-count"} className="detail-count">
            {detail.length} / {REPORT_DETAIL_MAX}
          </small>
          {result === "error" && (
            <p className="detail-error" role="alert">
              {t("report_error")}
            </p>
          )}
          <footer className="detail-dialog-actions">
            <button type="button" onClick={onClose}>
              {t("build_v4_cancel")}
            </button>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? t("auth_loading") : t("report_submit")}
            </button>
          </footer>
        </form>
      )}
    </Modal>
  );
}

function RestoreDialog({
  version,
  build,
  onClose,
}: {
  version: DetailVersion;
  build: DetailBuild;
  onClose: () => void;
}) {
  const { t } = useAccountLocale(),
    s = useBuildDetailStudy(),
    when = useWhen();
  const diff = changedSlots(build.sheet, version.sheet);
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t("build_v4_restore_title")}
      className="detail-dialog"
    >
      <div className="detail-restore">
        <div className="detail-restore-version">
          <History size={20} />
          <span>
            <b>{version.labelKey ? t(version.labelKey) : build.sheet.name}</b>
            <small>{when(version.created_at)}</small>
          </span>
        </div>
        <p>{t("build_history_restore_confirm")}</p>
        {diff > 0 && (
          <p className="detail-muted">{t("build_v4_restore_diff", { count: diff })}</p>
        )}
        <footer className="detail-dialog-actions">
          <button type="button" onClick={onClose}>
            {t("build_v4_cancel")}
          </button>
          <button
            className="primary"
            disabled={s.restoring != null}
            onClick={async () => {
              if (await s.restore(version, build)) onClose();
            }}
          >
            <RotateCcw size={15} />
            {s.restoring ? t("auth_loading") : t("build_v4_restore_confirm")}
          </button>
        </footer>
      </div>
    </Modal>
  );
}

/** The build page's dialogs opened from the review directory, on the page's build or an example. */
export function BuildDetailDialog({
  id,
  onClose,
}: {
  id: "report-build" | "report-comment" | "restore-version";
  onClose: () => void;
}) {
  const s = useBuildDetailStudy.getState(),
    own =
      s.build?.owner === STUDY_PLAYER
        ? s.build
        : (() => {
            const b = useLibraryStudy
              .getState()
              .builds.find((b) => b.owner === STUDY_PLAYER);
            return b ? detailFromLibrary(b) : null;
          })();
  if (id === "restore-version") {
    if (!own) return null;
    const version = (s.build?.id === own.id && s.history[0]) || {
      id: own.id + "-specimen",
      labelKey: "build_v4_fixture_version_2",
      created_at: own.activity.created_at,
      sheet: {
        ...own.sheet,
        slots: { ...own.sheet.slots, shield: undefined },
      },
    };
    return <RestoreDialog version={version} build={own} onClose={onClose} />;
  }
  return (
    <ReportDialog
      target={{
        kind: id === "report-comment" ? "comment" : "build",
        id:
          id === "report-comment"
            ? s.comments[0]?.id ?? "specimen-comment"
            : s.build?.id ?? "specimen-build",
      }}
      onClose={onClose}
    />
  );
}

function changedSlots(a: SheetBuild, b: SheetBuild) {
  const keys = new Set([...Object.keys(a.slots), ...Object.keys(b.slots)]);
  return [...keys].filter(
    (k) => a.slots[k as SlotId] !== b.slots[k as SlotId],
  ).length;
}
function useWhen() {
  const { i18n } = useAccountLocale();
  return (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
}

function Comment({
  comment: c,
  liked,
  own,
  onAuthor,
  onLike,
  onReport,
}: {
  comment: DetailComment;
  liked: boolean;
  own: boolean;
  onAuthor: (name: string) => void;
  onLike: () => void;
  onReport: () => void;
}) {
  const { t } = useAccountLocale(),
    when = useWhen();
  return (
    <li className="detail-comment">
      <Initial name={c.author} />
      <div>
        <p className="detail-comment-meta">
          <a
            href={"?view=profile&player=" + encodeURIComponent(c.author)}
            onClick={(e) => {
              e.preventDefault();
              onAuthor(c.author);
            }}
          >
            {c.author}
          </a>
          {own && <span className="detail-you">{t("build_v4_you")}</span>}
          <time dateTime={c.created_at}>{when(c.created_at)}</time>
        </p>
        <p className="detail-comment-text">{c.textKey ? t(c.textKey) : c.text}</p>
        <div className="detail-comment-actions">
          <button
            onClick={onLike}
            aria-pressed={liked}
            aria-label={t("comment_like") + (c.likes ? " (" + c.likes + ")" : "")}
            className={liked ? "is-on" : ""}
          >
            <Heart size={14} />
            {c.likes > 0 && <span>{c.likes}</span>}
          </button>
          {!own && (
            <button onClick={onReport} aria-label={t("build_v4_report_comment_of", { name: c.author })}>
              <Flag size={13} />
              {t("comment_report")}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function Section({
  id,
  title,
  aside,
  children,
  className = "",
}: {
  id: string;
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={id + "-title"} className={className}>
      <header className="detail-section-head">
        <h2 id={id + "-title"}>{title}</h2>
        {aside && <span>{aside}</span>}
      </header>
      {children}
    </section>
  );
}

export function BuildDetail({
  onBack,
  onAuthor,
  onOpenBuild,
  onTag,
  onSignIn,
  onCollection,
}: {
  onBack: () => void;
  onAuthor: (username: string) => void;
  onOpenBuild: (id: string) => void;
  onTag: (tag: string) => void;
  onSignIn: () => void;
  onCollection: (build: DetailBuild) => void;
}) {
  const { t, i18n } = useAccountLocale(),
    s = useBuildDetailStudy(),
    account = useAccountStudy(),
    [report, setReport] = useState<ReportTarget | null>(null),
    [restore, setRestore] = useState<DetailVersion | null>(null),
    [draft, setDraft] = useState(""),
    commentId = useId(),
    nf = new Intl.NumberFormat(i18n.language),
    rating = new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    when = useWhen();
  useEffect(() => {
    if (!s.notice) return;
    const timer = setTimeout(s.clearNotice, 4200);
    return () => clearTimeout(timer);
  }, [s.notice]);
  const b = s.build,
    signedIn = account.signedIn,
    own = signedIn && b?.owner === STUDY_PLAYER,
    admin = signedIn && s.admin,
    gated = (action: () => void) => (signedIn ? action() : onSignIn());

  if (s.loading)
    return (
      <div className="detail-study" aria-busy="true">
        <DetailReview />
        <div className="detail-loading" role="status">
          <span className="sr-only">{t("auth_loading")}</span>
          <div className="detail-skel detail-skel-hero" />
          <div className="detail-skel-body">
            <div className="detail-skel detail-skel-stage" />
            <div className="detail-skel detail-skel-stats" />
          </div>
        </div>
      </div>
    );
  if (!b)
    return (
      <div className="detail-study">
        <DetailReview />
        <div className="detail-missing">
          <Compass size={32} />
          <h1>{t("build_v4_missing_title")}</h1>
          <p>{t("build_detail_not_found")}</p>
          <button className="primary" onClick={onBack}>
            <ArrowLeft size={16} />
            {t("explore_title")}
          </button>
        </div>
      </div>
    );

  const className = resolveClassName(b.sheet.classId, i18n.language, null),
    nonPublic = b.visibility !== "public",
    a = b.activity,
    created = new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(a.created_at));

  return (
    <div className="detail-study">
      <DetailReview />
      <nav className="detail-crumbs" aria-label={t("build_v4_breadcrumb")}>
        <button onClick={onBack}>
          <ArrowLeft size={16} />
          {t("explore_title")}
        </button>
      </nav>
      <header className="detail-hero">
        <img className="detail-portrait" src={classImage(b.sheet)} alt="" />
        <div className="detail-identity">
          <p className="detail-kicker">
            {className}
            <span>{t("level_short", { level: b.sheet.level })}</span>
            {s.featured && (
              <span className="detail-featured">
                <Award size={14} aria-hidden="true" />
                {t("build_featured")}
              </span>
            )}
            {nonPublic && (
              <span className="detail-visibility">
                {t("publish_visibility_" + b.visibility)}
              </span>
            )}
          </p>
          <h1>{b.sheet.name}</h1>
          <p className="detail-byline">
            <a
              href={"?view=profile&player=" + encodeURIComponent(b.owner)}
              onClick={(e) => {
                e.preventDefault();
                onAuthor(b.owner);
              }}
            >
              <Initial name={b.owner} />
              {b.owner}
            </a>
            <span aria-hidden="true">·</span>
            <time dateTime={a.created_at}>{t("build_v4_published", { date: created })}</time>
          </p>
          {s.parent !== undefined && (
            <p className="detail-parent">
              <GitFork size={14} aria-hidden="true" />
              {s.parent ? (
                <>
                  {t("build_detail_remix_of")}{" "}
                  <a
                    href={"?view=build&example=" + s.parent.id}
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenBuild(s.parent!.id);
                    }}
                  >
                    {s.parent.sheet.name}
                  </a>{" "}
                  {t("build_detail_remix_by", { author: s.parent.owner })}
                </>
              ) : (
                t("build_detail_remix_unavailable")
              )}
            </p>
          )}
          {b.tags.length > 0 && (
            <ul className="detail-tags" aria-label={t("publish_tags_label")}>
              {b.tags.map((tag) => (
                <li key={tag.id}>
                  <a
                    href={"?view=explore&tag=" + tag.name}
                    onClick={(e) => {
                      e.preventDefault();
                      onTag(tag.name);
                    }}
                  >
                    {t("tag_" + tag.name)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="detail-cta">
          <a className="primary" href={workshopHref(b.sheet, b, own)}>
            {own || nonPublic ? <UploadCloud size={18} /> : <GitFork size={18} />}
            {t(own || nonPublic ? "build_v4_load" : "build_v4_remix")}
          </a>
          <p>
            {t(
              own
                ? "build_v4_load_own_hint"
                : nonPublic
                  ? "build_v4_load_hint"
                  : "build_v4_remix_hint",
            )}
          </p>
        </div>
      </header>

      <div className="detail-bar">
        <div className="detail-social" role="group" aria-label={t("build_v4_actions")}>
          <button
            onClick={() => gated(s.toggleLike)}
            aria-pressed={signedIn ? s.liked : undefined}
            aria-label={t("a11y_like_build", { count: s.likeCount })}
            className={s.liked ? "is-on is-like" : ""}
          >
            <Heart size={17} />
            <b>{nf.format(s.likeCount)}</b>
            <span>{t("build_v4_like")}</span>
          </button>
          <button
            onClick={() => gated(s.toggleBookmark)}
            aria-pressed={signedIn ? s.bookmarked : undefined}
            className={s.bookmarked ? "is-on" : ""}
          >
            <Bookmark size={17} />
            <span>{t(s.bookmarked ? "build_v4_bookmarked_label" : "build_detail_bookmark")}</span>
          </button>
          {(b.visibility !== "private" || own) && (
            <button onClick={() => gated(() => onCollection(b))}>
              <FolderPlus size={17} />
              <span>{t("collections_save")}</span>
            </button>
          )}
          {!own && (
            <button
              className="is-quiet"
              onClick={() => gated(() => setReport({ kind: "build", id: b.id }))}
            >
              <Flag size={16} />
              <span>{t("build_v4_report")}</span>
            </button>
          )}
          {admin && (b.visibility === "public" || s.featured) && (
            <button
              onClick={s.toggleFeatured}
              disabled={s.featureBusy}
              aria-pressed={s.featured}
              className={"is-admin" + (s.featured ? " is-on" : "")}
            >
              <Award size={17} />
              <span>{t(s.featured ? "build_feature_off" : "build_feature_on")}</span>
            </button>
          )}
        </div>
        <dl className="detail-numbers">
          <div>
            <dt>{t("build_v4_rating")}</dt>
            <dd>
              <Star size={15} aria-hidden="true" />
              {a.rating_count ? (
                <>
                  <b>{rating.format(a.avg_rating)}</b>
                  <small>{t("build_v4_ratings", { count: a.rating_count })}</small>
                </>
              ) : (
                <small>{t("build_v4_no_ratings")}</small>
              )}
            </dd>
          </div>
          <div>
            <dt>{t("build_v4_views")}</dt>
            <dd>
              <Eye size={15} aria-hidden="true" />
              <b>{nf.format(a.view_count)}</b>
            </dd>
          </div>
          <div>
            <dt>{t("build_v4_remixes")}</dt>
            <dd>
              <GitFork size={15} aria-hidden="true" />
              {s.forks.length ? (
                <a href="#remixes">{nf.format(s.forks.length)}</a>
              ) : (
                <b>0</b>
              )}
            </dd>
          </div>
          <div>
            <dt>{t("build_detail_comments")}</dt>
            <dd>
              <MessageSquare size={15} aria-hidden="true" />
              <a href="#comments">{nf.format(s.comments.length)}</a>
            </dd>
          </div>
        </dl>
        <div className="detail-rate">
          <span>{t("build_detail_your_rating")}</span>
          <StarRating value={s.myRating ?? 0} onRate={(n) => gated(() => s.rate(n))} />
        </div>
        {!signedIn && (
          <p className="detail-signin-note">
            {t("build_v4_signin_note")}{" "}
            <button onClick={onSignIn}>{t("auth_signin_btn")}</button>
          </p>
        )}
      </div>

      <div className="detail-body">
        <GearStage build={b} />
        <StatsColumn sheet={b.sheet} />
      </div>

      <SetsAndPassives sheet={b.sheet} />

      <div className="detail-community">
        <Section
          id="comments"
          className="detail-comments"
          title={t("build_detail_comments")}
          aside={nf.format(s.comments.length)}
        >
          {signedIn ? (
            <form
              className="detail-comment-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await s.postComment(draft)) setDraft("");
              }}
            >
              <label htmlFor={commentId} className="sr-only">
                {t("build_detail_comment_placeholder")}
              </label>
              <textarea
                id={commentId}
                rows={3}
                maxLength={COMMENT_MAX}
                value={draft}
                placeholder={t("build_v4_comment_placeholder")}
                onChange={(e) => setDraft(e.target.value)}
                aria-describedby={commentId + "-count"}
              />
              <div>
                <small id={commentId + "-count"} className="detail-count">
                  {nf.format(draft.length)} / {nf.format(COMMENT_MAX)}
                </small>
                <button
                  className="primary"
                  type="submit"
                  disabled={s.posting || !draft.trim()}
                >
                  {s.posting ? t("build_detail_posting") : t("build_detail_comment_submit")}
                </button>
              </div>
            </form>
          ) : (
            <div className="detail-comment-signin">
              <p>{t("build_v4_comment_signin")}</p>
              <button onClick={onSignIn}>{t("auth_signin_btn")}</button>
            </div>
          )}
          {s.comments.length ? (
            <ul className="detail-comment-list">
              {s.comments.map((c) => (
                <Comment
                  key={c.id}
                  comment={c}
                  liked={s.likedComments.includes(c.id)}
                  own={signedIn && c.author === STUDY_PLAYER}
                  onAuthor={onAuthor}
                  onLike={() => gated(() => s.toggleCommentLike(c.id))}
                  onReport={() => gated(() => setReport({ kind: "comment", id: c.id }))}
                />
              ))}
            </ul>
          ) : (
            <p className="detail-empty">{t("build_detail_no_comments")}</p>
          )}
        </Section>
        <div className="detail-side">
          {s.history.length > 0 && (
            <Section
              id="history"
              className="detail-history"
              title={
                <>
                  <History size={15} aria-hidden="true" />
                  {t("build_v4_history")}
                </>
              }
              aside={nf.format(s.history.length)}
            >
              <p className="detail-muted">{t("build_history_hint")}</p>
              <ol>
                {s.history.map((v) => {
                  const diff = changedSlots(b.sheet, v.sheet);
                  return (
                    <li key={v.id}>
                      <span>
                        <b>{v.labelKey ? t(v.labelKey) : b.sheet.name}</b>
                        <small>
                          <time dateTime={v.created_at}>{when(v.created_at)}</time>
                          {" · "}
                          {diff
                            ? t("build_v4_version_diff", { count: diff })
                            : t("build_v4_version_same")}
                        </small>
                      </span>
                      <a href={workshopHref(v.sheet, b, own)}>
                        <UploadCloud size={14} />
                        {t("build_history_open")}
                      </a>
                      {own && (
                        <button
                          onClick={() => setRestore(v)}
                          disabled={s.restoring != null}
                        >
                          <RotateCcw size={14} />
                          {t("build_history_restore")}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Section>
          )}
          {s.forks.length > 0 && (
            <Section
              id="remixes"
              className="detail-remixes"
              title={
                <>
                  <GitFork size={15} aria-hidden="true" />
                  {t("build_v4_remixes")}
                </>
              }
              aside={nf.format(s.forks.length)}
            >
              <ul>
                {s.forks.map((f) => (
                  <li key={f.id}>
                    <a
                      href={"?view=build&example=" + f.id}
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenBuild(f.id);
                      }}
                    >
                      <img src={classImage(f.sheet)} alt="" />
                      <span>
                        <b>{f.sheet.name}</b>
                        <small>
                          {f.owner} · {t("level_short", { level: f.sheet.level })}
                        </small>
                      </span>
                      <span className="detail-fork-likes">
                        <Heart size={13} aria-hidden="true" />
                        <span className="sr-only">{t("build_v4_like")}: </span>
                        {nf.format(f.likes)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>

      {report && <ReportDialog target={report} onClose={() => setReport(null)} />}
      {restore && (
        <RestoreDialog version={restore} build={b} onClose={() => setRestore(null)} />
      )}
      {s.notice && (
        <div
          className={"toast detail-toast" + (s.notice.kind === "error" ? " is-error" : "")}
          role={s.notice.kind === "error" ? "alert" : "status"}
        >
          {t(s.notice.key)}
          <button aria-label={t("modal_close")} onClick={s.clearNotice}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
