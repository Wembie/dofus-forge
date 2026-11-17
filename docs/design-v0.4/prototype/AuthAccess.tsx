import { useEffect, useId, useState, type ReactNode } from "react";
import { useTranslation, Trans } from "react-i18next";
import i18n from "i18next";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  MailCheck,
  ShieldCheck,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import {
  useAuthFlow,
  type AuthMode,
  type AuthServices,
} from "../../../src/features/auth/useAuthFlow";
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_PATTERN,
} from "../../../src/features/auth/authRules";
import { LEGAL_DOCS, type LegalDoc } from "../../../src/features/auth/legal";
import { useBuildStore } from "../../../src/store/buildStore";
import { useClassName } from "../../../src/features/class-picker/useClassName";
import { Modal } from "./SurfaceModal";
import es from "../../../public/locales/es/translation.json";
import en from "../../../public/locales/en/translation.json";
import fr from "../../../public/locales/fr/translation.json";
import pt from "../../../public/locales/pt/translation.json";
import "./auth.css";

export type AccessMode = AuthMode | "reset-password" | "consent";
type ResponseMode = "success" | "credentials" | "taken" | "rate" | "network";
type Verification = "verified" | "pending" | "expired" | "error";
const languages = { es, en, fr, pt };
const wait = () => new Promise((resolve) => setTimeout(resolve, 650));

