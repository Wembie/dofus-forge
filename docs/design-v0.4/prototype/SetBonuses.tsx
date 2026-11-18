import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useBuildStore } from "../../../src/store/buildStore";
import { computeActiveSets } from "../../../src/features/equipment/SetBonusesPanel";
import {
  STAT_META,
  fmtValue,
  isIgnored,
  statIconUrl,
} from "../../../src/features/equipment/statDisplay";
import { CHANGELOG, DOFUS_GAME_VERSION } from "../../../src/data/changelog";
import { equipment } from "./model";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Sets } from "./Sets";
import "./catalog.css";
import "./tools.css";

/** Each set you wear, the pieces that count and every tier, with the one in force marked. */
export function SetBonuses() {
  const { t } = useTranslation(),
    b = useBuildStore(),
    [open, setOpen] = useState<number | null>(null);
  const active = useMemo(
    () => computeActiveSets(b.equipped, b._equipment, b._sets),
    [b.equipped, b._equipment, b._sets],
  );
  const worn = new Set(Object.values(b.equipped));
  if (!active.length)
    return (
      <div className="tool-empty">
        <h3>{t("cat_v4_no_sets_title")}</h3>
        <p>{t("cat_v4_no_sets_body")}</p>
      </div>
    );
  return (
    <div
      className="bonus-sets"
      role="group"
      aria-label={t("cat_v4_sets_in_build")}
      tabIndex={0}
    >
      {active.map(({ set, count }) => {
        const pieces = set.items.flatMap((id) => equipment.get(id) ?? []),
          tiers = Object.keys(set.bonuses)
            .map(Number)
            .sort((x, y) => x - y),
          inForce = tiers.filter((n) => n <= count).at(-1);
        return (
          <section key={set.ankama_id} aria-label={set.name}>
            <header>
              <h3>{set.name}</h3>
              <p>
                <strong>{count}</strong>{" "}
                {t("cat_v4_of_pieces", { count: pieces.length })}
                {inForce ? "" : t("cat_v4_no_bonus_yet")}
              </p>
              <button
                className="bonus-open"
                onClick={() => setOpen(set.ankama_id)}
              >
                {t("cat_v4_see_set")}
                <ArrowRight size={14} />
              </button>
            </header>
            <ul className="bonus-pieces">
              {pieces.map((it) => (
                <li
                  key={it.ankama_id}
                  className={worn.has(it.ankama_id) ? "" : "is-missing"}
                  title={
                    worn.has(it.ankama_id)
                      ? it.name
                      : t("cat_v4_piece_unworn_title", { name: it.name })
                  }
                >
                  <img
                    src={it.image_url || "/design-assets/forge-mark.svg"}
                    alt=""
                  />
                  <span className="sr-only">
                    {t(
                      worn.has(it.ankama_id)
                        ? "cat_v4_piece_worn_sr"
                        : "cat_v4_piece_unworn_sr",
                      { name: it.name },
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <ol className="set-tiers">
              {tiers.map((n) => {
                const effects = set.bonuses[n].filter((e) => !isIgnored(e.stat));
                return (
                  <li key={n} className={n === inForce ? "is-reached" : ""}>
                    <span className="set-tier-count">
                      {n} <small>{t("cat_v4_tier_pieces", { count: n })}</small>
                    </span>
                    <span className="set-tier-effects">
                      {effects.map((e, i) => {
                        const meta = STAT_META[e.stat];
                        return (
                          <span key={i}>
                            {meta?.icon && (
                              <img src={statIconUrl(meta.icon)} alt="" />
                            )}
                            <b>{fmtValue(e.min, e.max)}</b>{" "}
                            {meta ? t(meta.tKey) : e.stat}
                          </span>
                        );
                      })}
                      {!effects.length && <span>{t("cat_v4_no_effects")}</span>}
                    </span>
                    {n === inForce && (
                      <span className="set-tier-note">{t("passives_on")}</span>
                    )}
                    {n === count + 1 && (
                      <span className="set-tier-note is-next">
                        {t("cat_v4_one_more")}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      {open != null && (
        <Sets open={open} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

/** Release notes as a dated reading list, newest first, a page at a time. */
export function Changelog() {
  const { t, i18n } = useTranslation(),
    [shown, setShown] = useState(12);
  const day = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    [i18n.language],
  );
  return (
    <div className="notes">
      <p className="notes-data">
        {t("cat_v4_game_data")} <strong>{DOFUS_GAME_VERSION}</strong>
        <span>{t("cat_v4_versions", { count: CHANGELOG.length })}</span>
      </p>
      <ol>
        {CHANGELOG.slice(0, shown).map((entry, i) => (
          <li key={entry.version}>
            <div>
              <strong>{entry.version}</strong>
              <time dateTime={entry.date}>
                {day.format(new Date(entry.date + "T00:00:00Z"))}
              </time>
              {i === 0 && <em>{t("cat_v4_current")}</em>}
            </div>
            <ul>
              {entry.notes.map((note, n) => (
                <li key={n}>{note}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {shown < CHANGELOG.length && (
        <button onClick={() => setShown(shown + 24)}>
          {t("cat_v4_older_versions")}
        </button>
      )}
    </div>
  );
}
