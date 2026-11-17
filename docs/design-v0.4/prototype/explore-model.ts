import { create } from "zustand";
import type {
  BuildVisibility,
  CommunityStats,
  ExploreSort,
  Tag,
} from "../../../src/features/builds/api";
import type { SheetBuild } from "./BuildSheet";
import type { BuildActivityValues } from "./BuildActivity";
import { CLASS_DATA } from "../../../src/features/class-picker/classData";
import { useLibraryStudy } from "./library-model";

export type ExploreRecord = {
  id: string;
  sheet: SheetBuild;
  activity: BuildActivityValues;
  owner: string;
  tags: Tag[];
  featured: boolean;
  visibility: BuildVisibility;
  description: string;
};
export type ExploreFilters = {
  search: string;
  classId: string;
  tag: string;
  sort: ExploreSort;
};
export type ExploreScene =
  | "normal"
  | "initial-error"
  | "more-error"
  | "loading"
  | "empty"
  | "slow"
  | "tags-error"
  | "stats-error"
  | "forge-null"
  | "stats-zero";
export const exploreScenes: ExploreScene[] = [
  "normal",
  "initial-error",
  "more-error",
  "loading",
  "empty",
  "slow",
  "tags-error",
  "stats-error",
  "forge-null",
  "stats-zero",
];
export const EXPLORE_PAGE_SIZE = 6;
export const exploreTags: Tag[] = (
  [
    ["pvp", "playstyle"],
    ["pvm", "playstyle"],
    ["xp", "playstyle"],
    ["kolo", "playstyle"],
    ["treasure", "playstyle"],
    ["boss", "playstyle"],
    ["dofus", "playstyle"],
    ["air", "element"],
    ["fire", "element"],
    ["earth", "element"],
    ["water", "element"],
    ["neutral", "element"],
    ["omni", "element"],
    ["critical", "general"],
    ["wisdom", "general"],
    ["budget", "general"],
    ["endgame", "general"],
    ["meta", "general"],
    ["fun", "general"],
    ["leveling", "general"],
  ] as const
).map(([name, category], i) => ({ id: i + 1, name, category }));
const defaults: ExploreFilters = {
  search: "",
  classId: "",
  tag: "",
  sort: "rating",
};
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const words = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFC")
    .match(/[\p{L}\p{N}]+/gu) || [];
