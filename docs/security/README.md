# Security

Dofus Forge is a static React SPA served by a Cloudflare Worker. User data lives in Supabase and is protected by Postgres row-level security. There is no other backend: the browser talks to Supabase directly with the public anon key, so **RLS and the database functions are the authorization boundary**. Hiding a button in the UI is not.

| Document | What it covers |
|---|---|
| [ACCESS_CONTROL.md](ACCESS_CONTROL.md) | Who can read and write each table, RPC and bucket; the tests that check it; queries to confirm production matches |
| [CLOUDFLARE_HARDENING.md](CLOUDFLARE_HARDENING.md) | Request flow, security headers and CSP rollout, dashboard checklist (WAF, rate limits, bots, DNS, R2) |
| [BUDGET_ALERTS.md](BUDGET_ALERTS.md) | Cost inventory; alert vs budget vs quota vs spend cap; manual alert setup; the opt-in usage-watch workflow |
| [TESTING_AUTHORIZATION.md](TESTING_AUTHORIZATION.md) | What needs written authorization; authorization template; load-test limits |
| [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) | Emergency stops, credential rotation, post-incident steps |
| [../PERFORMANCE_TESTING.md](../PERFORMANCE_TESTING.md) and [../../k6/README.md](../../k6/README.md) | Load-testing plan and k6 scripts |

## Architecture and trust boundaries

```
 Browser (SPA, session in localStorage)
   │  anon key / user JWT
   ├──────────────────────────────► Supabase (PostgREST, Auth, Storage, Realtime)
   │                                   └─ RLS policies, column grants, SECURITY DEFINER RPCs   ◄── boundary 1
   │
   └──► dofusforge.com (Cloudflare)
          ├─ static assets (dist/, headers from public/_headers)
          └─ Worker src/worker/index.ts                                                     ◄── boundary 2
               ├─ /og/<lang>/<id>.png   renders a PNG (anon, CPU-heavy) → Supabase (anon key + x-build-id)
               ├─ /build/<id>           rewrites meta tags
               ├─ /img/item/*           R2, falls back to api.dofusdu.de (third party)
               └─ /char/*               R2

 GitHub Actions
   ├─ PR checks (pull_request, read-only token, no secrets)
   ├─ update-data (hourly; third-party data → commit to main; Cloudflare token) ◄── boundary 3
   └─ db-backup (nightly pg_dump incl. auth schema → private R2 bucket)        ◄── boundary 4
```

1. **Browser → Supabase.** Everything a client sends is untrusted, including columns the UI never sends. Server-owned columns are reset by triggers, and ownership comes from `auth.uid()`, never from a client field.
2. **Anonymous HTTP → Worker.** Work done per request must be bounded. The OG image cache key comes from the build (`updated_at`), never from the request. Visibility is checked before any cached copy is served. Third-party responses are served on our origin only as images.
3. **Third-party data → repository and R2.** Upstream versions must match a strict pattern before they reach a URL. Archive members are written only as regular files, in-process. The write token reaches only the push step.
4. **Backups.** They contain account emails and password hashes. Keep the bucket private and the token narrowly scoped. Add an R2 lifecycle rule and consider encrypting dumps (see BUDGET_ALERTS.md and the audit report).

## Audit history

| Date | Scope | Result |
|---|---|---|
| 2026-10-27 | Full repository, Cloudflare `security-audit` skill, `quick` profile, source-only | No confirmed findings. 10 leads need validation. Fixes shipped in 0.3.135; see the CHANGELOG. The report artifacts are kept outside the repository. |

To report a vulnerability, follow [SECURITY.md](../../SECURITY.md). Do not open a public issue.
