import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase env vars missing — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Auth/cloud-build features will fail until .env is set (see .env.example).'
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '')
