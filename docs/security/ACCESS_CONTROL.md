# Supabase access-control matrix

This is the effective access model after every migration (`supabase/schema.sql` is cumulative). It was built from the source. Nothing was checked against the live project; to confirm production matches, use the queries at the end.

**Principals**

- **anon**: anon key, no JWT. Any browser or HTTP client.
- **user**: any signed-in account.
- **owner**: `auth.uid()` matches the row's user column.
- **mod / admin**: `profiles.role` is `moderator` / `admin`. Checked server-side by `is_moderator()` and inline role checks; the admin pages' client-side gating is UI only.
- **service_role**: not used anywhere in the repo or the Worker.
- **Worker**: uses the anon key plus the `x-build-id` header.

**Isolation tests**

- *Static* tests in `src/test/schema.test.ts` run on every PR.
- *Behavioural* tests in `supabase/tests/database/rls_isolation.test.sql` (pgTAP) must be run on a local stack: `supabase start && supabase db reset && supabase test db`. **As of 0.3.135 they have not been executed anywhere.** Running them needs Docker and the Supabase CLI, which the machine that wrote them didn't have. Treat a first run as part of review.

| Resource | Data | anon | user | owner | mod / admin | Controls | Tests |
|---|---|---|---|---|---|---|---|
| `profiles` | public profile; `settings` JSON | read all columns | read | update own row; `role` and counters reset by trigger | same | RLS `profiles own write`; `protect_profile_system_fields` | static; pgTAP "cannot promote themselves" |
| `builds` (public) | build content | read | read | full CRUD; UPDATE only on editable columns | mods read all; admin `set_build_featured` | RLS `builds read/insert/update`; column grants; `reset_build_counters` | static; pgTAP read/rename/delete |
| `builds` (unlisted) | build content | read **only** with `x-build-id: <id>` | same | full | mods read all | `requested_build_id()`; capability = UUID | static "never listable"; pgTAP "cannot list" |
| `builds` (private) | build content | none | none | full | mods read all | RLS; the Worker drops private rows again | pgTAP private-read |
| `build_snapshots`, `build_tags` | history, tags | via parent build RLS | via parent | FOR ALL own parent | via builds | subquery under builds RLS | static |
| `build_comments` | comments | read visible, non-deleted on visible builds | same | insert/delete own; no UPDATE | mods read hidden; `moderate_content` | RLS; `reset_comment_system_fields` (0.3.135) | static; pgTAP impersonation + column reset |
| `build_likes`, `build_bookmarks`, `comment_likes` | social | none | none | own rows; no UPDATE | — | FOR ALL own; UPDATE revoked | static |
| `build_ratings` | ratings | none | none | own; keys locked | — | `keep_rating_keys` | static |
| `follows` | social graph | read | read | own rows | — | FOR ALL own | static |
| `notifications` | per-user | none | none | own | — | triggers via `push_notification` (EXECUTE revoked); Realtime topic `notifications:<uid>` | static |
| `collections`, `collection_builds` | lists | public ones | public + own | own | — | builds RLS applied to entries | static |
| `build_reports`, `comment_reports` | moderation | none | insert as reporter | — | read/update | review fields reset on insert (0.3.135) | static |
| `tags` | reference | read | read | — | mods write | RLS | — |
| `slug_redirects` | id map | only rows whose build is visible (0.3.135) | same | — | — | RLS | static |
| `build_view_events`, `forge_runs`, `community_stats_cache` | internal | none (RLS, no policies) | none | — | — | only through SECURITY DEFINER RPCs | static |
| `memberships`, `membership_periods`, `supporter_contributions` | billing-ish | none | own (read) | — | — | no client writes | static |
| `custom_rank_*` | ranks | none | public badge via `get_public_custom_rank` | — | admin only; assignments only via `admin_*_custom_rank` | RLS + RPC role check | static; pgTAP non-admin RPC |
| Storage `avatars` | images | read (public bucket) | read | write only under `<uid>/`; png/jpeg/webp ≤ 2 MB (0.3.135) | — | storage RLS + bucket limits | — |
| `auth.*` | emails, password hashes | none | own session | — | — | Supabase Auth | — |

## RPCs callable by anon

`record_view` (counts only with a client IP, deduplicated per IP per hour), `start_forge_run` / `finish_forge_run` (throttled per IP; anonymous runs can only be finished by the same IP), `get_*` read helpers, `is_moderator`, `in_my_lists`, `requested_build_id`, `generate_slug`.

`generate_slug` tells a caller whether a slug already exists, including slugs of private builds. This was noted as hardening; it is not changed yet.

## Known open items (owner decision)

- **`builds.fork_of` is readable by anyone.** A public remix of a build that later became unlisted reveals the parent's UUID, which is the unlisted capability. Fixing it needs either a column-level revoke plus a SECURITY DEFINER lookup, or masking. The client reads `fork_of` today, so it is not a drop-in change. See NEEDS-VALIDATION in the audit report.
- **Moderator scope.** Moderators can read all private builds and hidden comments, not just reported ones. This is intentional per the schema comments.
- **Per-user quotas.** Only builds have a count limit (`check_build_limit`). Snapshots, collections, comments and notifications have no per-user count cap, and profile text has no length CHECK. The audit's coverage critic flagged this but it wasn't reviewed in this pass (deferred).
- **Usernames can be changed freely.** A released handle can be claimed by someone else, and old `/u/<name>` links then point to the new owner. Deferred.

## Checking production matches this file

Run these read-only queries in the Supabase SQL editor:

```sql
-- RLS on every public table
select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;          -- expect no rows

-- INSERT column grants on the tables that rely on reset triggers
select tgname from pg_trigger
where tgrelid in ('public.build_comments'::regclass, 'public.builds'::regclass,
                  'public.build_reports'::regclass, 'public.comment_reports'::regclass)
  and not tgisinternal;                                                             -- expect the *_reset / *_counters triggers

-- Functions anon can execute
select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute');

-- Avatar bucket limits
select file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars';
```
