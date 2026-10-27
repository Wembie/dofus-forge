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

  it('unlisted builds are readable only by link or from your own lists, never listable', () => {
    const read = schema.slice(schema.lastIndexOf('create policy "builds read"'))
    const body = read.slice(0, read.indexOf(';'))
    expect(body).not.toMatch(/visibility in \('public',\s*'unlisted'\)/)
    expect(body).toMatch(/visibility = 'unlisted' and \(id = \(select requested_build_id\(\)\) or in_my_lists\(id\)\)/)
    expect(schema.slice(schema.lastIndexOf('create or replace function requested_build_id'))).toMatch(/x-build-id/)
    // Rows that expose build ids to everyone would list unlisted builds again.
    expect(schema.lastIndexOf('drop policy if exists "likes read"')).toBeGreaterThan(schema.lastIndexOf('create policy "likes read"'))
    expect(schema.lastIndexOf('drop policy if exists "ratings read"')).toBeGreaterThan(schema.lastIndexOf('create policy "ratings read"'))
    const col = schema.slice(schema.lastIndexOf('create policy "col_builds read"'))
    expect(col.slice(0, col.indexOf(';'))).toMatch(/exists \(select 1 from builds where id = build_id\)/)
  })

  it('moderators can restore hidden content; only admins feature, and only public builds', () => {
    const mod = schema.slice(schema.lastIndexOf('create or replace function moderate_content'))
    expect(mod.slice(0, mod.indexOf('end; $$'))).toMatch(/p_action = 'restore'/)
    const feat = schema.slice(schema.lastIndexOf('create or replace function set_build_featured'))
    expect(feat).toMatch(/role = 'admin'/)
    expect(feat).toMatch(/visibility = 'public' or not p_featured/)
    expect(schema).toMatch(/revoke all on function set_build_featured\(uuid, boolean\) from public, anon;/)
  })

  it('a remix published later also notifies the original author', () => {
    expect(schema.slice(schema.lastIndexOf('create trigger notify_on_build_fork'))).toMatch(/after insert or update of visibility on builds/)
    expect(schema.slice(schema.lastIndexOf('create or replace function notify_build_fork'))).toMatch(/TG_OP = 'INSERT' or OLD\.visibility = 'private'/)
  })

  it('every table has explicit Data API grants (Supabase stops adding them from 2026-10-30)', () => {
    // Without them a database rebuilt from this file answers "permission
    // denied" through supabase-js. The grant must come right after the table.
    const missing: string[] = []
    for (const m of schema.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+) \(([\s\S]*?)\n\);\n([^\n]*)/gi)) {
      const [, table, , next] = m
      if (!new RegExp(`^grant [^;]* on public\\.${table} to [^;]*service_role;`).test(next)) missing.push(table)
    }
    expect(missing).toEqual([])
    expect(schema).toMatch(/grant usage, select on all sequences in schema public to anon, authenticated, service_role;/)
  })

  it('migrations that create a table also grant access to it', () => {
    const missing: string[] = []
    for (const file of migrations) {
      const sql = readFileSync(join(ROOT, 'supabase', 'migrations', file), 'utf8')
      for (const m of sql.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+)/gi)) {
        if (!new RegExp(`grant [^;]* on (?:table )?(?:public\\.)?[\\w., ]*\\b${m[1]}\\b[^;]* to [^;]*;`, 'i').test(sql)) missing.push(`${file}: ${m[1]}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('migrations are named with a sortable timestamp and are idempotent-looking', () => {
    for (const file of migrations) {
      expect(file).toMatch(/^\d{8,14}_[a-z0-9_]+\.sql$/)
      const sql = readFileSync(join(ROOT, 'supabase', 'migrations', file), 'utf8')
      expect(/\bcreate policy\b/i.test(sql) ? /drop policy if exists/i.test(sql) : true, file).toBe(true)
    }
  })
})

// The latest body of a function: later blocks in schema.sql override earlier ones.
function latestFunction(name: string) {
  const all = [...schema.matchAll(new RegExp(`create (?:or replace )?function (?:public\\.)?${name}\\(`, 'g'))]
  const from = all.at(-1)!.index
  const bodyStart = schema.indexOf('$$', from) + 2
  return schema.slice(from, schema.indexOf('$$', bodyStart))
}

describe('security audit guards (0.3.135)', () => {
  it('clients cannot forge server-owned columns when inserting comments, builds or reports', () => {
    expect(schema).toMatch(/create trigger before_comment_insert_reset before insert on public\.build_comments/)
    const comment = latestFunction('reset_comment_system_fields')
    for (const col of ['like_count := 0', 'deleted_at := null', 'created_at := now()']) expect(comment).toContain(`NEW.${col}`)
    const build = latestFunction('reset_build_counters')
    expect(build).toContain('NEW.created_at        := now()')
    expect(build).toContain('NEW.updated_at        := now()')
    expect(schema).toMatch(/create trigger before_build_report_insert before insert on public\.build_reports/)
    expect(schema).toMatch(/create trigger before_comment_report_insert before insert on public\.comment_reports/)
    expect(latestFunction('reset_report_review_fields')).toContain("NEW.reviewed_by := null")
  })

  it('deleting a comment a moderator already hid does not decrement comment_count again', () => {
    expect(latestFunction('sync_comment_count')).toMatch(/elsif OLD\.deleted_at is null then/)
  })

  it('admin revoke ends assignments closed ahead of time and fails loudly when nothing matched', () => {
    const revoke = latestFunction('admin_revoke_custom_rank')
    expect(revoke).toContain('(revoked_at is null or revoked_at > now())')
    expect(revoke).toMatch(/if not found then\s+raise exception/)
  })

  it('anonymous view dedupe never uses the caller-chosen user agent, and needs an IP to count', () => {
    const view = latestFunction('record_view')
    expect(view).not.toContain('user-agent')
    expect(view).toMatch(/if v_ip is null then\s+return;/)
    expect(schema).toMatch(/revoke all on function public\.record_view\(uuid, uuid, text\) from public;/)
  })

  it('anonymous forge runs are throttled per visitor and only their own visitor can finish them', () => {
    const start = latestFunction('start_forge_run')
    expect(start).toMatch(/if auth\.uid\(\) is null and v_visitor is null then\s+return null;/)
    expect(start).toContain('visitor = v_visitor')
    const finish = latestFunction('finish_forge_run')
    expect(finish).not.toContain('is not distinct from auth.uid()')
    expect(finish).toContain('auth.uid() is null and visitor = v_visitor')
  })

  it('slug redirects only list builds the reader can already see', () => {
    const policies = [...schema.matchAll(/create policy "slugs read" on [\w.]*slug_redirects for select\s+using \(([^;]*)\);/g)]
    expect(policies.at(-1)![1]).toContain('exists (select 1 from public.builds b where b.id = build_id)')
  })

  it('the avatars bucket enforces type and size on the server', () => {
    expect(schema).toMatch(/allowed_mime_types = array\['image\/png', 'image\/jpeg', 'image\/webp'\]/)
    expect(schema).toMatch(/file_size_limit = 2097152/)
  })

  it('the migration file matches the block appended to schema.sql', () => {
    const migration = readFileSync(join(ROOT, 'supabase', 'migrations', '20261027000000_security_audit_fixes.sql'), 'utf8')
    expect(migrations).toContain('20261027000000_security_audit_fixes.sql')
    expect(schema.replace(/\r\n/g, '\n')).toContain(migration.replace(/\r\n/g, '\n').split('\n').slice(2).join('\n').trim())
  })
})
