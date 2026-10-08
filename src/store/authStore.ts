import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase.ts'

export type Profile = {
  id:               string
  username:         string
  display_name:     string | null
  bio:              string | null
  avatar_url:       string | null
  followers_count:  number
  following_count:  number
  builds_count:     number
}

export type ProfileEdits = {
  display_name?: string | null
  bio?:          string | null
  avatar_url?:   string | null
}

type AuthState = {
  session:     Session | null
  profile:     Profile | null
  loading:     boolean   // true until the initial session check resolves
  initialized: boolean

  init:           () => void
  signUp:         (email: string, password: string, username: string, captchaToken: string) => Promise<{ error: string | null }>
  signIn:         (email: string, password: string, captchaToken: string) => Promise<{ error: string | null }>
  signOut:        () => Promise<void>
  updateUsername: (username: string) => Promise<{ error: string | null }>
  updateProfile:  (edits: ProfileEdits) => Promise<{ error: string | null }>
  uploadAvatar:   (file: File) => Promise<{ url: string | null; error: string | null }>
}

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/
// SVG excluded deliberately — it can carry embedded <script>/event handlers.
const AVATAR_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
export const AVATAR_ACCEPT = Object.keys(AVATAR_TYPES).join(',')
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export function isAcceptedAvatarType(type: string): boolean {
  return type in AVATAR_TYPES
}
// avatar_url is rendered as <img src> for every viewer of a public profile —
// restrict to http(s) so a saved `javascript:`/`data:` URI can't reach that sink.
const SAFE_URL_RE = /^https?:\/\//i

// Guard applied at every <img src={...}> render site, not just on save — the
// live preview in ProfileModal renders the raw input on every keystroke,
// before updateProfile() ever runs its own check.
export function isSafeImageUrl(url: string | null | undefined): url is string {
  return !!url && SAFE_URL_RE.test(url)
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, followers_count, following_count, builds_count')
    .eq('id', userId)
    .single()
  if (error) {
    // Swallowed everywhere else in this store (session still works without a
    // profile), but silent failures here are what made a missing/blocked
    // profiles row look like "the app just shows my email" with no clue why.
    console.error('fetchProfile failed:', error)
    return null
  }
  return data
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session:     null,
  profile:     null,
  loading:     true,
  initialized: false,

  init: () => {
    if (get().initialized) return
    set({ initialized: true })

    getSupabase().then(async supabase => {
      const { data: { session } } = await supabase.auth.getSession()
      const profile = session ? await fetchProfile(session.user.id) : null
      set({ session, profile, loading: false })

      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        const newProfile = newSession ? await fetchProfile(newSession.user.id) : null
        set({ session: newSession, profile: newProfile, loading: false })
      })
    })
  },

  signUp: async (email, password, username, captchaToken) => {
    if (!USERNAME_RE.test(username)) return { error: 'invalid_username' }

    const supabase = await getSupabase()
    // Pre-check before hitting the auth server — handle_new_user's trigger would
    // also reject a taken username (unique constraint), but only after creating
    // the auth.users row, surfacing as an opaque 500 instead of a clean message.
    const { data: existing } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle()
    if (existing) return { error: 'username_taken' }

    // Without emailRedirectTo, Supabase falls back to the dashboard's "Site URL"
    // (defaults to http://localhost:3000 on a fresh project) for the confirmation
    // email's link — always explicit here so it works regardless of that setting.
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: redirectTo, data: { username }, captchaToken },
    })
    return { error: error?.message ?? null }
  },

  signIn: async (email, password, captchaToken) => {
    const supabase = await getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
    return { error: error?.message ?? null }
  },

  signOut: async () => {
    const supabase = await getSupabase()
    await supabase.auth.signOut()
  },

  updateUsername: async (username) => {
    const session = get().session
    if (!session) return { error: 'Not signed in' }
    // Mirrors the DB CHECK constraint (profiles.username_format) so the
    // error shows up before round-tripping to Postgres.
    if (!USERNAME_RE.test(username)) return { error: 'invalid_username' }

    const supabase = await getSupabase()
    const { error } = await supabase.from('profiles').update({ username }).eq('id', session.user.id)
    if (error) {
      // Postgres unique_violation
      return { error: error.code === '23505' ? 'username_taken' : error.message }
    }
    set(s => ({ profile: s.profile ? { ...s.profile, username } : s.profile }))
    return { error: null }
  },

  updateProfile: async (edits) => {
    const session = get().session
    if (!session) return { error: 'Not signed in' }
    if (edits.avatar_url && !SAFE_URL_RE.test(edits.avatar_url)) return { error: 'invalid_avatar_url' }

    const supabase = await getSupabase()
    const { error } = await supabase.from('profiles').update(edits).eq('id', session.user.id)
    if (error) return { error: error.message }
    set(s => ({ profile: s.profile ? { ...s.profile, ...edits } : s.profile }))
    return { error: null }
  },

  uploadAvatar: async (file) => {
    const session = get().session
    if (!session) return { url: null, error: 'Not signed in' }

    const ext = AVATAR_TYPES[file.type]
    if (!ext) return { url: null, error: 'invalid_avatar_type' }
    if (file.size > AVATAR_MAX_BYTES) return { url: null, error: 'avatar_too_large' }

    const supabase = await getSupabase()
    const path = `${session.user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' })
    if (error) return { url: null, error: error.message }

    // Cache-bust: same path on every re-upload (upsert), so the URL alone
    // wouldn't change and <img> would keep showing the stale cached image.
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return { url: `${data.publicUrl}?t=${Date.now()}`, error: null }
  },
}))
