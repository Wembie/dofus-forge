import { useEffect, useId, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  GitFork,
  History,
  LogIn,
  Send,
} from "lucide-react";
import { CLASS_DATA } from "../../../src/features/class-picker/classData";
import { resolveClassName } from "../../../src/features/class-picker/useClassName";
import type { BuildVisibility } from "../../../src/features/builds/api";
import { useBuildStore } from "../../../src/store/buildStore";
import { useAccountLocale } from "./Account";
import { useAccountStudy } from "./account-model";
import { PrivacyChoices } from "./Library";
import { useLibraryStudy } from "./library-model";
import { exploreTags, useExploreStudy } from "./explore-model";
import { Modal } from "./SurfaceModal";
import { equipment } from "./model";
import {
  PUBLISH_MAX_TAGS,
  PUBLISH_NAME_MAX,
  publishLinks,
  publishResponses,
  usePublishStudy,
  type PublishLink,
  type PublishResponse,
} from "./publish-model";
import "./publish.css";

const LINKS: Record<PublishLink, [string | null, string | null]> = {
  new: [null, null],
  update: ["library-0", null],
  remix: [null, "explore-01"],
  "foreign-edit": ["explore-02", null],
};
const CATEGORIES = ["playstyle", "element", "general"] as const;

function PublishReview({ onLink }: { onLink: (l: PublishLink) => void }) {
  const { t } = useAccountLocale(),
    p = usePublishStudy(),
    b = useBuildStore(),
    current: PublishLink = b.linkedBuildId
      ? b.linkedBuildId.startsWith("library-") || b.linkedBuildId.startsWith("published-")
        ? "update"
        : "foreign-edit"
      : b.forkOf
        ? "remix"
        : "new";
  return (
    <details className="account-review publish-review">
      <summary>
        {t("publish_v4_review")}
        <span>{t("account_v4_local_only")}</span>
      </summary>
      <div>
        <label>
          {t("publish_v4_review_link")}
          <select value={current} onChange={(e) => onLink(e.target.value as PublishLink)}>
            {publishLinks.map((l) => (
              <option key={l} value={l}>
                {t("publish_v4_link_" + l)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("publish_v4_review_response")}
          <select
            value={p.response}
            onChange={(e) => p.setResponse(e.target.value as PublishResponse)}
          >
            {publishResponses.map((r) => (
              <option key={r} value={r}>
                {t("publish_v4_response_" + r)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </details>
  );
}

/** What is about to go public: the workshop's build as it is now. */
function Subject({ name }: { name: string }) {
  const { t, i18n } = useAccountLocale(),
    b = useBuildStore(),
    info = CLASS_DATA.find((c) => c.id === b.selectedClass),
    worn = Object.values(b.equipped).filter((id) => equipment.has(id || 0)).length;
  if (!info) return null;
  return (
    <div className="publish-subject">
      <img src={b.gender === "female" ? info.imageFUrl : info.imageUrl} alt="" />
      <span>
        <b>{name.trim() || t("untitled_build")}</b>
        <small>
          {resolveClassName(info.id, i18n.language, null)} ·{" "}
          {t("level_short", { level: b.level })} ·{" "}
          {t("build_v4_worn", { count: worn, total: 16 })}
        </small>
      </span>
      {b.stats && (
        <ul aria-label={t("lib_v4_vitals")}>
          {(
            [
              ["ap", "ap.webp", "lib_v4_ap"],
              ["mp", "mp.webp", "lib_v4_mp"],
              ["range", "range.webp", "lib_v4_range"],
            ] as const
          ).map(([key, icon, label]) => (
            <li key={key}>
              <img src={"/data/stats/" + icon} alt="" />
              <strong>{b.stats![key]}</strong>
              {t(label)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PublishDialog({
  update = false,
  onClose,
  onSignIn,
  onNavigate,
  onPublished,
}: {
  /** Opened as "update" from the dialog directory: link the workshop to one of your builds. */
  update?: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onNavigate: (view: string) => void;
  onPublished: (id: string) => void;
}) {
  const { t } = useAccountLocale(),
    p = usePublishStudy(),
    signedIn = useAccountStudy((s) => s.signedIn),
    linkedBuildId = useBuildStore((s) => s.linkedBuildId),
    forkOf = useBuildStore((s) => s.forkOf),
    id = useId(),
    [name, setName] = useState(() => useBuildStore.getState().buildName || ""),
    [visibility, setVisibility] = useState<BuildVisibility>("public"),
    [tagIds, setTagIds] = useState<number[]>([]),
    // Null until the published build's tags arrive, so an early Update never wipes them.
    [saved, setSaved] = useState<number[] | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<"error" | "limit" | null>(null);

  function link(l: PublishLink) {
    const store = useBuildStore.getState();
    store.setLinkedBuildId(LINKS[l][0]);
    store.setForkOf(LINKS[l][1]);
    // Each review case starts from a fresh dialog, as opening it again would.
    setName(store.buildName || "");
    setVisibility("public");
    setTagIds([]);
    setError(null);
  }
  useEffect(() => {
    if (update && !useBuildStore.getState().linkedBuildId) link("update");
    void p.loadTags();
    // The native dialog focuses its first control when it opens; the name is where you start.
    const frame = requestAnimationFrame(() =>
      document.getElementById(id + "-name")?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    setSaved(null);
    if (!linkedBuildId) return;
    let live = true;
    void p.prefill(linkedBuildId).then((data) => {
      if (!live || !data) return;
      // Someone else's edit link can't update their build: it becomes a remix of it.
      if ("foreign" in data) {
        const store = useBuildStore.getState();
        store.setLinkedBuildId(null);
        store.setForkOf(data.foreign === "public" ? linkedBuildId : null);
        return;
      }
      setName(data.name);
      setVisibility(data.visibility);
      setTagIds(data.tagIds);
      setSaved(data.tagIds);
      requestAnimationFrame(() =>
        document.getElementById(id + "-name")?.focus(),
      );
    });
    return () => {
      live = false;
    };
  }, [linkedBuildId]);

  const parent = forkOf
      ? (() => {
          const r = useExploreStudy.getState().records.find((r) => r.id === forkOf);
          if (r) return { name: r.sheet.name, author: r.owner };
          const l = useLibraryStudy.getState().builds.find((b) => b.id === forkOf);
          return l ? { name: l.sheet.name, author: l.owner } : null;
        })()
      : null,
    isUpdate = linkedBuildId != null,
    full = tagIds.length >= PUBLISH_MAX_TAGS,
    waiting = isUpdate && saved == null;

  if (!signedIn)
    return (
      <Modal open onClose={onClose} title={t("publish_title")} size="sm" className="publish-dialog">
        <div className="publish-signin">
          <LogIn size={26} />
          <p>{t("publish_signin_required")}</p>
          <p className="publish-muted">{t("publish_v4_signin_hint")}</p>
          <footer className="publish-actions">
            <button type="button" onClick={onClose}>
              {t("modal_close")}
            </button>
            <button className="primary" type="button" onClick={onSignIn}>
              {t("auth_signin_btn")}
            </button>
          </footer>
        </div>
      </Modal>
    );

  return (
    <Modal
      open
      onClose={onClose}
      title={t(isUpdate ? "publish_title_update" : "publish_title")}
      className="publish-dialog"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || waiting) return;
          setBusy(true);
          setError(null);
          const result = await p.submit({
            name: name.trim() || t("untitled_build"),
            visibility,
            tagIds,
            linkedBuildId,
            forkOf,
          });
          setBusy(false);
          if ("error" in result) setError(result.error);
          else onPublished(result.id);
        }}
      >
        <PublishReview onLink={link} />
        <Subject name={name} />
        {isUpdate ? (
          <p className="publish-note">
            <History size={16} aria-hidden="true" />
            <span>
              {t("publish_already_published_hint")} {t("publish_v4_history_hint")}
            </span>
          </p>
        ) : (
          parent && (
            <p className="publish-note">
              <GitFork size={16} aria-hidden="true" />
              <span>{t("publish_remix_hint", parent)}</span>
            </p>
          )
        )}
        {waiting && (
          <p className="publish-muted" role="status">
            {t("publish_v4_prefill")}
          </p>
        )}
        <div className="publish-field">
          <div>
            <label htmlFor={id + "-name"}>{t("build_name_label")}</label>
            <small id={id + "-count"}>
              {name.length} / {PUBLISH_NAME_MAX}
            </small>
          </div>
          <input
            id={id + "-name"}
            type="text"
            maxLength={PUBLISH_NAME_MAX}
            value={name}
            disabled={waiting}
            placeholder={t("untitled_build")}
            aria-describedby={id + "-count"}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <PrivacyChoices value={visibility} onChange={setVisibility} disabled={waiting} />
        <fieldset className="publish-tags" disabled={waiting}>
          <legend>
            {t("publish_tags_label")}
            <small aria-live="polite">
              {tagIds.length} / {PUBLISH_MAX_TAGS}
            </small>
          </legend>
          {p.tagsState === "loading" ? (
            <p className="publish-muted" role="status">
              {t("explore_v4_tags_loading")}
            </p>
          ) : p.tagsState === "error" ? (
            <div className="publish-inline-error">
              <p>{t("publish_v4_tags_error")}</p>
              <button type="button" onClick={() => p.setResponse("normal")}>
                {t("account_v4_retry")}
              </button>
            </div>
          ) : (
            <>
              <p className="publish-muted">
                {t(full ? "publish_v4_tags_full" : "publish_v4_tags_hint", {
                  max: PUBLISH_MAX_TAGS,
                })}
              </p>
              {CATEGORIES.map((cat) => (
                <div key={cat} className="publish-tag-group">
                  <h3>{t("tag_category_" + cat)}</h3>
                  <div>
                    {exploreTags
                      .filter((tag) => tag.category === cat)
                      .map((tag) => {
                        const on = tagIds.includes(tag.id);
                        return (
                          <button
                            type="button"
                            key={tag.id}
                            aria-pressed={on}
                            disabled={!on && full}
                            onClick={() =>
                              setTagIds(on ? tagIds.filter((x) => x !== tag.id) : [...tagIds, tag.id])
                            }
                          >
                            {t("tag_" + tag.name)}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </>
          )}
        </fieldset>
        {/* In the sticky footer, so the reason a submit failed shows where you pressed it. */}
        <footer className="publish-actions has-status">
          {error && (
            <div className="publish-error" role="alert">
              <AlertCircle size={17} aria-hidden="true" />
              <p>{t(error === "limit" ? "publish_v4_limit" : "publish_error")}</p>
              {error === "limit" && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate("my-builds");
                  }}
                >
                  {t("publish_v4_go_library")}
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          )}
          <div>
          <button type="button" onClick={onClose}>
            {t("build_v4_cancel")}
          </button>
          <button className="primary" type="submit" disabled={busy || waiting}>
            <Send size={16} />
            {busy
              ? t(isUpdate ? "publish_v4_updating" : "publish_v4_publishing")
              : t(isUpdate ? "publish_submit_update" : "publish_submit")}
          </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
