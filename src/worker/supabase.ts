export type BuildSnapshot = {
  v: 1
  c: string
  n?: string
  l: number
  g?: 'm' | 'f'
  a: number[]
  s: number
  e: (number | null)[]
  r?: Record<string, Record<string, number>>  // runes: slot -> stat -> value
}

export type BuildMeta = {
  name: string
  class_slug: string
  level: number
  gender: 'm' | 'f' | null
  visibility: 'private' | 'unlisted' | 'public'
  snapshot: BuildSnapshot
  profiles: { username: string } | null
  updated_at: string
}

/** Direct PostgREST call (not the supabase-js SDK — this Worker is a
 * separate bundle from the SPA, pulling in the full SDK here just for one
 * read-only query isn't worth the size). Same anon key the client ships,
 * same RLS: a private build simply won't come back, which callers treat as
 * "no enrichment, serve the page/image unchanged". */
export async function fetchBuildMeta(env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }, id: string): Promise<BuildMeta | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null

  const url = `${env.SUPABASE_URL}/rest/v1/builds?id=eq.${id}&select=name,class_slug,level,gender,visibility,snapshot,updated_at,profiles!builds_user_id_fkey(username)`
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
  })
  if (!res.ok) return null
  const rows = (await res.json()) as BuildMeta[]
  const row = rows[0]
  if (!row || row.visibility === 'private') return null
  return row
}
