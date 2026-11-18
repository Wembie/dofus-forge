import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useBuildStore, type BuildSnapshot } from "@/store/buildStore.ts";
import { useCompareStore } from "@/store/compareStore.ts";
import { useDataStore } from "@/store/dataStore.ts";
import { useAuthStore } from "@/store/authStore.ts";
import { COMPARE_STATS } from "@/features/compare/compareStats.ts";
import { CompareRadar } from "@/features/compare/CompareRadar.tsx";
import {
  buildSnapshotFromState,
  decodeBuild,
  encodeBuild,
  encodeSnapshot,
} from "@/features/share/codec.ts";
import { listBuilds } from "@/features/share/savedBuilds.ts";
import {
  fetchBuildById,
  fetchMyBuilds,
  type MyBuildRow,
} from "@/features/builds/api.ts";
import { langPathRootSegment } from "@/i18n/langPath.ts";
import { resolveClassName } from "@/features/class-picker/useClassName.ts";
import { statIconUrl } from "@/features/equipment/statDisplay.ts";
import { equipment, visibleSlots } from "./model";
import "./tools.css";

/** Section id and the translation key of its title. */
const SECTIONS: [string, string][] = [
  ["core", "fx_v4_cmp_section_core"],
  ["chars", "compare_section_chars"],
  ["damage", "stat_group_damage"],
  ["steal", "fx_v4_cmp_section_steal"],
  ["res_fixed", "fx_v4_cmp_section_res_fixed"],
  ["res_pct", "fx_v4_cmp_section_res_pct"],
  ["combat", "stats_combat"],
  ["mods", "compare_section_mods"],
];
const separators = new Map<string, string>();
/** Thousands always grouped, with the language's own separator (es: 1.234). */
const group = (n: number, lang: string) => {
  let sep = separators.get(lang);
  if (sep === undefined) {
    sep =
      new Intl.NumberFormat(lang)
        .formatToParts(10000)
        .find((p) => p.type === "group")?.value ?? ".";
    separators.set(lang, sep);
  }
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
};
const signed = (n: number, lang: string) =>
  (n > 0 ? "+" : n < 0 ? "−" : "") + group(Math.abs(n), lang);

