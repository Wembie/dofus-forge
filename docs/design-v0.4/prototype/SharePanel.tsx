import { useState, useRef } from "react";
import { Copy, Download, Check } from "lucide-react";
import { toPng } from "html-to-image";
import { useBuildStore } from "../../../src/store/buildStore";
import { encodeBuild } from "../../../src/features/share/codec";
import { useClassName } from "../../../src/features/class-picker/useClassName";
import { equipment, visibleSlots } from "./model";
import labels from "./stat-labels.json";
import type { StatBlock } from "../../../src/engine/types";

export function SharePanel() {
  const b = useBuildStore(),
    cls = useClassName(b.selectedClass),
    ref = useRef<HTMLDivElement>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  const url = `https://dofusforge.com/es?b=${encodeBuild(b)}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Enlace copiado.");
    } catch {
      setMessage(
        "No se pudo copiar. Selecciona el enlace y cópialo manualmente.",
      );
    }
  }
  async function download() {
    setBusy(true);
    setMessage("");
    try {
      await document.fonts.ready;
      await Promise.all(
        [...ref.current!.querySelectorAll("img")].map((img) =>
          img.decode().catch(() => {}),
        ),
      );
      const png = await toPng(ref.current!, {
        pixelRatio: 1,
        backgroundColor: "#111615",
      });
      const link = document.createElement("a");
      link.href = png;
      link.download = "dofus-forge-build.png";
      link.click();
      setMessage("Imagen preparada.");
    } catch {
      setMessage("No se pudo generar la imagen. Puedes volver a intentarlo.");
    } finally {
      setBusy(false);
    }
  }
  const stats = b.stats!,
    entries = Object.entries(labels) as [keyof StatBlock, string][];
  return (
    <div className="surface-form">
      <p>
        El enlace conserva equipo, runas, características, nombre y pasivos.
        Abre la build en Dofus Forge.
      </p>
      <label>
        Enlace de tu build
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <div className="share-actions">
        <button className="primary" onClick={copy}>
          <Copy size={16} />
          Copiar enlace
        </button>
        <button onClick={download} disabled={busy}>
          <Download size={16} />
          {busy ? "Preparando imagen…" : "Descargar ficha"}
        </button>
        <button onClick={() => setShow(!show)}>
          {show ? "Ocultar" : "Ver"} vista previa
        </button>
      </div>
      {message && (
        <p role="status">
          <Check size={14} />
          {message}
        </p>
      )}
      <div
        className={show ? "share-preview" : "share-offscreen"}
        aria-hidden={!show}
      >
        <div
          ref={ref}
          className="export-sheet"
          style={{
            background: "#111615",
            color: "#e9e8df",
            width: 1200,
            padding: 44,
            fontFamily: "Source Sans 3, sans-serif",
          }}
        >
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 28,
              borderBottom: "1px solid #343c35",
            }}
          >
            <div>
              <p
                style={{
                  font: "12px IBM Plex Mono",
                  color: "#e4b28b",
                  letterSpacing: 2,
                  margin: "0 0 12px",
                }}
              >
                FICHA DE EQUIPO
              </p>
              <h2 style={{ font: "600 44px Alegreya", margin: 0 }}>
                {b.buildName || cls}
              </h2>
              <p style={{ fontSize: 16, color: "#a1aaa0", margin: "12px 0 0" }}>
                Nivel {b.level} · {cls} ·{" "}
                {b.gender === "male" ? "Masculino" : "Femenino"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <img
                src="/design-assets/forge-mark.svg"
                width={56}
                height={56}
                alt=""
                style={{ filter: "brightness(0) invert(1)" }}
              />
              <b
                style={{ font: "700 28px Barlow Condensed", letterSpacing: 1 }}
              >
                DOFUS FORGE
              </b>
            </div>
          </header>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "230px 1fr",
              gap: 36,
              paddingTop: 28,
            }}
          >
            <aside>
              <img
                src={
                  "/data/classes/" +
                  b.selectedClass +
                  (b.gender === "female" ? "-f" : "") +
                  ".webp"
                }
                width={144}
                height={160}
                alt=""
                style={{
                  objectFit: "contain",
                  display: "block",
                  margin: "0 auto 24px",
                }}
              />
              {visibleSlots.map((slot) => {
                const it = equipment.get(b.equipped[slot] || 0);
                return (
                  <div
                    key={slot}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "9px 0",
                      borderBottom: "1px solid #343c35",
                      minHeight: 49,
                    }}
                  >
                    {it?.image_url ? (
                      <img
                        src={it.image_url}
                        width={30}
                        height={34}
                        alt=""
                        style={{ objectFit: "contain" }}
                      />
                    ) : (
                      <span style={{ width: 30 }} />
                    )}
                    <span
                      style={{
                        fontSize: 13,
                        lineHeight: 1.4,
                        color: it ? "#e9e8df" : "#a1aaa0",
                      }}
                    >
                      {it?.name || "Espacio vacío"}
                    </span>
                  </div>
                );
              })}
            </aside>
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 18,
                  paddingBottom: 26,
                  borderBottom: "1px solid #343c35",
                }}
              >
                {(
                  ["maxHp", "ap", "mp", "range", "critChance", "power"] as const
                ).map((key) => (
                  <div key={key}>
                    <span style={{ fontSize: 13, color: "#a1aaa0" }}>
                      {labels[key]}
                    </span>
                    <strong
                      style={{
                        display: "block",
                        font: "400 32px IBM Plex Mono",
                        marginTop: 6,
                      }}
                    >
                      {stats[key]}
                    </strong>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0 28px",
                  paddingTop: 20,
                }}
              >
                {entries.map(([key, label]) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "8px 0",
                      borderBottom: "1px solid #272e29",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "#a1aaa0" }}>{label}</span>
                    <b
                      style={{
                        font: "400 12px IBM Plex Mono",
                        textAlign: "right",
                      }}
                    >
                      {typeof stats[key] === "number"
                        ? (stats[key] as number)
                        : Object.keys(stats.unknownStats).length
                          ? Object.entries(stats.unknownStats)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")
                          : "Ninguno"}
                    </b>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <footer
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#a1aaa0",
              paddingTop: 24,
              marginTop: 28,
              borderTop: "1px solid #343c35",
            }}
          >
            <span>
              Estadísticas de equipo · 73 campos · sin activar pasivos de
              combate
            </span>
            <span>dofusforge.com</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
