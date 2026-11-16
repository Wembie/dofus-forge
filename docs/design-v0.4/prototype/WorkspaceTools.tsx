import { useEffect, useState } from "react";
import { useBuildStore, type SlotId } from "../../../src/store/buildStore";
import { useDataStore } from "../../../src/store/dataStore";
import { CharacteristicsPanel } from "../../../src/features/characteristics/CharacteristicsPanel";
import { PassivesPanel } from "../../../src/features/passives/PassivesPanel";
import { CombatViewBar } from "../../../src/features/passives/CombatViewBar";
import { SpellsPanel } from "../../../src/features/spells/SpellsPanel";
import { PvpArena } from "../../../src/features/pvp/PvpArena";
import { Catalog } from "./Catalog";
import { Sets } from "./Sets";
import { SetBonusesPanel } from "../../../src/features/equipment/SetBonusesPanel";
import { RuneModal } from "../../../src/features/equipment/RuneModal";
import { ComparePanel } from "../../../src/features/compare/ComparePanel";
import { useCompareStore } from "../../../src/store/compareStore";
import { buildSnapshotFromState } from "../../../src/features/share/codec";
import { SharePanel } from "./SharePanel";
import { ChangelogModal } from "../../../src/features/changelog/ChangelogModal";
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
export const toolNames: Record<WorkspaceTool, string> = {
  characteristics: "Distribuir características",
  passives: "Pasivos de combate",
  spells: "Hechizos y arma",
  pvp: "Simular un combate",
  sets: "Panoplias",
  bonuses: "Bonificaciones de panoplia",
  compare: "Comparar dos builds",
  share: "Compartir y exportar",
  changelog: "Novedades",
  catalog: "Elegir un objeto",
  runes: "Forjamagia",
  identity: "Nombre y nivel",
};

export function WorkspaceTools({
  tool,
  slot = "hat",
  onClose,
}: {
  tool: WorkspaceTool | null;
  slot?: SlotId;
  onClose: () => void;
}) {
  const b = useBuildStore(),
    data = useDataStore(),
    [runeSlot, setRuneSlot] = useState(slot);
  useEffect(() => setRuneSlot(slot), [slot]);
  useEffect(() => {
    if (tool === "compare" && !useCompareStore.getState().statsB)
      useCompareStore
        .getState()
        .loadBuild(
          buildSnapshotFromState(b),
          "Equipo de referencia",
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
    return <RuneModal slotId={runeSlot} item={selected} onClose={onClose} />;
  if (tool === "changelog") return <ChangelogModal onClose={onClose} />;
  return (
    <Modal
      open
      onClose={onClose}
      title={toolNames[tool]}
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
            Nombre del build
            <input
              maxLength={60}
              value={b.buildName}
              onChange={(e) => b.setBuildName(e.target.value)}
              placeholder="Ponle nombre a tu equipo"
            />
          </label>
          <label>
            Nivel
            <input
              type="number"
              min={1}
              max={200}
              value={b.level}
              onChange={(e) => b.setLevel(Number(e.target.value))}
            />
          </label>
          <p>
            El nivel actualiza el presupuesto de características y los cálculos
            del equipo.
          </p>
          <button onClick={onClose} className="primary">
            Listo
          </button>
        </div>
      )}
      {tool === "characteristics" && <CharacteristicsPanel />}
      {tool === "passives" && (
        <>
          <CombatViewBar />
          <PassivesPanel
            items={Object.values(b.equipped).flatMap((id) =>
              equipment.get(id!) ? [equipment.get(id!)!] : [],
            )}
            state={b.passives}
            onChange={b.setPassive}
            onReset={() =>
              Object.keys(b.passives).forEach((id) => b.setPassive(id, 0))
            }
          />
        </>
      )}
      {tool === "spells" && (
        <>
          <CombatViewBar />
          <SpellsPanel />
        </>
      )}
      {tool === "pvp" && (
        <>
          <CombatViewBar />
          <PvpArena />
        </>
      )}
      {tool === "bonuses" && <SetBonusesPanel />}
      {tool === "compare" && <ComparePanel />}
      {tool === "share" && <SharePanel />}
      {tool === "runes" && !selected && (
        <p>Equipa un objeto en este espacio para editar sus runas.</p>
      )}
    </Modal>
  );
}
