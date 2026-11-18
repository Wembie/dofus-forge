import { useState, useRef } from "react";
import { Copy, Download, Check, AlertCircle } from "lucide-react";
import { toPng } from "html-to-image";
import { useBuildStore } from "../../../src/store/buildStore";
import { encodeBuild } from "../../../src/features/share/codec";
import { useClassName } from "../../../src/features/class-picker/useClassName";
import { langPathRootSegment } from "../../../src/i18n/langPath";
import { useAccountLocale } from "./Account";
import { equipment, visibleSlots } from "./model";
import labels from "./stat-labels.json";
import type { StatBlock } from "../../../src/engine/types";
import type { SlotId } from "../../../src/store/buildStore";

/** As ShareBar: the build link in the page's language (English has no prefix). */
function shareUrl(lang: string) {
  const path = langPathRootSegment(lang);
  return `https://dofusforge.com/${path}?b=${encodeBuild(useBuildStore.getState())}`;
}

export function SharePanel() {
  const { t, i18n } = useAccountLocale(),
    b = useBuildStore(),
    cls = useClassName(b.selectedClass),
    ref = useRef<HTMLDivElement>(null),
    [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  const ready = Boolean(b.selectedClass && b.stats),
    url = b.selectedClass ? shareUrl(i18n.language) : "";
  const slotName = (slot: SlotId) =>
    slot === "companion" ? t("build_v4_slot_companion") : t("slot_" + slot);
  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ ok: true, text: t("copied") });
    } catch {
      setMessage({ ok: false, text: t("share_v4_copy_error") });
    }
  }
  async function download() {
    if (!ready || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await document.fonts.ready;
      await Promise.all(
        [...ref.current!.querySelectorAll("img")].map((img) => img.decode().catch(() => {})),
      );
      const png = await toPng(ref.current!, { pixelRatio: 2, backgroundColor: "#111615" });
      const link = document.createElement("a");
      link.href = png;
      // Production's name: dofus-<class>-lv<level>.png
      link.download = `dofus-${(cls || b.selectedClass || "build").toLowerCase().replace(/\s+/g, "-")}-lv${b.level}.png`;
      link.click();
      setMessage({ ok: true, text: t("share_v4_downloaded") });
    } catch {
      setMessage({ ok: false, text: t("share_v4_download_error") });
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <div className="surface-form">
        <p>{t("share_v4_no_class")}</p>
      </div>
    );
  const stats = b.stats!,
    entries = Object.entries(labels) as [keyof StatBlock, string][];
  return (
    <div className="surface-form">
      <p>{t("share_v4_intro")}</p>
      <label>
        {t("share_v4_link_label")}
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <div className="share-actions">
        <button className="primary" onClick={copy} title={t("copy_url_title")}>
          <Copy size={16} />
          {t("share_v4_copy")}
        </button>
        <button onClick={download} disabled={busy} title={t("export_btn_title")}>
          <Download size={16} />
          {busy ? t("exporting") : t("share_v4_download")}
        </button>
        <button onClick={() => setShow(!show)} aria-expanded={show}>
          {t(show ? "share_v4_preview_hide" : "share_v4_preview_show")}
        </button>
      </div>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "" : "inline-error"}>
          {message.ok ? <Check size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </p>
      )}
      <div className={show ? "share-preview" : "share-offscreen"} aria-hidden={!show}>
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
              <p style={{ font: "12px IBM Plex Mono", color: "#e4b28b", letterSpacing: 2, margin: "0 0 12px" }}>
                {t("share_v4_sheet_kicker")}
              </p>
              <h2 style={{ font: "600 44px Alegreya", margin: 0 }}>{b.buildName || cls}</h2>
              <p style={{ fontSize: 16, color: "#a1aaa0", margin: "12px 0 0" }}>
                {t("export_level")} {b.level} · {cls} · {t(b.gender === "male" ? "gender_male" : "gender_female")}
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
              <b style={{ font: "700 28px Barlow Condensed", letterSpacing: 1 }}>DOFUS FORGE</b>
            </div>
          </header>
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 36, paddingTop: 28 }}>
            <aside>
              <img
                src={"/data/classes/" + b.selectedClass + (b.gender === "female" ? "-f" : "") + ".webp"}
                width={144}
                height={160}
                alt=""
                style={{ objectFit: "contain", display: "block", margin: "0 auto 24px" }}
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
                      padding: "8px 0",
                      borderBottom: "1px solid #343c35",
                      minHeight: 49,
                    }}
                  >
                    {it?.image_url ? (
                      <img src={it.image_url} width={30} height={34} alt="" style={{ objectFit: "contain" }} />
                    ) : (
                      <span style={{ width: 30 }} />
                    )}
                    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ font: "10px IBM Plex Mono", color: "#a1aaa0", letterSpacing: 0.5 }}>
                        {slotName(slot)}
                      </span>
                      <span style={{ fontSize: 13, lineHeight: 1.35, color: it ? "#e9e8df" : "#a1aaa0" }}>
                        {it?.name || t("share_v4_empty_slot")}
                      </span>
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
                {(["maxHp", "ap", "mp", "range", "critChance", "power"] as const).map((key) => (
                  <div key={key}>
                    <span style={{ fontSize: 13, color: "#a1aaa0" }}>{labels[key]}</span>
                    <strong
                      style={{
                        display: "block",
                        font: "400 32px IBM Plex Mono",
                        marginTop: 6,
                        // As the export card: a penalty that pushes AP, MP or range below zero shows in red.
                        color: (stats[key] as number) < 0 ? "#e79a92" : undefined,
                      }}
                    >
                      {stats[key]}
                    </strong>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px", paddingTop: 20 }}>
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
                    <b style={{ font: "400 12px IBM Plex Mono", textAlign: "right" }}>
                      {typeof stats[key] === "number"
                        ? (stats[key] as number)
                        : Object.keys(stats.unknownStats).length
                          ? Object.entries(stats.unknownStats)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")
                          : t("share_v4_none")}
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
            <span>{t("share_v4_footer")}</span>
            <span>dofusforge.com</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
