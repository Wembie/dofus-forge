import { create } from "zustand";
import type {
  BuildVisibility,
  ReportReason,
  Tag,
} from "../../../src/features/builds/api";
import type { SlotId } from "../../../src/store/buildStore";
import type { SheetBuild } from "./BuildSheet";
import type { BuildActivityValues } from "./BuildActivity";
import { useAccountStudy } from "./account-model";
import { useLibraryStudy, type LibraryBuild } from "./library-model";
import {
  exploreTags,
  useExploreStudy,
  type ExploreRecord,
} from "./explore-model";

/** What the page needs from a build row, whichever list it was opened from. */
export type DetailBuild = {
  id: string;
  sheet: SheetBuild;
  owner: string;
  visibility: BuildVisibility;
  featured: boolean;
  tags: Tag[];
  activity: BuildActivityValues;
  description: string;
};
export type DetailComment = {
  id: string;
  author: string;
  created_at: string;
  /** Fixture text is a translation key so the four languages read naturally. */
  textKey?: string;
  text?: string;
  likes: number;
};
export type DetailVersion = {
  id: string;
  labelKey: string | null;
  created_at: string;
  sheet: SheetBuild;
};
export type DetailFork = {
  id: string;
  sheet: SheetBuild;
  owner: string;
  likes: number;
};
export type DetailScene =
  | "normal"
  | "loading"
  | "not-found"
  | "remix"
  | "remix-missing"
  | "quiet"
  | "action-error";
export const detailScenes: DetailScene[] = [
  "normal",
  "loading",
  "not-found",
  "remix",
  "remix-missing",
  "quiet",
  "action-error",
];
export type ReportTarget = { kind: "build" | "comment"; id: string };
export const COMMENT_MAX = 2000;
export const REPORT_DETAIL_MAX = 500;
/** The study's signed-in player; owner checks compare against it. */
export const STUDY_PLAYER = "brasa";

const pause = (ms = 380) => new Promise((r) => setTimeout(r, ms));

export function detailFromExplore(r: ExploreRecord): DetailBuild {
  return {
    id: r.id,
    sheet: r.sheet,
    owner: r.owner,
    visibility: r.visibility,
    featured: r.featured,
    tags: r.tags,
    activity: r.activity,
    description: r.description,
  };
}
export function detailFromLibrary(b: LibraryBuild): DetailBuild {
  return {
    id: b.id,
    sheet: b.sheet,
    owner: b.owner,
    visibility: b.visibility,
    featured: false,
    tags: exploreTags.filter((t) => b.tagIds?.includes(t.id)),
    activity: {
      avg_rating: b.rating,
      rating_count: b.rating ? 6 : 0,
      like_count: b.likes,
      view_count: b.views,
      comment_count: b.comments,
      created_at: b.updated,
    },
    description: "",
  };
}

/** Same piece in a different slot or none: an older version that reads as a real edit. */
function variant(sheet: SheetBuild, drop: SlotId[]): SheetBuild {
  const slots = { ...sheet.slots };
  for (const slot of drop) delete slots[slot];
  return { ...sheet, slots };
}
/** A moment between publication and the study's present, so no fixture is dated in the future. */
function after(iso: string, hours: number) {
  const start = Date.parse(iso),
    now = Date.parse("2026-11-17T13:00:00Z");
  return new Date(Math.min(start + hours * 3_600_000, now - 60_000 * (60 - hours))).toISOString();
}

type State = {
  build: DetailBuild | null;
  scene: DetailScene;
  admin: boolean;
  loading: boolean;
  liked: boolean;
  likeCount: number;
  bookmarked: boolean;
  myRating: number | null;
  featured: boolean;
  featureBusy: boolean;
  comments: DetailComment[];
  likedComments: string[];
  history: DetailVersion[];
  forks: DetailFork[];
  parent: DetailBuild | null | undefined;
  restoring: string | null;
  posting: boolean;
  notice: { kind: "ok" | "error"; key: string } | null;
  request: number;
  open: (build: DetailBuild | null) => Promise<void>;
  setScene: (scene: DetailScene) => void;
  setAdmin: (admin: boolean) => void;
  toggleLike: () => Promise<void>;
  toggleBookmark: () => Promise<void>;
  rate: (n: number) => Promise<void>;
  toggleFeatured: () => Promise<void>;
  toggleCommentLike: (id: string) => Promise<void>;
  postComment: (text: string) => Promise<boolean>;
  restore: (version: DetailVersion, build: DetailBuild) => Promise<boolean>;
  report: (
    target: ReportTarget,
    reason: ReportReason,
    detail: string,
  ) => Promise<"sent" | "duplicate" | "error">;
  clearNotice: () => void;
};
const reported = new Set<string>();

