import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Anvil,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Compass,
  Flame,
  Gauge,
  Hammer,
  Heart,
  HelpCircle,
  Keyboard,
  Layers,
  Lock,
  MousePointerClick,
  Pin,
  Scale,
  Share2,
  Smartphone,
  Sparkles,
  Star,
  Sword,
  Trophy,
  User,
  Users,
  Wand2,
  Database,
} from "lucide-react";
import { LegalBody } from "../../../src/components/LegalBody";
import { ForgeScene } from "../../../src/features/optimizer/ForgeParts";
import { CLASS_DATA } from "../../../src/features/class-picker/classData";
import { resolveClassName } from "../../../src/features/class-picker/useClassName";
import { statIconUrl } from "../../../src/features/equipment/statDisplay";
import { ELEM_COLOR, fmtRange } from "../../../src/features/spells/spellCalc";
import { useDataStore } from "../../../src/store/dataStore";
import type { GuideElement } from "../../../src/data/setGuide";
import { useAccountLocale } from "./Account";
import { useExploreStudy } from "./explore-model";
import { SetCard } from "./SetPages";
import { classGuide, useSetPagesStudy, GUIDE_ELEMENTS } from "./set-pages-model";
import "./reading.css";

/** Where a reading page sends the player; the study page maps these to its views. */
export type ReadingTarget =
  | "workshop"
  | "forge"
  | "explore"
  | "how-to-use"
  | "forge-guide"
  | "about"
  | { class: string }
  | { set: string }
  | { build: string }
  | { workshopClass: string };
type Go = (target: ReadingTarget) => void;

/** Section that is on screen, for the contents list. */
function useActive(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const seen = new Map<string, boolean>(),
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) seen.set(e.target.id, e.isIntersecting);
          const first = ids.find((id) => seen.get(id));
          if (first) setActive(first);
        },
        { rootMargin: "-15% 0px -60% 0px" },
      );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids.join()]);
  return active;
}

