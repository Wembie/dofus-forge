import {
  Compass as PaletteExplore,
  Settings as PaletteSettings,
  SunMoon as PaletteTheme,
  Volume2 as PaletteSound,
} from "lucide-react";
import { Palette, openPalette } from "./Palette";
import { toggleSound } from "@/lib/sound.ts";
import { useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  Compass,
  Folder,
  Hammer,
  Heart,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Star,
  Sun,
  User,
  X,
} from "lucide-react";
import es from "../../../public/locales/es/translation.json";
import { useBuildStore } from "../../../src/store/buildStore";
import { useDataStore } from "../../../src/store/dataStore";
import { CLASS_DATA } from "../../../src/features/class-picker/classData";
import { resolveClassName } from "../../../src/features/class-picker/useClassName";
import { CharacterStage } from "../../../src/components/CharacterStage";
import { LegalBody } from "../../../src/components/LegalBody";
import { Sets } from "./Sets";
import { STAT_META } from "../../../src/features/equipment/statDisplay";
import { prepareModel, equipment, seedItems, visibleSlots } from "./model";
import { BuildSheet, sheetVitals, type SheetBuild } from "./BuildSheet";
import {
  WorkspaceTools,
  toolNames,
  type WorkspaceTool,
} from "./WorkspaceTools";
import { SurfaceDialogs } from "./SurfaceDialogs";
import {
  pages,
  dialogs,
  states,
  type PageId,
  type DialogId,
  type ViewState,
} from "./surface-registry";
import "./style.css";
import "./forge.css";
import "./surfaces.css";
import "./product.css";

const translations = es as Record<string, string>,
  t = (key: string) => translations[key] || key;
/** Example compositions from real catalogue pieces; nothing here is a recommendation. */
const seedSlots = () =>
  Object.fromEntries(
    visibleSlots.flatMap((slot, i) =>
      seedItems[i] ? [[slot, seedItems[i]]] : [],
    ),
  ) as SheetBuild["slots"];
