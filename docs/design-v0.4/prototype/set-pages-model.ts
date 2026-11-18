import { create } from "zustand";
import {
  GUIDE_ELEMENTS,
  LEVEL_BRACKETS,
  elementScore,
  fullSetTotals,
  gearTotals,
  setClass,
  setLevel,
  setSlugs,
  statElements,
  type GuideElement,
  type SetLink,
  type StatTotal,
} from "../../../src/data/setGuide";
import { CLASS_DATA } from "../../../src/features/class-picker/classData";
import { useDataStore } from "../../../src/store/dataStore";
import type { AppItem, AppSet } from "../../../src/data/loaders";
import type { SheetBuild } from "./BuildSheet";
import { useExploreStudy } from "./explore-model";
import { useLibraryStudy } from "./library-model";

/**
 * Mirrors setPages.server.ts (prerender-only, it reads the files from disk):
 * one entry per set with a known item, sorted by level then name. The study's
 * catalogue is Spanish, so its slugs come from Spanish names; production slugs
 * them from the English catalogue so a set keeps one path in every language.
 */
export type SetEntry = SetLink & {
  set: AppSet;
  items: AppItem[];
  totals: StatTotal[];
  scores: Record<GuideElement, number>;
};
export type SetFilters = { q: string; element: GuideElement | ""; bracket: string };
export const bracketKey = ([min, max]: readonly [number, number]) => `${min}-${max}`;
export { GUIDE_ELEMENTS, LEVEL_BRACKETS };

const RELATED = 6,
  BUILDS = 6;

function build(classBySpell: Map<number, string>): SetEntry[] {
  const data = useDataStore.getState();
  if (!data.sets || !data.equipment) return [];
  const items = new Map(data.equipment.map((it) => [it.ankama_id, it]));
  const slugs = setSlugs(data.sets, new Set(items.keys()));
  const entries: SetEntry[] = [];
  for (const set of data.sets) {
    const slug = slugs.get(set.ankama_id);
    if (!slug) continue;
    const pieces = set.items
      .flatMap((id) => items.get(id) ?? [])
      .sort((a, b) => b.level - a.level || a.ankama_id - b.ankama_id);
    const totals = fullSetTotals(set, pieces);
    entries.push({
      id: set.ankama_id,
      slug,
      name: set.name,
      level: setLevel(pieces),
      pieces: pieces.length,
      icon: pieces[0]?.image_url ?? null,
      elements: statElements(totals),
      classId: setClass(pieces, classBySpell),
      set,
      items: pieces,
      totals: totals.list(),
      scores: Object.fromEntries(GUIDE_ELEMENTS.map((el) => [el, elementScore(totals, el)])) as Record<GuideElement, number>,
    });
  }
  return entries.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, "es"));
}

/** Production's loadSetPage: tiers, related sets and the public builds that wear a piece. */
export function setPage(entries: SetEntry[], slug: string) {
  const entry = entries.find((e) => e.slug === slug);
  if (!entry) return null;
  const tiers = Object.entries(entry.set.bonuses)
    .map(([pieces, effects]) => ({ pieces: Number(pieces), effects }))
    .sort((a, b) => a.pieces - b.pieces);
  // Closest in level, sharing an element when this set has one.
  const related = entries
    .filter(
      (e) =>
        e.id !== entry.id &&
        (entry.elements.length === 0 || e.elements.some((el) => entry.elements.includes(el))),
    )
    .sort((a, b) => Math.abs(a.level - entry.level) - Math.abs(b.level - entry.level) || b.pieces - a.pieces)
    .slice(0, RELATED);
  const ids = new Set(entry.set.items),
    wears = (sheet: SheetBuild) => Object.values(sheet.slots).some((id) => id != null && ids.has(id));
  const builds = [
    ...useExploreStudy
      .getState()
      .records.filter((r) => r.visibility === "public" && wears(r.sheet))
      .map((r) => ({ id: r.id, sheet: r.sheet, owner: r.owner, rating: r.activity.avg_rating, likes: r.activity.like_count })),
    ...useLibraryStudy
      .getState()
      .builds.filter((b) => b.visibility === "public" && wears(b.sheet))
      .map((b) => ({ id: b.id, sheet: b.sheet, owner: b.owner, rating: b.rating, likes: b.likes })),
  ].slice(0, BUILDS);
  return { entry, tiers, related, builds };
}
export type SetPageData = NonNullable<ReturnType<typeof setPage>>;

