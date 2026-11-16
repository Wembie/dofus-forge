import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBuildStore, type BuildSnapshot } from "@/store/buildStore.ts";
import { useCompareStore } from "@/store/compareStore.ts";
import { useDataStore } from "@/store/dataStore.ts";
import { useAuthStore } from "@/store/authStore.ts";
import { COMPARE_STATS } from "@/features/compare/compareStats.ts";
import { CompareRadar } from "@/features/compare/CompareRadar.tsx";
import {
  buildSnapshotFromState,
  decodeBuild,
  encodeBuild,
  encodeSnapshot,
} from "@/features/share/codec.ts";
import { listBuilds } from "@/features/share/savedBuilds.ts";
import {
  fetchBuildById,
  fetchMyBuilds,
  type MyBuildRow,
} from "@/features/builds/api.ts";
import { langPathRootSegment } from "@/i18n/langPath.ts";
import { resolveClassName } from "@/features/class-picker/useClassName.ts";
import { statIconUrl } from "@/features/equipment/statDisplay.ts";
import { equipment, visibleSlots } from "./model";
import "./tools.css";

const SECTIONS: [string, string][] = [
  ["core", "Lo esencial"],
  ["chars", "Características"],
  ["damage", "Daños"],
  ["steal", "Robos"],
  ["res_fixed", "Resistencias fijas"],
  ["res_pct", "Resistencias %"],
  ["combat", "Combate"],
  ["mods", "Modificadores %"],
];
const group = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const signed = (n: number) =>
  (n > 0 ? "+" : n < 0 ? "−" : "") + group(Math.abs(n));
const day = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