/** Your build against a reference: who is ahead on each stat, by how much, and which pieces differ. */
export function Compare() {
  const { t, i18n } = useTranslation(),
    b = useBuildStore(),
    ref = useCompareStore(),
    data = useDataStore(),
    session = useAuthStore((s) => s.session),
    lang = i18n.language,
    day = useMemo(
      () => new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" }),
      [lang],
    );
  const [onlyChanges, setOnlyChanges] = useState(true),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [picking, setPicking] = useState(false),
    [copied, setCopied] = useState(false),
    [account, setAccount] = useState<MyBuildRow[] | null>(null);
  const mine = b.stats,
    theirs = ref.statsB,
    local = listBuilds();
  useEffect(() => {
    if (!session) return;
    let live = true;
    void fetchMyBuilds(session.user.id).then(
      ({ data: rows }) => live && setAccount(rows),
    );
    return () => {
      live = false;
    };
  }, [session]);
  function load(snapshot: BuildSnapshot | null, name: string) {
    if (!snapshot)
      return setError(t("fx_v4_cmp_err_code"));
    ref.loadBuild(snapshot, name, data.equipment || [], data.sets || []);
    setCode("");
    setError("");
    setPicking(false);
  }
  /** Same inputs production accepts: a published build link or id, a `?b=` link (current or legacy hash form), or the bare code. */
  async function paste() {
    const raw = code.trim(),
      id = raw.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      );
    if (id) {
      const { data: found } = await fetchBuildById(id[0]);
      if (found) return load(found.snapshot, found.name);
      return setError(t("fx_v4_cmp_err_missing"));
    }
    let encoded = raw;
    try {
      const url = new URL(raw);
      encoded =
        url.searchParams.get("b") ||
        (url.hash.includes("?")
          ? new URLSearchParams(url.hash.slice(url.hash.indexOf("?") + 1)).get(
              "b",
            )
          : null) ||
        raw;
    } catch {
      /* Not a link: treat it as the build code itself. */
    }
    load(decodeBuild(encoded), t("fx_v4_cmp_pasted"));
  }
  function share() {
    const base = `${location.origin}${import.meta.env.BASE_URL}${langPathRootSegment(i18n.language)}`,
      a = encodeBuild(useBuildStore.getState()),
      z = ref.snapshotB ? encodeSnapshot(ref.snapshotB) : "";
    void navigator.clipboard
      .writeText(z ? `${base}?b=${a}&c=${z}` : `${base}?b=${a}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
  }
  if (!mine || !theirs)
    return (
      <div className="tool-empty">
        <h3>{t("fx_v4_cmp_none_title")}</h3>
        <p>{t("fx_v4_cmp_none_body")}</p>
      </div>
    );
  const sections = SECTIONS.map(([id, titleKey]) => ({
    title: t(titleKey),
    rows: COMPARE_STATS.filter((def) => def.section === id)
      .map((def) => {
        const a = Number(mine[def.key]) || 0,
          z = Number(theirs[def.key]) || 0;
        return { def, a, z, diff: a - z };
      })
      .filter((r) =>
        onlyChanges ? r.diff !== 0 : r.def.always || r.a !== 0 || r.z !== 0,
      ),
  })).filter((s) => s.rows.length);
  const every = COMPARE_STATS.map(
      (def) => (Number(mine[def.key]) || 0) - (Number(theirs[def.key]) || 0),
    ),
    ahead = every.filter((d) => d > 0).length,
    behind = every.filter((d) => d < 0).length;
  const gear = visibleSlots
    .map((slot) => ({
      slot,
      a: equipment.get(b.equipped[slot] || 0),
      z: equipment.get(ref.equippedB[slot] || 0),
    }))
    .filter((g) => g.a || g.z);
  const swapped = gear.filter((g) => g.a?.ankama_id !== g.z?.ankama_id);
  const shownGear = onlyChanges ? swapped : gear;
  return (
    <div className="cmp">
      <header className="cmp-head">
        <div>
          <span>{t("fx_v4_cmp_reference")}</span>
          <strong>{ref.nameB || t("fx_v4_cmp_unnamed")}</strong>
          <small>
            {t("fx_v4_cmp_name_level", {
              name: resolveClassName(ref.classB, lang, null),
              level: ref.levelB,
            })}
          </small>
        </div>
        <figure>
          <CompareRadar statsA={mine} statsB={theirs} />
          <figcaption aria-live="polite">
            {ahead || behind || swapped.length ? (
              <>
                <Trans
                  i18nKey="fx_v4_cmp_summary"
                  values={{ ahead, behind }}
                  components={{
                    win: <b className="positive" />,
                    lose: <b className="negative" />,
                  }}
                />{" "}
                {t("fx_v4_cmp_pieces", { count: swapped.length })}
              </>
            ) : (
              t("fx_v4_cmp_same")
            )}
          </figcaption>
        </figure>
        <div>
          <span>{t("fx_v4_cmp_yours")}</span>
          <strong>{b.buildName || t("fx_v4_cmp_draft")}</strong>
          <small>
            {t("fx_v4_cmp_name_level", {
              name: resolveClassName(b.selectedClass || "", lang, null),
              level: b.level,
            })}
          </small>
        </div>
      </header>
      <div className="cmp-actions">
        <label>
          <input
            type="checkbox"
            checked={onlyChanges}
            onChange={(e) => setOnlyChanges(e.target.checked)}
          />
          {t("fx_v4_cmp_only_diff")}
        </label>
        <button onClick={share} aria-live="polite">
          {copied ? t("fx_v4_cmp_copied") : t("fx_v4_cmp_copy")}
        </button>
        <button
          onClick={() =>
            load(
              buildSnapshotFromState(useBuildStore.getState()),
              t("fx_v4_cmp_pinned_name"),
            )
          }
        >
          {t("fx_v4_cmp_pin_current")}
        </button>
        <button aria-expanded={picking} onClick={() => setPicking(!picking)}>
          {t("fx_v4_cmp_use_other")}
        </button>
      </div>
      {picking && (
        <div className="cmp-pick">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void paste();
            }}
          >
            <label>
              {t("fx_v4_cmp_code_label")}
              <input
                value={code}
                aria-invalid={!!error}
                aria-describedby={error ? "cmp-paste-error" : undefined}
                placeholder={`https://dofusforge.com/${langPathRootSegment(lang) ? langPathRootSegment(lang) + "/" : ""}?b=…`}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
              />
            </label>
            <button className="primary" disabled={!code.trim()}>
              {t("compare")}
            </button>
            {error && (
              <p id="cmp-paste-error" role="alert">
                {error}
              </p>
            )}
          </form>
          <section aria-label={t("fx_v4_cmp_account_aria")}>
            <h4>{t("fx_v4_cmp_account")}</h4>
            {!session ? (
              <p>{t("fx_v4_cmp_signin")}</p>
            ) : !account ? (
              <p>{t("fx_v4_cmp_loading")}</p>
            ) : !account.length ? (
              <p>{t("fx_v4_cmp_account_empty")}</p>
            ) : (
              <ul>
                {account.map((row) => (
                  <li key={row.id}>
                    <button onClick={() => load(row.snapshot, row.name)}>
                      <b>{row.name}</b>
                      <small>
                        {t("fx_v4_cmp_name_level", {
                          name: resolveClassName(row.class_slug, lang, null),
                          level: row.level,
                        })}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-label={t("fx_v4_cmp_device_aria")}>
            <h4>{t("fx_v4_cmp_device")}</h4>
            {!local.length ? (
              <p>{t("fx_v4_cmp_device_empty")}</p>
            ) : (
              <ul>
                {local.map((row) => (
                  <li key={row.id}>
                    <button
                      onClick={() => load(decodeBuild(row.encoded), row.name)}
                    >
                      <b>{row.name}</b>
                      <small>{t("fx_v4_cmp_saved_on", { date: day.format(row.savedAt) })}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      {sections.map((section) => (
        <section key={section.title} aria-label={section.title}>
          <h3>{section.title}</h3>
          <ul className="cmp-rows">
            {section.rows.map(({ def, a, z, diff }) => {
              const floor = Math.min(a, z, 0),
                sum = a + z - 2 * floor,
                share = sum ? ((a - floor) / sum) * 100 : 50;
              return (
                <li key={def.key}>
                  <span className="cmp-name">
                    <img src={statIconUrl(def.icon)} alt="" />
                    {t(def.tKey)}
                  </span>
                  <span className="cmp-z">
                    {group(z, lang)}
                    {def.suffix}
                  </span>
                  <span
                    className="cmp-bar"
                    role="img"
                    aria-label={
                      diff > 0
                        ? t("fx_v4_cmp_ahead")
                        : diff < 0
                          ? t("fx_v4_cmp_behind")
                          : t("fx_v4_cmp_even")
                    }
                  >
                    <i
                      className={diff < 0 ? "is-lead" : ""}
                      style={{ width: 100 - share + "%" }}
                    />
                    <i
                      className={diff > 0 ? "is-ahead" : ""}
                      style={{ width: share + "%" }}
                    />
                  </span>
                  <span className="cmp-a">
                    {group(a, lang)}
                    {def.suffix}
                  </span>
                  <span
                    className={
                      "cmp-diff " +
                      (diff > 0 ? "positive" : diff < 0 ? "negative" : "")
                    }
                  >
                    {diff ? signed(diff, lang) : "="}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {!sections.length && onlyChanges && (
        <p className="cmp-none">{t("fx_v4_cmp_no_change")}</p>
      )}
      {shownGear.length > 0 && (
        <section aria-label={t("compare_equipment")}>
          <h3>{t("compare_equipment")}</h3>
          <ul className="cmp-gear">
            {shownGear.map(({ slot, a, z }) => {
              const same = a?.ankama_id === z?.ankama_id;
              return (
                <li key={slot} className={same ? "is-same" : ""}>
                  <span className="cmp-slot">{t("slot_" + slot)}</span>
                  <span className="cmp-piece">
                    {z ? (
                      <>
                        <img src={z.image_url || ""} alt="" />
                        {z.name}
                      </>
                    ) : (
                      <em>{t("fx_v4_cmp_empty")}</em>
                    )}
                  </span>
                  <span className="cmp-piece">
                    {a ? (
                      <>
                        <img src={a.image_url || ""} alt="" />
                        {a.name}
                      </>
                    ) : (
                      <em>{t("fx_v4_cmp_empty")}</em>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
