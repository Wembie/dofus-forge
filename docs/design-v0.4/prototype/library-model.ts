import { create } from "zustand";
import type { BuildVisibility } from "../../../src/features/builds/api";
import { ALL_SLOTS, type BuildSnapshot } from "../../../src/store/buildStore";
import { useAccountStudy } from "./account-model";
import type { SheetBuild } from "./BuildSheet";

export interface LibraryBuild {
  id: string;
  sheet: SheetBuild;
  owner: string;
  visibility: BuildVisibility;
  likes: number;
  views: number;
  comments: number;
  rating: number;
  updated: string;
}
export interface LibraryCollection {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  builds: string[];
}
export type LibraryTab = "mine" | "bookmarked" | "collections";
export type LibraryDialogId =
  | "rename"
  | "visibility"
  | "delete-build"
  | "collection-new"
  | "collection-edit"
  | "collection-picker"
  | "collection-delete";
export const libraryDialogIds: string[] = [
  "rename",
  "visibility",
  "delete-build",
  "collection-new",
  "collection-edit",
  "collection-picker",
  "collection-delete",
];
export const LIBRARY_NAME_MAX = 60;
export const COLLECTION_DESCRIPTION_MAX = 300;
type State = {
  builds: LibraryBuild[];
  collections: LibraryCollection[];
  bookmarks: string[];
  tab: LibraryTab;
  selectedBuild: string;
  selectedCollection: string;
  response: "success" | "error" | "forbidden" | "membership-error";
  viewState: "ready" | "loading" | "error" | "empty";
  visitor: boolean;
  busyIds: string[];
  selectBuild: (id: string) => void;
  selectCollection: (id: string) => void;
  setTab: (tab: LibraryTab) => void;
  review: (
    patch: Partial<Pick<State, "response" | "viewState" | "visitor">>,
  ) => void;
  patchBuild: (
    id: string,
    patch: { name?: string; visibility?: BuildVisibility },
  ) => Promise<void>;
  deleteBuild: (id: string) => Promise<void>;
  saveCollection: (
    id: string | null,
    name: string,
    description: string,
    is_public: boolean,
  ) => Promise<string>;
  deleteCollection: (id: string) => Promise<void>;
  membership: (
    collectionId: string,
    buildId: string,
    inside: boolean,
  ) => Promise<void>;
  bookmark: (id: string) => Promise<void>;
};
const delay = () => new Promise((resolve) => setTimeout(resolve, 450));
let sequence = 0;
/** Isolated examples: no cloud or legacy device-save writes. */
export const useLibraryStudy = create<State>((set, get) => {
  async function authorize(owner = true) {
    await delay();
    if (
      !useAccountStudy.getState().signedIn ||
      !owner ||
      get().response === "forbidden"
    )
      throw Error("forbidden");
    if (get().response === "error") throw Error("connection");
  }
  return {
    builds: [],
    collections: [],
    bookmarks: ["library-4", "library-5"],
    tab: "mine",
    selectedBuild: "library-0",
    selectedCollection: "collection-0",
    response: "success",
    viewState: "ready",
    visitor: false,
    busyIds: [],
    selectBuild: (selectedBuild) => set({ selectedBuild }),
    selectCollection: (selectedCollection) => set({ selectedCollection }),
    setTab: (tab) => set({ tab }),
    review: (patch) => set(patch),
    patchBuild: async (id, patch) => {
      await authorize(get().builds.find((b) => b.id === id)?.owner === "brasa");
      set((s) => ({
        builds: s.builds.map((b) =>
          b.id === id
            ? {
                ...b,
                visibility: patch.visibility ?? b.visibility,
                sheet: { ...b.sheet, name: patch.name ?? b.sheet.name },
              }
            : b,
        ),
      }));
    },
    deleteBuild: async (id) => {
      await authorize(get().builds.find((b) => b.id === id)?.owner === "brasa");
      set((s) => ({
        builds: s.builds.filter((b) => b.id !== id),
        bookmarks: s.bookmarks.filter((b) => b !== id),
        collections: s.collections.map((c) => ({
          ...c,
          builds: c.builds.filter((b) => b !== id),
        })),
      }));
    },
    saveCollection: async (id, name, description, is_public) => {
      await authorize(
        !get().visitor && (!id || get().collections.some((c) => c.id === id)),
      );
      if (
        !name.trim() ||
        name.trim().length > LIBRARY_NAME_MAX ||
        description.length > COLLECTION_DESCRIPTION_MAX
      )
        throw Error("invalid");
      const key = id || `collection-new-${++sequence}`;
      const patch = {
        name: name.trim(),
        description: description.trim() || null,
        is_public,
      };
      set((s) => ({
        collections: id
          ? s.collections.map((c) => (c.id === id ? { ...c, ...patch } : c))
          : [{ id: key, builds: [], ...patch }, ...s.collections],
      }));
      return key;
    },
    deleteCollection: async (id) => {
      await authorize(!get().visitor);
      set((s) => ({
        collections: s.collections.filter((c) => c.id !== id),
        tab: "collections",
      }));
    },
    membership: async (collectionId, buildId, inside) => {
      const key = `${collectionId}/${buildId}`;
      if (get().busyIds.includes(key)) return;
      const before =
        get()
          .collections.find((c) => c.id === collectionId)
          ?.builds.includes(buildId) ?? false;
      const apply = (inList: boolean) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  builds: inList
                    ? [...new Set([...c.builds, buildId])]
                    : c.builds.filter((id) => id !== buildId),
                }
              : c,
          ),
        }));
      set((s) => ({ busyIds: [...s.busyIds, key] }));
      apply(inside);
      try {
        await authorize(!get().visitor);
        if (get().response === "membership-error") throw Error("connection");
      } catch (e) {
        apply(before);
        throw e;
      } finally {
        set((s) => ({ busyIds: s.busyIds.filter((id) => id !== key) }));
      }
    },
    bookmark: async (id) => {
      await authorize();
      set((s) => ({
        bookmarks: s.bookmarks.includes(id)
          ? s.bookmarks.filter((b) => b !== id)
          : [...s.bookmarks, id],
      }));
    },
  };
});
export function seedLibrary(sheets: SheetBuild[]) {
  const builds = sheets.map(
    (sheet, i): LibraryBuild => ({
      id: `library-${i}`,
      sheet,
      owner: i < 4 ? "brasa" : i === 4 ? "caliza" : "nebula",
      visibility:
        i === 1 ? "private" : i === 2 || i === 5 ? "unlisted" : "public",
      likes: [12, 0, 3, 7, 24, 2][i] || 0,
      views: 125 + i * 32,
      comments: i + 1,
      rating: 4.2 + i / 10,
      updated: `2026-11-${String(17 - i).padStart(2, "0")}T12:00:00Z`,
    }),
  );
  useLibraryStudy.setState({
    builds,
    collections: [
      {
        id: "collection-0",
        name: "Equipos para mazmorras",
        description:
          "Alternativas para cambiar de estrategia sin empezar de cero.",
        is_public: true,
        builds: ["library-0", "library-1", "library-4", "library-5"],
      },
      {
        id: "collection-1",
        name: "Ideas para PvP",
        description: "Variantes por probar antes del próximo combate.",
        is_public: false,
        builds: ["library-2", "library-3"],
      },
      {
        id: "collection-2",
        name: "Próximos ensayos",
        description: null,
        is_public: false,
        builds: [],
      },
    ],
  });
}
export function collectionBuilds(c: LibraryCollection, visitor: boolean) {
  return c.builds
    .flatMap((id) => {
      const b = useLibraryStudy.getState().builds.find((b) => b.id === id);
      return b ? [b] : [];
    })
    .filter(
      (b) =>
        !visitor ||
        b.visibility === "public" ||
        (b.visibility === "unlisted" && b.owner === "brasa"),
    );
}
export function librarySnapshot(b: LibraryBuild): BuildSnapshot {
  const a = b.sheet.allocated || {};
  return {
    v: 1,
    c: b.sheet.classId,
    n: b.sheet.name,
    l: b.sheet.level,
    g: b.sheet.gender === "female" ? "f" : "m",
    a: [
      a.vitality || 0,
      0,
      a.strength || 0,
      a.intelligence || 0,
      a.chance || 0,
      a.agility || 0,
    ],
    s: 63,
    e: ALL_SLOTS.map((slot) => b.sheet.slots[slot] || null),
  };
}
