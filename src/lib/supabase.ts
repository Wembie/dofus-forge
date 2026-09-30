import type { SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton: keeps @supabase/supabase-js (~230KB) out of the eager
// main bundle for visitors who never touch auth/cloud builds. Loaded as
// its own chunk the moment auth actually initializes (App.tsx mount).
let client: SupabaseClient | null = null
let clientPromise: Promise<SupabaseClient> | null = null

export function getSupabase(): Promise<SupabaseClient> {
  if (client) return Promise.resolve(client)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => {
      const url = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!url || !anonKey) {
        console.warn(
          'Supabase env vars missing — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
          'Auth/cloud-build features will fail until .env is set (see .env.example).'
        )
      }
      client = createClient(url ?? '', anonKey ?? '')
      return client
    })
  }
  return clientPromise
}
