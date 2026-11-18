import {
  BarChart2 as PaletteCompare,
  BookOpen as PaletteGuide,
  Compass as PaletteExplore,
  FolderOpen as PaletteMine,
  Info as PaletteAbout,
  Keyboard as PaletteKeys,
  Layers as PaletteSets,
  Library as PaletteSetPages,
  Redo2,
  RotateCcw as PaletteReset,
  Save as PaletteSave,
  Send as PalettePublish,
  Settings as PaletteSettings,
  ShieldCheck as PaletteAdmin,
  SunMoon as PaletteTheme,
  Undo2 as PaletteUndo,
  Volume2 as PaletteSound,
  Wand2 as PaletteForge,
  Wrench as PaletteTool,
} from "lucide-react";
import { Palette, openPalette, type PaletteCommand } from "./Palette";
import { Search as PaletteSearch } from "lucide-react";
import { SurfaceDialogs } from "./SurfaceDialogs";
import {
  AccountButton,
  NotificationBell,
  SiteFooter,
  UpdateBanner,
  type ShellNavigate,
} from "./Shell";
import { toggleSound } from "@/lib/sound.ts";
import { useAuthStore } from "@/store/authStore.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Columns2,
  Expand,
  Hammer,
  Moon,
  Sun,
  RotateCcw,
  Save,
  Shield,
  SlidersHorizontal,
  Swords,
  Undo2,
  Users,
  X,
  Plus,
  Cat,
  BookOpen,
  Compass,
  FolderOpen,
  Menu,
} from "lucide-react";
import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import es from "../../../public/locales/es/translation.json";
import { CharacterStage } from "../../../src/components/CharacterStage";
import { useBuildStore } from "../../../src/store/buildStore";
import { useCombatStats } from "../../../src/store/useCombatStats";
import {
  useCombatView,
  useHasPassives,
} from "../../../src/store/useCombatView";
import { useHistoryStore } from "../../../src/store/historyStore";
import { useHistory } from "../../../src/store/useHistory";
import { Forge } from "./Forge";
import "./forge-study.css";
import { MemoryRouter } from "react-router";
import { CLASS_DATA } from "../../../src/features/class-picker/classData";
import {
  useClassName,
  resolveClassName,
} from "../../../src/features/class-picker/useClassName";
import {
  prepareModel,
  saveModel,
  previewItems,
  previousStats,
  visibleSlots,
  equipment,
  names,
  seedItems,
  equippedSetName,
} from "./model";
import type { StatBlock } from "../../../src/engine/types";

import { STAT_LABEL_KEYS, useStatLabel, type StatLabelKey } from "./stat-labels";
import { STAT_META } from "../../../src/features/equipment/statDisplay";
import "./style.css";
import "./forge.css";
import "./surfaces.css";
import "./product.css";
import {
  WorkspaceTools,
  toolNames,
  type WorkspaceTool,
} from "./WorkspaceTools";
import type { SlotId } from "../../../src/store/buildStore";
const ready = i18n
  .use(initReactI18next)
  .init({
    lng: "es",
    resources: { es: { translation: es } },
    interpolation: { escapeValue: false },
  });
// Slot labels are translation keys.
const slots = [
  ["slot_hat", 9461],
  ["slot_cape", 958],
  ["slot_weapon", 8098],
  ["slot_shield", 18670],
  ["slot_amulet", 9464],
  ["ws_v4_ring_1", 8877],
  ["ws_v4_ring_2", 8991],
  ["slot_belt", 9143],
  ["slot_boots", 8861],
] as const;
const eggs = [694, 737, 739, 972, 6980, 7043],
  initial: number[] = seedItems;