export const useBuildDetailStudy = create<State>((set, get) => {
  const failing = () => get().scene === "action-error";
  const signedIn = () => useAccountStudy.getState().signedIn;
  return {
    build: null,
    scene: "normal",
    admin: false,
    loading: false,
    liked: false,
    likeCount: 0,
    bookmarked: false,
    myRating: null,
    featured: false,
    featureBusy: false,
    comments: [],
    likedComments: [],
    history: [],
    forks: [],
    parent: undefined,
    restoring: null,
    posting: false,
    notice: null,
    request: 0,
    open: async (build) => {
      const token = get().request + 1,
        scene = get().scene;
      // Opening another build drops everything of the previous one first.
      set({
        request: token,
        build: null,
        loading: true,
        comments: [],
        history: [],
        forks: [],
        parent: undefined,
        likedComments: [],
        restoring: null,
        notice: null,
      });
      await pause(scene === "loading" ? 60_000 : 320);
      if (token !== get().request) return;
      if (!build || scene === "not-found") {
        set({ loading: false, build: null });
        return;
      }
      const quiet = scene === "quiet",
        records = useExploreStudy
          .getState()
          .records.filter((r) => r.visibility === "public" && r.id !== build.id),
        own = build.owner === STUDY_PLAYER;
      set({
        loading: false,
        build,
        featured: build.featured,
        likeCount: build.activity.like_count,
        liked: false,
        bookmarked: signedIn()
          ? useLibraryStudy.getState().bookmarks.includes(build.id)
          : false,
        myRating: signedIn() && !own ? 4 : null,
        comments: quiet
          ? []
          : [
              {
                id: build.id + "-c1",
                author: "nebula",
                created_at: after(build.activity.created_at, 2),
                textKey: "build_v4_fixture_comment_1",
                likes: 4,
              },
              {
                id: build.id + "-c2",
                author: STUDY_PLAYER,
                created_at: after(build.activity.created_at, 5),
                textKey: "build_v4_fixture_comment_2",
                likes: 1,
              },
              {
                id: build.id + "-c3",
                author: "pedernal",
                created_at: after(build.activity.created_at, 9),
                textKey: "build_v4_fixture_comment_3",
                likes: 0,
              },
            ],
        likedComments: signedIn() ? [build.id + "-c1"] : [],
        history: quiet
          ? []
          : [
              {
                id: build.id + "-v2",
                labelKey: "build_v4_fixture_version_2",
                created_at: after(build.activity.created_at, 1.5),
                sheet: variant(build.sheet, ["shield"]),
              },
              {
                id: build.id + "-v1",
                labelKey: null,
                created_at: after(build.activity.created_at, 0.5),
                sheet: variant(build.sheet, ["shield", "ring2", "dofus6"]),
              },
            ],
        forks: quiet
          ? []
          : records.slice(3, 5).map((r) => ({
              id: r.id,
              sheet: r.sheet,
              owner: r.owner,
              likes: r.activity.like_count,
            })),
        parent:
          scene === "remix"
            ? records[1]
              ? detailFromExplore(records[1])
              : null
            : scene === "remix-missing"
              ? null
              : undefined,
      });
    },
    setScene: (scene) => {
      set({ scene });
      void get().open(get().build ?? lastOpened);
    },
    setAdmin: (admin) => set({ admin }),
    toggleLike: async () => {
      if (!signedIn()) return;
      const was = get().liked;
      set((s) => ({ liked: !was, likeCount: s.likeCount + (was ? -1 : 1) }));
      await pause();
      if (failing())
        set((s) => ({
          liked: was,
          likeCount: s.likeCount + (was ? 1 : -1),
          notice: { kind: "error", key: "build_v4_action_error" },
        }));
    },
    toggleBookmark: async () => {
      if (!signedIn()) return;
      const was = get().bookmarked;
      set({ bookmarked: !was });
      await pause();
      if (failing())
        set({
          bookmarked: was,
          notice: { kind: "error", key: "build_v4_action_error" },
        });
      else
        set({
          notice: {
            kind: "ok",
            key: was ? "build_v4_unbookmarked" : "build_v4_bookmarked",
          },
        });
    },
    rate: async (n) => {
      if (!signedIn()) return;
      const before = get().myRating;
      set({ myRating: n });
      await pause();
      if (failing())
        set({
          myRating: before,
          notice: { kind: "error", key: "build_v4_action_error" },
        });
    },
    toggleFeatured: async () => {
      const next = !get().featured;
      set({ featureBusy: true });
      await pause();
      set(
        failing()
          ? {
              featureBusy: false,
              notice: { kind: "error", key: "build_v4_action_error" },
            }
          : { featureBusy: false, featured: next },
      );
    },
    toggleCommentLike: async (id) => {
      if (!signedIn()) return;
      const was = get().likedComments.includes(id);
      const apply = (liked: boolean) =>
        set((s) => ({
          likedComments: liked
            ? [...s.likedComments, id]
            : s.likedComments.filter((c) => c !== id),
          comments: s.comments.map((c) =>
            c.id === id ? { ...c, likes: c.likes + (liked ? 1 : -1) } : c,
          ),
        }));
      apply(!was);
      await pause();
      if (failing()) {
        apply(was);
        set({ notice: { kind: "error", key: "build_v4_action_error" } });
      }
    },
    postComment: async (text) => {
      const content = text.trim();
      if (!signedIn() || !content || content.length > COMMENT_MAX) return false;
      set({ posting: true });
      await pause(520);
      if (failing()) {
        set({
          posting: false,
          notice: { kind: "error", key: "build_v4_comment_error" },
        });
        return false;
      }
      set((s) => ({
        posting: false,
        // Oldest first, as the API returns them: a new comment lands at the end.
        comments: [
          ...s.comments,
          {
            id: "new-" + Date.now(),
            author: STUDY_PLAYER,
            created_at: new Date().toISOString(),
            text: content,
            likes: 0,
          },
        ],
      }));
      return true;
    },
    restore: async (version, build) => {
      if (build.owner !== STUDY_PLAYER || !signedIn()) return false;
      set({ restoring: version.id });
      await pause(700);
      if (failing()) {
        set({
          restoring: null,
          notice: { kind: "error", key: "build_v4_restore_error" },
        });
        return false;
      }
      // Opened from the dialog directory, away from the page: nothing on screen to update.
      if (get().build?.id !== build.id) {
        set({ restoring: null, notice: { kind: "ok", key: "build_v4_restored" } });
        return true;
      }
      // The current build is archived first, so a restore can itself be undone.
      set((s) => ({
        restoring: null,
        build: { ...build, sheet: { ...version.sheet, name: build.sheet.name } },
        history: [
          {
            id: build.id + "-v" + Date.now(),
            labelKey: "build_v4_before_restore",
            created_at: new Date().toISOString(),
            sheet: build.sheet,
          },
          ...s.history,
        ],
        notice: { kind: "ok", key: "build_v4_restored" },
      }));
      return true;
    },
    report: async (target, _reason, detail) => {
      await pause(520);
      if (failing() || detail.length > REPORT_DETAIL_MAX) return "error";
      const key = target.kind + ":" + target.id;
      if (reported.has(key)) return "duplicate";
      reported.add(key);
      return "sent";
    },
    clearNotice: () => set({ notice: null }),
  };
});
let lastOpened: DetailBuild | null = null;
export function openBuildDetail(build: DetailBuild | null) {
  lastOpened = build;
  void useBuildDetailStudy.getState().open(build);
}
