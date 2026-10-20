import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Guards on supabase/schema.sql (the full schema a fresh database is built
// from) for security rules that are easy to lose when someone edits it.
const ROOT   = join(__dirname, '..', '..')
const schema = readFileSync(join(ROOT, 'supabase', 'schema.sql'), 'utf8')
const migrations = readdirSync(join(ROOT, 'supabase', 'migrations')).filter(f => f.endsWith('.sql'))

function functionHeaders(sql: string) {
  const out: { name: string; head: string }[] = []
  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([\w.]+)\s*\(((?:[^()]|\([^)]*\))*)\)([\s\S]*?)\$\$/gi)) {
    out.push({ name: m[1].replace(/^public\./, ''), head: m[3].toLowerCase() })
  }
  return out
}

describe('supabase schema guards', () => {
  it('every security definer function pins its search_path', () => {
    // The last definition of each function is the one that applies.
    const latest = new Map(functionHeaders(schema).map(f => [f.name, f]))
    const missing = [...latest.values()]
      .filter(f => f.head.includes('security definer') && !f.head.includes('search_path'))
      .filter(f => !new RegExp(`alter function ${f.name}\\([^)]*\\)\\s+set search_path`, 'i').test(schema))
      .map(f => f.name)
    expect([...new Set(missing)]).toEqual([])
  })

  it('push_notification cannot be called through the API', () => {
    expect(schema).toMatch(/revoke all on function push_notification\([^)]*\) from public, anon, authenticated;/)
  })

  it('build owners can only update editable columns, never the counters', () => {
    expect(schema).toMatch(/revoke update on builds from authenticated;/)
    const grant = schema.match(/grant update \(([^)]*)\) on builds to authenticated;/)
    expect(grant).not.toBeNull()
    for (const counter of ['like_count', 'avg_rating', 'rating_count', 'view_count', 'comment_count', 'bookmark_count', 'is_featured', 'moderation_hidden']) {
      expect(grant![1]).not.toContain(counter)
    }
    expect(schema).toMatch(/create trigger before_build_insert_counters before insert on builds/)
  })

  it('like / bookmark / follow / comment-like rows cannot be moved with an UPDATE', () => {
    expect(schema).toMatch(/revoke update on build_likes, build_bookmarks, follows, comment_likes from authenticated;/)
    expect(schema).toMatch(/grant update \(rating\) on build_ratings to authenticated;/)
  })

  it('the app upsert on build_ratings has UPDATE on every column it sets, keys locked by a trigger', () => {
    // supabase-js upsert = INSERT … ON CONFLICT DO UPDATE SET <every column sent>.
    const api = readFileSync(join(ROOT, 'src', 'features', 'builds', 'api.ts'), 'utf8')
    const sent = api.match(/from\('build_ratings'\)\.upsert\(\{([^}]*)\}/)![1].split(',').map(c => c.split(':')[0].trim())
    const grants = [...schema.matchAll(/grant update \(([^)]*)\) on build_ratings to authenticated;/g)]
    const granted = grants.at(-1)![1].split(',').map(c => c.trim())
    expect(granted).toEqual(expect.arrayContaining(sent))
    expect(schema).toMatch(/create trigger before_rating_keys before update on build_ratings/)
    expect(schema.slice(schema.lastIndexOf('function keep_rating_keys'))).toMatch(/NEW\.build_id is distinct from OLD\.build_id or NEW\.user_id is distinct from OLD\.user_id/)
  })

  it('profile counters can be written by the counter triggers and the SQL editor (not frozen)', () => {
    const guard = schema.slice(schema.lastIndexOf('function protect_profile_system_fields'))
    const head = guard.slice(0, guard.indexOf('$$'))
    const body = guard.slice(0, guard.indexOf('end;'))
    expect(body).toMatch(/pg_trigger_depth\(\)\s*<=\s*1/)
    // Only direct API writes are guarded; a session without a JWT (the SQL
    // editor running the counter resync) must not be reverted.
    expect(body).toMatch(/current_user in \('anon', 'authenticated'\)/)
    // As security definer, current_user would be the owner and never match.
    expect(head).not.toContain('security definer')
  })

  it('hidden comments and comments on private builds are not publicly readable', () => {
    const policy = schema.slice(schema.lastIndexOf('create policy "comments read"'))
    expect(policy.slice(0, 300)).toContain('deleted_at is null')
    expect(policy.slice(0, 300)).toMatch(/visibility in \('public', 'unlisted'\) or b\.user_id = auth\.uid\(\)/)
  })

  it('no policy on builds reads builds, and its SELECT policies have no subquery (42P17)', () => {
    // Postgres raises "infinite recursion detected in policy for relation
    // builds" when a builds policy reads builds and the policies applied to
    // that read have a subquery of their own.
    const latest = new Map<string, string>()
    for (const m of schema.matchAll(/create policy "([^"]+)" on builds\b([\s\S]*?);/gi)) latest.set(m[1], m[2])
    expect([...latest.keys()]).toEqual(expect.arrayContaining(['builds read', 'builds mod read', 'builds update']))
    for (const [name, body] of latest) {
      expect(body, name).not.toMatch(/\bfrom\s+builds\b/i)
      // (select auth.uid()) reads no table; a SELECT policy that reads one
      // (EXISTS … FROM profiles) is what made the UPDATE policy recurse.
      if (/\bfor select\b/i.test(body)) expect(body, name).not.toMatch(/\bfrom\b/i)
    }
  })

  it('builds policies evaluate auth.uid() / is_moderator() once per query, not per row', () => {
    const latest = new Map<string, string>()
    for (const m of schema.matchAll(/create policy "([^"]+)" on builds\b([\s\S]*?);/gi)) latest.set(m[1], m[2])
    for (const [name, body] of latest) {
      const bare = body.replace(/\(select (auth\.uid|is_moderator)\(\)\)/g, '')
      expect(bare, name).not.toMatch(/\b(auth\.uid|is_moderator)\(\)/)
    }
  })

  it('migrations are named with a sortable timestamp and are idempotent-looking', () => {
    for (const file of migrations) {
      expect(file).toMatch(/^\d{8,14}_[a-z0-9_]+\.sql$/)
      const sql = readFileSync(join(ROOT, 'supabase', 'migrations', file), 'utf8')
      expect(/\bcreate policy\b/i.test(sql) ? /drop policy if exists/i.test(sql) : true, file).toBe(true)
    }
  })
})
