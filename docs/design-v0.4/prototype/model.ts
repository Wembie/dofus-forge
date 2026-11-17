import {
  useBuildStore,
  ALL_SLOTS,
  recompute,
  type SlotId,
} from "../../../src/store/buildStore";
import { useDataStore } from "../../../src/store/dataStore";
import {
  useHistoryStore,
  trackBuildChange,
} from "../../../src/store/historyStore";
import { encodeBuild, decodeBuild } from "../../../src/features/share/codec";
import type { AppItem } from "../../../src/data/loaders";

export const visibleSlots: SlotId[] = [
  "hat",
  "cape",
  "weapon",
  "shield",
  "amulet",
  "ring1",
  "ring2",
  "belt",
  "boots",
  "dofus1",
  "dofus2",
  "dofus3",
  "dofus4",
  "dofus5",
  "dofus6",
  "companion",
  "sidekick",
];
export const seedItems = [
  9461, 958, 8098, 18670, 9464, 8877, 8991, 9143, 8861, 694, 737, 739, 972,
  6980, 7043, 0, 0,
];
export let equipment = new Map<number, AppItem>();
export let names = new Map<number, string>();
const key = "forge-design-v3-draft";
export async function prepareModel() {
  await useDataStore.getState().load("es");
  const data = useDataStore.getState();
  if (data.error || !data.equipment || !data.sets)
    throw new Error(data.error || "No se pudo cargar el catálogo");
  equipment = new Map(data.equipment.map((item) => [item.ankama_id, item]));
  names = new Map(data.equipment.map((item) => [item.ankama_id, item.name]));
  const build = useBuildStore.getState();
  build.setClass("iop");
  build.setAllocated({
    vitality: 395,
    wisdom: 0,
    strength: 300,
    intelligence: 0,
    chance: 0,
    agility: 0,
  });
  build.setAllScrolls(true);
  build.equipMultiple(
    visibleSlots
      .map((slot, i) => ({ slot, ankama_id: seedItems[i] }))
      .filter((item) => item.ankama_id > 0),
  );
  try {
    const params = new URLSearchParams(location.search),
      linked = params.get("b"),
      saved =
        linked ||
        sessionStorage.getItem("forge-design-workspace") ||
        localStorage.getItem(key);
    const snap = saved && decodeBuild(saved);
    if (snap) build.applySnapshot(snap);
    // As useBuildUrl: a link from a build page carries &edit= (yours) or &fork= (a remix).
    if (snap && linked) {
      const edit = params.get("edit"),
        fork = params.get("fork");
      if (edit) build.setLinkedBuildId(edit);
      else if (fork) build.setForkOf(fork);
    }
  } catch {
    /* Default build remains available. */
  }
  useHistoryStore.getState().clear();
  trackBuildChange(useBuildStore.getState());
  window.addEventListener("pagehide", () => {
    try {
      sessionStorage.setItem(
        "forge-design-workspace",
        encodeBuild(useBuildStore.getState()),
      );
    } catch {
      /* The in-memory build remains available. */
    }
  });
}
export function saveModel() {
  localStorage.setItem(key, encodeBuild(useBuildStore.getState()));
}
export function previewItems(items: number[]) {
  const b = useBuildStore.getState(),
    equipped = { ...b.equipped },
    runes = { ...b.runes };
  visibleSlots.forEach((slot, i) => {
    if (equipped[slot] !== items[i]) runes[slot] = {};
    if (items[i]) equipped[slot] = items[i];
    else delete equipped[slot];
  });
  return recompute(
    b.selectedClass,
    b.level,
    b.allocated,
    b.scrolled,
    equipped,
    b._equipment,
    b._sets,
    runes,
  )!;
}
export function previousStats() {
  const b = useBuildStore.getState(),
    past = useHistoryStore.getState().past,
    snap = decodeBuild(past.at(-2) || past.at(-1) || "");
  if (!snap) return b.stats!;
  const characteristics = [
    "vitality",
    "wisdom",
    "strength",
    "intelligence",
    "chance",
    "agility",
  ] as const;
  const allocated = Object.fromEntries(
    characteristics.map((c, i) => [c, snap.a[i]]),
  ) as typeof b.allocated;
  const scrolled = Object.fromEntries(
    characteristics.map((c, i) => [c, Boolean(snap.s & (1 << i))]),
  ) as typeof b.scrolled;
  const eq = Object.fromEntries(
    ALL_SLOTS.flatMap((s, i) => (snap.e[i] ? [[s, snap.e[i]]] : [])),
  );
  return recompute(
    b.selectedClass,
    snap.l,
    allocated,
    scrolled,
    eq,
    b._equipment,
    b._sets,
    snap.r || {},
  )!;
}
