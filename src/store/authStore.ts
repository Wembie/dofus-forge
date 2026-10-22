import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase.ts'

export type Profile = {
  id:               string
  username:         string
  role:             'user' | 'moderator' | 'admin'
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
  // True from the moment Supabase reports a PASSWORD_RECOVERY auth event
  // (user followed the email link) until updatePassword() succeeds — lets
  // the UI force the "set a new password" modal open regardless of what
  // page the recovery link landed on.
  passwordRecovery: boolean

  init:                 () => void
  signUp:               (email: string, password: string, username: string, captchaToken: string) => Promise<{ error: string | null }>
  signIn:               (email: string, password: string, captchaToken: string) => Promise<{ error: string | null }>
  signOut:              () => Promise<void>
  updateUsername:       (username: string) => Promise<{ error: string | null }>
  updateProfile:        (edits: ProfileEdits) => Promise<{ error: string | null }>
  uploadAvatar:         (file: File) => Promise<{ url: string | null; error: string | null }>
  requestPasswordReset: (email: string, captchaToken: string) => Promise<{ error: string | null }>
  updatePassword:       (newPassword: string) => Promise<{ error: string | null }>
  clearPasswordRecovery: () => void
}

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/
// SVG excluded deliberately — it can carry embedded <script>/event handlers.
const AVATAR_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
export const AVATAR_ACCEPT = Object.keys(AVATAR_TYPES).join(',')
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export function isAcceptedAvatarType(type: string): boolean {
  return type in AVATAR_TYPES
}

// Avatars render at 14–72px, yet the original upload (up to 2 MB) was what
// every list of cards and comments downloaded. Downscaled so the short side
// is AVATAR_SIDE (sharp at 3x DPR) and re-encoded as webp; the original is
// kept when the browser can't decode/encode it or the result isn't smaller.
const AVATAR_SIDE = 256
const AVATAR_LONG_MAX = 1024
export async function shrinkAvatar(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, AVATAR_SIDE / Math.min(bitmap.width, bitmap.height), AVATAR_LONG_MAX / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) { bitmap.close(); return file }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.85))
    return blob && blob.type === 'image/webp' && blob.size < file.size ? blob : file
  } catch {
    return file
  }
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
    .select('id, username, role, display_name, bio, avatar_url, followers_count, following_count, builds_count')
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
  passwordRecovery: false,

  init: () => {
    if (get().initialized) return
    set({ initialized: true })

    getSupabase().then(supabase => {
      // Every auth change bumps `seq`; a profile fetch that finishes after a
      // newer change (e.g. a sign-out) is dropped instead of restoring a
      // stale session.
      //
      // auth-js re-emits SIGNED_IN for the same user on every tab refocus
      // and TOKEN_REFRESHED hourly. Nothing reads the token from this store
      // (supabase-js keeps its own), so for the same user the profile isn't
      // refetched and `session` keeps its identity — every page effect keyed
      // on it would otherwise refetch its data on each tab switch.
      let seq = 0
      let profileUser: string | null = null
      let latest: Session | null = null
      const apply = async (event: string, session: Session | null) => {
        latest = session
        if (session && session.user.id === profileUser) {
          if (event === 'USER_UPDATED' && !get().loading) set({ session })
          return
        }
        const mine = ++seq
        profileUser = session?.user.id ?? null
        const profile = session ? await fetchProfile(session.user.id) : null
        if (mine !== seq) return
        if (session && !profile) profileUser = null
        set({ session: latest, profile, loading: false })
      }
      // Subscribe before anything async: auth-js emits PASSWORD_RECOVERY
      // right after it detects the reset link, so listening only after the
      // session / profile round trips missed it (no "set new password" form).
      // INITIAL_SESSION always follows the subscription (null on failure),
      // so no separate getSession() round is needed.
      supabase.auth.onAuthStateChange((event, newSession) => {
        if (event === 'PASSWORD_RECOVERY') set({ passwordRecovery: true })
        void apply(event, newSession)
      })
    }).catch(() => {
      // Signed-out fallback so the auth button stops spinning; a later
      // init() call (next mount) can try again.
      set({ session: null, profile: null, loading: false, initialized: false })
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

    const [supabase, image] = await Promise.all([getSupabase(), shrinkAvatar(file)])
    const finalExt = AVATAR_TYPES[image.type] ?? ext
    const path = `${session.user.id}/avatar.${finalExt}`
    // A year of caching is safe: every upload gets a new ?t= in its URL.
    const { error } = await supabase.storage.from('avatars').upload(path, image, { upsert: true, cacheControl: '31536000', contentType: image.type || file.type })
    if (error) return { url: null, error: error.message }
    const stale = [...new Set(Object.values(AVATAR_TYPES))].filter(e => e !== finalExt).map(e => `${session.user.id}/avatar.${e}`)
    void supabase.storage.from('avatars').remove(stale).catch(() => {})

    // Cache-bust: same path on every re-upload (upsert), so the URL alone
    // wouldn't change and <img> would keep showing the stale cached image.
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return { url: `${data.publicUrl}?t=${Date.now()}`, error: null }
  },

  requestPasswordReset: async (email, captchaToken) => {
    const supabase = await getSupabase()
    // Lands back on the app root — onAuthStateChange there picks up the
    // PASSWORD_RECOVERY event from the link's token and flips
    // passwordRecovery, which is what actually opens the "set a new
    // password" modal; this redirect just needs to be a page that mounts
    // the auth store at all (every page does).
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo, captchaToken })
    // Supabase intentionally returns no error for "email not found" (so a
    // sign-in form can't be used to enumerate registered emails) — only
    // real failures (rate limit, captcha) surface here.
    return { error: error?.message ?? null }
  },

  updatePassword: async (newPassword) => {
    const supabase = await getSupabase()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }
    set({ passwordRecovery: false })
    return { error: null }
  },

  clearPasswordRecovery: () => set({ passwordRecovery: false }),
}))