export function matchExplore(records: ExploreRecord[], f: ExploreFilters) {
  // Mirrors the API's per-word prefix search over name + description, not author or equipment.
  const terms = f.search
    .trim()
    .split(/\s+/)
    .map((w) =>
      w
        .replace(/[^\p{L}\p{N}]/gu, "")
        .toLocaleLowerCase()
        .normalize("NFC"),
    )
    .filter(Boolean);
  const tag = exploreTags.find((t) => t.name === f.tag);
  return records
    .filter(
      (r) =>
        r.visibility === "public" &&
        (!f.classId || r.sheet.classId === f.classId) &&
        (!tag || r.tags.some((t) => t.id === tag.id)) &&
        terms.every((term) =>
          words(r.sheet.name + " " + r.description).some((word) =>
            word.startsWith(term),
          ),
        ),
    )
    .sort((a, b) => {
      const value = (r: ExploreRecord) =>
        f.sort === "rating"
          ? r.activity.avg_rating
          : f.sort === "likes"
            ? r.activity.like_count
            : f.sort === "views"
              ? r.activity.view_count
              : Date.parse(r.activity.created_at);
      return value(b) - value(a) || a.id.localeCompare(b.id);
    });
}
export function readExploreFilters(): ExploreFilters {
  const p = new URLSearchParams(location.search),
    sort = p.get("sort");
  return {
    search: p.get("q") || "",
    classId: CLASS_DATA.some((c) => c.id === p.get("class"))
      ? p.get("class")!
      : "",
    tag: p.get("tag") || "",
    sort:
      sort && ["rating", "likes", "recent", "views"].includes(sort)
        ? (sort as ExploreSort)
        : "rating",
  };
}
export function writeExploreFilters(f: ExploreFilters) {
  const p = new URLSearchParams(location.search);
  p.set("view", "explore");
  for (const [key, value] of Object.entries({
    q: f.search,
    class: f.classId,
    tag: f.tag,
    sort: f.sort === "rating" ? "" : f.sort,
  }))
    if (value) p.set(key, value);
    else p.delete(key);
  history.replaceState(null, "", "?" + p.toString());
}
type State = {
  records: ExploreRecord[];
  filters: ExploreFilters;
  rows: ExploreRecord[];
  total: number;
  page: number;
  initialized: boolean;
  loading: boolean;
  error: "initial" | "more" | null;
  scene: ExploreScene;
  request: number;
  metaRequest: number;
  scrollY: number;
  summaryOpen: boolean | null;
  stats: CommunityStats | null;
  statsState: "loading" | "ready" | "error";
  tagsState: "loading" | "ready" | "error";
  start: () => void;
  setFilters: (patch: Partial<ExploreFilters>) => void;
  load: (more?: boolean) => Promise<void>;
  loadMeta: () => Promise<void>;
  retryList: () => void;
  retryMeta: () => void;
  setScene: (scene: ExploreScene) => void;
  rememberScroll: () => void;
  setSummaryOpen: (open: boolean) => void;
};
export const useExploreStudy = create<State>((set, get) => ({
  records: [],
  filters: { ...defaults },
  rows: [],
  total: 0,
  page: 0,
  initialized: false,
  loading: false,
  error: null,
  scene: "normal",
  request: 0,
  metaRequest: 0,
  scrollY: 0,
  summaryOpen: null,
  stats: null,
  statsState: "loading",
  tagsState: "loading",
  start: () => {
    if (get().initialized) return;
    set({ initialized: true, filters: readExploreFilters() });
    void get().loadMeta();
    void get().load();
  },
  setFilters: (patch) => {
    const filters = { ...get().filters, ...patch };
    if (JSON.stringify(filters) === JSON.stringify(get().filters)) return;
    set({ filters, scrollY: 0 });
    void get().load();
  },
  load: async (more = false) => {
    if (
      more &&
      (get().loading ||
        get().rows.length >= get().total ||
        get().error === "initial")
    )
      return;
    const token = get().request + 1,
      next = more ? get().page + 1 : 0,
      filters = { ...get().filters },
      scene = get().scene;
    set({
      request: token,
      loading: true,
      error: null,
      ...(more ? {} : { rows: [], page: 0, total: 0 }),
    });
    await pause(scene === "slow" ? 1100 : 280);
    if (token !== get().request) return;
    if (scene === "loading") return;
    if (
      (scene === "initial-error" && !more) ||
      (scene === "more-error" && more) ||
      (scene === "tags-error" && !!filters.tag)
    ) {
      set({ loading: false, error: more ? "more" : "initial" });
      return;
    }
    const matches =
        scene === "empty" ? [] : matchExplore(get().records, filters),
      slice = matches.slice(
        next * EXPLORE_PAGE_SIZE,
        (next + 1) * EXPLORE_PAGE_SIZE,
      );
    set((s) => ({
      loading: false,
      error: null,
      page: next,
      total: matches.length,
      rows: more
        ? [
            ...s.rows,
            ...slice.filter(
              (r) => !s.rows.some((previous) => previous.id === r.id),
            ),
          ]
        : slice,
    }));
  },
  loadMeta: async () => {
    const token = get().metaRequest + 1,
      scene = get().scene;
    set({ metaRequest: token, statsState: "loading", tagsState: "loading" });
    await pause(260);
    if (token !== get().metaRequest) return;
    const all = get().records,
      visible = all.filter((r) => r.visibility === "public"),
      zero = scene === "stats-zero";
    const stats: CommunityStats = {
      usersCount: zero ? 0 : 4,
      buildsCount: zero ? 0 : all.length,
      publicBuildsCount: zero ? 0 : visible.length,
      likesCount: zero
        ? 0
        : visible.reduce((n, r) => n + r.activity.like_count, 0),
      viewsCount: zero
        ? 0
        : visible.reduce((n, r) => n + r.activity.view_count, 0),
      buildsThisWeek: zero
        ? 0
        : visible.filter((r) => r.activity.created_at >= "2026-11-11").length,
      forgeRunsCount: scene === "forge-null" ? null : zero ? 0 : 143,
      forgeFinishedCount: scene === "forge-null" ? null : zero ? 0 : 95,
    };
    set({
      stats: scene === "stats-error" ? null : stats,
      statsState: scene === "stats-error" ? "error" : "ready",
      tagsState: scene === "tags-error" ? "error" : "ready",
    });
  },
  setScene: (scene) => {
    set({ scene });
    void get().loadMeta();
    void get().load();
  },
  retryList: () => {
    const more = get().error === "more";
    if (["initial-error", "more-error", "tags-error"].includes(get().scene))
      set({ scene: "normal" });
    void get().load(more);
    if (get().tagsState === "error") void get().loadMeta();
  },
  retryMeta: () => {
    if (["tags-error", "stats-error"].includes(get().scene))
      set({ scene: "normal" });
    void get()
      .loadMeta()
      .then(() => {
        if (get().error === "initial" && get().filters.tag) void get().load();
      });
  },
  rememberScroll: () => set({ scrollY: window.scrollY }),
  setSummaryOpen: (summaryOpen) => set({ summaryOpen }),
}));
export function seedExplore(
  examples: (SheetBuild & { activity: BuildActivityValues })[],
) {
  const records: ExploreRecord[] = Array.from({ length: 18 }, (_, i) => {
    const base = examples[i % examples.length],
      copy = Math.floor(i / examples.length),
      sheet = {
        ...base,
        name: base.name + (copy ? " · " + ["", "II", "III"][copy] : ""),
      },
      created = new Date(base.activity.created_at);
    created.setUTCDate(created.getUTCDate() - copy * 6);
    const element = ["earth", "fire", "earth", "fire", "fire", "air"][i % 6],
      names = [
        sheet.tag.toLowerCase(),
        element,
        ["budget", "critical", "endgame", "meta", "fun", "leveling"][i % 6],
      ];
    return {
      id: `explore-${String(i).padStart(2, "0")}`,
      sheet,
      owner: ["caliza", "nebula", "pedernal"][i % 3],
      activity: {
        ...base.activity,
        avg_rating: Math.max(
          0,
          Number((base.activity.avg_rating - copy * 0.9).toFixed(1)),
        ),
        // Same shape as the API's timestamps (no milliseconds).
        created_at: created.toISOString().replace(".000Z", "Z"),
        like_count: base.activity.like_count + copy * 8,
        view_count: base.activity.view_count + copy * 200,
      },
      tags: exploreTags.filter((t) => names.includes(t.name)),
      featured: i === 0 || i === 10,
      visibility: "public",
      description: "Equipo de prueba para combates en grupo.",
    };
  });
  const hidden: ExploreRecord[] = ["private", "unlisted"].map(
    (visibility, i) => ({
      ...records[i],
      id: `explore-hidden-${visibility}`,
      sheet: { ...records[i].sheet, name: `Ejemplo ${visibility}` },
      visibility: visibility as BuildVisibility,
    }),
  );
  useExploreStudy.setState({ records: [...records, ...hidden] });
}
export function rememberExploreBuild(r: ExploreRecord) {
  useLibraryStudy.setState((s) => ({
    selectedBuild: r.id,
    builds: [
      ...s.builds.filter((b) => b.id !== r.id),
      {
        id: r.id,
        sheet: r.sheet,
        owner: r.owner,
        visibility: r.visibility,
        likes: r.activity.like_count,
        views: r.activity.view_count,
        comments: r.activity.comment_count,
        rating: r.activity.avg_rating,
        updated: r.activity.created_at,
      },
    ],
  }));
}
