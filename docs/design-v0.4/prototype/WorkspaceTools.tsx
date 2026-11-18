import { useEffect, useState } from "react";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { useBuildStore, type SlotId } from "../../../src/store/buildStore";
import { useDataStore } from "../../../src/store/dataStore";
import { Characteristics } from "./Characteristics";
import { Passives } from "./Passives";
import { Spells } from "./Spells";
import { Combat } from "./Combat";
import { Catalog } from "./Catalog";
import { Sets } from "./Sets";
import { SetBonuses, Changelog } from "./SetBonuses";
import { Runes } from "./Runes";
import { Compare } from "./Compare";
import { useCompareStore } from "../../../src/store/compareStore";
import { buildSnapshotFromState } from "../../../src/features/share/codec";
import { SharePanel } from "./SharePanel";
import { Modal } from "./SurfaceModal";
import { equipment } from "./model";

export type WorkspaceTool =
  | "characteristics"
  | "passives"
  | "spells"
  | "pvp"
  | "sets"
  | "bonuses"
  | "compare"
  | "share"
  | "changelog"
  | "catalog"
  | "runes"
  | "identity";
/** Translation key of each tool's name. */
export const toolNameKeys: Record<WorkspaceTool, string> = {
  characteristics: "fx_v4_tool_characteristics",
  passives: "fx_v4_tool_passives",
  spells: "fx_v4_tool_spells",
  pvp: "fx_v4_tool_pvp",
  sets: "fx_v4_tool_sets",
  bonuses: "fx_v4_tool_bonuses",
  compare: "fx_v4_tool_compare",
  share: "fx_v4_tool_share",
  changelog: "changelog_title",
  catalog: "fx_v4_tool_catalog",
  runes: "magesmithy",
  identity: "fx_v4_tool_identity",
};
/** Display names, translated each time they are read, for callers that index or iterate them as plain strings. */
export const toolNames = Object.defineProperties(
  {} as Record<WorkspaceTool, string>,
  Object.fromEntries(
    Object.entries(toolNameKeys).map(([tool, key]) => [
      tool,
      { enumerable: true, get: () => i18n.t(key) },
    ]),
  ),
);
/** Tool name in the page's language, re-rendering when the language changes. */
export function useToolName() {
  const { t } = useTranslation();
  return (tool: WorkspaceTool) => t(toolNameKeys[tool]);
}

export function WorkspaceTools({
  tool,
  slot = "hat",
  onClose,
}: {
  tool: WorkspaceTool | null;
  slot?: SlotId;
  onClose: () => void;
}) {
  const { t } = useTranslation(),
    toolName = useToolName(),
    b = useBuildStore(),
    data = useDataStore(),
    [runeSlot, setRuneSlot] = useState(slot);
  useEffect(() => setRuneSlot(slot), [slot]);
  useEffect(() => {
    if (tool === "compare" && !useCompareStore.getState().statsB)
      useCompareStore
        .getState()
        .loadBuild(
          buildSnapshotFromState(b),
          t("fx_v4_tool_reference_name"),
          data.equipment || [],
          data.sets || [],
        );
  }, [tool]);
  useEffect(() => {
    if (tool === "compare")
      return useCompareStore.subscribe((state, previous) => {
        if (previous.active && !state.active) onClose();
      });
  }, [tool, onClose]);
  useEffect(() => {
    if ((tool === "spells" || tool === "pvp") && b.selectedClass)
      void data.loadSpells("es", b.selectedClass);
  }, [tool, b.selectedClass]);
  if (!tool) return null;
  const selected = equipment.get(b.equipped[runeSlot] || 0);
  if (tool === "catalog") return <Catalog slot={slot} onClose={onClose} />;
  if (tool === "sets") return <Sets onClose={onClose} />;
  if (tool === "runes" && selected)
    return <Runes slot={runeSlot} item={selected} onClose={onClose} />;
  return (
    <Modal
      open
      onClose={onClose}
      title={toolName(tool)}
      size={
        tool === "compare" || tool === "spells"
          ? "4xl"
          : tool === "pvp"
            ? "3xl"
            : "xl"
      }
    >
      {tool === "identity" && (
        <div className="surface-form">
          <label>
            {t("build_name_label")}
            <input
              maxLength={60}
              value={b.buildName}
              onChange={(e) => b.setBuildName(e.target.value)}
              placeholder={t("fx_v4_tool_name_placeholder")}
            />
          </label>
          <label>
            {t("level")}
            <input
              type="number"
              min={1}
              max={200}
              value={b.level}
              onChange={(e) => b.setLevel(Number(e.target.value))}
            />
          </label>
          <p>{t("fx_v4_tool_level_hint")}</p>
          <button onClick={onClose} className="primary">
            {t("fx_v4_tool_done")}
          </button>
        </div>
      )}
      {tool === "characteristics" && <Characteristics />}
      {tool === "passives" && <Passives />}
      {tool === "spells" && <Spells />}
      {tool === "pvp" && <Combat />}
      {tool === "bonuses" && <SetBonuses />}
      {tool === "changelog" && <Changelog />}
      {tool === "compare" && <Compare />}
      {tool === "share" && <SharePanel />}
      {tool === "runes" && !selected && (
        <p>{t("fx_v4_tool_runes_empty")}</p>
      )}
    </Modal>
  );
}