const exampleBuilds = (): SheetBuild[] => [
  {
    name: "Yopuka · Tierra",
    classId: "iop",
    gender: "male",
    level: 200,
    tag: "PvM",
    slots: seedSlots(),
    allocated: { vitality: 395, strength: 300 },
  },
  {
    name: "El filo paciente",
    classId: "iop",
    gender: "female",
    level: 200,
    tag: "PvP",
    slots: {
      hat: 22190,
      cape: 22201,
      weapon: 21229,
      shield: 22191,
      companion: 15469,
      amulet: 22200,
      ring1: 22192,
      ring2: 22205,
      belt: 22209,
      boots: 22189,
      dofus1: 6980,
      dofus2: 7114,
      dofus3: 7115,
      dofus4: 8698,
      dofus5: 18043,
      dofus6: 19398,
    },
  },
  {
    name: "Guardia de piedra",
    classId: "feca",
    gender: "male",
    level: 200,
    tag: "PvM",
    slots: {
      hat: 19978,
      cape: 19591,
      weapon: 19606,
      shield: 19598,
      companion: 33012,
      amulet: 19590,
      ring1: 19977,
      ring2: 15740,
      belt: 19976,
      boots: 19592,
      dofus1: 694,
      dofus2: 737,
      dofus3: 739,
      dofus4: 7112,
      dofus5: 20286,
      dofus6: 21451,
      sidekick: 14962,
    },
  },
  {
    name: "Distancia justa",
    classId: "cra",
    gender: "female",
    level: 200,
    tag: "PvM",
    slots: {
      hat: 20465,
      cape: 20464,
      weapon: 20391,
      companion: 12975,
      amulet: 21227,
      ring1: 21228,
      ring2: 18029,
      belt: 18019,
      boots: 20463,
      dofus1: 739,
      dofus2: 972,
      dofus3: 6980,
      dofus4: 7043,
      dofus5: 26066,
    },
  },
  {
    name: "Entre bambúes",
    classId: "pandawa",
    gender: "male",
    level: 200,
    tag: "PvM",
    slots: {
      hat: 24026,
      cape: 24027,
      weapon: 24028,
      shield: 30683,
      companion: 33146,
      amulet: 24022,
      ring1: 12113,
      ring2: 12114,
      belt: 24023,
      boots: 24024,
      dofus1: 737,
      dofus2: 7114,
      dofus3: 8698,
      dofus4: 29134,
      dofus5: 22010,
      dofus6: 22014,
    },
  },
  {
    name: "Una segunda idea",
    classId: "iop",
    gender: "male",
    level: 200,
    tag: "PvP",
    slots: {
      ...seedSlots(),
      hat: 19266,
      shield: 19263,
      companion: 8693,
      amulet: 19261,
      ring2: 19264,
      boots: 19265,
    },
  },
];
let examples: (SheetBuild & {
  vitals: ReturnType<typeof sheetVitals>;
})[] = [];
const vitalIcons = { ap: "ap.webp", mp: "mp.webp", range: "range.webp" };
const elementIcons = {
  earth: "strength.png",
  fire: "intelligence.png",
  water: "chance.png",
  air: "agility.png",
};
const links: Partial<Record<PageId, string>> = {
  explore: "Comunidad",
  "my-builds": "Tu espacio",
  sets: "Enciclopedia",
  "how-to-use": "Aprender",
  account: "Cuenta",
  admin: "Administración",
};
function Action({
  children,
  onClick,
  primary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button className={primary ? "primary" : ""} onClick={onClick}>
      {children}
    </button>
  );
}
function App() {
  const initial = new URLSearchParams(location.search).get("view"),
    [view, setView] = useState<PageId>(
      pages.some((p) => p[0] === initial) ? (initial as PageId) : "explore",
    );
  const [state, setState] = useState<ViewState>("ready"),
    [dialog, setDialog] = useState<DialogId | null>(() => {
      const asked = new URLSearchParams(location.search).get("dialog");
      return dialogs.some((d) => d[0] === asked) ? (asked as DialogId) : null;
    }),
    [tool, setTool] = useState<WorkspaceTool | null>(null),
    [dark, setDark] = useState(true),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("Todos"),
    [tab, setTab] = useState(""),
    [notice, setNotice] = useState(""),
    [selectedSet, setSelectedSet] = useState(0),
    [setOpen, setSetOpen] = useState(false),
    [classId, setClassId] = useState("iop");
  const data = useDataStore(),
    build = useBuildStore(),
    heading = pages.find((p) => p[0] === view)![1];
  const sets = data.sets || [],
    chosenSet =
      sets.find((s) => s.ankama_id === selectedSet) ||
      sets.find((s) => s.ankama_id === equipment.get(seedItems[0])?.set_id) ||
      sets[0];
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "tinta" : "mineral";
  }, [dark]);
  useEffect(() => {
    if (view === "class") void data.loadSpells("es", classId);
  }, [view, classId]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  function go(id: string) {
    if (!pages.some((p) => p[0] === id)) return;
    setView(id as PageId);
    setQuery("");
    setFilter("Todos");
    setState("ready");
    setTab("");
    history.replaceState(null, "", "?view=" + id);
    window.scrollTo(0, 0);
  }
  function open(id: DialogId) {
    setDialog(id);
  }
  const hero = (
    eyebrow: string,
    title: string,
    description: string,
    action?: ReactNode,
  ) => (
    <header className="product-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
  const tabs = (items: string[]) => (
    <nav className="product-tabs" aria-label="Subvistas">
      {items.map((item, i) => (
        <button
          key={item}
          aria-current={(tab || items[0]) === item ? "page" : undefined}
          onClick={() => setTab(item)}
        >
          <span>{item}</span>
          {i === 0 && view === "my-builds" && <small>6</small>}
        </button>
      ))}
    </nav>
  );
  const search = (placeholder: string) => (
    <label className="product-search">
      <Search size={18} />
      <span className="sr-only">{placeholder}</span>
      <input
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <button aria-label="Limpiar búsqueda" onClick={() => setQuery("")}>
          <X size={16} />
        </button>
      )}
    </label>
  );
  const empty = (title: string, body: string) => (
    <div className="product-empty">
      <Folder size={36} />
      <h2>{title}</h2>
      <p>{body}</p>
      <button
        onClick={() => {
          setState("ready");
          setQuery("");
          setFilter("Todos");
        }}
      >
        Volver a ver el contenido
      </button>
    </div>
  );
  function BuildList({ owned = false }: { owned?: boolean }) {
    const matches = examples.filter(
      (b) =>
        b.name.toLowerCase().includes(query.toLowerCase()) &&
        (filter === "Todos" || filter === b.classId || filter === b.tag),
    );
    return matches.length ? (
      <div className="build-grid">
        {matches.map((b) => (
          <article className="product-build" key={b.name}>
            <button className="build-card-open" onClick={() => go("build")}>
              <span className="build-card-head">
                <span>{b.tag}</span>
                {b.vitals && (
                  <span className={"build-element " + b.vitals.element}>
                    <img
                      src={"/data/stats/" + elementIcons[b.vitals.element]}
                      alt=""
                    />
                    {b.vitals.label}
                  </span>
                )}
                <span className="build-level">Niv. {b.level}</span>
              </span>
              <BuildSheet build={b} items={equipment} />
              <h2>{b.name}</h2>
              <span className="card-author">
                {resolveClassName(b.classId, "es", null)} ·{" "}
                {owned ? "borrador de ejemplo" : "por Brasa · build de ejemplo"}
              </span>
            </button>
            <div className="build-card-bottom">
              {b.vitals && (
                <ul className="build-vitals" aria-label="Puntos de acción, movimiento y alcance">
                  {(["ap", "mp", "range"] as const).map((key) => (
                    <li key={key}>
                      <img src={"/data/stats/" + vitalIcons[key]} alt="" />
                      <strong>{b.vitals![key]}</strong>
                      {key === "ap" ? "PA" : key === "mp" ? "PM" : "AL"}
                    </li>
                  ))}
                </ul>
              )}
              <span className="build-rating">
                <Star size={13} />
                Sin votos
              </span>
              <button
                aria-label={"Acciones de " + b.name}
                onClick={() => open(owned ? "visibility" : "collection-picker")}
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>
    ) : (
      empty(
        "No encontramos builds con esos filtros",
        "Prueba con otra clase o vuelve a mostrar todos los resultados.",
      )
    );
  }
  function StateView() {
    if (state === "loading")
      return (
        <div
          className="product-loading"
          aria-busy="true"
          aria-label="Cargando contenido"
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} />
          ))}
        </div>
      );
    const content: Record<string, [string, string]> = {
      empty: [
        "Aquí empieza tu próxima idea",
        "Cuando haya contenido, podrás organizarlo desde esta vista.",
      ],
      error: [
        "No pudimos cargar esta vista",
        "Revisa la conexión y vuelve a intentarlo. Conservamos el trabajo que ya tienes abierto.",
      ],
      "signed-out": [
        "Tu espacio te está esperando",
        "Inicia sesión para acceder a tus builds y colecciones. Puedes seguir usando el taller sin una cuenta.",
      ],
      forbidden: [
        "No tienes acceso a esta sección",
        "Vuelve al taller o entra con una cuenta que tenga los permisos necesarios.",
      ],
      missing: [
        "Este contenido no está disponible",
        "Puede ser privado o haber sido retirado. Puedes seguir explorando otras builds.",
      ],
    };
    const [title, body] = content[state] || content.empty;
    return (
      <div className="product-empty">
        <Shield size={34} />
        <h2>{title}</h2>
        <p>{body}</p>
        <div>
          {state === "signed-out" ? (
            <Action primary onClick={() => open("signin")}>
              Iniciar sesión
            </Action>
          ) : (
            <Action onClick={() => setState("ready")}>
              {state === "error" ? "Reintentar" : "Volver"}
            </Action>
          )}
          <a href="/">
            Abrir el taller <ArrowRight size={16} />
          </a>
        </div>
      </div>
    );
  }
  function Editorial() {
    let sections: { id: string; title: string; body: string }[] = [];
    if (view === "privacy" || view === "terms")
      sections = Array.from(
        { length: view === "privacy" ? 12 : 15 },
        (_, i) => ({
          id: "s" + (i + 1),
          title: t(`${view}_s${i + 1}_title`),
          body: t(`${view}_s${i + 1}_body`),
        }),
      );
    else if (view === "how-to-use")
      sections = Array.from({ length: 8 }, (_, i) => ({
        id: "step" + (i + 1),
        title: t(`howto_step${i + 1}_title`),
        body: t(`howto_step${i + 1}_body`),
      }));
    else if (view === "forge-guide")
      sections = [
        "start",
        "order",
        "intensity",
        "items",
        "slots",
        "forgemagic",
        "forging",
        "results",
        "faq",
      ].map((id) => ({
        id,
        title: t(`forgeguide_${id}_title`),
        body: [
          t(`forgeguide_${id}_intro`),
          ...Object.entries(translations)
            .filter(([k]) =>
              new RegExp(`^forgeguide_${id}_[0-9]+_(title|body)$`).test(k),
            )
            .map(([, v]) => v),
        ].join("\n\n"),
      }));
    else {
      const prefix = view === "about" ? "about_" : "shortcuts_";
      sections = Object.entries(translations)
        .filter(([k]) => k.startsWith(prefix) && k.endsWith("_body"))
        .map(([k, body]) => ({
          id: k,
          title: t(k.replace("_body", "_title")),
          body,
        }));
    }
    const introKey =
      view === "how-to-use"
        ? "howto_intro"
        : view === "forge-guide"
          ? "forgeguide_intro"
          : `${view}_intro`;
    return (
      <>
        {hero(
          view === "privacy" || view === "terms"
            ? "INFORMACIÓN LEGAL"
            : "CUADERNO DEL TALLER",
          heading,
          translations[introKey] ||
            "Consulta el funcionamiento del taller y sus herramientas.",
        )}
        {(view === "privacy" || view === "terms") && (
          <p className="legal-date">{t("legal_effective")}</p>
        )}
        <div className="reading-layout">
          <aside>
            <nav aria-label="Contenido de la guía">
              {sections.map((s) => (
                <a key={s.id} href={"#" + s.id}>
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>
          <article className="reading-content">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id}>
                <span className="reading-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2>{s.title}</h2>
                <LegalBody text={s.body} />
              </section>
            ))}
            {(view === "terms" || view === "privacy") && (
              <LegalBody text={t(`${view}_contact`)} />
            )}
            <a className="reading-cta" href="/">
              Llevarlo a mi build <ArrowRight size={18} />
            </a>
          </article>
        </div>
      </>
    );
  }
  function Content() {
    if (view === "builder")
      return (
        <>
          {hero(
            "EL TALLER",
            "Un equipo alrededor de tu personaje.",
            "El constructor usa el estado, historial, cálculos y visor actuales.",
            <a className="primary product-anchor" href="/">
              Abrir taller <ArrowUpRight size={18} />
            </a>,
          )}
          <iframe
            className="builder-frame"
            src="/"
            title="Taller con personaje animado"
          />
        </>
      );
    if (
      [
        "about",
        "how-to-use",
        "forge-guide",
        "shortcuts",
        "privacy",
        "terms",
      ].includes(view)
    )
      return <Editorial />;
    if (view === "explore")
      return (
        <>
          {hero(
            "LA COMUNIDAD",
            "Encuentra tu próxima build.",
            "Equipo, decisiones y nuevas formas de jugar. Empieza por tu clase.",
            <img
              className="hero-dofus"
              src="/design-assets/item-972.png"
              alt="Dofus"
            />,
          )}
          <div className="explore-tools">
            {search("Buscar una build")}
            <label>
              Ordenar
              <select>
                <option>Mejor valoradas</option>
                <option>Más recientes</option>
                <option>Más populares</option>
                <option>Más vistas</option>
              </select>
            </label>
          </div>
          <div className="class-filters" aria-label="Filtrar por clase">
            <button
              aria-pressed={filter === "Todos"}
              onClick={() => setFilter("Todos")}
            >
              Todas las clases
            </button>
            {CLASS_DATA.map((c) => (
              <button
                aria-pressed={filter === c.id}
                key={c.id}
                onClick={() => setFilter(c.id)}
              >
                <img src={c.imageUrl} alt="" />
                {resolveClassName(c.id, "es", null)}
              </button>
            ))}
          </div>
          <div className="list-heading">
            <h2>Builds de la comunidad</h2>
            <span>Ejemplos de composición</span>
            <button
              onClick={() => setFilter(filter === "PvM" ? "Todos" : "PvM")}
            >
              <SlidersHorizontal size={15} />
              PvM
            </button>
          </div>
          <BuildList />
          <div className="pagination">
            <button onClick={() => setNotice("Primera página del ejemplo")}>
              Anterior
            </button>
            <span>Página 1 de 1</span>
            <button disabled>Siguiente</button>
          </div>
        </>
      );
    if (view === "my-builds" || view === "collection")
      return (
        <>
          {hero(
            "TU ESPACIO",
            view === "collection"
              ? "Equipos para mazmorras"
              : "Tus ideas, listas para volver.",
            "Organiza tus variantes sin perder el punto de partida.",
            <Action
              primary
              onClick={() =>
                open(
                  view === "collection" ? "collection-edit" : "collection-new",
                )
              }
            >
              <Plus size={16} />
              {view === "collection" ? "Editar colección" : "Nueva colección"}
            </Action>,
          )}
          {tabs(
            view === "collection"
              ? ["Builds", "Información"]
              : [
                  "Mis builds",
                  "Guardadas",
                  "Colecciones",
                  "En este dispositivo",
                ],
          )}
          {tab === "Colecciones" ? (
            <div className="collection-list">
              {[
                "Equipos para mazmorras",
                "Ideas para PvP",
                "Pendientes de probar",
              ].map((n, i) => (
                <button onClick={() => go("collection")} key={n}>
                  <span className="collection-number">0{i + 1}</span>
                  <Folder size={30} />
                  <h2>{n}</h2>
                  <span>
                    3 builds <ArrowRight size={16} />
                  </span>
                </button>
              ))}
            </div>
          ) : tab === "Información" ? (
            <div className="reading-content">
              <h2>Equipos para mazmorras</h2>
              <p>Una colección para reunir alternativas del mismo equipo.</p>
              <Action onClick={() => open("collection-edit")}>
                Editar información
              </Action>
              <Action onClick={() => open("collection-delete")}>
                Eliminar colección
              </Action>
            </div>
          ) : (
            <>
              {search("Buscar en mis builds")}
              <div className="library-actions">
                <button onClick={() => open("rename")}>Renombrar</button>
                <button
                  onClick={() =>
                    setNotice("Duplicado de ejemplo creado localmente")
                  }
                >
                  Duplicar
                </button>
                <button onClick={() => open("visibility")}>Visibilidad</button>
                <button onClick={() => open("delete-build")}>Eliminar…</button>
              </div>
              <BuildList owned />
            </>
          )}
        </>
      );
    if (view === "profile")
      return (
        <>
          {hero(
            "PERFIL DE JUGADOR",
            "Brasa",
            "Siempre hay una pieza que cambia el resto.",
            <Action
              onClick={() => setNotice("Seguimiento mostrado en el ejemplo")}
            >
              <Plus size={16} />
              Seguir
            </Action>,
          )}
          <div className="profile-strip">
            <span className="profile-avatar">B</span>
            <div>
              <span>@brasa</span>
              <p>Miembro del taller · perfil de ejemplo</p>
            </div>
            <button onClick={() => open("followers")}>
              Seguidores <ArrowRight size={15} />
            </button>
            <button onClick={() => open("following")}>
              Siguiendo <ArrowRight size={15} />
            </button>
          </div>
          {tabs(["Builds", "Colecciones"])}
          {tab === "Colecciones" ? (
            <button
              className="collection-link"
              onClick={() => go("collection")}
            >
              <Folder size={22} />
              Equipos para mazmorras <ArrowRight size={17} />
            </button>
          ) : (
            <BuildList />
          )}
        </>
      );
    if (view === "build")
      return (
        <>
          {hero(
            "BUILD DE LA COMUNIDAD",
            "Yopuka · Tierra",
            "Por Brasa · Nivel 200 · PvM",
            <a className="primary product-anchor" href="/">
              Abrir en mi taller <ArrowUpRight size={18} />
            </a>,
          )}
          <div className="detail-actions">
            <Action
              onClick={() => setNotice("Me gusta seleccionado en el ejemplo")}
            >
              <Heart size={16} />
              Me gusta
            </Action>
            <Action onClick={() => open("collection-picker")}>
              <Folder size={16} />
              Guardar
            </Action>
            <Action onClick={() => setTool("share")}>Compartir</Action>
            <Action onClick={() => open("report-build")}>Reportar</Action>
            <Action onClick={() => open("update-build")}>
              Editar publicación
            </Action>
          </div>
          <div className="public-build-layout">
            <div className="public-character">
              <CharacterStage
                breed={8}
                gender="male"
                width={240}
                height={330}
              />
              <span>YOPUKA · TIERRA</span>
              <div className="public-eggs">
                {seedItems.slice(9, 15).map((id) => (
                  <img
                    key={id}
                    src={equipment.get(id)?.image_url || ""}
                    alt={equipment.get(id)?.name}
                  />
                ))}
              </div>
            </div>
            <section>
              <h2>El equipo, de un vistazo.</h2>
              <div className="public-metrics">
                {[
                  ["PV", build.stats?.maxHp],
                  ["PA", build.stats?.ap],
                  ["PM", build.stats?.mp],
                  ["Alcance", build.stats?.range],
                  ["Fuerza", build.stats?.strength],
                  ["Potencia", build.stats?.power],
                ].map(([label, v]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
              <div className="public-gear">
                {seedItems.slice(0, 9).map((id) => (
                  <button key={id} onClick={() => setTool("bonuses")}>
                    <img src={equipment.get(id)?.image_url || ""} alt="" />
                    <span>{equipment.get(id)?.name}</span>
                  </button>
                ))}
              </div>
              <div className="detail-actions">
                <button onClick={() => setTool("passives")}>Pasivos</button>
                <button onClick={() => setTool("spells")}>Hechizos</button>
                <button onClick={() => setTool("compare")}>Comparar</button>
              </div>
            </section>
          </div>
          {tabs(["Comentarios", "Historial", "Valoración"])}
          {tab === "Historial" ? (
            <div className="version-list">
              {["Versión actual", "Versión anterior"].map((n, i) => (
                <div key={n}>
                  <span>0{2 - i}</span>
                  <b>{n}</b>
                  <button onClick={() => open("restore-version")}>
                    Restaurar esta versión
                  </button>
                </div>
              ))}
            </div>
          ) : tab === "Valoración" ? (
            <div className="rating-row">
              <p>Tu valoración</p>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  aria-label={`Valorar con ${n} estrellas`}
                  onClick={() =>
                    setNotice(`Valoración de ejemplo: ${n} estrellas`)
                  }
                >
                  <Star size={24} />
                </button>
              ))}
            </div>
          ) : (
            <section className="comments">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setNotice("Comentario de ejemplo listo para revisión");
                }}
              >
                <label htmlFor="comment">
                  Añade algo útil a la conversación
                </label>
                <div>
                  <input
                    id="comment"
                    required
                    placeholder="¿Qué cambiarías en esta build?"
                  />
                  <button className="primary">Comentar</button>
                </div>
              </form>
              <article>
                <div>
                  <span className="person-avatar">C</span>
                  <b>Caliza</b>
                  <small>Ejemplo</small>
                  <button onClick={() => open("report-comment")}>
                    Reportar
                  </button>
                  <button onClick={() => open("delete-comment")}>
                    Eliminar
                  </button>
                </div>
                <p>Una buena base para comparar alternativas.</p>
                <button
                  onClick={() =>
                    setNotice("Me gusta del comentario seleccionado")
                  }
                >
                  <Heart size={14} />
                  Me gusta
                </button>
              </article>
            </section>
          )}
        </>
      );
    if (view === "sets") {
      const results = sets
        .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 24);
      return (
        <>
          {hero(
            "ENCICLOPEDIA",
            "El conjunto cambia la pieza.",
            "Explora las panoplias del catálogo y compara sus bonificaciones.",
            <Action onClick={() => setTool("sets")}>
              Abrir catálogo avanzado
            </Action>,
          )}
          {search("Buscar una panoplia")}
          <div className="set-directory">
            {results.map((s) => (
              <button
                key={s.ankama_id}
                onClick={() => {
                  setSelectedSet(s.ankama_id);
                  go("set");
                }}
              >
                <div>
                  {[...equipment.values()]
                    .filter((it) => it.set_id === s.ankama_id)
                    .slice(0, 4)
                    .map((it) => (
                      <img src={it.image_url || ""} alt="" key={it.ankama_id} />
                    ))}
                </div>
                <h2>{s.name}</h2>
                <span>
                  Ver piezas y bonificaciones <ArrowRight size={16} />
                </span>
              </button>
            ))}
          </div>
          {!results.length &&
            empty("No encontramos esa panoplia", "Busca por otra palabra.")}
        </>
      );
    }
    if (view === "set") {
      const items = [...equipment.values()].filter(
        (it) => it.set_id === chosenSet?.ankama_id,
      );
      return (
        <>
          {hero(
            "PANOPLIA",
            chosenSet?.name || "Panoplia",
            "Cada pieza cuenta. Revisa los bonos por cantidad antes de equipar.",
            <Action primary onClick={() => setSetOpen(true)}>
              Ver bonos y equipar
            </Action>,
          )}
          <div className="set-pieces">
            {items.map((it) => (
              <article key={it.ankama_id}>
                <img src={it.image_url || ""} alt="" />
                <h2>{it.name}</h2>
                <p>Nivel {it.level}</p>
                <dl>
                  {it.effects.slice(0, 8).map((e, i) => (
                    <div key={i}>
                      <dt>
                        {STAT_META[e.stat]
                          ? i18n.t(STAT_META[e.stat].tKey)
                          : e.stat}
                      </dt>
                      <dd>
                        {e.min}
                        {e.max && e.max !== e.min ? " – " + e.max : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
          <button onClick={() => setSetOpen(true)}>
            Consultar condiciones y bonos por tier
          </button>
        </>
      );
    }
    if (view === "class") {
      const current = CLASS_DATA.find((c) => c.id === classId)!,
        spells = data.spells.get(classId)?.spells || [];
      return (
        <>
          {hero(
            "CLASES DEL MUNDO DE LOS DOCE",
            resolveClassName(classId, "es", null),
            "Consulta hechizos, variantes y efectos base de la clase.",
            <img className="hero-portrait" src={current.imageUrl} alt="" />,
          )}
          <label className="class-choice">
            Clase
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {CLASS_DATA.map((c) => (
                <option key={c.id} value={c.id}>
                  {resolveClassName(c.id, "es", null)}
                </option>
              ))}
            </select>
          </label>
          {search("Buscar hechizo")}
          <div className="spell-directory">
            {spells
              .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
              .map((s) => {
                const level = s.levels.at(-1);
                return (
                  <details key={s.id}>
                    <summary>
                      {s.image_url && <img src={s.image_url} alt="" />}
                      <span>
                        <b>{s.name}</b>
                        <small>
                          {s.is_variant ? "Variante" : "Hechizo"} · {level?.ap}{" "}
                          PA · {level?.minRange}–{level?.maxRange} alcance
                        </small>
                      </span>
                      <Plus size={16} />
                    </summary>
                    <p>{s.description}</p>
                    <p>
                      Grado {level?.grade} · {level?.critChance}% crítico ·{" "}
                      {level?.maxPerTurn} por turno
                    </p>
                    {level?.effects.map((e, i) => (
                      <p key={i}>
                        {e.min}–{e.max} · {e.element} · {e.kind}
                      </p>
                    ))}
                  </details>
                );
              })}
          </div>
        </>
      );
    }
    if (view === "account")
      return (
        <>
          {hero(
            "MI CUENTA",
            "Un lugar para tu identidad.",
            "Controla tu perfil y el acceso a tu cuenta.",
          )}
          <div className="settings-layout">
            <aside>
              <a href="#profile-settings">Perfil público</a>
              <a href="#security-settings">Seguridad</a>
              <button onClick={() => open("followers")}>Seguidores</button>
              <button onClick={() => open("following")}>Siguiendo</button>
            </aside>
            <div>
              <section id="profile-settings">
                <h2>Perfil público</h2>
                <p>Así te verán los demás jugadores.</p>
                <form
                  className="surface-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setNotice("Vista de confirmación: perfil guardado");
                  }}
                >
                  <label>
                    Nombre de usuario
                    <input
                      defaultValue="brasa"
                      minLength={3}
                      maxLength={24}
                      required
                    />
                  </label>
                  <label>
                    Nombre visible
                    <input defaultValue="Brasa" maxLength={60} />
                  </label>
                  <label>
                    Biografía
                    <textarea
                      defaultValue="Siempre hay una pieza que cambia el resto."
                      maxLength={300}
                      rows={3}
                    />
                  </label>
                  <button className="primary">Guardar perfil</button>
                </form>
              </section>
              <section id="security-settings">
                <h2>Seguridad</h2>
                <p>Actualiza la contraseña que usas para entrar.</p>
                <form
                  className="surface-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setNotice("Vista de confirmación: contraseña actualizada");
                  }}
                >
                  <label>
                    Nueva contraseña
                    <input type="password" minLength={8} required />
                  </label>
                  <label>
                    Confirmar contraseña
                    <input type="password" minLength={8} required />
                  </label>
                  <button>Cambiar contraseña</button>
                </form>
              </section>
              <section>
                <h2>Sesión</h2>
                <button onClick={() => open("signout")}>Cerrar sesión</button>
              </section>
            </div>
          </div>
        </>
      );
    if (view === "admin")
      return (
        <>
          {hero(
            "ADMINISTRACIÓN",
            "Mantén el taller en orden.",
            "Accesos operativos para gestionar la comunidad.",
          )}
          <div className="admin-destinations">
            <button onClick={() => go("reports")}>
              <Shield size={28} />
              <div>
                <h2>Reportes</h2>
                <p>Revisa el contexto y decide qué necesita intervención.</p>
              </div>
              <ArrowRight size={20} />
            </button>
            <button onClick={() => go("ranks")}>
              <Star size={28} />
              <div>
                <h2>Rangos y asignaciones</h2>
                <p>Definiciones, beneficios, vigencias e historial.</p>
              </div>
              <ArrowRight size={20} />
            </button>
          </div>
        </>
      );
    if (view === "ranks")
      return (
        <>
          {hero(
            "ADMINISTRACIÓN",
            "Rangos y asignaciones",
            "Identidad pública, beneficios y vigencia, en su contexto.",
            <Action
              primary
              onClick={() =>
                open(tab === "Asignaciones" ? "rank-assign" : "rank-edit")
              }
            >
              <Plus size={16} />
              {tab === "Asignaciones" ? "Asignar rango" : "Crear rango"}
            </Action>,
          )}
          {tabs(["Rangos", "Asignaciones"])}
          {search("Buscar rango o usuario")}
          <div className="operational-table">
            <table>
              <caption className="sr-only">
                {tab === "Asignaciones"
                  ? "Asignaciones de rangos"
                  : "Definiciones de rangos"}
              </caption>
              <thead>
                <tr>
                  {(tab === "Asignaciones"
                    ? ["Usuario", "Rango", "Estado", "Vigencia", "Acciones"]
                    : ["Rango", "Visibilidad", "Estado", "Orden", "Acciones"]
                  ).map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["Forjador", "Colaborador", "Fundador"]
                  .filter((n) => n.toLowerCase().includes(query.toLowerCase()))
                  .map((n, i) => (
                    <tr key={n}>
                      <td>
                        <Shield size={16} />
                        <b>{tab === "Asignaciones" ? "Brasa" : n}</b>
                      </td>
                      <td>{tab === "Asignaciones" ? n : "Público"}</td>
                      <td>
                        <span className="status-label">Activo</span>
                      </td>
                      <td>
                        {tab === "Asignaciones" ? "Sin vencimiento" : 100 + i}
                      </td>
                      <td>
                        <button
                          onClick={() =>
                            open(
                              tab === "Asignaciones"
                                ? "rank-revoke"
                                : "rank-edit",
                            )
                          }
                        >
                          {tab === "Asignaciones" ? "Revocar" : "Editar"}
                        </button>
                        <button onClick={() => open("rank-history")}>
                          Historial
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      );
    if (view === "reports")
      return (
        <>
          {hero(
            "ADMINISTRACIÓN",
            "Revisa, comprende, resuelve.",
            "Cada decisión conserva el contexto del contenido reportado.",
          )}
          {tabs(["Pendientes", "Con acción", "Descartados", "Revisados"])}
          <div className="report-list">
            {["Build", "Comentario"].map((kind, i) => (
              <article key={kind}>
                <header>
                  <span className="status-label">{tab || "Pendiente"}</span>
                  <span>
                    {kind} · #{String(i + 1).padStart(3, "0")}
                  </span>
                  <span>Reporte de ejemplo</span>
                </header>
                <div>
                  <section>
                    <small>CONTENIDO REPORTADO</small>
                    <h2>Yopuka · Tierra</h2>
                    <p>
                      {i
                        ? "Un comentario del build aparece aquí para su revisión."
                        : "El enlace al build mantiene accesible el contenido completo."}
                    </p>
                    <button onClick={() => go("build")}>
                      Ver contexto <ArrowUpRight size={15} />
                    </button>
                  </section>
                  <aside>
                    <small>MOTIVO</small>
                    <h3>{i ? "Spam" : "Datos incorrectos"}</h3>
                    <p>Detalle aportado por la persona que reportó.</p>
                    <button
                      className="primary"
                      onClick={() => open("moderate")}
                    >
                      Resolver reporte
                    </button>
                    {tab === "Con acción" && (
                      <button onClick={() => open("restore-content")}>
                        Restaurar contenido
                      </button>
                    )}
                  </aside>
                </div>
              </article>
            ))}
          </div>
        </>
      );
    return null;
  }
  return (
    <div className="product-study">
      <Palette
        commands={[
          ...pages.map(([key, label]) => ({
            key,
            label,
            group: "Ir a",
            Icon: PaletteExplore,
            onRun: () => go(key),
          })),
          {
            key: "settings",
            label: "Preferencias del taller",
            group: "Preferencias",
            Icon: PaletteSettings,
            onRun: () => open("settings"),
          },
          {
            key: "theme",
            label: dark ? "Cambiar al tema Mineral" : "Cambiar al tema Tinta",
            group: "Preferencias",
            Icon: PaletteTheme,
            onRun: () => setDark(!dark),
          },
          {
            key: "sound",
            label: "Activar o silenciar sonidos",
            group: "Preferencias",
            Icon: PaletteSound,
            onRun: toggleSound,
          },
        ]}
      />
      <div className="review-bar">
        <b>Estudio 0.4.0</b>
        <label>
          Vista
          <select
            aria-label="Vista del producto"
            value={view}
            onChange={(e) => go(e.target.value)}
          >
            {pages.map((p) => (
              <option key={p[0]} value={p[0]}>
                {p[1]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select
            aria-label="Estado de la vista"
            value={state}
            onChange={(e) => setState(e.target.value as ViewState)}
          >
            {states.map((s) => (
              <option key={s[0]} value={s[0]}>
                {s[1]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Diálogo
          <select
            aria-label="Abrir diálogo de revisión"
            value=""
            onChange={(e) => open(e.target.value as DialogId)}
          >
            <option value="">Seleccionar…</option>
            {dialogs.map((d) => (
              <option key={d[0]} value={d[0]}>
                {d[1]}
              </option>
            ))}
          </select>
        </label>
        <span>Ejemplos locales · sin conexión a cuentas</span>
      </div>
      <header className="product-header">
        <a className="brand" href="/">
          <img src="/design-assets/forge-mark.svg" alt="" />
          <span>
            DOFUS <span>FORGE</span>
          </span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="/">
            <Hammer size={15} />
            Taller
          </a>
          {(["explore", "my-builds", "sets", "how-to-use"] as PageId[]).map(
            (id) => (
              <button
                key={id}
                aria-current={view === id ? "page" : undefined}
                onClick={() => go(id)}
              >
                {id === "explore"
                  ? "Explorar"
                  : id === "my-builds"
                    ? "Mis builds"
                    : id === "sets"
                      ? "Panoplias"
                      : "Guías"}
              </button>
            ),
          )}
        </nav>
        <div>
          <button
            className="icon-button"
            aria-label="Todas las acciones (Ctrl K)"
            title="Todas las acciones · Ctrl K"
            onClick={openPalette}
          >
            <Search size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Cambiar tema"
            onClick={() => setDark(!dark)}
          >
            <Sun size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Notificaciones"
            onClick={() => open("notifications")}
          >
            <Bell size={18} />
          </button>
          <button
            className="avatar"
            aria-label="Mi cuenta"
            onClick={() => go("account")}
          >
            B
          </button>
          <button
            className="icon-button mobile-menu-trigger"
            aria-label="Abrir navegación"
            onClick={() => open("navigation")}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>
      <div className="product-shell">
        <aside className="product-sidebar">
          <p>MI TALLER</p>
          {(
            [
              "explore",
              "my-builds",
              "sets",
              "how-to-use",
              "account",
            ] as PageId[]
          ).map((id) => (
            <button
              key={id}
              aria-current={view === id ? "page" : undefined}
              onClick={() => go(id)}
            >
              {id === "explore" ? (
                <Compass size={17} />
              ) : id === "my-builds" ? (
                <Folder size={17} />
              ) : id === "account" ? (
                <User size={17} />
              ) : (
                <BookOpen size={17} />
              )}
              <span>{links[id]}</span>
            </button>
          ))}
          <hr />
          <p>APRENDER</p>
          {(["class", "forge-guide", "shortcuts", "about"] as PageId[]).map(
            (id) => (
              <button key={id} onClick={() => go(id)}>
                {pages.find((p) => p[0] === id)![1]}
              </button>
            ),
          )}
          <div className="sidebar-bottom">
            <button onClick={() => go("admin")}>
              <Shield size={16} />
              Administración
            </button>
            <button onClick={() => open("signin")}>Iniciar sesión</button>
          </div>
        </aside>
        <main className="product-main" id="product-content">
          {state === "ready" ? (
            Content()
          ) : (
            <>
              {hero(links[view] || "DOFUS FORGE", heading, "")}
              <StateView />
            </>
          )}
        </main>
      </div>
      <footer className="product-footer">
        <span>DOFUS FORGE · El taller de los Doce</span>
        <nav aria-label="Información del producto">
          {(["about", "how-to-use", "privacy", "terms"] as PageId[]).map(
            (id) => (
              <button key={id} onClick={() => go(id)}>
                {pages.find((p) => p[0] === id)![1]}
              </button>
            ),
          )}
        </nav>
      </footer>
      <nav className="product-mobile-nav" aria-label="Navegación móvil">
        <a href="/">
          <Hammer size={20} />
          Taller
        </a>
        <button onClick={() => go("explore")}>
          <Compass size={20} />
          Explorar
        </button>
        <button onClick={() => go("my-builds")}>
          <Folder size={20} />
          Mis builds
        </button>
        <button onClick={() => open("navigation")}>
          <Menu size={20} />
          Más
        </button>
      </nav>
      {dialog && (
        <SurfaceDialogs
          key={dialog}
          id={dialog}
          onClose={() => setDialog(null)}
          onOpen={open}
          onNavigate={go}
        />
      )}
      <WorkspaceTools tool={tool} onClose={() => setTool(null)} />
      {setOpen && chosenSet && (
        <Sets open={chosenSet.ankama_id} onClose={() => setSetOpen(false)} />
      )}
      <details className="tool-directory">
        <summary>Herramientas y subpaneles del equipo</summary>
        {Object.entries(toolNames).map(([key, label]) => (
          <button key={key} onClick={() => setTool(key as WorkspaceTool)}>
            {label}
          </button>
        ))}
        <a href="/">La Forjadora y ficha completa →</a>
      </details>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button aria-label="Cerrar aviso" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
void i18n
  .use(initReactI18next)
  .init({
    lng: "es",
    resources: { es: { translation: es } },
    interpolation: { escapeValue: false },
  })
  .then(prepareModel)
  .then(() => {
    examples = exampleBuilds().map((b) => ({ ...b, vitals: sheetVitals(b) }));
  })
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
