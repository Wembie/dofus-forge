import { CommandPalette } from "../../../src/components/CommandPalette";
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
} from "lucide-react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "../../../public/locales/es/translation.json";
import { CharacterStage } from "../../../src/components/CharacterStage";
import { useBuildStore } from "../../../src/store/buildStore";
import { useHistoryStore } from "../../../src/store/historyStore";
import { useHistory } from "../../../src/store/useHistory";
import { OptimizerModal } from "../../../src/features/optimizer/OptimizerModal";
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
} from "./model";
import type { StatBlock } from "../../../src/engine/types";

import labels from "./stat-labels.json";
import { STAT_META } from "../../../src/features/equipment/statDisplay";
import "./style.css";
import "./forge.css";
import "./surfaces.css";
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
const slots = [
  ["Sombrero", 9461],
  ["Capa", 958],
  ["Arma", 8098],
  ["Escudo", 18670],
  ["Amuleto", 9464],
  ["Anillo I", 8877],
  ["Anillo II", 8991],
  ["Cinturón", 9143],
  ["Botas", 8861],
] as const;
const eggs = [694, 737, 739, 972, 6980, 7043],
  initial: number[] = seedItems;
const groups: [string, string[]][] = [
  [
    "Combate",
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
    "Control",
    ["lock", "dodge", "apReduction", "mpReduction", "apParry", "mpParry"],
  ],
  [
    "Bonificaciones",
    ["vitality", "wisdom", "damage", "prospecting", "summons", "pods"],
  ],
];
const sheetGroups: [string, (keyof typeof labels)[]][] = [
  [
    "Personaje",
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
    "Daños",
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
    "Resistencias",
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
    "Control y límites",
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
    ? Number(s[key as keyof StatBlock]).toLocaleString("es-CO")
    : Object.keys(s.unknownStats).length
      ? Object.entries(s.unknownStats)
          .map(([name, value]) => name + ": " + value)
          .join(" ? ")
      : "Ninguno";
function App() {
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
  const dialog = useRef<HTMLDialogElement>(null),
    stats = build.stats!,
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
  function save() {
    try {
      saveModel();
      setSaved(true);
      setNotice("Build guardada en este dispositivo.");
    } catch {
      setNotice("No se pudo guardar. Tu build sigue abierta.");
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
    const label = slots[index][0],
      id = items[index] || seedItems[index];
    return (
      <button
        className={"slot " + (items[index] === 0 ? "empty" : "")}
        key={label}
        onClick={() => setSelected(index)}
        aria-label={label + ": " + names.get(id)}
        title={names.get(id)}
      >
        <span className="slot-art">
          {items[index] ? <img src={art(id)} alt="" /> : <Plus size={22} />}
        </span>
        <span className="slot-copy">
          <small>{label}</small>
          <span>{items[index] ? names.get(id) : "Espacio vacío"}</span>
        </span>
        <span className="slot-corner" />
      </button>
    );
  }
  function summary() {
    return (
      <div className="summary">
        {[
          ["maxHp", "Puntos de vida"],
          ["ap", "PA"],
          ["mp", "PM"],
          ["range", "Alcance"],
          ["critChance", "Críticos"],
          ["power", "Potencia"],
        ].map(([key, label]) => (
          <div className={"metric " + key} key={key}>
            <span className="metric-label">
              <img src={"/data/stats/" + icons[key]} alt="" />
              {label}
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
  return (
    <div className="app-shell">
      <CommandPalette
        commands={[
          ...Object.entries(toolNames).map(([key, label]) => ({
            key,
            label,
            Icon: Hammer,
            onRun: () => openTool(key as WorkspaceTool),
          })),
          {
            key: "forge",
            label: "La Forjadora",
            Icon: Hammer,
            onRun: () => setForge(true),
          },
        ]}
      />
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
            Taller
          </button>
          <button onClick={() => setOverlay("saved")}>
            <Columns2 size={15} />
            Mis builds
          </button>
          <button onClick={() => setOverlay("guide")}>
            <BookOpen size={15} />
            Guía de uso
          </button>
        </div>
        <div className="global-end">
          <a className="study-link" href="/surfaces.html">
            Ver todas las vistas
          </a>
          <span className="version">
            0.4.0 <span>ESTUDIO</span>
          </span>
          <button
            className="icon-button"
            aria-label={dark ? "Tema mineral" : "Tema tinta"}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="avatar"
            aria-label="Ver borradores locales"
            onClick={() => setOverlay("saved")}
          >
            DF
          </button>
        </div>
      </header>
      <div className="build-bar">
        <div>
          <span className="build-breadcrumb">
            Mi taller <span>/</span> Borrador local
          </span>
          <div className="build-name">
            <h1>
              {build.buildName || cls} <span>·</span> Tierra
            </h1>
            <button
              className="level-tag"
              aria-label="Editar nombre y nivel"
              onClick={() => openTool("identity")}
            >
              {build.level}
            </button>
            <span className="save-state">
              <i />
              {saved ? "Guardado" : "En este dispositivo"}
            </span>
          </div>
        </div>
        <div className="build-actions">
          <button
            className="icon-button"
            aria-label="Deshacer"
            disabled={!historyState.canUndo}
            onClick={undo}
          >
            <Undo2 size={18} />
          </button>
          <button
            className="forge-action"
            aria-label="La Forjadora"
            onClick={() => setForge(true)}
          >
            <Hammer size={16} />
            <span>La Forjadora</span>
          </button>
          <button
            className="compare-action"
            onClick={() => setOverlay("compare")}
          >
            <Columns2 size={16} />
            Comparar
          </button>
          <button
            className="primary"
            aria-label="Guardar borrador"
            onClick={save}
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            <span>{saved ? "Guardado" : "Guardar borrador"}</span>
          </button>
        </div>
      </div>
      <nav className="workspace-tools" aria-label="Herramientas del build">
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
            {toolNames[key]}
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
            aria-label="Equipamiento y personaje"
          >
            <div className="section-head">
              <div>
                <h2>Equipamiento</h2>
                <span>{items.filter(Boolean).length} / 17 espacios</span>
              </div>
              <button
                className="icon-button"
                aria-label="Restablecer equipo"
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
                  <span>Mascota / montura</span>
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
                      <p>Visor no disponible</p>
                      <button
                        onClick={() => {
                          setFailed(false);
                        }}
                      >
                        Reintentar
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
                    <span className="sr-only">Clase</span>
                    <select
                      value={breed}
                      onChange={(e) => {
                        setBreed(Number(e.target.value));
                        setFailed(false);
                      }}
                    >
                      {CLASS_DATA.map((c) => (
                        <option key={c.id} value={c.breed}>
                          {resolveClassName(c.id, "es", null)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    onClick={() =>
                      setGender(gender === "male" ? "female" : "male")
                    }
                  >
                    {gender === "male" ? "Masculino" : "Femenino"}
                    <ChevronDown size={12} />
                  </button>
                </div>
              </div>
              <div className="gear-column">{[4, 5, 6, 7, 8].map(itemSlot)}</div>
            </div>
            <div className="dofus-heading">
              <h3>Dofus & trofeos</h3>
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
                  : "Multiman"}
                <Plus size={13} />
              </button>
              <span>
                <span className="small-dot" />
                Giro y animación activos
              </span>
            </div>
          </section>
        )}
        <section
          className={
            "stats-panel " +
            (mobile && tab === "Equipo" && !full ? "mobile-hidden" : "")
          }
          aria-label="Ficha de estadísticas"
        >
          <div className="section-head">
            <div>
              <h2>{full ? "Ficha completa" : "Estadísticas"}</h2>
              <span>Equipo</span>
            </div>
            <button
              className="icon-button"
              aria-label={full ? "Volver al taller" : "Ficha completa"}
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
                  <span className="sr-only">Buscar una estadística</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar una estadística…"
                  />
                </label>
                <span>73 campos · valores en cero incluidos</span>
              </div>
              <div className="all-stats">
                {sheetGroups.map(([title, keys]) => {
                  const matches = keys.filter((key) =>
                    labels[key]
                      .toLocaleLowerCase()
                      .includes(search.toLocaleLowerCase()),
                  );
                  return (
                    matches.length > 0 && (
                      <section key={title} aria-label={title}>
                        <h3>{title}</h3>
                        <dl>
                          {matches.map((key) => (
                            <div className="stat-entry" key={key}>
                              <dt>{labels[key]}</dt>
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
                aria-label="Características"
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
                    <span>{labels[key]}</span>
                    <b>{fmt(stats, key)}</b>
                  </div>
                ))}
              </div>
              <table className="elements">
                <caption className="sr-only">
                  Daños y resistencias por elemento
                </caption>
                <thead>
                  <tr>
                    <th>ELEMENTO</th>
                    <th>DAÑOS</th>
                    <th>RES. FIJA</th>
                    <th>RES. %</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Neutral", "neutral", "neutral"],
                    ["Tierra", "earth", "strength"],
                    ["Fuego", "fire", "intelligence"],
                    ["Agua", "water", "chance"],
                    ["Aire", "air", "agility"],
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
                        {name}
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
                    <h3>{name}</h3>
                    {keys.map((key) => (
                      <div className="stat-row" key={key}>
                        <span>{labels[key as keyof typeof labels]}</span>
                        <b>{fmt(stats, key)}</b>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
              <div className="stat-note">
                <Shield size={15} />
                <span>
                  Daños generales incluidos en los totales elementales. Vista de
                  equipo.
                </span>
              </div>
              <button className="sheet-link" onClick={() => setFull(true)}>
                <span>
                  Ver ficha completa <small>73 estadísticas y límites</small>
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
          Borrador local
        </span>
        <span>Datos del juego · Combinación de estudio</span>
        <button onClick={() => setOverlay("guide")}>
          Ayuda y atajos <BookOpen size={13} />
        </button>
      </footer>
      <nav className="mobile-nav" aria-label="Vistas del taller">
        <button onClick={() => setForge(true)}>
          <Hammer size={20} />
          Forjar
        </button>
        <button
          aria-current={tab === "Equipo" && !full ? "page" : undefined}
          onClick={() => navigate("Equipo")}
        >
          <Swords size={20} />
          Equipo
        </button>
        <button
          aria-current={tab === "Estadísticas" || full ? "page" : undefined}
          onClick={() => navigate("Estadísticas")}
        >
          <SlidersHorizontal size={20} />
          Estadísticas
        </button>
        <button onClick={() => setOverlay("compare")}>
          <Columns2 size={20} />
          Comparar
        </button>
        <button onClick={save} aria-label="Guardar borrador">
          <Save size={20} />
          Guardar
        </button>
      </nav>
      <WorkspaceTools
        tool={tool}
        slot={toolSlot}
        onClose={() => setTool(null)}
      />
      {forge && <OptimizerModal open onClose={() => setForge(false)} />}{" "}
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
          <button
            className="icon-button"
            aria-label="Cerrar aviso"
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
              ? "Objeto seleccionado"
              : overlay === "compare"
                ? "Comparación"
                : overlay === "saved"
                  ? "Mis builds"
                  : "Guía del taller"
          }
        >
          <div className="dialog-content">
            <button
              className="close icon-button"
              onClick={close}
              aria-label="Cerrar"
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
                        ? slots[selected][0]
                        : selected === 15
                          ? "Mascota / montura"
                          : selected === 16
                            ? "Multiman"
                            : "Dofus / trofeo"}
                    </span>
                    <h2>{names.get(items[selected] || initial[selected])}</h2>
                    <p>
                      Nivel{" "}
                      {
                        equipment.get(items[selected] || initial[selected])
                          ?.level
                      }{" "}
                      · {items[selected] ? "Equipado" : "Sin equipar"}
                    </p>
                  </div>
                </div>
                <h3>
                  {items[selected]
                    ? "Impacto de retirar esta pieza"
                    : "Impacto de equipar esta pieza"}
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
                        <span>{labels[key as keyof typeof labels]}</span>
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
                <p className="dialog-note">
                  La comparación incluye los cambios de bonificación de
                  panoplia.
                </p>
                {equipment.get(items[selected] || initial[selected])?.conditions
                  ?.length ? (
                  <div className="item-conditions">
                    <h3>Condiciones del objeto</h3>
                    <ul>
                      {equipment
                        .get(items[selected] || initial[selected])!
                        .conditions!.map((c, i) => (
                          <li key={i}>
                            {STAT_META[c.stat]
                              ? i18n.t(STAT_META[c.stat].tKey)
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
                    Cambiar objeto
                  </button>
                  {items[selected] > 0 && (
                    <button
                      onClick={() => {
                        openTool("runes", visibleSlots[selected]);
                        close();
                      }}
                    >
                      Editar runas
                    </button>
                  )}
                </div>
                <div className="dialog-actions">
                  <button onClick={close}>Conservar equipo</button>
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
                      setNotice(
                        "Equipo actualizado. Puedes deshacer el cambio.",
                      );
                    }}
                  >
                    {items[selected]
                      ? "Quitar y ver el cambio"
                      : "Volver a equipar"}
                  </button>
                </div>
              </>
            ) : overlay === "compare" ? (
              <>
                <span className="eyebrow">COMPARACIÓN</span>
                <h2>Antes y después.</h2>
                <p>Tu última modificación, frente al equipo actual.</p>
                <div className="delta-table">
                  {Object.entries(labels)
                    .filter(
                      ([key]) =>
                        typeof stats[key as keyof StatBlock] === "number" &&
                        stats[key as keyof StatBlock] !==
                          baseline[key as keyof StatBlock],
                    )
                    .map(([key, label]) => (
                      <div key={key}>
                        <span>{label}</span>
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
                    <h3>Aún no hay diferencias</h3>
                    <p>Cambia una pieza del equipo para comparar su impacto.</p>
                  </div>
                )}
                <button onClick={close}>Volver al equipo</button>
              </>
            ) : overlay === "saved" ? (
              <>
                <span className="eyebrow">MIS BUILDS</span>
                <h2>Tu borrador local</h2>
                <div className="saved-build">
                  <img
                    src={"/data/classes/" + build.selectedClass + ".webp"}
                    alt=""
                  />
                  <div>
                    <h3>{cls} · Tierra</h3>
                    <p>
                      Nivel {build.level} · {items.filter(Boolean).length}{" "}
                      objetos
                    </p>
                  </div>
                  <span>{saved ? "Guardado" : "En edición"}</span>
                </div>
                <p>
                  Este estudio permite guardar un borrador en el navegador y
                  recuperarlo al volver a abrirlo.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    save();
                    close();
                  }}
                >
                  <Save size={16} />
                  Guardar borrador
                </button>
              </>
            ) : (
              <>
                <span className="eyebrow">GUÍA DEL TALLER</span>
                <h2>Cada decisión, en contexto.</h2>
                <ol>
                  <li>
                    <b>Inspecciona una pieza.</b> Toca su imagen para ver el
                    cambio que produciría retirarla.
                  </li>
                  <li>
                    <b>Compara.</b> Las diferencias de tu última acción están en
                    Comparar; Deshacer recupera el equipo anterior.
                  </li>
                  <li>
                    <b>Consulta toda la ficha.</b> El botón de expansión reúne
                    73 campos y permite buscar por nombre.
                  </li>
                  <li>
                    <b>Conserva tu trabajo.</b> Guarda un borrador para
                    recuperarlo en este navegador.
                  </li>
                </ol>
                <p>
                  Las herramientas del build abren los controles actuales de
                  características, runas, panoplias, pasivos, hechizos y
                  combate.
                </p>
                <button onClick={close}>Volver al taller</button>
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
      "No se pudo abrir el estudio: " + String(error);
  });
