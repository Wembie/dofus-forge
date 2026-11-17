import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  Copy,
  Eye,
  FolderOpen,
  Globe,
  Heart,
  Link2,
  LayoutGrid,
  List,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { normalizeSearch } from "../../../src/ui/normalize";
import { encodeSnapshot } from "../../../src/features/share/codec";
import { resolveClassName } from "../../../src/features/class-picker/useClassName";
import type { BuildVisibility } from "../../../src/features/builds/api";
import { BuildSheet, sheetVitals } from "./BuildSheet";
import { equipment } from "./model";
import { Modal } from "./SurfaceModal";
import { useAccountLocale } from "./Account";
import { useAccountStudy } from "./account-model";
import {
  collectionBuilds,
  librarySnapshot,
  useLibraryStudy,
  LIBRARY_NAME_MAX,
  COLLECTION_DESCRIPTION_MAX,
  type LibraryBuild,
  type LibraryDialogId,
  type LibraryCollection,
  type LibraryTab,
} from "./library-model";
import "./library.css";

const visibilityIcons = { private: Lock, unlisted: Link2, public: Globe };
export function LibraryReview({
  collection = false,
}: {
  collection?: boolean;
}) {
  const { t, i18n } = useAccountLocale(),
    s = useLibraryStudy();
  return (
    <details className="account-review library-review">
      <summary>
        {t("lib_v4_review")}
        <span>{t("account_v4_local_only")}</span>
      </summary>
      <div>
        <label>
          {t("account_v4_scenario")}
          <select
            value={s.response}
            onChange={(e) =>
              s.review({ response: e.target.value as typeof s.response })
            }
          >
            {["success", "error", "forbidden", "membership-error"].map((v) => (
              <option key={v} value={v}>
                {t("lib_v4_response_" + v)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("lib_v4_view_state")}
          <select
            value={s.viewState}
            onChange={(e) =>
              s.review({ viewState: e.target.value as typeof s.viewState })
            }
          >
            {["ready", "loading", "error", "empty"].map((v) => (
              <option key={v} value={v}>
                {t("lib_v4_state_" + v)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("account_v4_language")}
          <select
            value={i18n.language}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
          >
            {["es", "en", "fr", "pt"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        {collection && (
          <label>
            {t("lib_v4_view_as")}
            <select
              value={s.visitor ? "visitor" : "owner"}
              onChange={(e) =>
                s.review({ visitor: e.target.value === "visitor" })
              }
            >
              <option value="owner">{t("lib_v4_owner")}</option>
              <option value="visitor">{t("lib_v4_visitor")}</option>
            </select>
          </label>
        )}
      </div>
    </details>
  );
}
function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={"library-notice" + (error ? " is-error" : "")}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
function Visibility({
  value,
  collection = false,
}: {
  value: BuildVisibility;
  collection?: boolean;
}) {
  const { t } = useAccountLocale(),
    Icon = visibilityIcons[value];
  return (
    <span className={"library-visibility is-" + value}>
      <Icon size={13} />
      {t(
        collection
          ? value === "public"
            ? "collections_public"
            : "collections_private"
          : "publish_visibility_" + value,
      )}
    </span>
  );
}
function Empty({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <div className="library-empty">
      <FolderOpen size={30} />
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {children}
    </div>
  );
}
function CardMenu({
  name,
  children,
}: {
  name: string;
  children: (close: () => void) => ReactNode;
}) {
  const { t } = useAccountLocale(),
    [open, setOpen] = useState(false),
    ref = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      className="library-card-menu"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
    >
      <button
        ref={trigger}
        aria-label={t("lib_v4_actions", { name })}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      >
        <MoreHorizontal size={19} />
      </button>
      {open && (
        <div id={id} className="library-action-list">
          {children(close)}
        </div>
      )}
    </div>
  );
}
function workshopHref(b: LibraryBuild, owner: boolean) {
  return (
    "/?b=" +
    encodeSnapshot(librarySnapshot(b)) +
    (owner ? "&study-edit=" + encodeURIComponent(b.id) : "")
  );
}
function LibraryCard({
  b,
  onDialog,
  onDetail,
  onRemove,
  removing = false,
  owner = false,
  privacyNote = false,
  bookmarkAction = false,
}: {
  b: LibraryBuild;
  onDialog: (id: LibraryDialogId, b: LibraryBuild) => void;
  onDetail: (b: LibraryBuild) => void;
  onRemove?: () => void;
  removing?: boolean;
  owner?: boolean;
  privacyNote?: boolean;
  bookmarkAction?: boolean;
}) {
  const { t, i18n } = useAccountLocale(),
    s = useLibraryStudy(),
    v = sheetVitals(b.sheet),
    [copy, setCopy] = useState("");
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `https://dofusforge.com/${i18n.language === "en" ? "" : i18n.language + "/"}build/${b.id}`,
      );
      setCopy(t("lib_v4_copied"));
    } catch {
      setCopy(t("account_v4_copy_error"));
    }
  }
  return (
    <article className="library-card" aria-label={b.sheet.name}>
      <div className="library-card-meta">
        <Visibility value={b.visibility} />
        <span>{t("level_short", { level: b.sheet.level })}</span>
      </div>
      <button className="library-card-main" onClick={() => onDetail(b)}>
        <BuildSheet build={b.sheet} items={equipment} />
        <h2>{b.sheet.name}</h2>
        <span>
          {resolveClassName(b.sheet.classId, i18n.language, null)} · {b.owner}
        </span>
      </button>
      {v && (
        <div className="library-vitals" aria-label={t("lib_v4_vitals")}>
          {(["ap", "mp", "range"] as const).map((key, i) => (
            <span key={key}>
              <img
                src={"/data/stats/" + ["ap.webp", "mp.webp", "range.webp"][i]}
                alt=""
              />
              <b>{v[key]}</b>
              {t(["lib_v4_ap", "lib_v4_mp", "lib_v4_range"][i])}
            </span>
          ))}
        </div>
      )}
      <div className="library-social">
        <span>
          <Star size={13} />
          {b.rating.toFixed(1)}
        </span>
        <span>
          <Heart size={13} />
          {b.likes}
        </span>
        <span>
          <Eye size={13} />
          {b.views}
        </span>
        <span title={t("lib_v4_comments", { count: b.comments })}>
          <MessageSquare size={13} />
          {b.comments}
        </span>
      </div>
      {privacyNote && (
        <p className="library-private-note">
          <Lock size={13} />
          {t(
            b.visibility === "unlisted"
              ? "collection_unlisted_build_hint"
              : "collection_private_build_hint",
          )}
        </p>
      )}
      <footer>
        <a href={workshopHref(b, owner)}>
          <Pencil size={15} />
          {t(owner ? "my_builds_edit" : "lib_v4_open_workshop")}
        </a>
        <button
          onClick={() => onDialog("collection-picker", b)}
          aria-label={t("lib_v4_save_named", { name: b.sheet.name })}
        >
          <FolderOpen size={17} />
        </button>
        <CardMenu name={b.sheet.name}>
          {(close) => (
            <>
              <button
                onClick={() => {
                  close();
                  void copyLink();
                }}
              >
                <Copy size={15} />
                {t("my_builds_copy_link")}
              </button>
              {owner && (
                <>
                  <button
                    onClick={() => {
                      close();
                      onDialog("visibility", b);
                    }}
                  >
                    <Globe size={15} />
                    {t("publish_visibility_label")}
                  </button>
                  <button
                    onClick={() => {
                      close();
                      onDialog("rename", b);
                    }}
                  >
                    <Pencil size={15} />
                    {t("lib_v4_rename")}
                  </button>
                  <button
                    className="danger"
                    onClick={() => {
                      close();
                      onDialog("delete-build", b);
                    }}
                  >
                    <Trash2 size={15} />
                    {t("my_builds_delete")}
                  </button>
                </>
              )}
              {bookmarkAction && s.bookmarks.includes(b.id) && (
                <button
                  onClick={() => {
                    close();
                    onRemove?.();
                  }}
                  disabled={removing}
                >
                  <Bookmark size={15} />
                  {t("lib_v4_unbookmark")}
                </button>
              )}
            </>
          )}
        </CardMenu>
      </footer>
      {copy && (
        <p className="library-copy" role="status">
          {copy}
        </p>
      )}
    </article>
  );
}
function CollectionRow({
  c,
  onOpen,
}: {
  c: LibraryCollection;
  onOpen: () => void;
}) {
  const { t } = useAccountLocale(),
    s = useLibraryStudy(),
    rows = collectionBuilds(c, s.visitor);
  return (
    <button className="library-collection-row" onClick={onOpen}>
      <span className="library-collection-art" aria-hidden="true">
        {rows.length ? (
          rows
            .slice(0, 3)
            .map((b) => (
              <img
                key={b.id}
                src={
                  equipment.get(b.sheet.slots.dofus1 || 0)?.image_url ||
                  "/design-assets/item-972.png"
                }
                alt=""
              />
            ))
        ) : (
          <FolderOpen size={32} />
        )}
      </span>
      <span className="library-collection-copy">
        <b>{c.name}</b>
        {c.description && <span>{c.description}</span>}
        <small>
          <Visibility collection value={c.is_public ? "public" : "private"} />
          {t("collections_builds_count", { count: rows.length })}
        </small>
      </span>
      <ArrowUpRight size={20} />
    </button>
  );
}
export function Library({
  collection = false,
  onDialog,
  onCollection,
  onDetail,
  onSignIn,
}: {
  collection?: boolean;
  onDialog: (id: LibraryDialogId) => void;
  onCollection: () => void;
  onDetail: (b: LibraryBuild) => void;
  onSignIn: () => void;
}) {
  const { t, i18n } = useAccountLocale(),
    s = useLibraryStudy(),
    signedIn = useAccountStudy((v) => v.signedIn),
    [query, setQuery] = useState(""),
    [compact, setCompact] = useState(false),
    [visibility, setVisibility] = useState("all"),
    [sort, setSort] = useState(collection ? "saved" : "recent"),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [retry, setRetry] = useState(0);
  const visitor = collection && (s.visitor || !signedIn),
    c = s.collections.find((c) => c.id === s.selectedCollection),
    own = s.builds.filter((b) => b.owner === "brasa");
  useEffect(() => {
    setPending(true);
    const timer = setTimeout(() => setPending(false), 300);
    setQuery("");
    setVisibility("all");
    setSort(collection ? "saved" : "recent");
    if (!collection) s.review({ visitor: false });
    setError(null);
    return () => clearTimeout(timer);
  }, [s.tab, collection, s.selectedCollection, retry]);
  const collectionVisible = !!c && (!visitor || c.is_public),
    raw = collection
      ? collectionVisible
        ? collectionBuilds(c, visitor)
        : []
      : s.tab === "bookmarked"
        ? s.builds.filter((b) => s.bookmarks.includes(b.id))
        : own;
  const rows = (s.viewState === "empty" ? [] : raw)
    .filter(
      (b) =>
        normalizeSearch(
          b.sheet.name +
            " " +
            b.owner +
            " " +
            resolveClassName(b.sheet.classId, i18n.language, null) +
            " " +
            b.sheet.classId,
        ).includes(normalizeSearch(query)) &&
        (visibility === "all" || b.visibility === visibility),
    )
    .sort((a, b) =>
      sort === "saved"
        ? 0
        : sort === "name"
          ? a.sheet.name.localeCompare(b.sheet.name)
          : b.updated.localeCompare(a.updated),
    );
  const collections = (s.viewState === "empty" ? [] : s.collections).filter(
    (c) =>
      normalizeSearch(c.name + " " + (c.description || "")).includes(
        normalizeSearch(query),
      ),
  );
  function dialog(id: LibraryDialogId, b?: LibraryBuild) {
    if (b) s.selectBuild(b.id);
    onDialog(id);
  }
  async function remove(b: LibraryBuild) {
    setError(null);
    try {
      if (collection && c) await s.membership(c.id, b.id, false);
      else await s.bookmark(b.id);
    } catch (e) {
      setError(
        t(
          e instanceof Error && e.message === "forbidden"
            ? "lib_v4_forbidden"
            : "lib_v4_action_error",
        ),
      );
    }
  }
  const heading = collection
    ? collectionVisible
      ? c!.name
      : t("collection_not_found")
    : t("my_builds");
  return (
    <div className="library-study">
      <LibraryReview collection={collection} />
      {collection && (
        <button
          className="library-back"
          onClick={() => {
            s.setTab("collections");
            onCollection();
          }}
        >
          <ArrowLeft size={16} />
          {t("my_builds_tab_collections")}
        </button>
      )}
      <header className="library-heading">
        <div>
          <p className="account-eyebrow">
            {t(collection ? "lib_v4_collection_eyebrow" : "lib_v4_eyebrow")}
          </p>
          <h1>{heading}</h1>
          <p>
            {collection
              ? collectionVisible
                ? c?.description
                : t("collection_not_found")
              : t("lib_v4_intro")}
          </p>
        </div>
        {!collection ? (
          <a className="primary product-anchor" href="/">
            <Plus size={17} />
            {t("lib_v4_workshop")}
          </a>
        ) : collectionVisible && !visitor ? (
          <div className="library-heading-actions">
            <button onClick={() => dialog("collection-edit")}>
              <Pencil size={16} />
              {t("collection_edit")}
            </button>
            <button
              onClick={() => dialog("collection-delete")}
              aria-label={t("collection_delete")}
            >
              <Trash2 size={17} />
            </button>
          </div>
        ) : null}
      </header>
      {!collection && !signedIn ? (
        <Empty
          title={t("auth_signin_title")}
          body={t("my_builds_signin_required")}
        >
          <button className="primary" onClick={onSignIn}>
            {t("auth_signin_btn")}
          </button>
        </Empty>
      ) : collection && !collectionVisible ? (
        <Empty
          title={t("collection_not_found")}
          body={t("lib_v4_collection_unavailable")}
        />
      ) : (
        <>
          {!collection ? (
            <>
              <div className="library-summary">
                <span>
                  <b>{own.length}</b>
                  {t("my_builds_total")}
                </span>
                <span>
                  <b>{own.filter((b) => b.visibility === "public").length}</b>
                  {t("my_builds_public_count")}
                </span>
                <span>
                  <b>{own.reduce((total, b) => total + b.likes, 0)}</b>
                  {t("my_builds_likes_received")}
                </span>
              </div>
              <nav
                className="account-tabs library-tabs"
                aria-label={t("my_builds")}
              >
                {(["mine", "bookmarked", "collections"] as LibraryTab[]).map(
                  (tab) => (
                    <button
                      key={tab}
                      aria-current={s.tab === tab ? "page" : undefined}
                      onClick={() => s.setTab(tab)}
                    >
                      {t("my_builds_tab_" + tab)}
                      <span>
                        {tab === "mine"
                          ? own.length
                          : tab === "bookmarked"
                            ? s.bookmarks.length
                            : s.collections.length}
                      </span>
                    </button>
                  ),
                )}
              </nav>
            </>
          ) : (
            <div className="library-collection-meta">
              <Visibility
                collection
                value={c!.is_public ? "public" : "private"}
              />
              <span>
                {t("collections_builds_count", { count: raw.length })}
              </span>
              <span>{t("collection_by", { author: "brasa" })}</span>
              {visitor && <span>{t("lib_v4_visitor_view")}</span>}
            </div>
          )}
          {collection && c!.is_public && !visitor && (
            <p className="library-privacy-note">
              <Lock size={16} />
              {t("lib_v4_collection_privacy")}
            </p>
          )}
          <div className="library-toolbar">
            <label className="library-search">
              <Search size={17} />
              <span className="sr-only">{t("lib_v4_search")}</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(
                  s.tab === "collections" && !collection
                    ? "lib_v4_search_collections"
                    : "lib_v4_search",
                )}
              />
              {query && (
                <button
                  aria-label={t("lib_v4_clear")}
                  onClick={() => setQuery("")}
                >
                  <X size={16} />
                </button>
              )}
            </label>
            {s.tab === "collections" && !collection ? (
              <button
                className="primary"
                onClick={() => dialog("collection-new")}
              >
                <Plus size={17} />
                {t("lib_v4_new_collection")}
              </button>
            ) : (
              <>
                <label className="library-filter">
                  {t("publish_visibility_label")}
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                  >
                    <option value="all">{t("lib_v4_all")}</option>
                    {(["private", "unlisted", "public"] as const).map((v) => (
                      <option key={v} value={v}>
                        {t("publish_visibility_" + v)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </label>
                <label className="library-filter">
                  {t("lib_v4_sort")}
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    {collection && (
                      <option value="saved">{t("lib_v4_saved_order")}</option>
                    )}
                    <option value="recent">{t("lib_v4_recent")}</option>
                    <option value="name">{t("lib_v4_name")}</option>
                  </select>
                  <ChevronDown size={14} />
                </label>
              </>
            )}
          </div>
          {error && <Notice error>{error}</Notice>}
          {pending || s.viewState === "loading" ? (
            <div className="library-loading" role="status">
              <span />
              {t("auth_loading")}
            </div>
          ) : s.viewState === "error" ? (
            <Empty
              title={t("lib_v4_load_error")}
              body={t("lib_v4_load_error_hint")}
            >
              <button
                onClick={() => {
                  s.review({ viewState: "ready" });
                  setRetry((v) => v + 1);
                }}
              >
                {t("account_v4_retry")}
              </button>
            </Empty>
          ) : s.tab === "collections" && !collection ? (
            collections.length ? (
              <div className="library-collections">
                {collections.map((c) => (
                  <CollectionRow
                    key={c.id}
                    c={c}
                    onOpen={() => {
                      s.selectCollection(c.id);
                      s.review({ visitor: false });
                      onCollection();
                    }}
                  />
                ))}
              </div>
            ) : (
              <Empty
                title={t(query ? "lib_v4_no_matches" : "lib_v4_no_collections")}
                body={t(query ? "lib_v4_no_matches_hint" : "collections_empty")}
              />
            )
          ) : rows.length ? (
            <>
              <div className="library-results-count">
                {t("collections_builds_count", { count: rows.length })}
                {(query || visibility !== "all") && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setVisibility("all");
                    }}
                  >
                    {t("lib_v4_reset")}
                  </button>
                )}
                <span
                  className="library-density"
                  aria-label={t("lib_v4_display")}
                >
                  <button
                    aria-label={t("lib_v4_detailed_view")}
                    aria-pressed={!compact}
                    onClick={() => setCompact(false)}
                  >
                    <LayoutGrid size={17} />
                  </button>
                  <button
                    aria-label={t("lib_v4_compact_view")}
                    aria-pressed={compact}
                    onClick={() => setCompact(true)}
                  >
                    <List size={18} />
                  </button>
                </span>
              </div>
              <div
                className={
                  "library-build-grid" + (compact ? " is-compact" : "")
                }
              >
                {rows.map((b) => (
                  <div className="library-build-wrap" key={b.id}>
                    <LibraryCard
                      b={b}
                      owner={!visitor && b.owner === "brasa"}
                      onDialog={dialog}
                      onDetail={(b) => {
                        s.selectBuild(b.id);
                        onDetail(b);
                      }}
                      bookmarkAction={!collection && s.tab === "bookmarked"}
                      privacyNote={
                        collection &&
                        !visitor &&
                        c!.is_public &&
                        (b.visibility === "private" ||
                          (b.visibility === "unlisted" && b.owner !== "brasa"))
                      }
                      onRemove={() => void remove(b)}
                      removing={s.busyIds.includes(`${c?.id}/${b.id}`)}
                    />
                    {collection && !visitor && (
                      <button
                        className="library-remove"
                        disabled={s.busyIds.includes(`${c!.id}/${b.id}`)}
                        onClick={() => void remove(b)}
                      >
                        <X size={15} />
                        {t("collection_remove_build")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty
              title={t(
                query || visibility !== "all"
                  ? "lib_v4_no_matches"
                  : collection
                    ? "collection_empty"
                    : s.tab === "bookmarked"
                      ? "my_builds_no_bookmarks"
                      : "no_saved_builds",
              )}
              body={t(
                query || visibility !== "all"
                  ? "lib_v4_no_matches_hint"
                  : collection
                    ? "lib_v4_add_hint"
                    : "lib_v4_empty_hint",
              )}
            >
              <button
                onClick={() => {
                  setQuery("");
                  setVisibility("all");
                }}
              >
                {t("lib_v4_reset")}
              </button>
            </Empty>
          )}
          {!collection && (
            <p className="library-device-note">
              <Lock size={15} />
              {t("lib_v4_device_note")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function PrivacyChoices({
  value,
  onChange,
  collection = false,
  disabled = false,
}: {
  value: BuildVisibility;
  onChange: (value: BuildVisibility) => void;
  collection?: boolean;
  disabled?: boolean;
}) {
  const { t } = useAccountLocale(),
    id = useId();
  return (
    <fieldset className="library-privacy-choices" disabled={disabled}>
      <legend>{t("publish_visibility_label")}</legend>
      {(collection
        ? (["private", "public"] as const)
        : (["private", "unlisted", "public"] as const)
      ).map((v) => {
        const Icon = visibilityIcons[v];
        return (
          <label key={v} className={value === v ? "is-selected" : ""}>
            <input
              type="radio"
              name={id}
              value={v}
              checked={value === v}
              onChange={() => onChange(v)}
            />
            <Icon size={19} />
            <span>
              <b>
                {t(
                  collection
                    ? v === "public"
                      ? "collections_public"
                      : "collections_private"
                    : "publish_visibility_" + v,
                )}
              </b>
              <small>
                {t(
                  collection
                    ? v === "public"
                      ? "lib_v4_public_collection_hint"
                      : "lib_v4_private_collection_hint"
                    : "publish_visibility_" + v + "_hint",
                )}
              </small>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
export function LibraryDialog({
  id,
  onClose,
  onNavigate,
}: {
  id: LibraryDialogId;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const { t } = useAccountLocale(),
    s = useLibraryStudy(),
    signedIn = useAccountStudy((v) => v.signedIn),
    b = s.builds.find((b) => b.id === s.selectedBuild),
    c = s.collections.find((c) => c.id === s.selectedCollection),
    collection = id.startsWith("collection-") && id !== "collection-picker",
    creating = id === "collection-new",
    deleting = id === "delete-build" || id === "collection-delete",
    picker = id === "collection-picker",
    uid = useId();
  const initialName =
      creating || picker
        ? ""
        : collection
          ? c?.name || ""
          : b?.sheet.name || "",
    initialDescription = collection && !creating ? c?.description || "" : "",
    initialVisibility: BuildVisibility =
      creating || picker
        ? "private"
        : collection
          ? c?.is_public
            ? "public"
            : "private"
          : b?.visibility || "private";
  const [name, setName] = useState(initialName),
    [description, setDescription] = useState(initialDescription),
    [visibility, setVisibility] = useState(initialVisibility),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [adding, setAdding] = useState(false),
    [query, setQuery] = useState(""),
    [closing, setClosing] = useState(false),
    [createdId, setCreatedId] = useState<string | null>(null),
    [notice, setNotice] = useState("");
  const dirty =
      name !== initialName ||
      description !== initialDescription ||
      visibility !== initialVisibility,
    title = t(
      picker
        ? "collections_save"
        : creating
          ? "lib_v4_new_collection"
          : id === "collection-edit"
            ? "lib_v4_edit_collection"
            : id === "collection-delete"
              ? "lib_v4_delete_collection"
              : id === "rename"
                ? "lib_v4_rename"
                : id === "visibility"
                  ? "lib_v4_visibility_title"
                  : "lib_v4_delete_build",
    ),
    allowed =
      signedIn && (collection ? !s.visitor : picker || b?.owner === "brasa");
  function close() {
    if (busy || s.busyIds.length) return;
    if (dirty && !deleting) {
      setClosing(true);
      return;
    }
    onClose();
  }
  function showError(e: unknown, partial = false) {
    setError(
      t(
        partial
          ? "lib_v4_create_partial"
          : e instanceof Error && e.message === "forbidden"
            ? "lib_v4_forbidden"
            : "lib_v4_action_error",
      ),
    );
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !allowed) return;
    setBusy(true);
    setError(null);
    let newId = createdId;
    try {
      if (picker) {
        if (!b) return;
        newId =
          newId ||
          (await s.saveCollection(
            null,
            name,
            description,
            visibility === "public",
          ));
        setCreatedId(newId);
        await s.membership(newId, b.id, true);
        setAdding(false);
        setCreatedId(null);
        setName("");
        setDescription("");
        setVisibility("private");
        setNotice(t("lib_v4_added"));
        return;
      }
      if (id === "delete-build" && b) await s.deleteBuild(b.id);
      else if (id === "collection-delete" && c) {
        await s.deleteCollection(c.id);
        onClose();
        onNavigate("my-builds");
        return;
      } else if (collection) {
        const key = await s.saveCollection(
          creating ? null : c?.id || null,
          name,
          description,
          visibility === "public",
        );
        if (creating) s.selectCollection(key);
      } else if (b)
        await s.patchBuild(
          b.id,
          id === "rename" ? { name: name.trim() } : { visibility },
        );
      onClose();
    } catch (e) {
      showError(e, picker && !!newId);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(c: LibraryCollection) {
    if (!b) return;
    setError(null);
    setNotice("");
    try {
      await s.membership(c.id, b.id, !c.builds.includes(b.id));
    } catch (e) {
      showError(e);
    }
  }
  const missing =
    (!collection && !creating && !b) || (collection && !creating && !c);
  return (
    <Modal
      open
      onClose={close}
      title={title}
      size="md"
      className="library-dialog"
    >
      {!allowed ? (
        <Empty
          title={t(signedIn ? "lib_v4_forbidden" : "auth_signin_title")}
          body={t("lib_v4_no_permission")}
        >
          <button onClick={onClose}>{t("modal_close")}</button>
        </Empty>
      ) : missing ? (
        <Empty title={t("lib_v4_missing")}>
          <button onClick={onClose}>{t("modal_close")}</button>
        </Empty>
      ) : closing ? (
        <div className="library-dialog-body">
          <h3>{t("account_v4_leave_title")}</h3>
          <p>{t("account_v4_leave_body")}</p>
          <div className="library-dialog-actions">
            <button onClick={onClose}>{t("account_v4_leave")}</button>
            <button className="primary" onClick={() => setClosing(false)}>
              {t("account_v4_stay")}
            </button>
          </div>
        </div>
      ) : picker && !adding ? (
        <div className="library-dialog-body">
          <div className="library-dialog-subject">
            <FolderOpen size={23} />
            <span>
              <small>{t("lib_v4_saving_build")}</small>
              <b>{b!.sheet.name}</b>
            </span>
          </div>
          <p>{t("lib_v4_picker_hint")}</p>
          <label className="library-search">
            <Search size={17} />
            <span className="sr-only">{t("lib_v4_search_collections")}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("lib_v4_search_collections")}
            />
          </label>
          {error && <Notice error>{error}</Notice>}
          {notice && <Notice>{notice}</Notice>}
          <ul className="library-picker-list">
            {s.collections
              .filter((c) =>
                normalizeSearch(c.name).includes(normalizeSearch(query)),
              )
              .map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => void toggle(c)}
                    aria-pressed={c.builds.includes(b!.id)}
                    disabled={s.busyIds.includes(`${c.id}/${b!.id}`)}
                  >
                    <span className="library-check">
                      {c.builds.includes(b!.id) && <Check size={16} />}
                    </span>
                    <span>
                      <b>{c.name}</b>
                      <small>
                        {t("collections_builds_count", {
                          count: c.builds.length,
                        })}
                      </small>
                    </span>
                    <Visibility
                      collection
                      value={c.is_public ? "public" : "private"}
                    />
                  </button>
                </li>
              ))}
          </ul>
          {!s.collections.length && <p>{t("collections_empty")}</p>}
          {query &&
            !s.collections.some((c) =>
              normalizeSearch(c.name).includes(normalizeSearch(query)),
            ) && <p>{t("lib_v4_no_matches")}</p>}
          <div className="library-dialog-actions">
            <button
              onClick={() => {
                setAdding(true);
                setError(null);
              }}
            >
              <Plus size={17} />
              {t("lib_v4_new_collection")}
            </button>
            <button
              className="primary"
              disabled={!!s.busyIds.length}
              onClick={onClose}
            >
              {t("lib_v4_done")}
            </button>
          </div>
        </div>
      ) : (
        <form
          className="library-dialog-body"
          onSubmit={submit}
          aria-busy={busy}
        >
          {picker && (
            <button
              type="button"
              className="library-back"
              disabled={busy}
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
            >
              <ArrowLeft size={16} />
              {t("lib_v4_back_collections")}
            </button>
          )}
          <div className="library-dialog-subject">
            {deleting ? (
              <Trash2 size={25} />
            ) : collection || picker ? (
              <FolderOpen size={25} />
            ) : (
              <Pencil size={25} />
            )}
            <span>
              <small>
                {t(
                  collection || picker
                    ? "lib_v4_collection_eyebrow"
                    : "lib_v4_build",
                )}
              </small>
              <b>
                {creating || picker
                  ? t("lib_v4_new_collection")
                  : collection
                    ? c?.name
                    : b?.sheet.name}
              </b>
            </span>
          </div>
          {deleting ? (
            <>
              <p>
                {t(
                  id === "collection-delete"
                    ? "collection_delete_confirm"
                    : "lib_v4_delete_build_hint",
                )}
              </p>
              {id === "delete-build" && (
                <p className="library-warning">
                  {t("lib_v4_delete_relations")}
                </p>
              )}
            </>
          ) : (
            <>
              {id !== "visibility" && (
                <div className="library-field">
                  <label htmlFor={uid + "-name"}>
                    {t(
                      collection || picker
                        ? "lib_v4_collection_name"
                        : "build_name_label",
                    )}
                  </label>
                  <input
                    id={uid + "-name"}
                    required
                    maxLength={LIBRARY_NAME_MAX}
                    value={name}
                    disabled={busy || !!createdId}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <small>
                    {name.length} / {LIBRARY_NAME_MAX}
                  </small>
                </div>
              )}
              {(collection || picker) && (
                <div className="library-field">
                  <label htmlFor={uid + "-description"}>
                    {t("collection_description_placeholder")}
                  </label>
                  <textarea
                    id={uid + "-description"}
                    rows={3}
                    maxLength={COLLECTION_DESCRIPTION_MAX}
                    value={description}
                    disabled={busy || !!createdId}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <small>
                    {description.length} / {COLLECTION_DESCRIPTION_MAX}
                  </small>
                </div>
              )}
              {id !== "rename" && (
                <PrivacyChoices
                  value={visibility}
                  onChange={setVisibility}
                  collection={collection || picker}
                  disabled={busy || !!createdId}
                />
              )}
              {collection && !creating && (
                <p className="library-warning">
                  {t("lib_v4_collection_privacy")}
                </p>
              )}
              {id === "rename" && <p>{t("lib_v4_rename_hint")}</p>}
            </>
          )}
          {error && <Notice error>{error}</Notice>}
          <div className="library-dialog-actions">
            <button type="button" disabled={busy} onClick={close}>
              {t("collection_cancel")}
            </button>
            <button
              className={deleting ? "library-danger" : "primary"}
              type="submit"
              disabled={
                busy ||
                (!deleting && !name.trim()) ||
                (id === "visibility" && visibility === initialVisibility)
              }
            >
              {t(
                busy
                  ? "account_v4_saving"
                  : deleting
                    ? "my_builds_delete"
                    : createdId
                      ? "lib_v4_retry_add"
                      : creating || picker
                        ? "collections_create"
                        : "collection_save",
              )}
              {!busy && !deleting && <Check size={16} />}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
