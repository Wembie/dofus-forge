import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Coffee,
  Compass,
  FolderOpen,
  GitFork,
  Hammer,
  Heart,
  Info,
  Keyboard,
  Languages,
  Library,
  LogIn,
  LogOut,
  MessageSquare,
  Moon,
  MousePointer2,
  Mountain,
  PanelLeft,
  PanelRight,
  PersonStanding,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  SunMedium,
  User,
  UserPlus,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from "lucide-react";
import type { NotificationType } from "../../../src/features/builds/api";
import { ColombianMark } from "../../../src/components/ColombianMark";
import { isSoundEnabled, toggleSound, SOUND_EVENT_NAME } from "../../../src/lib/sound";
import {
  getCharacterMode,
  isCursorEnabled,
  isParticlesEnabled,
  setCharacterMode,
  setCursorEnabled,
  setParticlesEnabled,
  MOTION_SETTINGS_EVENT,
  type CharacterMode,
} from "../../../src/lib/motionSettings";
import {
  getSidebarSide,
  setSidebarSide,
  LAYOUT_SETTINGS_EVENT,
  type SidebarSide,
} from "../../../src/lib/layoutSettings";
import { useAccountLocale } from "./Account";
import { useAccountStudy } from "./account-model";
import { Modal } from "./SurfaceModal";
import { notificationScenes, useShellStudy, type NotificationScene } from "./shell-model";
import "./shell.css";

const TYPE_ICON: Record<NotificationType, typeof Heart> = {
  build_liked: Heart,
  build_commented: MessageSquare,
  build_rated: Star,
  build_forked: GitFork,
  comment_liked: Heart,
  comment_replied: MessageSquare,
  new_follower: UserPlus,
};
// Date of the project's first commit, as SiteFooter.
const FOUNDED_AT = Date.UTC(2026, 7, 4),
  FOUNDED_YEAR = 2026;
const STUDY_NOW = Date.parse("2026-11-17T13:00:00Z");

function timeAgo(iso: string, lang: string) {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" }),
    secs = (Date.parse(iso) - STUDY_NOW) / 1000,
    steps: [Intl.RelativeTimeFormatUnit, number][] = [
      ["year", 31536000],
      ["month", 2592000],
      ["week", 604800],
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60],
    ];
  for (const [unit, size] of steps)
    if (Math.abs(secs) >= size) return rtf.format(Math.round(secs / size), unit);
  return rtf.format(Math.round(secs), "second");
}

/** Where a page sends the player; each study page maps these to its own navigation. */
export type ShellTarget =
  | "workshop"
  | "explore"
  | "my-builds"
  | "sets"
  | "how-to-use"
  | "forge-guide"
  | "shortcuts"
  | "about"
  | "privacy"
  | "terms"
  | "account"
  | "admin";
export type ShellNavigate = (target: ShellTarget | { build: string } | { profile: string }) => void;

function useOutside(open: boolean, close: () => void, root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
        if (!root.current?.contains(e.target as Node)) close();
      },
      key = (e: KeyboardEvent) => {
        if (e.key === "Escape") close();
      };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
}

