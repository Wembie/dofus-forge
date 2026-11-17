import {
  RANK_COLORS,
  type PublicCustomRank,
} from "../../../src/features/ranks/catalog";
import { create } from "zustand";
import type { Profile, ProfileEdits } from "../../../src/store/authStore";
import { USERNAME_RE } from "../../../src/features/auth/authRules";
import type {
  MembershipTier,
  PublicProfile,
  FollowProfile,
} from "../../../src/features/builds/api";

export type AccountScenario =
  | "success"
  | "taken"
  | "offline"
  | "partial"
  | "password-error"
  | "follow-error"
  | "signout-error";
type Person = PublicProfile & {
  tier: MembershipTier;
  rank?: PublicCustomRank;
  builds: number;
  likes: number;
  comments: number;
};
const own: Profile = {
  id: "study-player",
  username: "brasa",
  display_name: "Brasa",
  bio: "Siempre hay una pieza que cambia el resto.",
  avatar_url: null,
  role: "user",
  followers_count: 3,
  following_count: 2,
  builds_count: 6,
};
export const people: Person[] = [
  {
    id: "caliza",
    tier: "artisan",
    rank: {
      name: "Colaborador",
      description: "Apoya el taller y su comunidad.",
      icon: "anvil",
      color: RANK_COLORS[0],
      badgeStyle: "standard",
    },
    username: "caliza",
    display_name: "Caliza",
    bio: "Equipos para llevar la calma a cada combate.",
    avatar_url: null,
    created_at: "2026-05-14T12:00:00Z",
    followers_count: 14,
    following_count: 8,
    builds: 3,
    likes: 24,
    comments: 7,
  },
  {
    id: "nebula",
    tier: "free",
    username: "nebula",
    display_name: "Nébula",
    bio: "Probando otras formas de jugar.",
    avatar_url: null,
    created_at: "2026-06-21T12:00:00Z",
    followers_count: 8,
    following_count: 5,
    builds: 2,
    likes: 12,
    comments: 4,
  },
  {
    id: "pedernal",
    tier: "free",
    username: "pedernal",
    display_name: "Pedernal",
    bio: null,
    avatar_url: null,
    created_at: "2026-07-03T12:00:00Z",
    followers_count: 4,
    following_count: 6,
    builds: 0,
    likes: 0,
    comments: 0,
  },
];
interface AccountStudy {
  profile: Profile;
  signedIn: boolean;
  scenario: AccountScenario;
  dirty: boolean;
  following: string[];
  followBusy: string[];
  publicUsername: string;
  emptyPeople: boolean;
  setScenario: (scenario: AccountScenario) => void;
  setSignedIn: (value: boolean) => void;
  setDirty: (value: boolean) => void;
  showProfile: (username: string) => void;
  setEmptyPeople: (value: boolean) => void;
  updateUsername: (username: string) => Promise<{ error: string | null }>;
  updateProfile: (edits: ProfileEdits) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  listPeople: (
    kind: "followers" | "following",
    userId: string,
  ) => Promise<FollowProfile[]>;
  toggleFollow: (id: string) => Promise<{ error: string | null }>;
}
const delay = () => new Promise((resolve) => setTimeout(resolve, 500));
/** In-memory fixtures only. These methods never reach Supabase or replace its auth store. */
export const useAccountStudy = create<AccountStudy>((set, get) => ({
  profile: { ...own },
  signedIn: true,
  scenario: "success",
  dirty: false,
  following: ["caliza", "nebula"],
  followBusy: [],
  publicUsername: "brasa",
  emptyPeople: false,
  setScenario: (scenario) => set({ scenario }),
  setSignedIn: (signedIn) => set({ signedIn }),
  setDirty: (dirty) => set({ dirty }),
  showProfile: (publicUsername) => set({ publicUsername }),
  setEmptyPeople: (emptyPeople) => set({ emptyPeople }),
  updateUsername: async (username) => {
    await delay();
    if (!get().signedIn) return { error: "signed_out" };
    if (get().scenario === "offline") throw Error("offline");
    if (!USERNAME_RE.test(username)) return { error: "invalid_username" };
    if (
      get().scenario === "taken" ||
      people.some((p) => p.username === username)
    )
      return { error: "username_taken" };
    set((s) => ({
      profile: { ...s.profile, username },
      publicUsername:
        s.publicUsername === s.profile.username ? username : s.publicUsername,
    }));
    return { error: null };
  },
  updateProfile: async (edits) => {
    await delay();
    if (!get().signedIn) return { error: "signed_out" };
    if (get().scenario === "offline") throw Error("offline");
    if (get().scenario === "partial") return { error: "profile_error" };
    set((s) => ({ profile: { ...s.profile, ...edits } }));
    return { error: null };
  },
  updatePassword: async () => {
    await delay();
    if (!get().signedIn) return { error: "signed_out" };
    if (get().scenario === "offline") throw Error("offline");
    return {
      error: get().scenario === "password-error" ? "password_error" : null,
    };
  },
  signOut: async () => {
    await delay();
    if (["offline", "signout-error"].includes(get().scenario))
      throw Error("signout_error");
    set({ signedIn: false, dirty: false });
  },
  listPeople: async (kind, userId) => {
    await delay();
    if (get().scenario === "offline") throw Error("offline");
    if (get().emptyPeople) return [];
    return kind === "followers"
      ? people
      : people.filter((p) =>
          userId === "study-player"
            ? get().following.includes(p.id)
            : p.id !== "pedernal",
        );
  },
  toggleFollow: async (id) => {
    const before = get();
    if (!before.signedIn) return { error: "signed_out" };
    if (id === before.profile.id || before.followBusy.includes(id))
      return { error: null };
    const carried = before.following.includes(id);
    set((s) => ({
      following: carried
        ? s.following.filter((p) => p !== id)
        : [...s.following, id],
      followBusy: [...s.followBusy, id],
      profile: {
        ...s.profile,
        following_count: s.profile.following_count + (carried ? -1 : 1),
      },
    }));
    await delay();
    const failure = ["offline", "follow-error"].includes(get().scenario);
    if (failure)
      set((s) => ({
        following: carried
          ? [...s.following, id]
          : s.following.filter((p) => p !== id),
        profile: {
          ...s.profile,
          following_count: s.profile.following_count + (carried ? 1 : -1),
        },
      }));
    set((s) => ({ followBusy: s.followBusy.filter((p) => p !== id) }));
    return { error: failure ? "follow_error" : null };
  },
}));
export const accountEmail = "player@example.com";
export const accountJoined = "2026-04-12T12:00:00Z";
export function publicPerson(username: string): Person | null {
  const { profile, following } = useAccountStudy.getState();
  if (username === profile.username)
    return {
      ...profile,
      tier: "free",
      created_at: accountJoined,
      builds: 3,
      likes: 18,
      comments: 6,
    };
  const person = people.find((p) => p.username === username);
  return person
    ? {
        ...person,
        followers_count:
          person.followers_count + (following.includes(person.id) ? 1 : 0),
      }
    : null;
}