function Password({
  label,
  value,
  onChange,
  id,
  hint,
  autoComplete = "new-password",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
  hint?: string;
  autoComplete?: string;
}) {
  const { t } = useTranslation(),
    [visible, setVisible] = useState(false);
  return (
    <div className="access-field">
      <label htmlFor={id}>{label}</label>
      <div className="access-password">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          minLength={PASSWORD_MIN_LENGTH}
          aria-describedby={hint ? id + "-hint" : undefined}
        />
        <button
          type="button"
          aria-label={t(visible ? "auth_password_hide" : "auth_password_show")}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && <small id={id + "-hint"}>{hint}</small>}
    </div>
  );
}
function LegalChecks({
  accepted,
  onChange,
}: {
  accepted: Partial<Record<LegalDoc, boolean>>;
  onChange: (doc: LegalDoc, value: boolean) => void;
}) {
  return (
    <fieldset className="access-consent">
      {LEGAL_DOCS.map((doc) => (
        <label key={doc}>
          <input
            type="checkbox"
            required
            checked={!!accepted[doc]}
            onChange={(e) => onChange(doc, e.target.checked)}
          />
          <span>
            <Trans
              i18nKey={"consent_" + doc + "_label"}
              components={{
                anchor: (
                  <a
                    href={"/surfaces.html?view=" + doc}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ),
              }}
            />
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Study-only local responses. No account requests, accounts or mail are created. */
export function AuthAccess({
  initialMode,
  onClose,
}: {
  initialMode: AccessMode;
  onClose: () => void;
}) {
  const { t } = useTranslation(),
    [scenario, setScenario] = useState<ResponseMode>("success"),
    [verification, setVerification] = useState<Verification>("verified"),
    [done, setDone] = useState(false),
    [changedEmail, setChangedEmail] = useState(false),
    [secondary, setSecondary] = useState(
      initialMode === "reset-password" || initialMode === "consent",
    );
  const title = useId(),
    cls = useClassName(useBuildStore((s) => s.selectedClass)),
    level = useBuildStore((s) => s.level);
  useEffect(() => {
    for (const [lang, copy] of Object.entries(languages))
      i18n.addResourceBundle(lang, "translation", copy, true, false);
  }, []);
  const services: AuthServices = {
    signIn: async () => respond(),
    signUp: async () => respond(),
    requestPasswordReset: async () => respond(),
  };
  async function respond() {
    await wait();
    if (scenario === "network") throw new Error("local preview");
    return {
      error:
        scenario === "success"
          ? null
          : scenario === "taken"
            ? "username_taken"
            : t("auth_v4_" + scenario),
    };
  }
  const flow = useAuthFlow({
    initialMode:
      initialMode === "reset-password" || initialMode === "consent"
        ? "signin"
        : initialMode,
    onClose: () => setDone(true),
    services,
  });
  useEffect(() => {
    flow.setCaptchaToken(
      verification === "verified" ? "study-only-token" : null,
    );
  }, [verification, flow.turnstileKey]);
  // Errors consume a challenge. The next attempt must explicitly verify again in this study.
  useEffect(() => {
    if (flow.error) setVerification("expired");
  }, [flow.error]);
  const mode = flow.mode,
    isSecondary = secondary,
    confirmed = flow.signedUp || flow.resetSent || done;
  function switchMode(next: AuthMode) {
    setDone(false);
    setChangedEmail(false);
    flow.switchMode(next);
    setVerification("verified");
  }
  function close() {
    flow.close();
    onClose();
  }
  const titleKey = confirmed
    ? done
      ? "auth_v4_success"
      : "auth_reset_sent_title"
    : mode === "signin"
      ? "auth_signin_title"
      : mode === "signup"
        ? "auth_signup_title"
        : "auth_forgot_title";
  function review(): ReactNode {
    return (
      <details className="access-review">
        <summary>
          {t("auth_v4_review")} <span>{t("auth_v4_preview")}</span>
        </summary>
        <div>
          <label>
            {t("auth_v4_scenario")}
            <select
              aria-label={t("auth_v4_scenario")}
              value={scenario}
              onChange={(e) => setScenario(e.target.value as ResponseMode)}
            >
              {(
                ["success", "credentials", "taken", "rate", "network"] as const
              ).map((s) => (
                <option key={s} value={s}>
                  {s === "success" ? t("auth_v4_normal") : t("auth_v4_" + s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("auth_v4_verification")}
            <select
              aria-label={t("auth_v4_verification")}
              value={verification}
              onChange={(e) => setVerification(e.target.value as Verification)}
            >
              {(["verified", "pending", "expired", "error"] as const).map(
                (s) => (
                  <option key={s} value={s}>
                    {t("auth_v4_" + (s === "error" ? "verification_error" : s))}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            {t("auth_v4_language")}
            <select
              aria-label={t("auth_v4_language")}
              value={i18n.language}
              onChange={(e) => void i18n.changeLanguage(e.target.value)}
            >
              {Object.keys(languages).map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
      </details>
    );
  }
  return (
    <Modal
      open
      onClose={close}
      labelledBy={title}
      size="4xl"
      className="auth-dialog"
    >
      {review()}
      <div className="access-layout">
        <aside className="access-story">
          <div className="access-brand">
            <img src="/design-assets/forge-mark.svg" alt="" />
            <span>DOFUS FORGE</span>
          </div>
          <div>
            <p className="access-eyebrow">{t("auth_v4_eyebrow")}</p>
            <h3>{t("auth_v4_title")}</h3>
            <p>{t("auth_v4_body")}</p>
          </div>
          <div className="access-build">
            <span className="access-dot" />
            <div>
              <b>{t("auth_v4_context")}</b>
              <span>
                {cls} · {level}
              </span>
            </div>
          </div>
          <div className="access-dofus" aria-hidden="true">
            {[694, 737, 739].map((id) => (
              <img key={id} src={"/design-assets/item-" + id + ".png"} alt="" />
            ))}
          </div>
        </aside>
        <section className="access-main" aria-label={t("auth_v4_eyebrow")}>
          {isSecondary ? (
            <SecondaryAccess
              mode={initialMode as "reset-password" | "consent"}
              title={title}
              respond={respond}
              onClose={close}
              onRequestLink={() => {
                setSecondary(false);
                switchMode("forgot");
              }}
            />
          ) : confirmed ? (
            <div className="access-result">
              <span className="access-result-icon">
                {done ? <Check size={30} /> : <MailCheck size={30} />}
              </span>
              <h2 id={title}>{t(titleKey)}</h2>
              <p role="status">
                {done
                  ? t("auth_v4_success_body")
                  : flow.resetSent
                    ? t("auth_reset_sent")
                    : t("auth_v4_signup_email")}
              </p>
              {!done && (
                <>
                  <p className="access-recipient">
                    {t("auth_v4_sent_to", { email: flow.email })}
                  </p>
                  <p>{t("auth_check_spam")}</p>
                </>
              )}
              <button className="primary" onClick={close}>
                {t("auth_v4_continue")}
                <ArrowRight size={17} />
              </button>
              {!done && (
                <button
                  className="access-text-button"
                  onClick={() => {
                    const was = mode;
                    switchMode(was);
                    setChangedEmail(true);
                  }}
                >
                  {t("auth_v4_change_email")}
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="access-eyebrow">
                DOFUS FORGE / {mode === "signup" ? "02" : "01"}
              </p>
              <h2 id={title}>{t(titleKey)}</h2>
              <p className="access-intro">
                {t(
                  mode === "signin"
                    ? "auth_signin_subtitle"
                    : mode === "signup"
                      ? "auth_v4_signup_note"
                      : "auth_forgot_subtitle",
                )}
              </p>
              {mode !== "forgot" && (
                <div
                  className="access-mode"
                  role="group"
                  aria-label={t("auth_v4_eyebrow")}
                >
                  <button
                    aria-pressed={mode === "signin"}
                    onClick={() => switchMode("signin")}
                  >
                    {t("auth_signin_title")}
                  </button>
                  <button
                    aria-pressed={mode === "signup"}
                    onClick={() => switchMode("signup")}
                  >
                    {t("auth_signup_title")}
                  </button>
                </div>
              )}
              <form
                onSubmit={flow.submit}
                className="access-form"
                aria-busy={flow.busy}
              >
                <div className="access-field">
                  <label htmlFor={title + "-email"}>{t("auth_email")}</label>
                  <input
                    id={title + "-email"}
                    type="email"
                    required
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus={!changedEmail}
                    value={flow.email}
                    onChange={(e) => flow.setEmail(e.target.value)}
                    placeholder="nombre@ejemplo.com"
                  />
                </div>
                {mode === "signup" && (
                  <div className="access-field">
                    <label htmlFor={title + "-username"}>
                      {t("auth_username")}
                    </label>
                    <input
                      id={title + "-username"}
                      required
                      minLength={3}
                      maxLength={30}
                      pattern={USERNAME_PATTERN}
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={flow.username}
                      onChange={(e) => flow.setUsername(e.target.value)}
                      aria-describedby={title + "-username-hint"}
                    />
                    <small id={title + "-username-hint"}>
                      {t("auth_username_hint")}
                    </small>
                  </div>
                )}
                {mode !== "forgot" && (
                  <Password
                    key={mode}
                    id={title + "-password"}
                    label={t("auth_password")}
                    value={flow.password}
                    onChange={flow.setPassword}
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    hint={
                      mode === "signup"
                        ? t("auth_v4_password_hint", {
                            count: PASSWORD_MIN_LENGTH,
                          })
                        : undefined
                    }
                  />
                )}
                {mode === "signin" && (
                  <button
                    className="access-forgot"
                    type="button"
                    onClick={() => switchMode("forgot")}
                  >
                    {t("auth_forgot_password")}
                  </button>
                )}
                {mode === "signup" && (
                  <LegalChecks
                    accepted={flow.accepted}
                    onChange={(doc, value) =>
                      flow.setAccepted((a) => ({ ...a, [doc]: value }))
                    }
                  />
                )}
                {flow.error && (
                  <div className="access-error" role="alert">
                    <AlertCircle size={18} />
                    <p>{flow.error}</p>
                  </div>
                )}
                <div
                  className={"access-verification " + verification}
                  role="status"
                >
                  {verification === "verified" ? (
                    <ShieldCheck size={18} />
                  ) : verification === "pending" ? (
                    <LoaderCircle size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )}
                  <span>
                    {t(
                      "auth_v4_" +
                        (verification === "error"
                          ? "verification_error"
                          : verification),
                    )}
                  </span>
                  {(verification === "expired" || verification === "error") && (
                    <button
                      type="button"
                      onClick={() => setVerification("verified")}
                    >
                      {t("auth_v4_retry")}
                    </button>
                  )}
                </div>
                <button
                  className="primary access-submit"
                  type="submit"
                  disabled={flow.busy || !flow.captchaToken || !flow.legalOk}
                >
                  {flow.busy ? (
                    <>
                      <LoaderCircle size={17} />
                      {t("auth_loading")}
                    </>
                  ) : (
                    <>
                      {t(
                        mode === "signin"
                          ? "auth_signin_btn"
                          : mode === "signup"
                            ? "auth_signup_btn"
                            : "auth_forgot_btn",
                      )}
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>
              <div className="access-footer">
                <button
                  onClick={
                    mode === "forgot" ? () => switchMode("signin") : close
                  }
                >
                  <ArrowLeft size={15} />
                  {t(
                    mode === "forgot"
                      ? "auth_back_to_signin"
                      : "auth_v4_return",
                  )}
                </button>
                <span>{t("auth_v4_signin_note")}</span>
              </div>
            </>
          )}
        </section>
      </div>
    </Modal>
  );
}

function SecondaryAccess({
  mode,
  title,
  respond,
  onClose,
  onRequestLink,
}: {
  mode: "reset-password" | "consent";
  title: string;
  respond: () => Promise<{ error: string | null }>;
  onClose: () => void;
  onRequestLink: () => void;
}) {
  const { t } = useTranslation(),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [accepted, setAccepted] = useState<Partial<Record<LegalDoc, boolean>>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [done, setDone] = useState(false);
  const consent = mode === "consent";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!consent && password !== confirm) {
      setError(t("auth_password_mismatch"));
      return;
    }
    if (consent && !LEGAL_DOCS.every((d) => accepted[d])) return;
    setBusy(true);
    setError(null);
    try {
      const result = await respond();
      if (result.error) setError(result.error);
      else {
        setDone(true);
        setPassword("");
        setConfirm("");
      }
    } catch {
      setError(t("auth_v4_connection_error"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="access-eyebrow">DOFUS FORGE / {consent ? "03" : "04"}</p>
      <h2 id={title}>
        {t(
          done
            ? consent
              ? "consent_gate_accept"
              : "auth_v4_reset_done"
            : consent
              ? "consent_gate_title"
              : "auth_v4_reset_title",
        )}
      </h2>
      {done ? (
        <div className="access-result">
          <Check size={32} />
          <p role="status">
            {t(consent ? "auth_v4_success_body" : "auth_v4_reset_body")}
          </p>
          <button className="primary" onClick={onClose}>
            {t("auth_v4_continue")}
          </button>
        </div>
      ) : (
        <form className="access-form" onSubmit={submit} aria-busy={busy}>
          <p className="access-intro">
            {t(consent ? "consent_gate_body" : "auth_reset_password_subtitle")}
          </p>
          {consent ? (
            <>
              <LegalChecks
                accepted={accepted}
                onChange={(d, v) => setAccepted((a) => ({ ...a, [d]: v }))}
              />
              <p className="access-hint">{t("auth_v4_consent_note")}</p>
            </>
          ) : (
            <>
              <Password
                id={title + "-new"}
                label={t("auth_new_password")}
                value={password}
                onChange={setPassword}
                hint={t("auth_v4_password_hint", {
                  count: PASSWORD_MIN_LENGTH,
                })}
              />
              <Password
                id={title + "-confirm"}
                label={t("auth_confirm_password")}
                value={confirm}
                onChange={setConfirm}
              />
            </>
          )}
          {error && (
            <p className="access-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary access-submit"
            disabled={
              busy || (consent && !LEGAL_DOCS.every((d) => accepted[d]))
            }
          >
            {t(
              busy
                ? "auth_loading"
                : consent
                  ? "consent_gate_accept"
                  : "auth_reset_btn",
            )}
            <ArrowRight size={17} />
          </button>
          <button
            type="button"
            className="access-text-button"
            onClick={consent ? onClose : onRequestLink}
          >
            {t(consent ? "auth_signout" : "auth_v4_request_link")}
          </button>
        </form>
      )}
    </>
  );
}