/** Bell with unread count and the latest activity; only for a signed-in player, as production. */
export function NotificationBell({ onNavigate }: { onNavigate: ShellNavigate }) {
  const { t, i18n } = useAccountLocale(),
    s = useShellStudy(),
    signedIn = useAccountStudy((a) => a.signedIn),
    root = useRef<HTMLDivElement>(null),
    button = useRef<HTMLButtonElement>(null),
    id = useId();
  useOutside(s.open, () => s.setOpen(false), root);
  // Back to the bell when the panel closes, never on first render.
  const wasOpen = useRef(s.open);
  useEffect(() => {
    if (wasOpen.current && !s.open) button.current?.focus({ preventScroll: true });
    wasOpen.current = s.open;
  }, [s.open]);
  if (!signedIn) return null;
  return (
    <div ref={root} className="shell-bell">
      <button
        ref={button}
        type="button"
        className="icon-button shell-icon"
        aria-label={
          t("notif_title") + (s.unread ? " · " + t("notif_unread", { count: s.unread }) : "")
        }
        aria-expanded={s.open}
        aria-controls={id}
        onClick={() => s.setOpen(!s.open)}
      >
        <Bell size={18} />
        {s.unread > 0 && <span className="shell-badge" aria-hidden="true">{s.unread > 9 ? "9+" : s.unread}</span>}
      </button>
      {s.open && (
        <div id={id} className="shell-popover shell-notifications" role="dialog" aria-label={t("notif_title")}>
          <header>
            <h2>{t("notif_title")}</h2>
            {s.items?.some((n) => !n.read) && (
              <button type="button" onClick={s.markAll}>
                {t("notif_mark_all")}
              </button>
            )}
          </header>
          {s.items == null ? (
            <p className="shell-empty" role="status">
              {t("auth_loading")}
            </p>
          ) : s.items.length === 0 ? (
            <div className="shell-empty">
              <Bell size={22} aria-hidden="true" />
              <p>{t("notif_empty")}</p>
              <small>{t("shell_v4_notif_empty_hint")}</small>
            </div>
          ) : (
            <ul>
              {s.items.map((n) => {
                const Icon = TYPE_ICON[n.type];
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={n.read ? "" : "is-unread"}
                      onClick={() => {
                        s.markRead(n.id);
                        s.setOpen(false);
                        if (n.type === "new_follower" && n.actor) onNavigate({ profile: n.actor.username });
                        else if (n.build_id) onNavigate({ build: n.build_id });
                      }}
                    >
                      <span className={"shell-notif-icon is-" + n.type}>
                        <Icon size={15} aria-hidden="true" />
                      </span>
                      <span>
                        <span>
                          {t("notif_" + n.type, {
                            user: n.actor?.username ?? t("notif_someone"),
                            build: n.build?.name ?? "",
                          })}
                        </span>
                        <time dateTime={n.created_at}>{timeAgo(n.created_at, i18n.language)}</time>
                      </span>
                      {!n.read && <span className="sr-only">{t("shell_v4_unread_item")}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Sign-in button, or the player's menu: profile and account, then sign out. */
export function AccountButton({
  onSignIn,
  onSignOut,
  onNavigate,
}: {
  onSignIn: () => void;
  onSignOut: () => void;
  onNavigate: ShellNavigate;
}) {
  const { t } = useAccountLocale(),
    a = useAccountStudy(),
    [open, setOpen] = useState(false),
    root = useRef<HTMLDivElement>(null),
    id = useId();
  useOutside(open, () => setOpen(false), root);
  if (!a.signedIn)
    return (
      <button type="button" className="shell-signin" onClick={onSignIn}>
        <LogIn size={16} />
        <span>{t("auth_signin_btn")}</span>
      </button>
    );
  const name = a.profile.username;
  return (
    <div ref={root} className="shell-account">
      <button
        type="button"
        className="shell-avatar"
        aria-label={t("shell_v4_account_menu", { name })}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {name.slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div id={id} className="shell-popover shell-account-menu">
          <p>
            <b>{name}</b>
            <small>{t("shell_v4_signed_in_as")}</small>
          </p>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onNavigate({ profile: name });
            }}
          >
            <User size={16} />
            {t("shell_v4_public_profile")}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onNavigate("account");
            }}
          >
            <Settings size={16} />
            {t("auth_profile_title")}
          </button>
          <button
            type="button"
            className="is-quiet"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <LogOut size={16} />
            {t("auth_signout")}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  Icon,
  title,
  hint,
  children,
}: {
  Icon: typeof Heart;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="shell-setting">
      <Icon size={18} aria-hidden="true" />
      <span>
        <b>{title}</b>
        {hint && <small>{hint}</small>}
      </span>
      {children}
    </div>
  );
}
function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="shell-switch" onClick={onToggle}>
      <i />
    </button>
  );
}
function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string; Icon?: typeof Heart }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="shell-segmented" role="radiogroup" aria-label={label}>
      {options.map(({ id, label: l, Icon }) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} onClick={() => onChange(id)}>
          {Icon && <Icon size={15} aria-hidden="true" />}
          {l}
        </button>
      ))}
    </div>
  );
}

