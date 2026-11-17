import { RANK_ICONS } from "../../../src/features/ranks/catalog";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Search,
  User,
  UserPlus,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_PATTERN,
  USERNAME_RE,
} from "../../../src/features/auth/authRules";
import { isSafeImageUrl } from "../../../src/store/authStore";
import type { FollowProfile } from "../../../src/features/builds/api";
import { normalizeSearch } from "../../../src/ui/normalize";
import {
  useAccountStudy,
  publicPerson,
  people,
  accountEmail,
  accountJoined,
  type AccountScenario,
} from "./account-model";
import { Modal } from "./SurfaceModal";
import es from "../../../public/locales/es/translation.json";
import en from "../../../public/locales/en/translation.json";
import fr from "../../../public/locales/fr/translation.json";
import pt from "../../../public/locales/pt/translation.json";
import "./account.css";

function useAccountLocale() {
  const result = useTranslation();
  useEffect(() => {
    for (const [lang, copy] of Object.entries({ es, en, fr, pt }))
      i18n.addResourceBundle(lang, "translation", copy, true, false);
  }, []);
  return result;
}
function Avatar({ username, url }: { username: string; url?: string | null }) {
  return (
    <span className="account-avatar" aria-hidden="true">
      {isSafeImageUrl(url) ? (
        <img src={url} alt="" />
      ) : (
        username.slice(0, 1).toUpperCase() || <User size={26} />
      )}
    </span>
  );
}
export function AccountReview() {
  const { t } = useAccountLocale(),
    s = useAccountStudy();
  return (
    <details className="account-review">
      <summary>
        {t("account_v4_review")}
        <span>{t("account_v4_local_only")}</span>
      </summary>
      <div>
        <label>
          {t("account_v4_scenario")}
          <select
            aria-label={t("account_v4_scenario")}
            value={s.scenario}
            onChange={(e) => s.setScenario(e.target.value as AccountScenario)}
          >
            {(
              [
                "success",
                "taken",
                "offline",
                "partial",
                "password-error",
                "follow-error",
                "signout-error",
              ] as const
            ).map((v) => (
              <option value={v} key={v}>
                {t(
                  "account_v4_" +
                    {
                      success: "success",
                      taken: "taken",
                      offline: "offline",
                      partial: "partial_option",
                      "password-error": "password_error",
                      "follow-error": "follow_error_option",
                      "signout-error": "signout_error_option",
                    }[v],
                )}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("account_v4_session")}
          <select
            aria-label={t("account_v4_session")}
            value={s.signedIn ? "in" : "out"}
            onChange={(e) => s.setSignedIn(e.target.value === "in")}
          >
            <option value="in">{t("account_v4_signed_in")}</option>
            <option value="out">{t("account_v4_signed_out")}</option>
          </select>
        </label>
        <label>
          {t("account_v4_language")}
          <select
            aria-label={t("account_v4_language")}
            value={i18n.language}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
          >
            {["es", "en", "fr", "pt"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="account-review-check">
          <input
            type="checkbox"
            checked={s.emptyPeople}
            onChange={(e) => s.setEmptyPeople(e.target.checked)}
          />
          {t("account_v4_people_empty")}
        </label>
      </div>
    </details>
  );
}
function PasswordField({
  label,
  value,
  onChange,
  id,
  autoComplete = "new-password",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation(),
    [visible, setVisible] = useState(false);
  return (
    <label className="account-field" htmlFor={id}>
      {label}
      <span className="account-password">
        <input
          id={id}
          type={visible ? "text" : "password"}
          minLength={PASSWORD_MIN_LENGTH}
          required
          disabled={disabled}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          aria-label={
            t(visible ? "auth_password_hide" : "auth_password_show") +
            ": " +
            label
          }
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}
function Message({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={"account-message " + (error ? "is-error" : "")}
      role={error ? "alert" : "status"}
    >
      {error ? <AlertCircle size={18} /> : <Check size={18} />}
      <span>{children}</span>
    </div>
  );
}
export function Account({
  onProfile,
  onPeople,
  onSignIn,
  onBuilds,
}: {
  onProfile: (username: string) => void;
  onPeople: (kind: "followers" | "following") => void;
  onSignIn: () => void;
  onBuilds: () => void;
}) {
  const { t } = useAccountLocale(),
    s = useAccountStudy(),
    p = s.profile,
    id = useId();
  const [tab, setTab] = useState("profile"),
    [username, setUsername] = useState(p.username),
    [displayName, setDisplayName] = useState(p.display_name || ""),
    [bio, setBio] = useState(p.bio || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [saved, setSaved] = useState(false),
    [partial, setPartial] = useState(false),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [passwordBusy, setPasswordBusy] = useState(false),
    [passwordError, setPasswordError] = useState<string | null>(null),
    [passwordDone, setPasswordDone] = useState(false),
    [signout, setSignout] = useState(false);
  const profileDirty =
    username.trim().toLowerCase() !== p.username ||
    (displayName.trim() || null) !== p.display_name ||
    (bio.trim() || null) !== p.bio;
  const dirty = profileDirty || !!password || !!confirm;
  useEffect(() => {
    s.setDirty(dirty);
    return () => useAccountStudy.getState().setDirty(false);
  }, [dirty]);
  useEffect(() => {
    if (!s.signedIn) {
      const p = useAccountStudy.getState().profile;
      setUsername(p.username);
      setDisplayName(p.display_name || "");
      setBio(p.bio || "");
      setPassword("");
      setConfirm("");
      setError(null);
      setPasswordError(null);
      setSaved(false);
      setPasswordDone(false);
    }
  }, [s.signedIn]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    addEventListener("beforeunload", guard);
    return () => removeEventListener("beforeunload", guard);
  }, [dirty]);
  function restore() {
    setUsername(p.username);
    setDisplayName(p.display_name || "");
    setBio(p.bio || "");
    setError(null);
    setPartial(false);
    setSaved(false);
  }
  function edit(fn: () => void) {
    fn();
    setSaved(false);
    setError(null);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !profileDirty) return;
    const name = username.trim().toLowerCase();
    if (!USERNAME_RE.test(name)) {
      setError(t("auth_username_invalid"));
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    setPartial(false);
    let renamed = false;
    try {
      if (name !== s.profile.username) {
        const r = await s.updateUsername(name);
        if (r.error) {
          setError(
            t(
              r.error === "username_taken"
                ? "auth_username_taken"
                : r.error === "invalid_username"
                  ? "auth_username_invalid"
                  : "account_v4_error",
            ),
          );
          return;
        }
        renamed = true;
        setUsername(name);
      }
      const r = await s.updateProfile({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      });
      if (r.error) {
        setPartial(renamed);
        setError(t(renamed ? "account_v4_partial" : "account_v4_error"));
        return;
      }
      setDisplayName(displayName.trim());
      setBio(bio.trim());
      setSaved(true);
    } catch {
      setPartial(renamed);
      setError(t(renamed ? "account_v4_partial" : "account_v4_error"));
    } finally {
      setBusy(false);
    }
  }
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordBusy) return;
    setPasswordDone(false);
    if (password !== confirm) {
      setPasswordError(t("auth_password_mismatch"));
      return;
    }
    setPasswordBusy(true);
    setPasswordError(null);
    try {
      const r = await s.updatePassword(password);
      if (r.error) {
        setPasswordError(t("account_v4_error"));
        return;
      }
      setPassword("");
      setConfirm("");
      setPasswordDone(true);
    } catch {
      setPasswordError(t("account_v4_error"));
    } finally {
      setPasswordBusy(false);
    }
  }
  const joined = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
  }).format(new Date(accountJoined));
  return (
    <div className="account-study">
      <AccountReview />
      <header className="account-heading">
        <div>
          <p className="account-eyebrow">
            DOFUS FORGE / {t("account_v4_private")}
          </p>
          <h1>{t("auth_profile_title")}</h1>
          <p>{t("account_v4_intro")}</p>
        </div>
        {s.signedIn && (
          <button onClick={() => onProfile(p.username)}>
            {t("account_v4_public_preview")}
            <ArrowUpRight size={17} />
          </button>
        )}
      </header>
      {!s.signedIn ? (
        <section className="account-empty">
          <Lock size={30} />
          <h2>{t("auth_signin_title")}</h2>
          <p>{t("account_v4_sign_in")}</p>
          <button className="primary" onClick={onSignIn}>
            {t("auth_signin_btn")}
            <ArrowRight size={17} />
          </button>
          <a href="/">{t("app_title")}</a>
        </section>
      ) : (
        <>
          <div className="account-identity">
            <Avatar username={p.username} url={p.avatar_url} />
            <div>
              <h2>{p.username}</h2>
              {p.display_name && <p>{p.display_name}</p>}
              <small>{t("profile_joined", { date: joined })}</small>
            </div>
            <nav aria-label={t("account_v4_counts")}>
              <button onClick={onBuilds}>
                <b>{p.builds_count}</b>
                {t("auth_stat_builds")}
              </button>
              <button onClick={() => onPeople("followers")}>
                <b>{p.followers_count}</b>
                {t("auth_stat_followers")}
              </button>
              <button onClick={() => onPeople("following")}>
                <b>{p.following_count}</b>
                {t("auth_stat_following")}
              </button>
            </nav>
          </div>
          <nav className="account-tabs" aria-label={t("auth_profile_title")}>
            {["profile", "security", "session"].map((v) => (
              <button
                key={v}
                aria-current={tab === v ? "page" : undefined}
                onClick={() => setTab(v)}
              >
                {t("account_v4_" + v)}
                {v === "profile" && profileDirty && (
                  <span
                    className="account-dirty-dot"
                    role="img"
                    aria-label={t("account_v4_unsaved")}
                  />
                )}
              </button>
            ))}
          </nav>
          <div className="account-editor-layout">
            <div className="account-editor">
              <section
                className="account-section"
                hidden={tab !== "profile"}
                aria-label={t("account_v4_profile")}
              >
                <h2>{t("account_v4_public_identity")}</h2>
                <p>{t("account_v4_profile_hint")}</p>
                <form onSubmit={save} aria-busy={busy} className="account-form">
                  <div className="account-field">
                    <label htmlFor={id + "-username"}>
                      {t("auth_username")}
                    </label>
                    <input
                      id={id + "-username"}
                      value={username}
                      disabled={busy}
                      onChange={(e) => edit(() => setUsername(e.target.value))}
                      required
                      minLength={3}
                      maxLength={30}
                      pattern={USERNAME_PATTERN}
                      autoComplete="username"
                      spellCheck={false}
                      autoCapitalize="none"
                      aria-describedby={id + "-username-hint"}
                    />
                    <small id={id + "-username-hint"}>
                      {t("auth_username_hint")}
                    </small>
                  </div>
                  <div className="account-field">
                    <label htmlFor={id + "-display"}>
                      {t("auth_display_name")}
                    </label>
                    <input
                      id={id + "-display"}
                      value={displayName}
                      disabled={busy}
                      onChange={(e) =>
                        edit(() => setDisplayName(e.target.value))
                      }
                      maxLength={50}
                      autoComplete="nickname"
                      aria-describedby={id + "-display-hint"}
                    />
                    <small id={id + "-display-hint"}>
                      {t("auth_display_name_hint")}
                    </small>
                  </div>
                  <div className="account-field">
                    <label htmlFor={id + "-bio"}>{t("auth_bio")}</label>
                    <textarea
                      id={id + "-bio"}
                      rows={4}
                      maxLength={300}
                      value={bio}
                      disabled={busy}
                      onChange={(e) => edit(() => setBio(e.target.value))}
                    />
                    <small className="account-counter">
                      {bio.length} / 300
                    </small>
                  </div>
                  <p className="account-avatar-note">
                    <User size={16} />
                    {t("account_v4_avatar_unavailable")}
                  </p>
                  {error && <Message error>{error}</Message>}
                  {saved && <Message>{t("account_v4_saved")}</Message>}
                  <footer
                    className={
                      "account-savebar " + (profileDirty ? "is-dirty" : "")
                    }
                  >
                    <span>
                      {partial
                        ? t("account_v4_username_partial")
                        : profileDirty
                          ? t("account_v4_unsaved")
                          : t("account_v4_profile_hint")}
                    </span>
                    <div>
                      <button
                        type="button"
                        disabled={busy || !profileDirty}
                        onClick={restore}
                      >
                        {t("account_v4_discard")}
                      </button>
                      <button
                        className="primary"
                        disabled={busy || !profileDirty}
                        type="submit"
                      >
                        {t(busy ? "account_v4_saving" : "account_v4_save")}
                        {!busy && <Check size={16} />}
                      </button>
                    </div>
                  </footer>
                </form>
              </section>
              <section
                className="account-section"
                hidden={tab !== "security"}
                aria-label={t("account_v4_security")}
              >
                <h2>{t("auth_change_password")}</h2>
                <p>{t("account_v4_password_intro")}</p>
                <div className="account-private-email">
                  <Lock size={16} />
                  <span>
                    {t("account_v4_private_email")}
                    <b>{accountEmail}</b>
                  </span>
                </div>
                <form
                  className="account-form"
                  onSubmit={changePassword}
                  aria-busy={passwordBusy}
                >
                  <PasswordField
                    label={t("auth_new_password")}
                    id={id + "-password"}
                    value={password}
                    disabled={passwordBusy}
                    onChange={(v) => {
                      setPassword(v);
                      setPasswordError(null);
                      setPasswordDone(false);
                    }}
                  />
                  <small>
                    {t("auth_v4_password_hint", { count: PASSWORD_MIN_LENGTH })}
                  </small>
                  <PasswordField
                    label={t("auth_confirm_password")}
                    id={id + "-confirm"}
                    value={confirm}
                    disabled={passwordBusy}
                    onChange={(v) => {
                      setConfirm(v);
                      setPasswordError(null);
                      setPasswordDone(false);
                    }}
                  />
                  {passwordError && <Message error>{passwordError}</Message>}
                  {passwordDone && (
                    <Message>{t("account_v4_password_saved")}</Message>
                  )}
                  <button
                    className="primary account-password-submit"
                    disabled={passwordBusy}
                    type="submit"
                  >
                    {t(
                      passwordBusy
                        ? "account_v4_saving"
                        : "auth_change_password",
                    )}
                    <Lock size={16} />
                  </button>
                </form>
              </section>
              <section
                className="account-section"
                hidden={tab !== "session"}
                aria-label={t("account_v4_session")}
              >
                <h2>{t("account_v4_session")}</h2>
                <p>{t("account_v4_session_intro")}</p>
                <div className="account-session-row">
                  <span>
                    <b>{p.username}</b>
                    <small>{accountEmail}</small>
                  </span>
                  <button onClick={() => setSignout(true)}>
                    {t("auth_signout")}
                    <LogOut size={16} />
                  </button>
                </div>
                {dirty && (
                  <p className="account-pending-note">
                    {t("account_v4_unsaved")}
                  </p>
                )}
              </section>
            </div>
            <aside className="account-side-note">
              <span className="account-eyebrow">
                {t("account_v4_public_identity")}
              </span>
              <Avatar username={p.username} url={p.avatar_url} />
              <h3>{p.username}</h3>
              {p.display_name && <p>{p.display_name}</p>}
              <p>{p.bio || t("account_v4_no_bio")}</p>
              <button onClick={() => onProfile(p.username)}>
                {t("account_v4_public_preview")}
                <ArrowRight size={16} />
              </button>
            </aside>
          </div>
        </>
      )}
      {signout && <SignOut onClose={() => setSignout(false)} />}
    </div>
  );
}
export function SignOut({ onClose }: { onClose: () => void }) {
  const { t } = useAccountLocale(),
    s = useAccountStudy(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await s.signOut();
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={t("account_v4_signout_title")}
      size="md"
    >
      <div className="account-dialog-body">
        <LogOut size={28} />
        <p>{t("account_v4_session_intro")}</p>
        {s.dirty && <p>{t("account_v4_leave_body")}</p>}
        {error && <Message error>{t("account_v4_signout_error")}</Message>}
        <div className="account-dialog-actions">
          <button onClick={onClose} disabled={busy}>
            {t("account_v4_cancel")}
          </button>
          <button className="primary" onClick={confirm} disabled={busy}>
            {t(busy ? "account_v4_signing_out" : "auth_signout")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
export function LeaveAccount({
  onStay,
  onLeave,
}: {
  onStay: () => void;
  onLeave: () => void;
}) {
  const { t } = useAccountLocale();
  return (
    <Modal open onClose={onStay} title={t("account_v4_leave_title")}>
      <div className="account-dialog-body">
        <p>{t("account_v4_leave_body")}</p>
        <div className="account-dialog-actions">
          <button onClick={onLeave}>{t("account_v4_leave")}</button>
          <button className="primary" onClick={onStay}>
            {t("account_v4_stay")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function PeopleDialog({
  kind,
  onClose,
  onProfile,
  userId = "study-player",
}: {
  kind: "followers" | "following";
  onClose: () => void;
  onProfile: (username: string) => void;
  userId?: string;
}) {
  const { t } = useAccountLocale(),
    s = useAccountStudy(),
    [rows, setRows] = useState<FollowProfile[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [query, setQuery] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    s.listPeople(kind, userId)
      .then((rows) => {
        if (live) setRows(rows);
      })
      .catch(() => {
        if (live) setError(true);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [kind, userId, retry, s.emptyPeople]);
  const matches = rows.filter((p) =>
    normalizeSearch(p.username + " " + (p.display_name || "")).includes(
      normalizeSearch(query),
    ),
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={t(
        kind === "followers" ? "auth_stat_followers" : "auth_stat_following",
      )}
      size="md"
    >
      <div className="people-dialog">
        <label className="people-search">
          <Search size={17} />
          <span className="sr-only">{t("account_v4_search_people")}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("account_v4_search_people")}
          />
        </label>
        {loading ? (
          <p role="status" className="account-list-state">
            {t("auth_loading")}
          </p>
        ) : error ? (
          <div className="account-list-state">
            <Message error>{t("account_v4_load_error")}</Message>
            <button onClick={() => setRetry((v) => v + 1)}>
              {t("account_v4_retry")}
            </button>
          </div>
        ) : !matches.length ? (
          <p className="account-list-state">
            {t(
              query
                ? "account_v4_no_matches"
                : kind === "followers"
                  ? "account_no_followers"
                  : "account_no_following",
            )}
          </p>
        ) : (
          <ul>
            {matches.map((person) => (
              <li key={person.id}>
                <button
                  className="people-open"
                  onClick={() => {
                    onClose();
                    onProfile(person.username);
                  }}
                >
                  <Avatar username={person.username} url={person.avatar_url} />
                  <span>
                    <b>{person.username}</b>
                    {person.display_name && (
                      <small>{person.display_name}</small>
                    )}
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

export function PublicProfile({
  onAccount,
  onSignIn,
  onPeople,
  onBuild,
  onCollection,
  renderBuilds,
}: {
  onAccount: () => void;
  onSignIn: () => void;
  onPeople: (kind: "followers" | "following") => void;
  onBuild: () => void;
  onCollection: () => void;
  renderBuilds: (limit: number) => ReactNode;
}) {
  const { t } = useAccountLocale(),
    s = useAccountStudy(),
    p = publicPerson(s.publicUsername),
    [tab, setTab] = useState("builds"),
    [error, setError] = useState(false),
    [copied, setCopied] = useState("");
  const own = p?.id === s.profile.id,
    following = p && s.following.includes(p.id),
    busy = p && s.followBusy.includes(p.id);
  const [shown, setShown] = useState(2);
  useEffect(() => {
    setTab("builds");
    setCopied("");
    setError(false);
    setShown(2);
  }, [s.publicUsername]);
  async function follow() {
    if (!p) return;
    setError(false);
    const r = await s.toggleFollow(p.id);
    if (r.error) setError(true);
  }
  async function copy() {
    if (!p) return;
    try {
      await navigator.clipboard.writeText(
        "https://dofusforge.com/" +
          i18n.language +
          "/u/" +
          encodeURIComponent(p.username),
      );
      setCopied(t("account_v4_copied"));
    } catch {
      setCopied(t("account_v4_copy_error"));
    }
  }
  if (!p)
    return (
      <div className="account-study">
        <AccountReview />
        <div className="account-empty">
          <User size={30} />
          <h1>{t("account_v4_unknown")}</h1>
          <p>{t("account_v4_missing")}</p>
          <button onClick={onAccount}>{t("auth_profile_title")}</button>
        </div>
      </div>
    );
  return (
    <div className="account-study">
      <AccountReview />
      <div className="profile-review">
        <label>
          {t("account_v4_profile")}
          <select
            aria-label={t("account_v4_profile")}
            value={s.publicUsername}
            onChange={(e) => s.showProfile(e.target.value)}
          >
            <option value={s.profile.username}>{t("account_v4_own")}</option>
            {people.map((p) => (
              <option key={p.id} value={p.username}>
                {p.username}
              </option>
            ))}
            <option value="missing">{t("account_v4_unknown")}</option>
          </select>
        </label>
      </div>
      <header className="public-profile-heading">
        <Avatar username={p.username} url={p.avatar_url} />
        <div>
          <p className="account-eyebrow">{t("account_v4_public_identity")}</p>
          <h1>{p.username}</h1>
          {(p.tier !== "free" || p.rank) && (
            <div className="public-ranks">
              {p.tier !== "free" && (
                <span>{t("membership_tier_" + p.tier)}</span>
              )}
              {p.rank && (
                <span title={p.rank.description}>
                  {(() => {
                    const Icon = RANK_ICONS[p.rank.icon];
                    return <Icon size={14} aria-hidden="true" />;
                  })()}
                  {p.rank.name}
                </span>
              )}
            </div>
          )}
          {p.display_name && (
            <p className="public-display-name">{p.display_name}</p>
          )}
          <p className="public-biography">{p.bio || t("account_v4_no_bio")}</p>
          <small>
            {t("profile_joined", {
              date: new Intl.DateTimeFormat(i18n.language, {
                dateStyle: "medium",
              }).format(new Date(p.created_at)),
            })}
          </small>
        </div>
        <div className="public-profile-actions">
          {own && s.signedIn ? (
            <button onClick={onAccount}>
              {t("account_v4_edit")}
              <ArrowRight size={16} />
            </button>
          ) : !own && s.signedIn ? (
            <button
              className={following ? "" : "primary"}
              onClick={follow}
              disabled={!!busy}
            >
              {following ? <UserCheck size={17} /> : <UserPlus size={17} />}{" "}
              {t(following ? "profile_unfollow" : "profile_follow")}
            </button>
          ) : !own ? (
            <button onClick={onSignIn}>
              {t("auth_signin_btn")}
              <UserPlus size={17} />
            </button>
          ) : null}
          <button onClick={copy}>{t("account_v4_copy_link")}</button>
        </div>
      </header>
      {error && <Message error>{t("account_v4_follow_error")}</Message>}
      {copied && (
        <p role="status" className="account-copy-status">
          {copied}
        </p>
      )}
      <nav className="public-social-counts" aria-label={t("account_v4_counts")}>
        <button onClick={() => onPeople("followers")}>
          <b>{p.followers_count}</b>
          {t("auth_stat_followers")}
        </button>
        <button onClick={() => onPeople("following")}>
          <b>{p.following_count}</b>
          {t("auth_stat_following")}
        </button>
      </nav>
      <section
        className="public-profile-metrics"
        aria-label={t("account_v4_counts")}
      >
        {[
          [p.builds, "profile_public_builds"],
          [p.likes, "profile_likes_received"],
          [p.comments, "profile_comments_posted"],
        ].map(([value, key]) => (
          <div key={key}>
            <strong>{value}</strong>
            <span>{t(String(key))}</span>
          </div>
        ))}
      </section>
      <nav
        className="account-tabs"
        aria-label={t("account_v4_public_identity")}
      >
        <button
          aria-current={tab === "builds" ? "page" : undefined}
          onClick={() => setTab("builds")}
        >
          {t("auth_stat_builds")}
        </button>
        <button
          aria-current={tab === "collections" ? "page" : undefined}
          onClick={() => setTab("collections")}
        >
          {t("account_v4_all_collections")}
        </button>
      </nav>
      <p className="public-only-note">{t("account_v4_public_note")}</p>
      {tab === "builds" ? (
        p.builds === 0 ? (
          <div className="account-empty">
            <p>{t("profile_no_builds")}</p>
          </div>
        ) : (
          <>
            {renderBuilds(Math.min(shown, p.builds))}
            <button
              className="profile-more"
              disabled={shown >= p.builds}
              onClick={() => setShown(p.builds)}
            >
              {t("explore_load_more")}
              <ArrowRight size={16} />
            </button>
            {shown >= p.builds && (
              <button className="account-profile-build-link" onClick={onBuild}>
                {t("profile_builds_title", { username: p.username })}
                <ArrowRight size={16} />
              </button>
            )}
          </>
        )
      ) : p.builds === 0 ? (
        <p className="account-list-state">
          {t("account_v4_empty_collections")}
        </p>
      ) : (
        <div className="profile-collections">
          {["PvM", "PvP"].map((name, i) => (
            <button key={name} onClick={onCollection}>
              <span className="account-eyebrow">0{i + 1}</span>
              <h2>{name}</h2>
              <span>
                {i + 1} {t("auth_stat_builds")}
                <ArrowRight size={17} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
