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
  gender: 'male' | 'female' | null  // builds.gender column (check constraint)
  visibility: 'private' | 'unlisted' | 'public'
  snapshot: BuildSnapshot
  profiles: { username: string } | null
  updated_at: string
}

export type BuildPageMeta = Pick<BuildMeta, 'name' | 'class_slug' | 'level' | 'visibility' | 'updated_at'>

const IMAGE_FIELDS = 'name,class_slug,level,gender,visibility,snapshot,updated_at,profiles!builds_user_id_fkey(username)'
// The page's meta tags only need these; the snapshot and owner are for the image.
const PAGE_FIELDS = 'name,class_slug,level,visibility,updated_at'

export function fetchBuildMeta(env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }, id: string): Promise<BuildMeta | null> {
  return fetchBuildRow<BuildMeta>(env, id, IMAGE_FIELDS)
}

export function fetchBuildPageMeta(env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }, id: string): Promise<BuildPageMeta | null> {
  return fetchBuildRow<BuildPageMeta>(env, id, PAGE_FIELDS)
}

/** Direct PostgREST call (not the supabase-js SDK — this Worker is a
 * separate bundle from the SPA, pulling in the full SDK here just for one
 * read-only query isn't worth the size). Same anon key the client ships,
 * same RLS: a private build simply won't come back, which callers treat as
 * "no enrichment, serve the page/image unchanged". */
async function fetchBuildRow<T extends { visibility: BuildMeta['visibility'] }>(env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }, id: string, fields: string): Promise<T | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null

  const url = `${env.SUPABASE_URL}/rest/v1/builds?id=eq.${id}&select=${fields}`
  const res = await fetch(url, {
    // Crawlers and link previews hit the same build in bursts; a minute of
    // edge cache spares Supabase the repeats (edits show up within it).
    cf: { cacheTtl: 60 },
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      // A preview is requested through the build's link, which is what
      // makes an unlisted build readable (BUILD_LINK_HEADER in api.ts).
      'x-build-id': id,
    },
  })
  if (!res.ok) return null
  const rows = (await res.json()) as T[]
  const row = rows[0]
  if (!row || row.visibility === 'private') return null
  return row
}