/** Production's preferences: language, theme, sound, cursor, particles, character, sheet side. */
export function SettingsDialog({
  onClose,
  dark,
  onTheme,
}: {
  onClose: () => void;
  dark: boolean;
  onTheme: (dark: boolean) => void;
}) {
  const { t, i18n } = useAccountLocale(),
    [sound, setSound] = useState(isSoundEnabled),
    [cursor, setCursor] = useState(isCursorEnabled),
    [particles, setParticles] = useState(isParticlesEnabled),
    [mode, setMode] = useState<CharacterMode>(getCharacterMode),
    [side, setSide] = useState<SidebarSide>(getSidebarSide);
  useEffect(() => {
    const motion = () => {
        setCursor(isCursorEnabled());
        setParticles(isParticlesEnabled());
        setMode(getCharacterMode());
      },
      layout = () => setSide(getSidebarSide()),
      audio = () => setSound(isSoundEnabled());
    addEventListener(MOTION_SETTINGS_EVENT, motion);
    addEventListener(LAYOUT_SETTINGS_EVENT, layout);
    addEventListener(SOUND_EVENT_NAME, audio);
    return () => {
      removeEventListener(MOTION_SETTINGS_EVENT, motion);
      removeEventListener(LAYOUT_SETTINGS_EVENT, layout);
      removeEventListener(SOUND_EVENT_NAME, audio);
    };
  }, []);
  return (
    <Modal open onClose={onClose} title={t("settings_title")} size="sm" className="shell-settings">
      <div className="shell-settings-body">
        <h3>{t("shell_v4_settings_general")}</h3>
        <Row Icon={Languages} title={t("settings_language")}>
          <select
            aria-label={t("settings_language")}
            value={i18n.language.slice(0, 2)}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="pt">Português</option>
          </select>
        </Row>
        <Row Icon={dark ? Moon : SunMedium} title={t("settings_theme")} hint={t(dark ? "theme_label_dark" : "theme_label_light")}>
          <Segmented
            label={t("settings_theme")}
            value={dark ? "dark" : "light"}
            onChange={(v) => onTheme(v === "dark")}
            options={[
              { id: "dark", label: t("shell_v4_theme_dark"), Icon: Moon },
              { id: "light", label: t("shell_v4_theme_light"), Icon: SunMedium },
            ]}
          />
        </Row>
        <Row Icon={sound ? Volume2 : VolumeX} title={t("settings_sound")} hint={t(sound ? "shell_v4_sound_on" : "shell_v4_sound_off")}>
          <Switch on={sound} onToggle={toggleSound} label={t("settings_sound")} />
        </Row>
        <h3>{t("shell_v4_settings_motion")}</h3>
        <Row Icon={MousePointer2} title={t("settings_cursor")} hint={t("settings_cursor_hint")}>
          <Switch on={cursor} onToggle={() => setCursorEnabled(!cursor)} label={t("settings_cursor")} />
        </Row>
        <Row Icon={Sparkles} title={t("settings_particles")} hint={t("settings_particles_hint")}>
          <Switch on={particles} onToggle={() => setParticlesEnabled(!particles)} label={t("settings_particles")} />
        </Row>
        <Row Icon={PersonStanding} title={t("settings_character")} hint={t("settings_character_hint")}>
          <Segmented
            label={t("settings_character")}
            value={mode}
            onChange={setCharacterMode}
            options={[
              { id: "3d", label: "3D" },
              { id: "2d", label: "2D" },
            ]}
          />
        </Row>
        <h3>{t("shell_v4_settings_layout")}</h3>
        <Row Icon={side === "left" ? PanelLeft : PanelRight} title={t("settings_sidebar_side")} hint={t("settings_sidebar_side_hint")}>
          <Segmented
            label={t("settings_sidebar_side")}
            value={side}
            onChange={setSidebarSide}
            options={[
              { id: "left", label: t("sidebar_side_left"), Icon: PanelLeft },
              { id: "right", label: t("sidebar_side_right"), Icon: PanelRight },
            ]}
          />
        </Row>
        <p className="shell-muted">{t("shell_v4_settings_saved")}</p>
      </div>
    </Modal>
  );
}