/** The reading layout: title block, contents beside the text on wide screens, folded on narrow ones. */
function Reading({
  kicker,
  title,
  intro,
  toc,
  tocLabel,
  hero,
  children,
  className = "",
}: {
  kicker: string;
  title: ReactNode;
  intro?: ReactNode;
  toc?: { id: string; label: string; Icon?: typeof Flame }[];
  tocLabel?: string;
  hero?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useAccountLocale(),
    active = useActive(toc?.map((s) => s.id) ?? []);
  const list = toc && (
    <ol>
      {toc.map((s, i) => (
        <li key={s.id}>
          <a href={"#" + s.id} aria-current={active === s.id ? "location" : undefined}>
            <span>{s.Icon ? <s.Icon size={14} aria-hidden="true" /> : String(i + 1).padStart(2, "0")}</span>
            {s.label}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <div className={"rd-study " + className}>
      <header className="rd-head">
        <div>
          <p className="account-eyebrow">{kicker}</p>
          <h1>{title}</h1>
          {intro && <div className="rd-intro">{intro}</div>}
        </div>
        {hero}
      </header>
      <div className={toc ? "rd-layout" : "rd-layout is-single"}>
        {toc && (
          <>
            <nav className="rd-toc" aria-label={tocLabel ?? t("class_guide_nav_label")}>
              <p>{tocLabel ?? t("class_guide_nav_label")}</p>
              {list}
            </nav>
            <details className="rd-toc-mobile">
              <summary>{tocLabel ?? t("class_guide_nav_label")}</summary>
              <nav aria-label={(tocLabel ?? t("class_guide_nav_label")) + " · " + t("shell_v4_mobile_nav")}>{list}</nav>
            </details>
          </>
        )}
        <div className="rd-content">{children}</div>
      </div>
    </div>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="rd-actions">{children}</div>;
}
function Go({ to, go, primary, children }: { to: ReadingTarget; go: Go; primary?: boolean; children: ReactNode }) {
  return (
    <button type="button" className={primary ? "primary" : ""} onClick={() => go(to)}>
      {children}
    </button>
  );
}

export function HowToUse({ go }: { go: Go }) {
  const { t } = useAccountLocale(),
    steps = Array.from({ length: 8 }, (_, i) => i + 1);
  return (
    <Reading
      kicker={t("rd_v4_kicker_guide")}
      title={t("howto_title")}
      intro={<p>{t("howto_intro")}</p>}
      toc={steps.map((n) => ({ id: "step" + n, label: t(`howto_step${n}_title`) }))}
    >
      <ol className="rd-steps">
        {steps.map((n) => (
          <li key={n} id={"step" + n}>
            <span className="rd-step-n" aria-hidden="true">
              {n}
            </span>
            <div>
              <h2>{t(`howto_step${n}_title`)}</h2>
              <p>{t(`howto_step${n}_body`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <Actions>
        <Go to="workshop" go={go} primary>
          <Hammer size={17} aria-hidden="true" />
          {t("howto_cta_start")}
        </Go>
        <Go to="about" go={go}>
          {t("howto_cta_about")}
        </Go>
        <Go to="forge-guide" go={go}>
          <Wand2 size={17} aria-hidden="true" />
          {t("nav_forge_guide")}
        </Go>
      </Actions>
    </Reading>
  );
}

const FORGE_SECTIONS: { id: string; Icon: typeof Flame; count: number; layout: "steps" | "grid" | "heat" | "faq"; example?: boolean }[] = [
  { id: "start", Icon: Flame, count: 5, layout: "steps" },
  { id: "order", Icon: Scale, count: 4, layout: "grid", example: true },
  { id: "intensity", Icon: Gauge, count: 4, layout: "heat" },
  { id: "items", Icon: Pin, count: 5, layout: "grid", example: true },
  { id: "slots", Icon: Lock, count: 2, layout: "grid" },
  { id: "forgemagic", Icon: Sparkles, count: 4, layout: "grid" },
  { id: "forging", Icon: Anvil, count: 4, layout: "grid" },
  { id: "results", Icon: Trophy, count: 5, layout: "grid" },
  { id: "faq", Icon: HelpCircle, count: 5, layout: "faq" },
];
const HEAT = [35, 60, 85, 100];

export function ForgeGuide({ go }: { go: Go }) {
  const { t } = useAccountLocale();
  return (
    <Reading
      className="rd-forge"
      kicker={t("forgeguide_kicker")}
      title={t("forgeguide_title")}
      intro={
        <>
          <p>{t("forgeguide_intro")}</p>
          <Actions>
            <Go to="forge" go={go} primary>
              <Flame size={17} aria-hidden="true" />
              {t("forgeguide_cta_open")}
            </Go>
            <Go to="how-to-use" go={go}>
              <BookOpen size={17} aria-hidden="true" />
              {t("forgeguide_cta_howto")}
            </Go>
          </Actions>
        </>
      }
      hero={
        <div className="rd-forge-scene" aria-hidden="true">
          <ForgeScene heat={0.85} burst={0} tempering={false} />
        </div>
      }
      tocLabel={t("forgeguide_toc")}
      toc={FORGE_SECTIONS.map((s) => ({ id: s.id, label: t(`forgeguide_${s.id}_title`), Icon: s.Icon }))}
    >
      {FORGE_SECTIONS.map((s) => {
        const items = Array.from({ length: s.count }, (_, i) => i + 1);
        return (
          <section key={s.id} id={s.id} className="rd-section">
            <header>
              <span className="rd-section-icon">
                <s.Icon size={18} aria-hidden="true" />
              </span>
              <h2>{t(`forgeguide_${s.id}_title`)}</h2>
            </header>
            <p className="rd-lead">{t(`forgeguide_${s.id}_intro`)}</p>
            {s.layout === "faq" ? (
              <div className="rd-faq">
                {items.map((n) => (
                  <details key={n}>
                    <summary>
                      {t(`forgeguide_faq_${n}_title`)}
                      <ChevronDown size={16} aria-hidden="true" />
                    </summary>
                    <p>{t(`forgeguide_faq_${n}_body`)}</p>
                  </details>
                ))}
              </div>
            ) : (
              <ol className={"rd-cards is-" + s.layout}>
                {items.map((n, i) => (
                  <li key={n}>
                    {s.layout === "steps" && <span className="rd-card-n">{n}</span>}
                    {s.layout === "heat" && (
                      <span className={"rd-heat" + (i === 3 ? " is-max" : "")} aria-hidden="true">
                        <i style={{ width: HEAT[i] + "%" }} />
                      </span>
                    )}
                    <h3>{t(`forgeguide_${s.id}_${n}_title`)}</h3>
                    <p>{t(`forgeguide_${s.id}_${n}_body`)}</p>
                  </li>
                ))}
              </ol>
            )}
            {s.example && (
              <p className="rd-example">
                <b>{t("forgeguide_example")}</b>
                {t(`forgeguide_${s.id}_example`)}
              </p>
            )}
          </section>
        );
      })}
      <Actions>
        <Go to="forge" go={go} primary>
          <Flame size={17} aria-hidden="true" />
          {t("forgeguide_cta_open")}
        </Go>
      </Actions>
    </Reading>
  );
}

const SHORTCUT_GROUPS: { id: string; Icon: typeof Flame; items: [string, string[]?][] }[] = [
  { id: "mouse", Icon: MousePointerClick, items: [["drag_ring"], ["drag_dofus"], ["rightclick"]] },
  {
    id: "keyboard",
    Icon: Keyboard,
    items: [
      ["undo", ["Ctrl", "Z"]],
      ["redo", ["Ctrl", "Shift", "Z"]],
      ["palette", ["Ctrl", "K"]],
      ["palette_nav", ["↑", "↓", "↵", "Esc"]],
    ],
  },
  { id: "mobile", Icon: Smartphone, items: [["mobile_tap"], ["mobile_nodrag"], ["mobile_pin"]] },
];

export function Shortcuts({ go }: { go: Go }) {
  const { t } = useAccountLocale();
  return (
    <Reading
      kicker={t("rd_v4_kicker_guide")}
      title={t("shortcuts_title")}
      intro={<p>{t("shortcuts_intro")}</p>}
      toc={SHORTCUT_GROUPS.map((g) => ({ id: "group-" + g.id, label: t(`shortcuts_group_${g.id}_title`), Icon: g.Icon }))}
    >
      {SHORTCUT_GROUPS.map((g) => (
        <section key={g.id} id={"group-" + g.id} className="rd-section">
          <header>
            <span className="rd-section-icon">
              <g.Icon size={18} aria-hidden="true" />
            </span>
            <h2>{t(`shortcuts_group_${g.id}_title`)}</h2>
          </header>
          <dl className="rd-keys">
            {g.items.map(([key, combo]) => (
              <div key={key}>
                <dt>
                  {combo && (
                    <span className="rd-combo">
                      {combo.map((k, i) => (
                        <span key={k}>
                          {i > 0 && combo.length < 4 && <i aria-hidden="true">+</i>}
                          <kbd>{k}</kbd>
                        </span>
                      ))}
                    </span>
                  )}
                  {t(`shortcuts_${key}_title`)}
                </dt>
                <dd>{t(`shortcuts_${key}_body`)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <Actions>
        <Go to="workshop" go={go} primary>
          <Hammer size={17} aria-hidden="true" />
          {t("shortcuts_cta_start")}
        </Go>
        <Go to="how-to-use" go={go}>
          {t("shortcuts_cta_howto")}
        </Go>
      </Actions>
    </Reading>
  );
}

const ABOUT_CARDS: [string, typeof Flame][] = [
  ["why", Sparkles],
  ["data", Database],
  ["free", Heart],
  ["team", Users],
];
const FEATURES: [string, typeof Flame][] = [
  ["catalog", BookOpen],
  ["sets", Layers],
  ["runes", Sparkles],
  ["optimizer", Wand2],
  ["share", Share2],
  ["explore", Compass],
];

export function About({ go }: { go: Go }) {
  const { t, i18n } = useAccountLocale(),
    // Production reads get_total_builds_count; the study counts its example builds.
    total = useExploreStudy((s) => s.records.length),
    nf = new Intl.NumberFormat(i18n.language);
  return (
    <Reading
      kicker={t("rd_v4_kicker_about")}
      title={t("about_title")}
      intro={
        <>
          <p>{t("about_intro")}</p>
          {total > 0 && (
            <p className="rd-pill">
              <Hammer size={15} aria-hidden="true" />
              {t("about_total_builds", { count: total, formattedCount: nf.format(total) })}
            </p>
          )}
        </>
      }
      toc={[
        { id: "about-project", label: t("rd_v4_about_project") },
        { id: "about-features", label: t("seo_features_title") },
        { id: "about-classes", label: t("seo_classes_title") },
        { id: "about-faq", label: t("seo_faq_title") },
      ]}
    >
      <section id="about-project" className="rd-section">
        <div className="rd-cards is-grid">
          {ABOUT_CARDS.map(([key, Icon]) => (
            <article key={key}>
              <Icon size={18} aria-hidden="true" />
              <h2>{t(`about_${key}_title`)}</h2>
              <p>{t(`about_${key}_body`)}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="about-features" className="rd-section">
        <header>
          <h2>{t("seo_features_title")}</h2>
        </header>
        <div className="rd-features">
          {FEATURES.map(([key, Icon]) => (
            <article key={key}>
              <span className="rd-section-icon">
                <Icon size={17} aria-hidden="true" />
              </span>
              <h3>{t(`seo_feature_${key}_title`)}</h3>
              <p>{t(`seo_feature_${key}_desc`)}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="about-classes" className="rd-section">
        <header>
          <h2>{t("seo_classes_title")}</h2>
        </header>
        <p className="rd-lead">{t("seo_classes_body")}</p>
        <ul className="rd-classes">
          {CLASS_DATA.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => go({ class: c.id })}>
                <img src={c.imageUrl} alt="" />
                {resolveClassName(c.id, i18n.language, null)}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section id="about-faq" className="rd-section">
        <header>
          <h2>{t("seo_faq_title")}</h2>
        </header>
        <dl className="rd-qa">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n}>
              <dt>{t(`seo_faq_q${n}`)}</dt>
              <dd>{t(`seo_faq_a${n}`)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <Actions>
        <Go to="how-to-use" go={go} primary>
          {t("about_cta_howto")}
        </Go>
        <Go to="explore" go={go}>
          <Compass size={17} aria-hidden="true" />
          {t("about_cta_explore")}
        </Go>
      </Actions>
    </Reading>
  );
}

export function Legal({ kind }: { kind: "privacy" | "terms" }) {
  const { t } = useAccountLocale(),
    sections = Array.from({ length: kind === "privacy" ? 12 : 15 }, (_, i) => "s" + (i + 1));
  return (
    <Reading
      className="rd-legal"
      kicker={t("rd_v4_kicker_legal")}
      title={t(`${kind}_title`)}
      intro={
        <>
          <p className="rd-effective">{t("legal_effective")}</p>
          <p>{t(`${kind}_intro`)}</p>
        </>
      }
      toc={sections.map((id) => ({ id, label: t(`${kind}_${id}_title`) }))}
    >
      {sections.map((id, i) => (
        <section key={id} id={id} className="rd-legal-section">
          <h2>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {t(`${kind}_${id}_title`)}
          </h2>
          <LegalBody text={t(`${kind}_${id}_body`)} />
        </section>
      ))}
      <p className="rd-legal-contact">{t(`${kind}_contact`)}</p>
    </Reading>
  );
}

const ELEMENT_STAT: Record<GuideElement, string> = {
  earth: "strength",
  fire: "intelligence",
  water: "chance",
  air: "agility",
};

export function ClassGuide({ classId, go }: { classId: string; go: Go }) {
  const { t, i18n } = useAccountLocale(),
    sets = useSetPagesStudy(),
    data = useDataStore(),
    info = CLASS_DATA.find((c) => c.id === classId);
  useEffect(() => {
    sets.start();
  }, []);
  // In the catalogue's language: the store drops spells fetched for another one (the study's is Spanish).
  useEffect(() => {
    if (info) void data.loadSpells(data.lang || "es", classId);
  }, [classId, data.lang]);
  const guide = useMemo(() => (sets.entries.length ? classGuide(sets.entries, classId) : null), [sets.entries, classId]);
  if (!info)
    return (
      <div className="rd-study rd-missing">
        <h1>{t("class_guide_not_found")}</h1>
        <button className="primary" onClick={() => go("workshop")}>
          {t("app_title")}
        </button>
      </div>
    );
  const name = resolveClassName(classId, i18n.language, null),
    own = (["earth", "fire", "water", "air"] as string[]).includes(info.element) ? (info.element as GuideElement) : null,
    order = own ? [own, ...GUIDE_ELEMENTS.filter((e) => e !== own)] : [...GUIDE_ELEMENTS],
    spells = (data.spells.get(classId)?.spells ?? []).filter((s) => !s.is_variant),
    label = (min: number, max: number) =>
      min === max ? t("sets_bracket_single", { level: min }) : t("sets_bracket_range", { min, max });
  const toc = [
    { id: "builds-by-element", label: t("class_guide_nav_elements") },
    ...(guide?.classSets.length ? [{ id: "class-sets", label: t("class_guide_nav_class_sets") }] : []),
    { id: "community-builds", label: t("class_guide_nav_builds") },
    { id: "spells", label: t("class_guide_nav_spells") },
  ];
  return (
    <Reading
      className="rd-class"
      kicker={t("rd_v4_kicker_class")}
      title={
        <span className="rd-class-title" data-element={own ?? undefined}>
          <img src={info.imageUrl} alt="" />
          {name}
          <span className="rd-element">{t("elem_" + (own ?? "neutral"))}</span>
        </span>
      }
      intro={
        <>
          <p>{t("class_guide_intro", { class: name })}</p>
          <Actions>
            <Go to={{ workshopClass: classId }} go={go} primary>
              <Hammer size={17} aria-hidden="true" />
              {t("class_guide_cta", { class: name })}
            </Go>
          </Actions>
        </>
      }
      toc={toc}
    >
      <nav className="rd-class-switch" aria-label={t("rd_v4_other_classes")}>
        {CLASS_DATA.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-current={c.id === classId ? "page" : undefined}
            aria-label={resolveClassName(c.id, i18n.language, null)}
            title={resolveClassName(c.id, i18n.language, null)}
            onClick={() => go({ class: c.id })}
          >
            <img src={c.imageUrl} alt="" />
          </button>
        ))}
      </nav>
      <section id="builds-by-element" className="rd-section">
        <header>
          <h2>{t("class_guide_elements_title", { class: name })}</h2>
        </header>
        <p className="rd-lead">{t("class_guide_elements_note")}</p>
        {!guide ? (
          <p className="rd-muted" role="status">
            {t("loading_data")}
          </p>
        ) : (
          <div className="rd-elements">
            {order.map((el) => (
              <article key={el} data-element={el} className="rd-element-panel">
                <header>
                  <img src={statIconUrl(ELEMENT_STAT[el])} alt="" />
                  <h3>
                    {t("class_guide_element_build", {
                      class: name,
                      stat: t("stat_" + ELEMENT_STAT[el]),
                      element: t("elem_" + el),
                    })}
                  </h3>
                  {el === own && <span className="rd-main">{t("class_guide_element_main")}</span>}
                </header>
                <dl>
                  {guide.byElement[el].map((b) => (
                    <div key={b.min}>
                      <dt>{label(b.min, b.max)}</dt>
                      <dd>
                        {b.sets.map((st) => (
                          <button key={st.id} type="button" onClick={() => go({ set: st.slug })}>
                            {st.icon && <img src={st.icon} alt="" loading="lazy" />}
                            <span>{st.name}</span>
                            <small>{st.level}</small>
                          </button>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
                <button type="button" className="rd-element-cta" onClick={() => go({ workshopClass: classId })}>
                  <Hammer size={15} aria-hidden="true" />
                  {t("class_guide_element_cta", { class: name, element: t("elem_" + el) })}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      {guide && guide.classSets.length > 0 && (
        <section id="class-sets" className="rd-section">
          <header>
            <h2>{t("class_guide_class_sets_title", { class: name })}</h2>
          </header>
          <p className="rd-lead">{t("class_guide_class_sets_note", { class: name })}</p>
          <div className="sp-grid">
            {guide.classSets.map((e) => (
              <SetCard key={e.id} entry={e} onOpen={(slug) => go({ set: slug })} />
            ))}
          </div>
        </section>
      )}
      <section id="community-builds" className="rd-section">
        <header>
          <h2>{t("class_guide_builds_title", { class: name })}</h2>
        </header>
        {guide?.builds.length ? (
          <ul className="rd-builds">
            {guide.builds.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => go({ build: b.id })}>
                  <img src={b.sheet.gender === "female" ? info.imageFUrl : info.imageUrl} alt="" />
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
                      {b.elements.map((el) => (
                        <span key={el} className="rd-element" data-element={el}>
                          {t("elem_" + el)}
                        </span>
                      ))}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rd-muted">
            {t("class_guide_builds_empty", { class: name })}{" "}
            <button type="button" className="rd-link" onClick={() => go({ workshopClass: classId })}>
              {t("class_guide_cta", { class: name })}
            </button>
          </p>
        )}
        <button type="button" className="rd-link" onClick={() => go("explore")}>
          {t("class_guide_builds_more")}
        </button>
      </section>
      <section id="spells" className="rd-section">
        <header>
          <h2>{t("class_guide_spells_title", { class: name })}</h2>
        </header>
        <p className="rd-lead">{t("class_guide_spells_note")}</p>
        {!spells.length ? (
          <p className="rd-muted" role="status">
            {t("loading_data")}
          </p>
        ) : (
          <div className="rd-spells">
            {spells.map((sp) => {
              const top = sp.levels[sp.levels.length - 1],
                damage = top?.effects.filter((e) => e.kind === "damage") ?? [];
              return (
                <article key={sp.id} style={{ "--rd-spell": damage[0] ? ELEM_COLOR[damage[0].element] : "var(--line)" } as React.CSSProperties}>
                  <header>
                    {sp.image_url ? <img src={sp.image_url} alt="" loading="lazy" /> : <Sword size={28} aria-hidden="true" />}
                    <span>
                      <h3>{sp.name}</h3>
                      {top && <small>{t("class_guide_grade_label", { grade: top.grade })}</small>}
                    </span>
                  </header>
                  {sp.description && <p>{sp.description}</p>}
                  {top && (
                    <ul>
                      <li>
                        <img src={statIconUrl("ap")} alt="" />
                        <b>{top.ap}</b> {t("class_guide_ap")}
                      </li>
                      <li>
                        <img src={statIconUrl("range")} alt="" />
                        <b>{fmtRange(top.minRange, top.maxRange)}</b> {t("weapon_range_label")}
                      </li>
                      {damage.map((e, i) => (
                        <li key={i}>
                          <i style={{ background: ELEM_COLOR[e.element] }} aria-hidden="true" />
                          <b>{fmtRange(e.min, e.max)}</b> {t("class_guide_damage_label")} {t("elem_" + e.element)}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
      <Actions>
        <Go to={{ workshopClass: classId }} go={go} primary>
          <Hammer size={17} aria-hidden="true" />
          {t("class_guide_cta", { class: name })}
          <ArrowRight size={16} aria-hidden="true" />
        </Go>
      </Actions>
    </Reading>
  );
}
