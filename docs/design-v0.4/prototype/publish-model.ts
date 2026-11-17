import { create } from "zustand";
import type { BuildVisibility } from "../../../src/features/builds/api";
import { useBuildStore, type SlotId } from "../../../src/store/buildStore";
import type { DofusClass } from "../../../src/engine/types";
import type { SheetBuild } from "./BuildSheet";
import { useLibraryStudy, type LibraryBuild } from "./library-model";
import { exploreTags, useExploreStudy } from "./explore-model";
import { STUDY_PLAYER } from "./build-detail-model";

/** Same limits as production: MAX_BUILD_TAGS and the name field's maxLength. */
export const PUBLISH_MAX_TAGS = 5;
export const PUBLISH_NAME_MAX = 60;
export type PublishResponse = "normal" | "slow" | "error" | "limit" | "tags-error";
export const publishResponses: PublishResponse[] = [
  "normal",
  "slow",
  "error",
  "limit",
  "tags-error",
];
/** Which build the workshop holds: a new one, its own published one, a remix, or someone else's edit link. */
export type PublishLink = "new" | "update" | "remix" | "foreign-edit";
export const publishLinks: PublishLink[] = ["new", "update", "remix", "foreign-edit"];

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const STORE_KEY = "forge-design-published";

export type PublishPrefill = {
  name: string;
  visibility: BuildVisibility;
  tagIds: number[];
};
type State = {
  response: PublishResponse;
  tagsState: "loading" | "ready" | "error";
  setResponse: (r: PublishResponse) => void;
  loadTags: () => Promise<void>;
  /** Mirrors fetchBuildById for the linked build; null when it isn't the player's. */
  prefill: (
    id: string,
  ) => Promise<PublishPrefill | { foreign: BuildVisibility } | null>;
  submit: (input: {
    name: string;
    visibility: BuildVisibility;
    tagIds: number[];
    linkedBuildId: string | null;
    forkOf: string | null;
  }) => Promise<{ id: string } | { error: "error" | "limit" }>;
};

function sheetFromWorkshop(name: string): SheetBuild {
  const b = useBuildStore.getState();
  return {
    name,
    classId: (b.selectedClass || "iop") as DofusClass,
    gender: b.gender,
    level: b.level,
    tag: "PvM",
    slots: { ...b.equipped } as Partial<Record<SlotId, number>>,
    allocated: { ...b.allocated },
  };
}
function remember(build: LibraryBuild) {
  try {
    const list: LibraryBuild[] = JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]");
    sessionStorage.setItem(
      STORE_KEY,
      JSON.stringify([...list.filter((b) => b.id !== build.id), build]),
    );
  } catch {
    /* Only this page keeps it. */
  }
}
/** Builds published from the workshop page reach the other study page through the session. */
export function restorePublished() {
  try {
    const list: LibraryBuild[] = JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]");
    if (list.length)
      useLibraryStudy.setState((s) => ({
        builds: [...list, ...s.builds.filter((b) => !list.some((p) => p.id === b.id))],
      }));
  } catch {
    /* Nothing stored. */
  }
}
let sequence = 0;

export const usePublishStudy = create<State>((set, get) => ({
  response: "normal",
  tagsState: "loading",
  setResponse: (response) => {
    set({ response });
    void get().loadTags();
  },
  loadTags: async () => {
    set({ tagsState: "loading" });
    await pause(240);
    set({ tagsState: get().response === "tags-error" ? "error" : "ready" });
  },
  prefill: async (id) => {
    await pause(get().response === "slow" ? 1400 : 420);
    const own = useLibraryStudy.getState().builds.find((b) => b.id === id);
    if (own && own.owner === STUDY_PLAYER)
      return {
        name: own.sheet.name,
        visibility: own.visibility,
        tagIds:
          own.tagIds ??
          exploreTags
            .filter((t) => ["pvm", "earth", "budget"].includes(t.name))
            .map((t) => t.id),
      };
    const other =
      own ?? useExploreStudy.getState().records.find((r) => r.id === id);
    return other ? { foreign: other.visibility } : null;
  },
  submit: async ({ name, visibility, tagIds, linkedBuildId }) => {
    await pause(get().response === "slow" ? 1600 : 650);
    const r = get().response;
    if (r === "error") return { error: "error" };
    if (r === "limit" && !linkedBuildId) return { error: "limit" };
    const lib = useLibraryStudy.getState(),
      existing = linkedBuildId
        ? lib.builds.find((b) => b.id === linkedBuildId)
        : undefined,
      id = existing?.id ?? `published-${Date.now()}-${++sequence}`,
      build: LibraryBuild = {
        id,
        sheet: sheetFromWorkshop(name),
        owner: STUDY_PLAYER,
        visibility,
        likes: existing?.likes ?? 0,
        views: existing?.views ?? 0,
        comments: existing?.comments ?? 0,
        rating: existing?.rating ?? 0,
        updated: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
        tagIds,
      };
    useLibraryStudy.setState((s) => ({
      builds: [build, ...s.builds.filter((b) => b.id !== id)],
    }));
    remember(build);
    const store = useBuildStore.getState();
    store.setBuildName(name);
    store.setLinkedBuildId(id);
    store.setForkOf(null);
    return { id };
  },
}));