/** Your build against a reference: who is ahead on each stat, by how much, and which pieces differ. */
export function Compare() {
  const { t, i18n } = useTranslation(),
    b = useBuildStore(),
    ref = useCompareStore(),
    data = useDataStore(),
    session = useAuthStore((s) => s.session);
  const [onlyChanges, setOnlyChanges] = useState(true),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [picking, setPicking] = useState(false),
    [copied, setCopied] = useState(false),
    [account, setAccount] = useState<MyBuildRow[] | null>(null);
  const mine = b.stats,
    theirs = ref.statsB,
    local = listBuilds();
  useEffect(() => {
    if (!session) return;
    let live = true;
    void fetchMyBuilds(session.user.id).then(
      ({ data: rows }) => live && setAccount(rows),
    );
    return () => {
      live = false;
    };
  }, [session]);
  function load(snapshot: BuildSnapshot | null, name: string) {
    if (!snapshot)
      return setError(
        "No reconocemos ese enlace o código. Copia el enlace completo desde «Compartir y exportar».",
      );
    ref.loadBuild(snapshot, name, data.equipment || [], data.sets || []);
    setCode("");
    setError("");
    setPicking(false);
  }
  /** Same inputs production accepts: a published build link or id, a `?b=` link (current or legacy hash form), or the bare code. */
  async function paste() {
    const raw = code.trim(),
      id = raw.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      );
    if (id) {
      const { data: found } = await fetchBuildById(id[0]);
      if (found) return load(found.snapshot, found.name);
      return setError(
        "No encontramos esa build publicada. Puede ser privada o haberse retirado.",
      );
    }
    let encoded = raw;
    try {
      const url = new URL(raw);
      encoded =
        url.searchParams.get("b") ||
        (url.hash.includes("?")
          ? new URLSearchParams(url.hash.slice(url.hash.indexOf("?") + 1)).get(
              "b",
            )
          : null) ||
        raw;
    } catch {
      /* Not a link: treat it as the build code itself. */
    }
    load(decodeBuild(encoded), "Build pegada");
  }
  function share() {
    const base = `${location.origin}${import.meta.env.BASE_URL}${langPathRootSegment(i18n.language)}`,
      a = encodeBuild(useBuildStore.getState()),
      z = ref.snapshotB ? encodeSnapshot(ref.snapshotB) : "";
    void navigator.clipboard
      .writeText(z ? `${base}?b=${a}&c=${z}` : `${base}?b=${a}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
  }
  if (!mine || !theirs)
    return (
      <div className="tool-empty">
        <h3>Falta una build para comparar</h3>
        <p>Elige una clase en el taller para poder comparar tu equipo.</p>
      </div>
    );
  const sections = SECTIONS.map(([id, title]) => ({
    title,
    rows: COMPARE_STATS.filter((def) => def.section === id)
      .map((def) => {
        const a = Number(mine[def.key]) || 0,
          z = Number(theirs[def.key]) || 0;
        return { def, a, z, diff: a - z };
      })
      .filter((r) =>
        onlyChanges ? r.diff !== 0 : r.def.always || r.a !== 0 || r.z !== 0,
      ),
  })).filter((s) => s.rows.length);
  const every = COMPARE_STATS.map(
      (def) => (Number(mine[def.key]) || 0) - (Number(theirs[def.key]) || 0),
    ),
    ahead = every.filter((d) => d > 0).length,
    behind = every.filter((d) => d < 0).length;
  const gear = visibleSlots
    .map((slot) => ({
      slot,
      a: equipment.get(b.equipped[slot] || 0),
      z: equipment.get(ref.equippedB[slot] || 0),
    }))
    .filter((g) => g.a || g.z);
  const swapped = gear.filter((g) => g.a?.ankama_id !== g.z?.ankama_id);
  const shownGear = onlyChanges ? swapped : gear;
  return (
    <div className="cmp">
      <header className="cmp-head">
        <div>
          <span>Referencia</span>
          <strong>{ref.nameB || "Sin nombre"}</strong>
          <small>
            {resolveClassName(ref.classB, "es", null)} · nivel {ref.levelB}
          </small>
        </div>
        <figure>
          <CompareRadar statsA={mine} statsB={theirs} />
          <figcaption aria-live="polite">
            {ahead || behind || swapped.length ? (
              <>
                Tu build gana en <b className="positive">{ahead}</b> y pierde
                en <b className="negative">{behind}</b> estadísticas ·{" "}
                {swapped.length === 1
                  ? "1 pieza distinta"
                  : `${swapped.length} piezas distintas`}
              </>
            ) : (
              "Las dos builds son iguales. Cambia una pieza en el taller y vuelve aquí."
            )}
          </figcaption>
        </figure>
        <div>
          <span>Tu build</span>
          <strong>{b.buildName || "Borrador"}</strong>
          <small>
            {resolveClassName(b.selectedClass || "", "es", null)} · nivel{" "}
            {b.level}
          </small>
        </div>
      </header>
      <div className="cmp-actions">
        <label>
          <input
            type="checkbox"
            checked={onlyChanges}
            onChange={(e) => setOnlyChanges(e.target.checked)}
          />
          Solo diferencias
        </label>
        <button onClick={share} aria-live="polite">
          {copied ? "Enlace copiado" : "Copiar enlace de la comparación"}
        </button>
        <button
          onClick={() =>
            load(
              buildSnapshotFromState(useBuildStore.getState()),
              "Mi build al fijarla",
            )
          }
        >
          Fijar mi build actual como referencia
        </button>
        <button aria-expanded={picking} onClick={() => setPicking(!picking)}>
          Usar otra build…
        </button>
      </div>
      {picking && (
        <div className="cmp-pick">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void paste();
            }}
          >
            <label>
              Enlace o código de una build
              <input
                value={code}
                aria-invalid={!!error}
                aria-describedby={error ? "cmp-paste-error" : undefined}
                placeholder="https://dofusforge.com/es/?b=…"
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
              />
            </label>
            <button className="primary" disabled={!code.trim()}>
              Comparar
            </button>
            {error && (
              <p id="cmp-paste-error" role="alert">
                {error}
              </p>
            )}
          </form>
          <section aria-label="Builds de tu cuenta">
            <h4>De tu cuenta</h4>
            {!session ? (
              <p>Inicia sesión para elegir entre las builds que has guardado.</p>
            ) : !account ? (
              <p>Cargando tus builds…</p>
            ) : !account.length ? (
              <p>Todavía no has guardado ninguna build en tu cuenta.</p>
            ) : (
              <ul>
                {account.map((row) => (
                  <li key={row.id}>
                    <button onClick={() => load(row.snapshot, row.name)}>
                      <b>{row.name}</b>
                      <small>
                        {resolveClassName(row.class_slug, "es", null)} · nivel{" "}
                        {row.level}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-label="Builds guardadas en este dispositivo">
            <h4>En este dispositivo</h4>
            {!local.length ? (
              <p>No hay builds guardadas en este navegador.</p>
            ) : (
              <ul>
                {local.map((row) => (
                  <li key={row.id}>
                    <button
                      onClick={() => load(decodeBuild(row.encoded), row.name)}
                    >
                      <b>{row.name}</b>
                      <small>Guardada el {day.format(row.savedAt)}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      {sections.map((section) => (
        <section key={section.title} aria-label={section.title}>
          <h3>{section.title}</h3>
          <ul className="cmp-rows">
            {section.rows.map(({ def, a, z, diff }) => {
              const floor = Math.min(a, z, 0),
                sum = a + z - 2 * floor,
                share = sum ? ((a - floor) / sum) * 100 : 50;
              return (
                <li key={def.key}>
                  <span className="cmp-name">
                    <img src={statIconUrl(def.icon)} alt="" />
                    {t(def.tKey)}
                  </span>
                  <span className="cmp-z">
                    {group(z)}
                    {def.suffix}
                  </span>
                  <span
                    className="cmp-bar"
                    role="img"
                    aria-label={
                      diff > 0
                        ? "tu build por delante"
                        : diff < 0
                          ? "la referencia por delante"
                          : "iguales"
                    }
                  >
                    <i
                      className={diff < 0 ? "is-lead" : ""}
                      style={{ width: 100 - share + "%" }}
                    />
                    <i
                      className={diff > 0 ? "is-ahead" : ""}
                      style={{ width: share + "%" }}
                    />
                  </span>
                  <span className="cmp-a">
                    {group(a)}
                    {def.suffix}
                  </span>
                  <span
                    className={
                      "cmp-diff " +
                      (diff > 0 ? "positive" : diff < 0 ? "negative" : "")
                    }
                  >
                    {diff ? signed(diff) : "="}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {!sections.length && onlyChanges && (
        <p className="cmp-none">
          Ninguna estadística cambia. Desmarca «Solo diferencias» para ver la
          ficha completa de las dos builds.
        </p>
      )}
      {shownGear.length > 0 && (
        <section aria-label="Equipo">
          <h3>Equipo</h3>
          <ul className="cmp-gear">
            {shownGear.map(({ slot, a, z }) => {
              const same = a?.ankama_id === z?.ankama_id;
              return (
                <li key={slot} className={same ? "is-same" : ""}>
                  <span className="cmp-slot">{t("slot_" + slot)}</span>
                  <span className="cmp-piece">
                    {z ? (
                      <>
                        <img src={z.image_url || ""} alt="" />
                        {z.name}
                      </>
                    ) : (
                      <em>Vacío</em>
                    )}
                  </span>
                  <span className="cmp-piece">
                    {a ? (
                      <>
                        <img src={a.image_url || ""} alt="" />
                        {a.name}
                      </>
                    ) : (
                      <em>Vacío</em>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
