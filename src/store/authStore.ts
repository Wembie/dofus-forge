import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase.ts'

export type Profile = {
  id:            string
  username:      string
  display_name:  string | null
  avatar_url:    string | null
}

type AuthState = {
  session:     Session | null
  profile:     Profile | null
  loading:     boolean   // true until the initial session check resolves
  initialized: boolean

  init:      () => void
  signUp:    (email: string, password: string) => Promise<{ error: string | null }>
  signIn:    (email: string, password: string) => Promise<{ error: string | null }>
  signOut:   () => Promise<void>
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', userId)
    .single()
  if (error) return null
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

  signUp: async (email, password) => {
    const supabase = await getSupabase()
    // Without this, Supabase falls back to the dashboard's "Site URL" (defaults
    // to http://localhost:3000 on a fresh project) for the confirmation email's
    // link — always explicit here so it works regardless of that setting.
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
    return { error: error?.message ?? null }
  },

  signIn: async (email, password) => {
    const supabase = await getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  },

  signOut: async () => {
    const supabase = await getSupabase()
    await supabase.auth.signOut()
  },
}))