const groups: [string, string[]][] = [
  [
    "stats_combat",
    [
      "initiative",
      "critDamage",
      "critResistance",
      "pushbackDamage",
      "pushbackResist",
      "heals",
    ],
  ],
  [
    "ws_v4_group_control",
    ["lock", "dodge", "apReduction", "mpReduction", "apParry", "mpParry"],
  ],
  [
    "ws_v4_group_bonuses",
    ["vitality", "wisdom", "damage", "prospecting", "summons", "pods"],
  ],
];
const sheetGroups: [string, StatLabelKey[]][] = [
  [
    "character",
    [
      "maxHp",
      "ap",
      "mp",
      "range",
      "vitality",
      "wisdom",
      "strength",
      "intelligence",
      "chance",
      "agility",
      "power",
      "initiative",
      "prospecting",
      "summons",
      "pods",
      "pointsBudget",
      "pointsSpent",
    ],
  ],
  [
    "section_damage",
    [
      "damage",
      "neutralDamage",
      "earthDamage",
      "fireDamage",
      "waterDamage",
      "airDamage",
      "critChance",
      "critDamage",
      "meleeDamagePercent",
      "rangedDamagePercent",
      "spellDamagePercent",
      "weaponDamagePercent",
      "finalDamagePercent",
      "pushbackDamage",
      "trapDamage",
      "trapPower",
      "reflectedDamage",
      "neutralSteal",
      "earthSteal",
      "fireSteal",
      "waterSteal",
      "airSteal",
      "bestElemSteal",
      "bestElemDamage",
    ],
  ],
  [
    "section_resistances",
    [
      "neutralResFixed",
      "earthResFixed",
      "fireResFixed",
      "waterResFixed",
      "airResFixed",
      "neutralResPercent",
      "earthResPercent",
      "fireResPercent",
      "waterResPercent",
      "airResPercent",
      "neutralResPercentRaw",
      "earthResPercentRaw",
      "fireResPercentRaw",
      "waterResPercentRaw",
      "airResPercentRaw",
      "critResistance",
      "pushbackResist",
      "meleeResistPercent",
      "rangedResistPercent",
      "targetVulnerabilityPercent",
    ],
  ],
  [
    "ws_v4_group_control_limits",
    [
      "apReduction",
      "mpReduction",
      "apParry",
      "mpParry",
      "lock",
      "dodge",
      "mpSteal",
      "heals",
      "apRaw",
      "mpRaw",
      "rangeRaw",
      "unknownStats",
    ],
  ],
];
const icons: Record<string, string> = {
  maxHp: "vitality.png",
  ap: "ap.webp",
  mp: "mp.webp",
  range: "range.webp",
  power: "power.webp",
  critChance: "crit.webp",
  strength: "strength.png",
  intelligence: "intelligence.png",
  chance: "chance.png",
  agility: "agility.png",
  neutral: "neutral.webp",
};
const art = (id: number) =>
  equipment.get(id)?.image_url || "/design-assets/forge-mark.svg";
const fmt = (s: StatBlock, key: string) =>
  typeof s[key as keyof StatBlock] === "number"
    ? Number(s[key as keyof StatBlock]).toLocaleString(
        // "es" alone drops the thousands dot on four-digit values; es-CO keeps the sheet's figures.
        i18n.language === "es" ? "es-CO" : i18n.language,
      )
    : Object.keys(s.unknownStats).length
      ? Object.entries(s.unknownStats)
          .map(([name, value]) => name + ": " + value)
          .join(" · ")
      : i18n.t("share_v4_none");
