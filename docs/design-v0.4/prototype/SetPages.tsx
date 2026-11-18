import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { ArrowLeft, Hammer, Heart, Layers, Search, Sparkles, Star, User, Users, X } from "lucide-react";
import { normalizeSearch } from "../../../src/ui/normalize";
import { CLASS_DATA } from "../../../src/features/class-picker/classData";
import { resolveClassName } from "../../../src/features/class-picker/useClassName";
import { STAT_META, fmtValue, statIconUrl } from "../../../src/features/equipment/statDisplay";
import type { GuideElement } from "../../../src/data/setGuide";
import { useAccountLocale } from "./Account";
import { ItemFactsList, ItemPeek } from "./ItemFacts";
import {
  GUIDE_ELEMENTS,
  LEVEL_BRACKETS,
  bracketKey,
  readSetFilters,
  setPage,
  useSetPagesStudy,
  writeSetFilters,
  type SetEntry,
  type SetFilters,
} from "./set-pages-model";
import "./set-pages.css";

const ELEMENT_ICON: Record<GuideElement, string> = {
  earth: "strength",
  fire: "intelligence",
  water: "chance",
  air: "agility",
};

function useBracketLabel() {
  const { t } = useAccountLocale();
  return (min: number, max: number) =>
    min === max ? t("sets_bracket_single", { level: min }) : t("sets_bracket_range", { min, max });
}

function Elements({ elements, labels = true }: { elements: GuideElement[]; labels?: boolean }) {
  const { t } = useAccountLocale();
  if (!elements.length) return null;
  return (
    <span className="sp-elements">
      {elements.map((el) => (
        <span key={el} className="sp-element" data-element={el}>
          <img src={statIconUrl(ELEMENT_ICON[el])} alt={labels ? "" : t("elem_" + el)} />
          {labels && t("elem_" + el)}
        </span>
      ))}
    </span>
  );
}

function StatLine({ stat, min, max = 0 }: { stat: string; min: number; max?: number }) {
  const { t } = useAccountLocale(),
    meta = STAT_META[stat];
  return (
    <span className={"sp-stat" + (min < 0 ? " is-negative" : "")}>
      {meta?.icon ? <img src={statIconUrl(meta.icon)} alt="" /> : <i />}
      <b>{fmtValue(min, max, t("range_sep_neg"))}</b>
      <span>{meta ? t(meta.tKey) : stat}</span>
    </span>
  );
}

/** A set in a list: every piece, its level and elements, and what the full set adds. */
export function SetCard({ entry, onOpen }: { entry: SetEntry; onOpen: (slug: string) => void }) {
  const { t, i18n } = useAccountLocale(),
    shown = entry.items.slice(0, 7);
  return (
    <article className="sp-card" data-element={entry.elements.length === 1 ? entry.elements[0] : undefined}>
      <ul className="sp-card-pieces" aria-hidden="true">
        {shown.map((it) => (
          <li key={it.ankama_id}>
            <img src={it.image_url || "/design-assets/forge-mark.svg"} alt="" loading="lazy" decoding="async" />
          </li>
        ))}
        {entry.items.length > shown.length && <li className="sp-more">+{entry.items.length - shown.length}</li>}
      </ul>
      <h3>
        <a
          href={"?view=set&slug=" + entry.slug}
          onClick={(e) => {
            e.preventDefault();
            onOpen(entry.slug);
          }}
        >
          {entry.name}
        </a>
      </h3>
      <p className="sp-card-meta">
        <span>{t("sets_card_level", { level: entry.level })}</span>
        <span>{t("sets_card_pieces", { count: entry.pieces })}</span>
        <Elements elements={entry.elements} labels={false} />
        {entry.classId && (
          <span className="sp-class">{resolveClassName(entry.classId, i18n.language, null)}</span>
        )}
      </p>
      {entry.totals.length > 0 && (
        <p className="sp-card-totals">
          <small>{t("sets_v4_full_set")}</small>
          {entry.totals.slice(0, 3).map((s) => (
            <StatLine key={s.stat} stat={s.stat} min={s.value} />
          ))}
        </p>
      )}
    </article>
  );
}