/** Every destination of the site, as the header menu and the bottom bar's "More" in production. */
export function NavigationSheet({
  onClose,
  onNavigate,
  current,
  admin,
  onSettings,
}: {
  onClose: () => void;
  onNavigate: ShellNavigate;
  current?: ShellTarget;
  admin: boolean;
  onSettings: () => void;
}) {
  const { t } = useAccountLocale();
  const groups: [string, [ShellTarget, string, typeof Heart][]][] = [
    [
      "shell_v4_nav_build",
      [
        ["workshop", "shell_v4_workshop", Hammer],
        ["explore", "explore_open", Compass],
        ["my-builds", "my_builds", FolderOpen],
        ["sets", "nav_sets", Library],
      ],
    ],
    [
      "shell_v4_nav_learn",
      [
        ["how-to-use", "nav_how_to_use", BookOpen],
        ["forge-guide", "nav_forge_guide", Wand2],
        ["shortcuts", "nav_shortcuts", Keyboard],
        ["about", "nav_about", Info],
      ],
    ],
    ...(admin
      ? ([["shell_v4_nav_admin", [["admin", "admin_nav", ShieldCheck]]]] as [string, [ShellTarget, string, typeof Heart][]][])
      : []),
  ];
  return (
    <Modal open onClose={onClose} title={t("shell_v4_nav_title")} className="shell-sheet">
      <nav className="shell-sheet-body" aria-label={t("a11y_main_nav")}>
        {groups.map(([title, items]) => (
          <section key={title}>
            <h3>{t(title)}</h3>
            <ul>
              {items.map(([target, label, Icon]) => (
                <li key={target}>
                  <button
                    type="button"
                    aria-current={current === target ? "page" : undefined}
                    onClick={() => {
                      onClose();
                      onNavigate(target);
                    }}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {t(label)}
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <button
          type="button"
          className="shell-sheet-settings"
          onClick={() => {
            onClose();
            onSettings();
          }}
        >
          <Settings size={18} aria-hidden="true" />
          {t("settings_title")}
        </button>
      </nav>
    </Modal>
  );
}

/** A newer deploy was detected: reload or keep working. */
export function UpdateBanner() {
  const { t } = useAccountLocale(),
    s = useShellStudy();
  if (!s.updateAvailable) return null;
  return (
    <div className="shell-update" role="status">
      <RefreshCw size={17} aria-hidden="true" />
      <span>
        <b>{t("update_available")}</b>
        <small>{t("shell_v4_update_hint")}</small>
      </span>
      <button type="button" className="primary" onClick={() => location.reload()}>
        {t("update_reload")}
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={t("dismiss")}
        onClick={() => s.setUpdateAvailable(false)}
      >
        <X size={17} />
      </button>
    </div>
  );
}

/** Review switches for the shell: notifications fixtures and the update notice. */
export function ShellReview() {
  const { t } = useAccountLocale(),
    s = useShellStudy();
  return (
    <div className="shell-review">
      <label>
        {t("shell_v4_review_notifications")}
        <select value={s.scene} onChange={(e) => s.setScene(e.target.value as NotificationScene)}>
          {notificationScenes.map((v) => (
            <option key={v} value={v}>
              {t("shell_v4_scene_" + v)}
            </option>
          ))}
        </select>
      </label>
      <label className="shell-review-check">
        <input
          type="checkbox"
          checked={s.updateAvailable}
          onChange={(e) => s.setUpdateAvailable(e.target.checked)}
        />
        {t("shell_v4_review_update")}
      </label>
    </div>
  );
}

/** Production's footer: site and legal links, credits, community, disclaimer, age of the project. */
export function SiteFooter({ onNavigate }: { onNavigate: ShellNavigate }) {
  const { t, i18n } = useAccountLocale(),
    year = new Date(STUDY_NOW).getUTCFullYear(),
    days = Math.floor((STUDY_NOW - FOUNDED_AT) / 86_400_000),
    founded = new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(FOUNDED_AT);
  const link = (target: ShellTarget, label: string) => (
    <button type="button" onClick={() => onNavigate(target)}>
      {t(label)}
    </button>
  );
  return (
    <footer className="shell-footer">
      <div className="shell-footer-top">
        <div className="shell-footer-brand">
          <span className="shell-footer-name">
            <img src="/design-assets/forge-mark.svg" alt="" />
            DOFUS <span>FORGE</span>
          </span>
          <p>{t("shell_v4_footer_tagline")}</p>
          <p className="shell-colombia" role="img" aria-label={t("colombia_badge")}>
            <ColombianMark />
            <span aria-hidden="true">{t("colombia_badge")}</span>
            <Coffee size={14} aria-hidden="true" />
            <Mountain size={14} aria-hidden="true" />
          </p>
        </div>
        <nav aria-label={t("a11y_site_nav")}>
          <h2>{t("shell_v4_footer_product")}</h2>
          {link("workshop", "shell_v4_workshop")}
          {link("explore", "explore_open")}
          {link("my-builds", "my_builds")}
          {link("sets", "nav_sets")}
        </nav>
        <nav aria-label={t("shell_v4_footer_learn")}>
          <h2>{t("shell_v4_footer_learn")}</h2>
          {link("how-to-use", "nav_how_to_use")}
          {link("forge-guide", "nav_forge_guide")}
          {link("shortcuts", "nav_shortcuts")}
          {link("about", "nav_about")}
        </nav>
        <div className="shell-footer-credits">
          <h2>{t("shell_v4_footer_credits")}</h2>
          <dl>
            <div>
              <dt>{t("credits_server")}</dt>
              <dd>Tal Kasha</dd>
            </div>
            <div>
              <dt>{t("credits_creator")}</dt>
              <dd>Juan / Wembie</dd>
            </div>
            <div>
              <dt>{t("credits_ingame")}</dt>
              <dd>Raik-Luck</dd>
            </div>
            <div>
              <dt>{t("credits_community")}</dt>
              <dd>
                <a href="https://discord.gg/Rv8q4C8C5j" target="_blank" rel="noopener noreferrer">
                  Discord
                </a>
                <a href="https://x.com/DofusForgeApp" target="_blank" rel="noopener noreferrer" aria-label={t("a11y_on_x")}>
                  X
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="shell-footer-legal">
        <nav aria-label={t("a11y_legal_nav")}>
          {link("privacy", "legal_privacy")}
          {link("terms", "legal_terms")}
          <a href="mailto:contact@dofusforge.com">{t("legal_contact")}</a>
        </nav>
        <p>{t("legal_ankama_disclaimer")}</p>
        <p className="shell-footer-age">
          <span>
            © {FOUNDED_YEAR}
            {year > FOUNDED_YEAR ? "–" + year : ""} {t("app_title")}
          </span>
          <span aria-hidden="true">·</span>
          <span>{t("footer_founded", { date: founded })}</span>
          <span aria-hidden="true">·</span>
          <span>{t("footer_days_online", { count: days })}</span>
        </p>
      </div>
    </footer>
  );
}
