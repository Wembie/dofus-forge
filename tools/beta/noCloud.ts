import type { SupabaseClient } from '@supabase/supabase-js'

export function getSupabase(): Promise<SupabaseClient> {
  return Promise.reject(new Error('Cloud services are disabled in the local beta workshop'))
}