export function SetsIndex({ onOpen }: { onOpen: (slug: string) => void }) {
  const { t } = useAccountLocale(),
    s = useSetPagesStudy(),
    label = useBracketLabel(),
    id = useId(),
    [filters, setFilters] = useState<SetFilters>(readSetFilters),
    q = useDeferredValue(filters.q);
  useEffect(() => {
    s.start();
  }, []);
  useEffect(() => {
    writeSetFilters(filters);
  }, [filters]);
  const patch = (p: Partial<SetFilters>) => setFilters((f) => ({ ...f, ...p }));
  const groups = useMemo(() => {
    const needle = normalizeSearch(q.trim()),
      visible = s.entries.filter(
        (e) =>
          (!needle || normalizeSearch(e.name).includes(needle)) &&
          (!filters.element || e.elements.includes(filters.element)),
      );
    return LEVEL_BRACKETS.filter((b) => !filters.bracket || bracketKey(b) === filters.bracket)
      .map(([min, max]) => ({ min, max, sets: visible.filter((e) => e.level >= min && e.level <= max) }))
      .filter((g) => g.sets.length > 0);
  }, [s.entries, q, filters.element, filters.bracket]);
  const shown = groups.reduce((n, g) => n + g.sets.length, 0),
    active = !!(filters.q || filters.element || filters.bracket);
  return (
    <div className="sp-study">
      <header className="sp-heading">
        <p className="account-eyebrow">{t("sets_v4_eyebrow")}</p>
        <h1>{t("sets_page_title")}</h1>
        <p>{t("sets_page_intro", { count: s.entries.length })}</p>
      </header>
      <section className="sp-toolbar" aria-label={t("sets_v4_controls")}>
        <label className="sp-search" htmlFor={id + "-q"}>
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">{t("sets_search_placeholder")}</span>
          <input
            id={id + "-q"}
            type="search"
            value={filters.q}
            placeholder={t("sets_search_placeholder")}
            onChange={(e) => patch({ q: e.target.value })}
          />
        </label>
        <div className="sp-element-filter" role="group" aria-label={t("sets_filter_element")}>
          {GUIDE_ELEMENTS.map((el) => (
            <button
              key={el}
              type="button"
              data-element={el}
              aria-pressed={filters.element === el}
              onClick={() => patch({ element: filters.element === el ? "" : el })}
            >
              <img src={statIconUrl(ELEMENT_ICON[el])} alt="" />
              {t("elem_" + el)}
            </button>
          ))}
        </div>
        <select
          aria-label={t("sets_filter_level")}
          value={filters.bracket}
          onChange={(e) => patch({ bracket: e.target.value })}
        >
          <option value="">{t("sets_filter_all_levels")}</option>
          {LEVEL_BRACKETS.map((b) => (
            <option key={bracketKey(b)} value={bracketKey(b)}>
              {label(b[0], b[1])}
            </option>
          ))}
        </select>
        <span className="sp-count" aria-live="polite">
          {t("sets_shown", { count: shown })}
        </span>
        {active && (
          <button type="button" className="sp-clear" onClick={() => setFilters({ q: "", element: "", bracket: "" })}>
            <X size={15} />
            {t("lib_v4_reset")}
          </button>
        )}
      </section>
      {filters.element && (
        <p className="sp-note">
          <Elements elements={[filters.element]} /> {t("sets_element_note")}
        </p>
      )}
      {!groups.length ? (
        <div className="sp-empty">
          <Layers size={28} aria-hidden="true" />
          <p>{t("sets_empty")}</p>
          <button type="button" onClick={() => setFilters({ q: "", element: "", bracket: "" })}>
            {t("lib_v4_reset")}
          </button>
        </div>
      ) : (
        groups.map((g) => (
          <section
            key={g.min}
            className="sp-bracket"
            aria-labelledby={id + "-b" + g.min}
            style={{ containIntrinsicSize: `auto ${Math.ceil(g.sets.length / 3) * 190}px` }}
          >
            <header>
              <h2 id={id + "-b" + g.min}>{label(g.min, g.max)}</h2>
              <span>{t("sets_shown", { count: g.sets.length })}</span>
            </header>
            <div className="sp-grid">
              {g.sets.map((e) => (
                <SetCard key={e.id} entry={e} onOpen={onOpen} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function SetReview() {
  const { t } = useAccountLocale(),
    s = useSetPagesStudy();
  return (
    <details className="account-review sp-review">
      <summary>
        {t("sets_v4_review")}
        <span>{t("account_v4_local_only")}</span>
      </summary>
      <div>
        <label>
          {t("account_v4_scenario")}
          <select value={s.scene} onChange={(e) => s.setScene(e.target.value as "normal" | "no-builds")}>
            {(["normal", "no-builds"] as const).map((v) => (
              <option key={v} value={v}>
                {t("sets_v4_scene_" + v)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </details>
  );
}

export function SetGuidePage({
  slug,
  onIndex,
  onOpen,
  onBuild,
  onClass,
}: {
  slug: string;
  onIndex: () => void;
  onOpen: (slug: string) => void;
  onBuild: (id: string) => void;
  onClass: (classId: string) => void;
}) {
  const { t, i18n } = useAccountLocale(),
    s = useSetPagesStudy();
  useEffect(() => {
    s.start();
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);
  const current = slug || s.entries[0]?.slug || "",
    data = useMemo(() => setPage(s.entries, current), [s.entries, current]);
  if (!s.entries.length) return null;
  if (!data)
    return (
      <div className="sp-study sp-missing">
        <Layers size={30} aria-hidden="true" />
        <h1>{t("sets_v4_missing_title")}</h1>
        <p>{t("set_page_not_found")}</p>
        <button className="primary" onClick={onIndex}>
          <ArrowLeft size={16} />
          {t("set_page_cta_all")}
        </button>
      </div>
    );
  const { entry, tiers, related } = data,
    builds = s.scene === "no-builds" ? [] : data.builds,
    maxTier = tiers.at(-1)?.pieces ?? 0,
    summary = entry.totals
      .slice(0, 4)
      .map((x) => `${x.value > 0 ? "+" : ""}${x.value} ${STAT_META[x.stat] ? t(STAT_META[x.stat].tKey) : x.stat}`)
      .join(", "),
    element = entry.elements.length === 1 ? entry.elements[0] : undefined;
  return (
    <div className="sp-study sp-page" data-element={element}>
      <SetReview />
      <nav className="sp-crumbs" aria-label={t("build_v4_breadcrumb")}>
        <button onClick={onIndex}>
          <ArrowLeft size={16} />
          {t("sets_page_title")}
        </button>
      </nav>
      <header className="sp-hero">
        <ul className="sp-hero-pieces" aria-label={t("set_page_items_title", { count: entry.items.length })}>
          {entry.items.map((it) => (
            <li key={it.ankama_id}>
              <ItemPeek item={it}>
                <span className="sp-tile" tabIndex={0}>
                  <img src={it.image_url || "/design-assets/forge-mark.svg"} alt={it.name} />
                </span>
              </ItemPeek>
            </li>
          ))}
        </ul>
        <h1>{entry.name}</h1>
        <p className="sp-hero-meta">
          <span className="sp-chip is-level">{t("sets_card_level", { level: entry.level })}</span>
          <span className="sp-chip">{t("sets_card_pieces", { count: entry.pieces })}</span>
          <Elements elements={entry.elements} />
          {entry.classId && (
            <button type="button" className="sp-chip is-class" onClick={() => onClass(entry.classId!)}>
              <Sparkles size={13} aria-hidden="true" />
              {t("set_page_class_set", { class: resolveClassName(entry.classId, i18n.language, null) })}
            </button>
          )}
        </p>
        <p className="sp-hero-intro">
          {t("set_page_intro", {
            name: entry.name,
            level: entry.level,
            count: entry.pieces,
            tiers: maxTier,
            bonus: summary,
          })}
        </p>
        <div className="sp-hero-actions">
          <a className="primary" href={"/?set=" + entry.id}>
            <Hammer size={17} aria-hidden="true" />
            {t("sets_v4_try")}
          </a>
          <button type="button" onClick={onIndex}>
            <Layers size={17} aria-hidden="true" />
            {t("set_page_cta_all")}
          </button>
        </div>
      </header>

      <div className="sp-body">
        <div className="sp-column">
          <section aria-labelledby="sp-totals">
            <header className="sp-section-head">
              <h2 id="sp-totals">{t("set_page_totals_title")}</h2>
              <p>{t("set_page_totals_note", { count: entry.pieces })}</p>
            </header>
            <div className="sp-totals">
              {entry.totals.map((x) => (
                <StatLine key={x.stat} stat={x.stat} min={x.value} />
              ))}
            </div>
          </section>
          <section aria-labelledby="sp-tiers">
            <header className="sp-section-head">
              <h2 id="sp-tiers">{t("set_page_tiers_title")}</h2>
              <p>{t("set_page_tiers_note")}</p>
            </header>
            <ol className="sp-tiers">
              {tiers.map((tier) => (
                <li key={tier.pieces} className={tier.pieces === maxTier ? "is-full" : ""}>
                  <h3>
                    {t("build_v4_tier", { count: tier.pieces })}
                    {tier.pieces === maxTier && <em>{t("set_page_full_bonus")}</em>}
                  </h3>
                  <div>
                    {tier.effects.map((e, i) => (
                      <StatLine key={i} stat={e.stat} min={e.min} max={e.max} />
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <section aria-labelledby="sp-items" className="sp-items">
          <header className="sp-section-head">
            <h2 id="sp-items">{t("set_page_items_title", { count: entry.items.length })}</h2>
          </header>
          {entry.items.map((it) => (
            <article key={it.ankama_id} className="sp-item">
              <header>
                <span className="sp-tile">
                  <img src={it.image_url || "/design-assets/forge-mark.svg"} alt="" loading="lazy" />
                </span>
                <span>
                  <h3>{it.name}</h3>
                  <small>
                    {t("item_type_" + it.type, { defaultValue: it.type })} ·{" "}
                    {t("sets_card_level", { level: it.level })}
                  </small>
                </span>
              </header>
              <div className="sp-item-facts">
                <ItemFactsList item={{ ...it, description: undefined }} />
              </div>
              {it.conditions && it.conditions.length > 0 && (
                <p className="sp-conditions">
                  <b>{t("conditions")}</b>
                  {it.conditions
                    .map((c) => `${STAT_META[c.stat] ? t(STAT_META[c.stat].tKey) : c.stat} ${c.operator} ${c.value}`)
                    .join(" · ")}
                </p>
              )}
              {it.description && (
                <details className="sp-lore">
                  <summary>{t("sets_v4_description")}</summary>
                  <p>{it.description}</p>
                </details>
              )}
            </article>
          ))}
        </section>
      </div>

      <section aria-labelledby="sp-builds" className="sp-builds">
        <header className="sp-section-head">
          <h2 id="sp-builds">{t("set_page_builds_title")}</h2>
          {builds.length > 0 && <p>{t("set_page_builds_note", { name: entry.name })}</p>}
        </header>
        {builds.length ? (
          <ul>
            {builds.map((b) => {
              const info = CLASS_DATA.find((c) => c.id === b.sheet.classId);
              return (
                <li key={b.id}>
                  <a
                    href={"?view=build&example=" + b.id}
                    onClick={(e) => {
                      e.preventDefault();
                      onBuild(b.id);
                    }}
                  >
                    <img src={(b.sheet.gender === "female" ? info?.imageFUrl : info?.imageUrl) || ""} alt="" />
                    <span>
                      <b>{b.sheet.name}</b>
                      <small>
                        <span>{t("sets_card_level", { level: b.sheet.level })}</span>
                        <span>
                          <User size={12} aria-hidden="true" />
                          {b.owner}
                        </span>
                        {b.rating > 0 && (
                          <span className="is-rating">
                            <Star size={12} aria-hidden="true" />
                            {b.rating.toFixed(1)}
                          </span>
                        )}
                        {b.likes > 0 && (
                          <span>
                            <Heart size={12} aria-hidden="true" />
                            {b.likes}
                          </span>
                        )}
                      </small>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="sp-builds-empty">
            <Users size={18} aria-hidden="true" />
            <p>{t("set_page_builds_empty", { name: entry.name })}</p>
            <a href={"/?set=" + entry.id}>{t("sets_v4_try")}</a>
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section aria-labelledby="sp-related" className="sp-related">
          <header className="sp-section-head">
            <h2 id="sp-related">{t("set_page_related_title")}</h2>
            <p>{t("set_page_related_note")}</p>
          </header>
          <div className="sp-grid">
            {related.map((r) => (
              <SetCard key={r.id} entry={r} onOpen={onOpen} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
