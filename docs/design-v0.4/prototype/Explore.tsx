import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  ChevronDown,
  Compass,
  FolderPlus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { CLASS_DATA } from "../../../src/features/class-picker/classData";
import { resolveClassName } from "../../../src/features/class-picker/useClassName";
import type {
  CommunityStats,
  ExploreSort,
} from "../../../src/features/builds/api";
import { useDataStore } from "../../../src/store/dataStore";
import { useAccountLocale } from "./Account";
import { useAccountStudy } from "./account-model";
import { BuildActivity } from "./BuildActivity";
import { BuildSheet, sheetVitals } from "./BuildSheet";
import { equipment } from "./model";
import { Modal } from "./SurfaceModal";
import {
  exploreScenes,
  exploreTags,
  readExploreFilters,
  useExploreStudy,
  writeExploreFilters,
  type ExploreRecord,
  type ExploreScene,
} from "./explore-model";
import "./explore.css";

function navigateLocally(
  e: MouseEvent<HTMLAnchorElement>,
  callback: () => void,
) {
  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    callback();
  }
}
function ExploreReview() {
  const { t, i18n } = useAccountLocale(),
    s = useExploreStudy(),
    account = useAccountStudy();
  return (
    <details className="account-review explore-review">
      <summary>
        {t("explore_v4_review")}
        <span>{t("account_v4_local_only")}</span>
      </summary>
      <div>
        <label>
          {t("account_v4_scenario")}
          <select
            value={s.scene}
            onChange={(e) => s.setScene(e.target.value as ExploreScene)}
          >
            {exploreScenes.map((scene) => (
              <option value={scene} key={scene}>
                {t("explore_v4_scene_" + scene)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("account_v4_session")}
          <select
            value={account.signedIn ? "in" : "out"}
            onChange={(e) => account.setSignedIn(e.target.value === "in")}
          >
            <option value="in">{t("account_v4_signed_in")}</option>
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
function CommunitySummary() {
  const { t, i18n } = useAccountLocale(),
    s = useExploreStudy(),
    data = useDataStore(),
    id = useId(),
    expanded = s.summaryOpen ?? matchMedia("(min-width:1000px)").matches,
    nf = new Intl.NumberFormat(i18n.language);
  const rows: [keyof CommunityStats, string][] = [
    ["usersCount", "players"],
    ["publicBuildsCount", "public_builds"],
    ["viewsCount", "views"],
    ["forgeFinishedCount", "forge_finished"],
    ["buildsCount", "all_builds"],
    ["likesCount", "likes"],
    ["buildsThisWeek", "this_week"],
    ["forgeRunsCount", "forge_runs"],
  ];
  return (
    <section
      className="explore-community"
      aria-label={t("explore_v4_community")}
    >
      <button
        className="explore-community-toggle"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => s.setSummaryOpen(!expanded)}
      >
        <span>
          <b>{t("explore_v4_community")}</b>
          <small>{t("explore_v4_example_stats")}</small>
        </span>
        <span>
          {s.statsState === "ready" &&
            s.stats &&
            t("explore_v4_community_short", {
              players: nf.format(s.stats.usersCount),
              builds: nf.format(s.stats.publicBuildsCount),
            })}
          <ChevronDown size={17} className={expanded ? "is-open" : ""} />
        </span>
      </button>
      <div id={id} hidden={!expanded}>
        {s.statsState === "loading" ? (
          <p className="explore-community-state" role="status">
            {t("explore_v4_stats_loading")}
          </p>
        ) : s.statsState === "error" ? (
          <div className="explore-community-state">
            <p>{t("explore_v4_stats_error")}</p>
            <button onClick={s.retryMeta}>{t("account_v4_retry")}</button>
          </div>
        ) : (
          s.stats && (
            <>
              <dl>
                {rows
                  .filter(([key]) => s.stats![key] != null)
                  .map(([key, label]) => (
                    <div key={key}>
                      <dt>{t("explore_v4_stat_" + label)}</dt>
                      <dd>{nf.format(s.stats![key]!)}</dd>
                    </div>
                  ))}
              </dl>
              {s.stats.forgeRunsCount == null && (
                <p className="explore-community-note">
                  {t("explore_v4_forge_unavailable")}
                </p>
              )}
              {!!data.index?.length && !!data.sets?.length && (
                <p className="explore-catalog-count">
                  {t("explore_stat_catalog", {
                    items: nf.format(data.index.length),
                    sets: nf.format(data.sets.length),
                  })}
                </p>
              )}
            </>
          )
        )}
      </div>
      {!expanded && s.statsState === "error" && (
        <p className="explore-community-inline">
          {t("explore_v4_stats_error")}{" "}
          <button onClick={s.retryMeta}>{t("account_v4_retry")}</button>
        </p>
      )}
    </section>
  );
}
function ClassChoice({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  const { t, i18n } = useAccountLocale();
  return (
    <div className="explore-select">
      <label htmlFor={id}>{t("class")}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t("explore_all_classes")}</option>
        {CLASS_DATA.map((c) => (
          <option key={c.id} value={c.id}>
            {resolveClassName(c.id, i18n.language, null)}
          </option>
        ))}
      </select>
    </div>
  );
}
function FilterDialog({ onClose }: { onClose: () => void }) {
  const { t } = useAccountLocale(),
    s = useExploreStudy(),
    id = useId(),
    [classId, setClassId] = useState(s.filters.classId),
    [tag, setTag] = useState(
      exploreTags.some((t) => t.name === s.filters.tag) ? s.filters.tag : "",
    ),
    known = exploreTags.some((t) => t.name === tag);
  return (
    <Modal
      open
      onClose={onClose}
      title={t("explore_v4_filter_title")}
      className="explore-filter-dialog"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          s.setFilters({ classId, tag });
          onClose();
        }}
      >
        <div className="explore-filter-scroll">
          <ClassChoice
            id={id + "-class"}
            value={classId}
            onChange={setClassId}
          />
          <p className="explore-filter-hint">{t("explore_v4_filter_hint")}</p>
          {s.tagsState === "loading" ? (
            <p role="status">{t("explore_v4_tags_loading")}</p>
          ) : s.tagsState === "error" ? (
            <div className="explore-inline-error">
              <p>{t("explore_v4_tags_error")}</p>
              <button type="button" onClick={s.retryMeta}>
                {t("account_v4_retry")}
              </button>
            </div>
          ) : (
            <fieldset className="explore-tag-options">
              <legend>{t("explore_tags_label")}</legend>
              <label className={!tag || !known ? "is-selected" : ""}>
                <input
                  type="radio"
                  name={id + "-tag"}
                  checked={!tag}
                  onChange={() => setTag("")}
                />
                <span>{t("explore_tag_all")}</span>
              </label>
              {(["playstyle", "element", "general"] as const).map(
                (category) => (
                  <div key={category}>
                    <h3>{t("tag_category_" + category)}</h3>
                    <div>
                      {exploreTags
                        .filter((t) => t.category === category)
                        .map((option) => (
                          <label
                            key={option.id}
                            className={tag === option.name ? "is-selected" : ""}
                          >
                            <input
                              type="radio"
                              name={id + "-tag"}
                              checked={tag === option.name}
                              onChange={() => setTag(option.name)}
                            />
                            <span>{t("tag_" + option.name)}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                ),
              )}
            </fieldset>
          )}
        </div>
        <footer className="explore-filter-actions">
          <button
            type="button"
            onClick={() => {
              setClassId("");
              setTag("");
            }}
          >
            {t("explore_v4_clear_selection")}
          </button>
          <button className="primary" type="submit">
            {t("explore_v4_apply")}
            <ArrowRight size={16} />
          </button>
        </footer>
      </form>
    </Modal>
  );
}
function ExploreCard({
  record: r,
  onBuild,
  onAuthor,
  onSave,
  onTag,
}: {
  record: ExploreRecord;
  onBuild: (r: ExploreRecord) => void;
  onAuthor: (username: string) => void;
  onSave: (r: ExploreRecord) => void;
  onTag: (tag: string) => void;
}) {
  const { t, i18n } = useAccountLocale(),
    s = useExploreStudy(),
    vitals = sheetVitals(r.sheet),
    className = resolveClassName(r.sheet.classId, i18n.language, null);
  return (
    <article
      className="product-build explore-card"
      data-build-id={r.id}
      aria-label={r.sheet.name}
    >
      <div className="explore-card-author">
        <a
          href={"?view=profile&player=" + encodeURIComponent(r.owner)}
          onClick={(e) =>
            navigateLocally(e, () => {
              s.rememberScroll();
              onAuthor(r.owner);
            })
          }
          aria-label={t("explore_v4_open_author", { name: r.owner })}
        >
          <span aria-hidden="true">{r.owner.slice(0, 1).toUpperCase()}</span>
          {r.owner}
          <ArrowUpRight size={12} />
        </a>
        {r.featured && (
          <span className="explore-featured">
            <Award size={14} />
            {t("build_featured")}
          </span>
        )}
      </div>
      <a
        id={"card-" + r.id}
        className="build-card-open explore-card-open"
        href={"?view=build&example=" + r.id}
        onClick={(e) =>
          navigateLocally(e, () => {
            s.rememberScroll();
            onBuild(r);
          })
        }
      >
        <span className="build-card-head">
          <span>{className}</span>
          <span className="build-level">
            {t("level_short", { level: r.sheet.level })}
          </span>
        </span>
        <BuildSheet build={r.sheet} items={equipment} />
        <h2>{r.sheet.name}</h2>
      </a>
      <div className="explore-card-tags" aria-label={t("publish_tags_label")}>
        {r.tags.slice(0, 3).map((tag) => (
          <button
            key={tag.id}
            onClick={() => onTag(tag.name)}
            aria-pressed={s.filters.tag === tag.name}
          >
            {t("tag_" + tag.name)}
          </button>
        ))}
      </div>
      <div className="build-card-bottom">
        {vitals && (
          <ul className="build-vitals" aria-label={t("lib_v4_vitals")}>
            {(["ap", "mp", "range"] as const).map((key, i) => (
              <li key={key}>
                <img
                  src={"/data/stats/" + ["ap.webp", "mp.webp", "range.webp"][i]}
                  alt=""
                />
                <strong>{vitals[key]}</strong>
                {t(["lib_v4_ap", "lib_v4_mp", "lib_v4_range"][i])}
              </li>
            ))}
          </ul>
        )}
        <button
          className="explore-save"
          onClick={() => onSave(r)}
          aria-label={t("lib_v4_save_named", { name: r.sheet.name })}
        >
          <FolderPlus size={18} />
        </button>
      </div>
      <BuildActivity activity={r.activity} />
    </article>
  );
}
function ExploreEmpty({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="explore-empty">
      <Compass size={30} />
      <h2>{title}</h2>
      <p>{body}</p>
      {children}
    </div>
  );
}
export function Explore({
  onBuild,
  onAuthor,
  onSave,
}: {
  onBuild: (r: ExploreRecord) => void;
  onAuthor: (username: string) => void;
  onSave: (r: ExploreRecord) => void;
}) {
  const { t, i18n } = useAccountLocale(),
    s = useExploreStudy(),
    [search, setSearch] = useState(() =>
      s.initialized
        ? s.filters.search
        : new URLSearchParams(location.search).get("q") || "",
    ),
    [filtersOpen, setFiltersOpen] = useState(false),
    id = useId(),
    previousCount = useRef(s.rows.length),
    nf = new Intl.NumberFormat(i18n.language);
  useEffect(() => {
    s.start();
    const y = useExploreStudy.getState().scrollY;
    const frame = requestAnimationFrame(() => window.scrollTo(0, y));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => s.setFilters({ search }), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (s.initialized) writeExploreFilters(s.filters);
  }, [s.filters, s.initialized]);
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(location.search);
      if (p.get("view") === "explore") {
        const filters = readExploreFilters();
        setSearch(filters.search);
        s.setFilters(filters);
      }
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    const count = previousCount.current;
    previousCount.current = s.rows.length;
    if (count > 0 && s.rows.length > count && s.page > 0) {
      const card = document.getElementById("card-" + s.rows[count].id);
      card?.focus({ preventScroll: true });
      card?.scrollIntoView({ block: "start" });
    }
  }, [s.rows, s.page]);
  function clear() {
    setSearch("");
    s.setFilters({ search: "", classId: "", tag: "" });
  }
  const active = !!s.filters.search || !!s.filters.classId || !!s.filters.tag,
    unknown =
      s.tagsState === "ready" &&
      !!s.filters.tag &&
      !exploreTags.some((t) => t.name === s.filters.tag),
    filterCount = Number(!!s.filters.classId) + Number(!!s.filters.tag),
    searchPending = search !== s.filters.search;
  return (
    <div className="explore-study">
      <ExploreReview />
      <header className="explore-heading">
        <div>
          <p className="account-eyebrow">{t("explore_v4_eyebrow")}</p>
          <h1>{t("explore_title")}</h1>
          <p>{t("explore_v4_intro")}</p>
        </div>
        <a href="/">
          {t("lib_v4_workshop")}
          <ArrowUpRight size={16} />
        </a>
      </header>
      <CommunitySummary />
      <section
        className="explore-controls"
        aria-label={t("explore_v4_controls")}
      >
        <div className="explore-toolbar">
          <form
            className="explore-search"
            onSubmit={(e) => {
              e.preventDefault();
              s.setFilters({ search });
            }}
          >
            <Search size={18} />
            <label className="sr-only" htmlFor={id + "-search"}>
              {t("explore_search_placeholder")}
            </label>
            <input
              id={id + "-search"}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("explore_search_placeholder")}
            />
            {search && (
              <button
                type="button"
                aria-label={t("lib_v4_clear")}
                onClick={() => {
                  setSearch("");
                  s.setFilters({ search: "" });
                }}
              >
                <X size={16} />
              </button>
            )}
          </form>
          <div className="explore-desktop-class">
            <ClassChoice
              id={id + "-class"}
              value={s.filters.classId}
              onChange={(classId) => s.setFilters({ classId })}
            />
          </div>
          <div className="explore-select explore-sort">
            <label htmlFor={id + "-sort"}>{t("lib_v4_sort")}</label>
            <select
              id={id + "-sort"}
              value={s.filters.sort}
              onChange={(e) =>
                s.setFilters({ sort: e.target.value as ExploreSort })
              }
            >
              {(["rating", "likes", "recent", "views"] as const).map((sort) => (
                <option key={sort} value={sort}>
                  {t("sort_" + sort)}
                </option>
              ))}
            </select>
          </div>
          <button
            className="explore-filter-trigger"
            aria-haspopup="dialog"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={17} />
            {t("explore_v4_filters")}
            {filterCount > 0 && <span>{filterCount}</span>}
          </button>
        </div>
        {active && (
          <div
            className="explore-active-filters"
            aria-label={t("explore_v4_active")}
          >
            {s.filters.search && (
              <button
                onClick={() => {
                  setSearch("");
                  s.setFilters({ search: "" });
                }}
                aria-label={t("explore_v4_remove_search")}
              >
                <span>“{s.filters.search}”</span>
                <X size={13} />
              </button>
            )}
            {s.filters.classId && (
              <button
                onClick={() => s.setFilters({ classId: "" })}
                aria-label={t("explore_v4_remove_class")}
              >
                <span>
                  {resolveClassName(s.filters.classId, i18n.language, null)}
                </span>
                <X size={13} />
              </button>
            )}
            {s.filters.tag && (
              <button
                onClick={() => s.setFilters({ tag: "" })}
                aria-label={t("explore_v4_remove_tag")}
              >
                <span>
                  {unknown ? s.filters.tag : t("tag_" + s.filters.tag)}
                </span>
                <X size={13} />
              </button>
            )}
            <button className="explore-clear" onClick={clear}>
              {t("lib_v4_reset")}
            </button>
          </div>
        )}
      </section>
      {unknown && (
        <p className="explore-inline-notice" role="status">
          {t("explore_v4_unknown_tag", { tag: s.filters.tag })}
        </p>
      )}
      {s.tagsState === "error" && (
        <div className="explore-inline-error">
          <p>{t("explore_v4_tags_error")}</p>
          <button onClick={s.retryMeta}>{t("account_v4_retry")}</button>
        </div>
      )}
      <div className="explore-results-heading">
        <h2>{t("explore_v4_results")}</h2>
        <p role="status" aria-live="polite">
          {(s.loading && !s.rows.length) || searchPending
            ? t("explore_v4_searching")
            : s.error === "initial"
              ? t("explore_v4_load_error")
              : t("explore_v4_showing", {
                  shown: nf.format(s.rows.length),
                  total: nf.format(s.total),
                })}
        </p>
      </div>
      <div className="explore-results" aria-busy={s.loading || searchPending}>
        {s.loading && !s.rows.length ? (
          <div className="explore-loading" role="status">
            <span>{t("auth_loading")}</span>
            <div className="build-grid" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="explore-skeleton">
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          </div>
        ) : s.error === "initial" ? (
          <ExploreEmpty
            title={t("explore_v4_load_error")}
            body={t("explore_v4_load_error_hint")}
          >
            <button onClick={s.retryList}>{t("account_v4_retry")}</button>
          </ExploreEmpty>
        ) : !s.rows.length ? (
          <ExploreEmpty
            title={t(active ? "explore_v4_no_results" : "explore_v4_no_builds")}
            body={t(
              active
                ? "explore_v4_no_results_hint"
                : "explore_v4_no_builds_hint",
            )}
          >
            {active ? (
              <button onClick={clear}>{t("lib_v4_reset")}</button>
            ) : (
              <a className="primary product-anchor" href="/">
                {t("lib_v4_workshop")}
                <ArrowRight size={16} />
              </a>
            )}
          </ExploreEmpty>
        ) : (
          <div className="build-grid explore-grid">
            {s.rows.map((record) => (
              <ExploreCard
                key={record.id}
                record={record}
                onBuild={onBuild}
                onAuthor={onAuthor}
                onSave={onSave}
                onTag={(tag) => s.setFilters({ tag })}
              />
            ))}
          </div>
        )}
      </div>
      {!!s.rows.length && s.rows.length < s.total && (
        <div className="explore-pagination">
          {s.error === "more" && (
            <p role="alert">{t("explore_v4_more_error")}</p>
          )}
          <button
            className="explore-more"
            disabled={s.loading}
            onClick={() =>
              s.error === "more" ? s.retryList() : void s.load(true)
            }
          >
            {t(
              s.loading
                ? "auth_loading"
                : s.error === "more"
                  ? "explore_v4_retry_more"
                  : "explore_load_more",
            )}
            <ArrowRight size={16} />
          </button>
          <span>
            {t("explore_v4_showing", {
              shown: nf.format(s.rows.length),
              total: nf.format(s.total),
            })}
          </span>
        </div>
      )}
      {!!s.rows.length && s.rows.length >= s.total && !s.loading && (
        <p className="explore-end">{t("explore_v4_end")}</p>
      )}
      {filtersOpen && <FilterDialog onClose={() => setFiltersOpen(false)} />}
    </div>
  );
}