function App() {
  const { t, i18n } = useTranslation(),
    statLabel = useStatLabel();
  const [tool, setTool] = useState<WorkspaceTool | null>(null),
    [toolSlot, setToolSlot] = useState<SlotId>("hat");
  function openTool(next: WorkspaceTool, slot: SlotId = "hat") {
    setToolSlot(slot);
    setTool(next);
  }
  useHistory();
  const build = useBuildStore(),
    historyState = useHistoryStore();
  const items = visibleSlots.map((slot) => build.equipped[slot] || 0),
    history = historyState.past;
  const breed =
      CLASS_DATA.find((c) => c.id === build.selectedClass)?.breed || 8,
    gender = build.gender;
  const setBreed = (value: number) => {
    const found = CLASS_DATA.find((c) => c.breed === value);
    if (found) build.setClass(found.id);
  };
  const setGender = build.setGender;
  const [surface, setSurface] = useState<
      "settings" | "publish" | "signin" | "signout" | "navigation" | null
    >(null),
    isAdmin = useAuthStore((s) => s.profile?.role === "admin");
  const [dark, setDark] = useState(true),
    [tab, setTab] = useState("Equipo"),
    [full, setFull] = useState(false),
    [mobile, setMobile] = useState(innerWidth < 1080),
    [failed, setFailed] = useState(false),
    [selected, setSelected] = useState<number | null>(null),
    [overlay, setOverlay] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [saved, setSaved] = useState(false),
    [search, setSearch] = useState(""),
    [forge, setForge] = useState(false);
  const combatStats = useCombatStats(),
    combatView = useCombatView(),
    hasPassives = useHasPassives(),
    inCombat = combatView && hasPassives && combatStats != null;
  const dialog = useRef<HTMLDialogElement>(null),
    stats = inCombat ? combatStats : build.stats!,
    baseline = useMemo(previousStats, [history]),
    preview = useMemo(
      () =>
        selected === null
          ? stats
          : previewItems(
              items.map((v, i) =>
                i === selected ? (v === 0 ? initial[i] : 0) : v,
              ),
            ),
      [selected, items, breed, stats],
    ),
    cls = useClassName(build.selectedClass);
  useEffect(() => {
    const f = () => setMobile(innerWidth < 1080);
    addEventListener("resize", f);
    return () => removeEventListener("resize", f);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "tinta" : "mineral";
  }, [dark]);
  useEffect(() => {
    if (selected !== null || overlay) {
      const active = document.activeElement as HTMLElement;
      dialog.current?.showModal();
      return () => active?.focus();
    }
    dialog.current?.close();
  }, [selected, overlay]);
  // As BuilderPage: ?forge=1 (the Forger guide's button) opens it once, then the param goes.
  useEffect(() => {
    const url = new URL(location.href);
    if (!url.searchParams.has("forge")) return;
    if (url.searchParams.get("forge") === "1") setForge(true);
    url.searchParams.delete("forge");
    window.history.replaceState(window.history.state, "", url);
  }, []);
  useEffect(() => {
    if (equippedSetName) setNotice(i18n.t("set_page_equipped_toast", { name: equippedSetName }));
  }, []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(
    () => setSaved(false),
    [
      build.equipped,
      build.allocated,
      build.runes,
      build.passives,
      build.selectedClass,
      build.gender,
      build.level,
    ],
  );
  function change(next: number[]) {
    visibleSlots.forEach((slot, i) => {
      if (next[i] !== items[i]) {
        if (next[i]) build.equipItem(slot, next[i]);
        else build.unequipItem(slot);
      }
    });
    setSaved(false);
  }
  function undo() {
    historyState.undo();
    setSaved(false);
  }
  function redo() {
    historyState.redo();
    setSaved(false);
  }
  /** Production's reset: an empty build and a clean history. */
  function resetBuild() {
    build.reset();
    historyState.clear();
    setSaved(false);
  }
  const page = (view: string) => () =>
    location.assign("/surfaces.html?view=" + view);
  const tools = t("ws_v4_cmd_tools"),
    buildGroup = t("ws_v4_cmd_build"),
    goTo = t("shell_v4_nav_title"),
    prefs = t("ws_v4_cmd_preferences");
  const commands: PaletteCommand[] = [
    { key: "forge", group: tools, label: t("optimizer_title"), Icon: PaletteForge, onRun: () => setForge(true) },
    { key: "sets", group: tools, label: t("ws_v4_cmd_sets"), Icon: PaletteSets, onRun: () => openTool("sets") },
    { key: "compare", group: tools, label: t("ws_v4_cmd_compare_builds"), Icon: PaletteCompare, onRun: () => openTool("compare") },
    ...(Object.entries(toolNames) as [WorkspaceTool, string][])
      .filter(([key]) => key !== "sets" && key !== "compare")
      .map(([key, label]) => ({ key, group: tools, label: t(label), Icon: PaletteTool, onRun: () => openTool(key) })),
    { key: "undo", group: buildGroup, label: t("undo"), Icon: PaletteUndo, hint: "Ctrl Z", disabled: !historyState.canUndo, onRun: undo },
    { key: "redo", group: buildGroup, label: t("redo"), Icon: Redo2, hint: "Ctrl Y", disabled: !historyState.canRedo, onRun: redo },
    { key: "save", group: buildGroup, label: t("ws_v4_save_draft"), Icon: PaletteSave, onRun: save },
    { key: "signin", group: buildGroup, label: t("auth_signin_btn"), Icon: PalettePublish, onRun: () => setSurface("signin") },
    { key: "publish", group: buildGroup, label: t("publish_title"), Icon: PalettePublish, disabled: !build.selectedClass, onRun: () => setSurface("publish") },
    { key: "reset", group: buildGroup, label: t("ws_v4_cmd_new_build"), Icon: PaletteReset, onRun: resetBuild },
    { key: "my-builds", group: goTo, label: t("ws_v4_my_builds"), Icon: PaletteMine, onRun: page("my-builds") },
    { key: "explore", group: goTo, label: t("explore_title"), Icon: PaletteExplore, onRun: page("explore") },
    { key: "sets-page", group: goTo, label: t("ws_v4_cmd_set_pages"), Icon: PaletteSetPages, onRun: page("sets") },
    { key: "how-to-use", group: goTo, label: t("ws_v4_workshop_guide"), Icon: PaletteGuide, onRun: page("how-to-use") },
    { key: "shortcuts", group: goTo, label: t("ws_v4_cmd_shortcuts"), Icon: PaletteKeys, onRun: page("shortcuts") },
    { key: "about", group: goTo, label: t("about_title"), Icon: PaletteAbout, onRun: page("about") },
    ...(isAdmin ? [{ key: "admin", group: goTo, label: t("shell_v4_nav_admin"), Icon: PaletteAdmin, onRun: page("admin") }] : []),
    { key: "settings", group: prefs, label: t("ws_v4_workshop_preferences"), Icon: PaletteSettings, onRun: () => setSurface("settings") },
    { key: "theme", group: prefs, label: dark ? t("ws_v4_cmd_theme_mineral") : t("ws_v4_cmd_theme_ink"), Icon: PaletteTheme, onRun: () => setDark(!dark) },
    { key: "sound", group: prefs, label: t("ws_v4_cmd_sound"), Icon: PaletteSound, onRun: toggleSound },
  ];
  function save() {
    try {
      saveModel();
      setSaved(true);
      setNotice(t("ws_v4_saved_notice"));
    } catch {
      setNotice(t("ws_v4_save_error"));
    }
  }
  function close() {
    setSelected(null);
    setOverlay(null);
  }
  function navigate(view: string) {
    setTab(view);
    setFull(false);
  }
  function itemSlot(index: number) {
    const label = t(slots[index][0]),
      id = items[index] || seedItems[index];
    return (
      <button
        className={"slot " + (items[index] === 0 ? "empty" : "")}
        key={slots[index][0]}
        onClick={() => setSelected(index)}
        aria-label={label + ": " + names.get(id)}
        title={names.get(id)}
      >
        <span className="slot-art">
          {items[index] ? <img src={art(id)} alt="" /> : <Plus size={22} />}
        </span>
        <span className="slot-copy">
          <small>{label}</small>
          <span>{items[index] ? names.get(id) : t("share_v4_empty_slot")}</span>
        </span>
        <span className="slot-corner" />
      </button>
    );
  }
  function summary() {
    return (
      <div className="summary">
        {[
          ["maxHp", "stat_v4_maxHp"],
          ["ap", "stat_ap"],
          ["mp", "stat_mp"],
          ["range", "stat_range"],
          ["critChance", "ws_v4_crits"],
          ["power", "stat_power"],
        ].map(([key, label]) => (
          <div className={"metric " + key} key={key}>
            <span className="metric-label">
              <img src={"/data/stats/" + icons[key]} alt="" />
              {t(label)}
            </span>
            <strong>
              {fmt(stats, key)}
              {key === "critChance" && <em>%</em>}
            </strong>
          </div>
        ))}
      </div>
    );
  }
  // Other pages live in the surfaces study; the workshop is this page.
  const shellNavigate: ShellNavigate = (target) => {
    if (target === "workshop") return navigate("Equipo");
    location.assign(
      "/surfaces.html?" +
        (typeof target === "string"
          ? "view=" + target
          : "build" in target
            ? (target.build.startsWith("explore-") ? "view=build&example=" : "view=build&build=") + target.build
            : "view=profile&player=" + encodeURIComponent(target.profile)),
    );
  };
  return (
    <div className="app-shell">
      <Palette commands={commands} />
      {surface && (
        <SurfaceDialogs
          key={surface}
          id={surface}
          onClose={() => setSurface(null)}
          onOpen={(next) =>
            next === "settings" ||
            next === "publish" ||
            next === "signin" ||
            next === "signout"
              ? setSurface(next)
              : location.assign("/surfaces.html?dialog=" + next)
          }
          onNavigate={(view) => location.assign("/surfaces.html?view=" + view)}
          dark={dark}
          onTheme={setDark}
        />
      )}
      <header className="global-header">
        <a className="brand" href="#" onClick={() => navigate("Equipo")}>
          <img src="/design-assets/forge-mark.svg" alt="" />
          <span>
            DOFUS <span>FORGE</span>
          </span>
        </a>
        <div className="global-links">
          <button className="current" onClick={() => navigate("Equipo")}>
            <Hammer size={15} />
            {t("shell_v4_workshop")}
          </button>
          <button onClick={() => shellNavigate("explore")}>
            <Compass size={15} />
            {t("explore_open")}
          </button>
          <button onClick={() => shellNavigate("my-builds")}>
            <FolderOpen size={15} />
            {t("my_builds")}
          </button>
          <button onClick={() => setOverlay("saved")}>
            <Columns2 size={15} />
            {t("ws_v4_drafts")}
          </button>
          <button onClick={() => setOverlay("guide")}>
            <BookOpen size={15} />
            {t("ws_v4_usage_guide")}
          </button>
        </div>
        <div className="global-end">
          <a className="study-link" href="/surfaces.html">
            {t("ws_v4_all_views")}
          </a>
          <span className="version">
            0.4.0 <span>{t("ws_v4_study")}</span>
          </span>
          <button
            className="icon-button"
            aria-label={t("ws_v4_all_actions_label")}
            title={t("ws_v4_all_actions_title")}
            onClick={openPalette}
          >
            <PaletteSearch size={18} />
          </button>
          <button
            className="icon-button wide-only"
            aria-label={t("ws_v4_workshop_preferences")}
            onClick={() => setSurface("settings")}
          >
            <PaletteSettings size={18} />
          </button>
          <button
            className="icon-button"
            aria-label={dark ? t("ws_v4_theme_mineral") : t("ws_v4_theme_ink")}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NotificationBell onNavigate={shellNavigate} />
          <AccountButton
            onSignIn={() => setSurface("signin")}
            onSignOut={() => setSurface("signout")}
            onNavigate={shellNavigate}
          />
          <button
            className="icon-button workshop-menu"
            aria-label={t("shell_v4_nav_title")}
            onClick={() => setSurface("navigation")}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>
      <div className="build-bar">
        <div>
          <span className="build-breadcrumb">
            {t("ws_v4_my_workshop")} <span>/</span> {t("ws_v4_local_draft")}
          </span>
          <div className="build-name">
            <h1>
              {build.buildName || cls} <span>·</span> {t("elem_earth")}
            </h1>
            <button
              className="level-tag"
              aria-label={t("ws_v4_edit_identity")}
              onClick={() => openTool("identity")}
            >
              {build.level}
            </button>
            <span className="save-state">
              <i />
              {saved ? t("ws_v4_saved") : t("ws_v4_on_device")}
            </span>
          </div>
        </div>
        <div className="build-actions">
          <button
            className="icon-button"
            aria-label={t("undo")}
            disabled={!historyState.canUndo}
            onClick={undo}
          >
            <Undo2 size={18} />
          </button>
          <button
            className="icon-button"
            aria-label={t("redo")}
            disabled={!historyState.canRedo}
            onClick={redo}
          >
            <Redo2 size={18} />
          </button>
          <button
            className="forge-action"
            aria-label={t("optimizer_title")}
            onClick={() => setForge(true)}
          >
            <Hammer size={16} />
            <span>{t("optimizer_title")}</span>
          </button>
          <button
            className="compare-action"
            onClick={() => setOverlay("compare")}
          >
            <Columns2 size={16} />
            {t("compare")}
          </button>
          <button
            className="compare-action"
            disabled={!build.selectedClass}
            onClick={() => setSurface("publish")}
          >
            <PalettePublish size={16} />
            {build.linkedBuildId ? t("publish_update_open") : t("publish_open")}
          </button>
          <button
            className="primary"
            aria-label={t("ws_v4_save_draft")}
            onClick={save}
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            <span>{saved ? t("ws_v4_saved") : t("ws_v4_save_draft")}</span>
          </button>
        </div>
      </div>
      <nav className="workspace-tools" aria-label={t("ws_v4_build_tools")}>
        {(
          [
            "characteristics",
            "passives",
            "spells",
            "pvp",
            "sets",
            "bonuses",
            "compare",
            "share",
          ] as WorkspaceTool[]
        ).map((key) => (
          <button key={key} onClick={() => openTool(key)}>
            {t(toolNames[key])}
          </button>
        ))}
      </nav>
      <div className="mobile-summary">{summary()}</div>
      <main className={full ? "full-view" : ""}>
        {!full && (
          <section
            className={
              "equipment-panel " +
              (mobile && tab !== "Equipo" ? "mobile-hidden" : "")
            }
            aria-label={t("ws_v4_gear_and_character")}
          >
            <div className="section-head">
              <div>
                <h2>{t("ws_v4_gear_heading")}</h2>
                <span>{items.filter(Boolean).length} / 17 {t("ws_v4_slots_word")}</span>
              </div>
              <button
                className="icon-button"
                aria-label={t("ws_v4_reset_gear")}
                onClick={() => change(initial)}
              >
                <RotateCcw size={16} />
              </button>
            </div>
            <div className="character-layout">
              <div className="gear-column">
                {[0, 1, 2, 3].map(itemSlot)}
                <button
                  className="companion-slot"
                  onClick={() =>
                    build.equipped.companion
                      ? setSelected(15)
                      : openTool("catalog", "companion")
                  }
                >
                  {build.equipped.companion ? (
                    <img
                      src={art(build.equipped.companion)}
                      alt={names.get(build.equipped.companion)}
                      style={{ width: 44, height: 44, objectFit: "contain" }}
                    />
                  ) : (
                    <Cat size={22} />
                  )}
                  <span>{t("ws_v4_pet_mount")}</span>
                </button>
              </div>
              <div className="character-center">
                <div className="stage-arch" />
                <div className="stage-orbit" />
                <div className="stage-floor" />
                <span className="ember one" />
                <span className="ember two" />
                <div className="class-stamp">
                  {build.selectedClass?.toUpperCase()}
                </div>
                <div className="stage">
                  {failed ? (
                    <div className="stage-error">
                      <img
                        src={"/data/classes/" + build.selectedClass + ".webp"}
                        alt={cls}
                      />
                      <p>{t("ws_v4_viewer_unavailable")}</p>
                      <button
                        onClick={() => {
                          setFailed(false);
                        }}
                      >
                        {t("account_v4_retry")}
                      </button>
                    </div>
                  ) : (
                    <CharacterStage
                      key={breed + "-" + gender}
                      breed={breed}
                      gender={gender}
                      companion={build.equipped.companion}
                      width={mobile ? 152 : 224}
                      height={mobile ? 258 : 320}
                      onError={() => setFailed(true)}
                    />
                  )}
                </div>
                <div className="character-controls">
                  <label>
                    <span className="sr-only">{t("class")}</span>
                    <select
                      value={breed}
                      onChange={(e) => {
                        setBreed(Number(e.target.value));
                        setFailed(false);
                      }}
                    >
                      {CLASS_DATA.map((c) => (
                        <option key={c.id} value={c.breed}>
                          {resolveClassName(c.id, i18n.language, null)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    onClick={() =>
                      setGender(gender === "male" ? "female" : "male")
                    }
                  >
                    {gender === "male" ? t("gender_male") : t("gender_female")}
                    <ChevronDown size={12} />
                  </button>
                </div>
              </div>
              <div className="gear-column">{[4, 5, 6, 7, 8].map(itemSlot)}</div>
            </div>
            <div className="dofus-heading">
              <h3>{t("ws_v4_dofus_trophies")}</h3>
              <span>{items.slice(9, 15).filter(Boolean).length} / 6</span>
            </div>
            <div className="dofus-row">
              {eggs.map((seed, i) => {
                const id = items[i + 9] || seed;
                return (
                  <button
                    key={id}
                    className={items[i + 9] === 0 ? "empty" : ""}
                    title={names.get(id)}
                    aria-label={names.get(id)}
                    onClick={() => setSelected(i + 9)}
                  >
                    <span className="egg-index">0{i + 1}</span>
                    {items[i + 9] ? (
                      <img src={art(id)} alt="" />
                    ) : (
                      <Plus size={24} />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="equipment-footer">
              <button
                onClick={() =>
                  build.equipped.sidekick
                    ? setSelected(16)
                    : openTool("catalog", "sidekick")
                }
              >
                <Users size={15} />
                {build.equipped.sidekick
                  ? names.get(build.equipped.sidekick)
                  : t("ws_v4_sidekick")}
                <Plus size={13} />
              </button>
              <span>
                <span className="small-dot" />
                {t("ws_v4_animation_on")}
              </span>
            </div>
          </section>
        )}
        <section
          className={
            "stats-panel " +
            (mobile && tab === "Equipo" && !full ? "mobile-hidden" : "")
          }
          aria-label={t("ws_v4_stat_sheet")}
        >
          <div className="section-head">
            <div>
              <h2>{full ? t("ws_v4_full_sheet") : t("stats")}</h2>
              <span>{inCombat ? t("combat_view_combat") : t("combat_view_gear")}</span>
            </div>
            <button
              className="icon-button"
              aria-label={full ? t("ws_v4_back_to_workshop") : t("ws_v4_full_sheet")}
              onClick={() => {
                setFull(!full);
                setSearch("");
              }}
            >
              {full ? <X size={17} /> : <Expand size={17} />}
            </button>
          </div>
          {!full && summary()}
          {full ? (
            <>
              <div className="sheet-controls">
                <label>
                  <SlidersHorizontal size={15} />
                  <span className="sr-only">{t("ws_v4_search_stat_label")}</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("ws_v4_search_stat_placeholder")}
                  />
                </label>
                <span>{t("ws_v4_sheet_fields")}</span>
              </div>
              <div className="all-stats">
                {sheetGroups.map(([title, keys]) => {
                  const matches = keys.filter((key) =>
                    statLabel(key)
                      .toLocaleLowerCase()
                      .includes(search.toLocaleLowerCase()),
                  );
                  return (
                    matches.length > 0 && (
                      <section key={title} aria-label={t(title)}>
                        <h3>{t(title)}</h3>
                        <dl>
                          {matches.map((key) => (
                            <div className="stat-entry" key={key}>
                              <dt>{statLabel(key)}</dt>
                              <dd>{fmt(stats, key)}</dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    )
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div
                className="characteristic-strip"
                aria-label={t("characteristics")}
              >
                {(
                  [
                    "vitality",
                    "wisdom",
                    "strength",
                    "intelligence",
                    "chance",
                    "agility",
                  ] as const
                ).map((key) => (
                  <div key={key}>
                    <span>{statLabel(key)}</span>
                    <b>{fmt(stats, key)}</b>
                  </div>
                ))}
              </div>
              <table className="elements">
                <caption className="sr-only">
                  {t("ws_v4_elements_caption")}
                </caption>
                <thead>
                  <tr>
                    <th>{t("ws_v4_col_element")}</th>
                    <th>{t("ws_v4_col_damage")}</th>
                    <th>{t("ws_v4_col_res_fixed")}</th>
                    <th>{t("ws_v4_col_res_percent")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["ws_v4_elem_neutral", "neutral", "neutral"],
                    ["elem_earth", "earth", "strength"],
                    ["elem_fire", "fire", "intelligence"],
                    ["elem_water", "water", "chance"],
                    ["elem_air", "air", "agility"],
                  ].map(([name, key, stat]) => (
                    <tr key={key}>
                      <th className={key}>
                        <img
                          src={
                            "/data/stats/" +
                            (key === "neutral" ? icons.neutral : icons[stat])
                          }
                          alt=""
                        />
                        {t(name)}
                      </th>
                      <td>{fmt(stats, key + "Damage")}</td>
                      <td>{fmt(stats, key + "ResFixed")}</td>
                      <td>
                        <span className="res-value">
                          {fmt(stats, key + "ResPercent")}
                          <small>%</small>
                        </span>
                        <span className="res-track">
                          <i
                            style={{
                              width:
                                Math.min(
                                  100,
                                  Number(
                                    stats[
                                      (key + "ResPercent") as keyof StatBlock
                                    ],
                                  ) * 2,
                                ) + "%",
                            }}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="stat-groups">
                {groups.map(([name, keys]) => (
                  <section key={name}>
                    <h3>{t(name)}</h3>
                    {keys.map((key) => (
                      <div className="stat-row" key={key}>
                        <span>{statLabel(key)}</span>
                        <b>{fmt(stats, key)}</b>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
              <div className="stat-note">
                <Shield size={15} />
                <span>
                  {t("ws_v4_general_damage_note")}{" "}
                  {inCombat
                    ? t("ws_v4_combat_view_note")
                    : t("ws_v4_gear_view_note")}
                </span>
              </div>
              <button className="sheet-link" onClick={() => setFull(true)}>
                <span>
                  {t("ws_v4_see_full_sheet")} <small>{t("ws_v4_full_sheet_hint")}</small>
                </span>
                <ArrowRight size={17} />
              </button>
            </>
          )}
        </section>
      </main>
      <footer className="app-footer">
        <span>
          <span className="small-dot" />
          {t("ws_v4_local_draft")}
        </span>
        <span>{t("ws_v4_footer_data")}</span>
        <span className="app-footer-links">
          <button onClick={() => openTool("changelog")}>{t("changelog_title")}</button>
          <button onClick={() => setOverlay("guide")}>
            {t("ws_v4_help_shortcuts")} <BookOpen size={13} />
          </button>
        </span>
      </footer>
      <SiteFooter onNavigate={shellNavigate} />
      <UpdateBanner />
      <nav className="mobile-nav" aria-label={t("ws_v4_workshop_views")}>
        <button onClick={() => setForge(true)}>
          <Hammer size={20} />
          {t("ws_v4_forge")}
        </button>
        <button
          aria-current={tab === "Equipo" && !full ? "page" : undefined}
          onClick={() => navigate("Equipo")}
        >
          <Swords size={20} />
          {t("equipment")}
        </button>
        <button
          aria-current={tab === "Estadísticas" || full ? "page" : undefined}
          onClick={() => navigate("Estadísticas")}
        >
          <SlidersHorizontal size={20} />
          {t("stats")}
        </button>
        <button onClick={() => setOverlay("compare")}>
          <Columns2 size={20} />
          {t("compare")}
        </button>
        <button onClick={save} aria-label={t("ws_v4_save_draft")}>
          <Save size={20} />
          {t("save")}
        </button>
      </nav>
      <WorkspaceTools
        tool={tool}
        slot={toolSlot}
        onClose={() => setTool(null)}
      />
      {forge && <Forge onClose={() => setForge(false)} />}{" "}
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
          <button
            className="icon-button"
            aria-label={t("ws_v4_close_notice")}
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {(selected !== null || overlay) && (
        <dialog
          ref={dialog}
          onCancel={close}
          onClose={close}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          aria-label={
            selected !== null
              ? t("ws_v4_selected_item")
              : overlay === "compare"
                ? t("ws_v4_comparison")
                : overlay === "saved"
                  ? t("ws_v4_my_builds")
                  : t("ws_v4_workshop_guide")
          }
        >
          <div className="dialog-content">
            <button
              className="close icon-button"
              onClick={close}
              aria-label={t("modal_close")}
            >
              <X size={20} />
            </button>
            {selected !== null ? (
              <>
                <div className="item-heading">
                  <img src={art(items[selected] || initial[selected])} alt="" />
                  <div>
                    <span className="eyebrow">
                      {selected < 9
                        ? t(slots[selected][0])
                        : selected === 15
                          ? t("ws_v4_pet_mount")
                          : selected === 16
                            ? t("ws_v4_sidekick")
                            : t("ws_v4_dofus_trophy")}
                    </span>
                    <h2>{names.get(items[selected] || initial[selected])}</h2>
                    <p>
                      {t("level")}{" "}
                      {
                        equipment.get(items[selected] || initial[selected])
                          ?.level
                      }{" "}
                      · {items[selected] ? t("ws_v4_equipped") : t("ws_v4_unequipped")}
                    </p>
                  </div>
                </div>
                <h3>
                  {items[selected]
                    ? t("ws_v4_impact_remove")
                    : t("ws_v4_impact_equip")}
                </h3>
                <div className="delta-table">
                  {[
                    "maxHp",
                    "ap",
                    "mp",
                    "strength",
                    "power",
                    "critChance",
                    "earthResPercent",
                  ].map((key) => {
                    const diff =
                      Number(preview[key as keyof StatBlock]) -
                      Number(stats[key as keyof StatBlock]);
                    return (
                      <div key={key}>
                        <span>{statLabel(key)}</span>
                        <b>
                          {fmt(stats, key)}
                          <ArrowRight size={12} />
                          {fmt(preview, key)}
                        </b>
                        <em
                          className={
                            diff > 0 ? "positive" : diff < 0 ? "negative" : ""
                          }
                        >
                          {diff > 0 ? "+" : ""}
                          {diff}
                        </em>
                      </div>
                    );
                  })}
                </div>
                <p className="dialog-note">{t("ws_v4_set_bonus_note")}</p>
                {equipment.get(items[selected] || initial[selected])?.conditions
                  ?.length ? (
                  <div className="item-conditions">
                    <h3>{t("ws_v4_item_conditions")}</h3>
                    <ul>
                      {equipment
                        .get(items[selected] || initial[selected])!
                        .conditions!.map((c, i) => (
                          <li key={i}>
                            {STAT_META[c.stat]
                              ? t(STAT_META[c.stat].tKey)
                              : c.stat}{" "}
                            {c.operator} {c.value}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
                <div className="item-tools">
                  <button
                    onClick={() => {
                      openTool("catalog", visibleSlots[selected]);
                      close();
                    }}
                  >
                    {t("ws_v4_change_item")}
                  </button>
                  {items[selected] > 0 && (
                    <button
                      onClick={() => {
                        openTool("runes", visibleSlots[selected]);
                        close();
                      }}
                    >
                      {t("ws_v4_edit_runes")}
                    </button>
                  )}
                </div>
                <div className="dialog-actions">
                  <button onClick={close}>{t("ws_v4_keep_gear")}</button>
                  <button
                    className="primary"
                    onClick={() => {
                      change(
                        items.map((v, i) =>
                          i === selected
                            ? v === 0
                              ? items[selected] || initial[selected]
                              : 0
                            : v,
                        ),
                      );
                      close();
                      setNotice(t("ws_v4_gear_updated"));
                    }}
                  >
                    {items[selected]
                      ? t("ws_v4_remove_and_compare")
                      : t("ws_v4_re_equip")}
                  </button>
                </div>
              </>
            ) : overlay === "compare" ? (
              <>
                <span className="eyebrow">{t("ws_v4_compare_kicker")}</span>
                <h2>{t("ws_v4_compare_title")}</h2>
                <p>{t("ws_v4_compare_intro")}</p>
                <div className="delta-table">
                  {STAT_LABEL_KEYS
                    .filter(
                      (key) =>
                        typeof stats[key as keyof StatBlock] === "number" &&
                        stats[key as keyof StatBlock] !==
                          baseline[key as keyof StatBlock],
                    )
                    .map((key) => (
                      <div key={key}>
                        <span>{statLabel(key)}</span>
                        <b>
                          {fmt(baseline, key)}
                          <ArrowRight size={12} />
                          {fmt(stats, key)}
                        </b>
                      </div>
                    ))}
                </div>
                {JSON.stringify(stats) === JSON.stringify(baseline) && (
                  <div className="empty-state">
                    <Columns2 size={32} />
                    <h3>{t("ws_v4_no_diff")}</h3>
                    <p>{t("ws_v4_no_diff_hint")}</p>
                  </div>
                )}
                <button onClick={close}>{t("ws_v4_back_to_gear")}</button>
              </>
            ) : overlay === "saved" ? (
              <>
                <span className="eyebrow">{t("ws_v4_my_builds_kicker")}</span>
                <h2>{t("ws_v4_your_local_draft")}</h2>
                <div className="saved-build">
                  <img
                    src={"/data/classes/" + build.selectedClass + ".webp"}
                    alt=""
                  />
                  <div>
                    <h3>{cls} · {t("elem_earth")}</h3>
                    <p>
                      {t("level")} {build.level} · {items.filter(Boolean).length}{" "}
                      {t("ws_v4_items", { count: items.filter(Boolean).length })}
                    </p>
                  </div>
                  <span>{saved ? t("ws_v4_saved") : t("ws_v4_editing")}</span>
                </div>
                <p>{t("ws_v4_saved_intro")}</p>
                <button
                  className="primary"
                  onClick={() => {
                    save();
                    close();
                  }}
                >
                  <Save size={16} />
                  {t("ws_v4_save_draft")}
                </button>
              </>
            ) : (
              <>
                <span className="eyebrow">{t("ws_v4_guide_kicker")}</span>
                <h2>{t("ws_v4_guide_title")}</h2>
                <ol>
                  {[1, 2, 3, 4].map((step) => (
                    <li key={step}>
                      <b>{t(`ws_v4_guide_${step}_title`)}</b>{" "}
                      {t(`ws_v4_guide_${step}_body`)}
                    </li>
                  ))}
                </ol>
                <p>{t("ws_v4_guide_tools")}</p>
                <button onClick={close}>{t("ws_v4_back_to_workshop")}</button>
              </>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
}
void ready
  .then(prepareModel)
  .then(() =>
    createRoot(document.getElementById("root")!).render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    ),
  )
  .catch((error) => {
    document.getElementById("root")!.textContent =
      i18n.t("ws_v4_open_error") + String(error);
  });
