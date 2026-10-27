# Incident response and emergency stop

Short runbook for the solo/small-team setup of Dofus Forge. The goal is to stop damage first, then investigate.

## Who and where

| Thing | Where it is controlled |
|---|---|
| Site, Worker, WAF, rate limits, DNS | Cloudflare dashboard → account → `dofusforge.com` zone and Workers & Pages → `dofus-forge` |
| Assets and backups | Cloudflare R2 → `dofus-forge-assets` (public domain `assets.dofusforge.com`), `dofus-forge-backups` (private) |
| Database, auth, storage | Supabase dashboard → project used by `wrangler.jsonc` `SUPABASE_URL` |
| CI secrets | GitHub → repo → Settings → Secrets and variables → Actions (`SUPABASE_DB_URL`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DISCORD_WEBHOOK_URL`) |
| Deploys | Cloudflare Workers Builds from `main` (the GitHub Pages workflow only serves a redirect) |

## Severity

- **SEV1**: user data exposed or changed by someone who shouldn't, a leaked service credential (DB URL, Cloudflare token), or the site serving attacker content.
- **SEV2**: site down or badly degraded, runaway cost (usage spiking far above baseline).
- **SEV3**: a bug with security impact but no sign of exploitation.

## Emergency stops (fastest first)

**Traffic flood / cost spike**
1. Cloudflare → Security → Settings: turn on **Under Attack mode** for the zone (adds a challenge before every request).
2. Cloudflare → Security → WAF: add or tighten a rate-limiting rule on the hot path, e.g. `/og/` (see `CLOUDFLARE_HARDENING.md`).
3. If one path burns Workers CPU, block it with a WAF custom rule (`http.request.uri.path starts_with "/og/"` → Block). Link previews lose images; the site keeps working.
4. Check Supabase → Reports for request and egress spikes; if the database is the target, consider pausing the project. That takes the whole app's accounts and community features down; the builder keeps working offline.

**Bad deploy**
1. Cloudflare → Workers & Pages → `dofus-forge` → Deployments → roll back to the previous version.
2. Revert the commit on `dev`, then open a PR to `main`.

**Leaked credential**
1. `SUPABASE_DB_URL` (database owner): Supabase → Database settings → reset the database password, then update the GitHub secret. Every connection using the old password stops.
2. `CLOUDFLARE_API_TOKEN`: Cloudflare → My Profile / Account → API Tokens → roll or delete the token, then update the GitHub secret.
3. Supabase API keys: rotate in Supabase → Project settings → API. The anon/publishable key is public by design; rotate it only if the JWT secret itself leaked, and redeploy so the SPA and Worker get the new key.
4. `DISCORD_WEBHOOK_URL`: delete the webhook in Discord and create a new one.
5. Search the history: `gitleaks git` locally, or check the gitleaks result of the PR check.

**Malicious content from a user** (spam builds, abusive comments)
- Use the in-app moderation (`/admin/reports`, `moderate_content` RPC). If an account must be stopped, ban or delete it in Supabase → Authentication → Users.

## After the stop

1. Write down the timeline while it is fresh: first signal, actions, times (UTC).
2. Keep evidence: Cloudflare analytics exports, Supabase logs, the commit/deploy involved. Don't copy user data out of Supabase.
3. If user data was exposed, decide whether affected users must be told. Depending on where they live (e.g. GDPR in the EU), there can be a legal deadline for notifying authorities and users, so check this the same day.
4. Fix the cause in the repo with a regression test, following the normal commit flow.
5. Undo temporary measures (Under Attack mode, blocking rules) once the fix is live.
