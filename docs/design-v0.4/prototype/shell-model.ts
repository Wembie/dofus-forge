import { create } from "zustand";
import type { NotificationRow } from "../../../src/features/builds/api";

export type NotificationScene = "normal" | "empty" | "slow" | "many";
export const notificationScenes: NotificationScene[] = ["normal", "empty", "slow", "many"];

const NOW = Date.parse("2026-11-17T13:00:00Z");
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

/** One of each production notification type, on the study's example builds and players. */
function fixtures(many: boolean): NotificationRow[] {
  const base: NotificationRow[] = [
    { id: "n1", type: "build_commented", read: false, created_at: ago(14), actor: { username: "nebula", avatar_url: null }, build: { id: "library-0", name: "Yopuka · Tierra" }, build_id: "library-0" },
    { id: "n2", type: "new_follower", read: false, created_at: ago(55), actor: { username: "caliza", avatar_url: null }, build: null, build_id: null },
    { id: "n3", type: "build_liked", read: false, created_at: ago(180), actor: { username: "pedernal", avatar_url: null }, build: { id: "library-0", name: "Yopuka · Tierra" }, build_id: "library-0" },
    { id: "n4", type: "build_rated", read: true, created_at: ago(60 * 26), actor: { username: "caliza", avatar_url: null }, build: { id: "library-3", name: "Distancia justa" }, build_id: "library-3" },
    { id: "n5", type: "build_forked", read: true, created_at: ago(60 * 50), actor: { username: "nebula", avatar_url: null }, build: { id: "library-0", name: "Yopuka · Tierra" }, build_id: "library-0" },
    { id: "n6", type: "comment_replied", read: true, created_at: ago(60 * 24 * 4), actor: { username: "pedernal", avatar_url: null }, build: { id: "explore-01", name: "Entre bambúes" }, build_id: "explore-01" },
    { id: "n7", type: "comment_liked", read: true, created_at: ago(60 * 24 * 9), actor: null, build: { id: "explore-02", name: "Guardia de piedra" }, build_id: "explore-02" },
  ];
  if (!many) return base;
  return [
    ...Array.from({ length: 9 }, (_, i): NotificationRow => ({
      id: "m" + i,
      type: i % 2 ? "build_liked" : "comment_liked",
      read: false,
      created_at: ago(2 + i * 3),
      actor: { username: ["caliza", "nebula", "pedernal"][i % 3], avatar_url: null },
      build: { id: "library-0", name: "Yopuka · Tierra" },
      build_id: "library-0",
    })),
    ...base,
  ];
}

type State = {
  scene: NotificationScene;
  items: NotificationRow[] | null;
  unread: number;
  open: boolean;
  updateAvailable: boolean;
  setScene: (scene: NotificationScene) => void;
  setOpen: (open: boolean) => void;
  load: () => Promise<void>;
  markAll: () => void;
  markRead: (id: string) => void;
  setUpdateAvailable: (on: boolean) => void;
};
const unreadOf = (items: NotificationRow[]) => items.filter((n) => !n.read).length;

export const useShellStudy = create<State>((set, get) => ({
  scene: "normal",
  items: null,
  unread: unreadOf(fixtures(false)),
  open: false,
  updateAvailable: false,
  setScene: (scene) => {
    const items = scene === "empty" ? [] : fixtures(scene === "many");
    set({ scene, items: null, unread: unreadOf(items) });
    if (get().open) void get().load();
  },
  setOpen: (open) => {
    set({ open });
    if (open) void get().load();
  },
  // Production fetches the list each time the panel opens.
  load: async () => {
    const scene = get().scene;
    set({ items: null });
    await new Promise((r) => setTimeout(r, scene === "slow" ? 60_000 : 280));
    if (get().scene !== scene || !get().open) return;
    const kept = get().unread,
      items = scene === "empty" ? [] : fixtures(scene === "many");
    // Read state survives reopening: keep the count the player already cleared.
    let toClear = unreadOf(items) - kept;
    set({
      items: items.map((n) => (!n.read && toClear-- > 0 ? { ...n, read: true } : n)),
    });
  },
  markAll: () =>
    set((s) => ({ items: s.items?.map((n) => ({ ...n, read: true })) ?? null, unread: 0 })),
  markRead: (id) =>
    set((s) => {
      const target = s.items?.find((n) => n.id === id);
      if (!target || target.read) return s;
      return {
        items: s.items!.map((n) => (n.id === id ? { ...n, read: true } : n)),
        unread: Math.max(0, s.unread - 1),
      };
    }),
  setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),
}));