/**
 * Production's loadClassBuildGuide: the three strongest sets of each element in every level
 * bracket, the sets made for the class, and up to eight of its public builds with the elements
 * their gear plays.
 */
export function classGuide(entries: SetEntry[], classId: string) {
  const byElement = Object.fromEntries(
    GUIDE_ELEMENTS.map((el) => [
      el,
      LEVEL_BRACKETS.map(([min, max]) => ({
        min,
        max,
        sets: entries
          .filter((e) => e.level >= min && e.level <= max && e.scores[el] > 0 && e.elements.includes(el))
          .sort((a, b) => b.scores[el] - a.scores[el])
          .slice(0, 3),
      })).filter((b) => b.sets.length > 0),
    ]),
  ) as Record<GuideElement, { min: number; max: number; sets: SetEntry[] }[]>;
  const data = useDataStore.getState(),
    items = new Map((data.equipment ?? []).map((it) => [it.ankama_id, it])),
    setsById = new Map((data.sets ?? []).map((st) => [st.ankama_id, st])),
    gear = (sheet: SheetBuild) =>
      Object.values(sheet.slots).flatMap((id) => (id != null && items.has(id) ? [items.get(id)!] : []));
  const builds = [
    ...useExploreStudy
      .getState()
      .records.filter((r) => r.visibility === "public" && r.sheet.classId === classId)
      .map((r) => ({ id: r.id, sheet: r.sheet, owner: r.owner, rating: r.activity.avg_rating, likes: r.activity.like_count })),
    ...useLibraryStudy
      .getState()
      .builds.filter((b) => b.visibility === "public" && b.sheet.classId === classId)
      .map((b) => ({ id: b.id, sheet: b.sheet, owner: b.owner, rating: b.rating, likes: b.likes })),
  ]
    .slice(0, 8)
    .map((b) => ({ ...b, elements: statElements(gearTotals(gear(b.sheet), setsById)) }));
  return { byElement, classSets: entries.filter((e) => e.classId === classId), builds };
}

type State = {
  entries: SetEntry[];
  classes: "loading" | "ready" | "error";
  scene: "normal" | "no-builds";
  start: () => void;
  setScene: (scene: State["scene"]) => void;
};
let started = false,
  classBySpell = new Map<number, string>();
export const useSetPagesStudy = create<State>((set) => ({
  entries: [],
  classes: "loading",
  scene: "normal",
  start: () => {
    if (started) return;
    set({ entries: build(classBySpell) });
    started = true;
    // Class sets are found through the spells their pieces modify, as the prerender does.
    void Promise.all(
      CLASS_DATA.map((c) =>
        fetch(`/data/en/spells/${c.id}.json`)
          .then((r) => r.json() as Promise<{ spells: { id: number }[] }>)
          .then(({ spells }) => spells.map((s) => [s.id, c.id] as const)),
      ),
    ).then(
      (lists) => {
        classBySpell = new Map(lists.flat());
        set({ entries: build(classBySpell), classes: "ready" });
      },
      () => set({ classes: "error" }),
    );
  },
  setScene: (scene) => set({ scene }),
}));

// Kept across the index and a set page, so coming back finds the same filters.
let last: SetFilters | null = null;
export function readSetFilters(): SetFilters {
  const p = new URLSearchParams(location.search);
  if (last && !p.has("q") && !p.has("element") && !p.has("level")) return last;
  const
    element = p.get("element") as GuideElement | null;
  return {
    q: p.get("q") || "",
    element: element && GUIDE_ELEMENTS.includes(element) ? element : "",
    bracket: LEVEL_BRACKETS.some((b) => bracketKey(b) === p.get("level")) ? p.get("level")! : "",
  };
}
export function writeSetFilters(f: SetFilters) {
  last = f;
  const p = new URLSearchParams(location.search);
  for (const [key, value] of Object.entries({ q: f.q, element: f.element, level: f.bracket }))
    if (value) p.set(key, value);
    else p.delete(key);
  history.replaceState(null, "", "?" + p.toString());
}
