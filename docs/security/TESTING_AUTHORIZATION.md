# Security testing authorization

Active security testing of anything that is **deployed** (dofusforge.com, `*.workers.dev` previews, the Supabase project, the R2 buckets, the GitHub repository settings) needs a written authorization **before** it starts. This file explains what is allowed without one, what needs one, and gives the template to fill in.

## What needs no authorization

These never send traffic to shared infrastructure, so anyone working on the repo can do them:

- Reading source, SQL, workflows and configuration.
- Static analysis: CodeQL, gitleaks, `pnpm audit`, ESLint, `src/test/schema.test.ts`.
- Unit tests (`pnpm test`) and the local Playwright suite (`pnpm test:e2e`), which builds the app and serves it on `127.0.0.1`.
- k6 against a local `vite preview` (`k6/README.md`).
- A local Supabase stack (`supabase start`) loaded with `supabase/schema.sql` and dummy accounts.

## What needs a written authorization

- Any load, stress, spike or soak test against a deployed URL, including Cloudflare preview deployments. The one exception is the 7-request preview smoke in `.github/workflows/performance.yml`, which is part of CI.
- Any request to production meant to test a vulnerability: auth bypass, RLS probing with real accounts, injection payloads, rate-limit probing, scanning tools such as ZAP, nuclei or sqlmap.
- Any test that creates, changes or deletes rows in the production Supabase project, even with test accounts.
- Changing Cloudflare WAF, rate-limit, DNS or cache rules to run a test.

A repository owner can authorize tests only against infrastructure they control. **Third-party services are never in scope** through this document, whatever the authorization says: `api.dofusdu.de`, `api.dofusdb.fr`, Google (AdSense, Fonts), Cloudflare Turnstile, GitHub, Discord, X. Each provider's own terms decide what testing is allowed. Supabase and Cloudflare also have their own acceptable-use and penetration-testing policies. An authorization from the project owner does not replace them; check them before testing their platforms.

Never allowed, whatever the authorization:

- Denial of service against production.
- Credential stuffing or brute force against real accounts.
- Reading or changing other users' data beyond what proves a finding. Use your own test accounts as both attacker and victim.
- Social engineering.

## Authorization template

Copy this into a private place (an issue in a private repo, an email thread, a signed document). **Do not commit a filled-in copy**: it holds names, contacts and schedules.

```text
DOFUS FORGE — SECURITY TEST AUTHORIZATION

Authorizing party:   <full name>, <role, e.g. project owner / maintainer>
Authority:           <why this person may authorize: owns the Cloudflare account
                      and the Supabase project; GitHub repo owner>
Tester(s):           <names, GitHub handles>

In-scope targets (exact):
  - <e.g. https://<deployment-id>-dofus-forge.<account>.workers.dev (preview only)>
  - <e.g. Supabase project ref: <staging-ref> (NOT production)>
Out of scope (explicit):
  - api.dofusdu.de, api.dofusdb.fr, Google, Turnstile, GitHub, Discord, X
  - <production, if not in scope>
  - <anything else>

Approved techniques:  <e.g. k6 peak.js profile; RLS probing with test accounts A/B>
Forbidden techniques: <e.g. no fuzzing of auth endpoints; no DoS>

Window:               <YYYY-MM-DD HH:MM> to <YYYY-MM-DD HH:MM> <timezone>
Traffic ceiling:      <max requests/second>, <max concurrent VUs>, <max total requests>
Resource ceiling:     <e.g. stop if Workers CPU or Supabase egress exceeds X% of quota>

Test accounts/data:   <emails of dedicated test accounts; test data prefix>
Monitoring:           <who watches Cloudflare analytics / Supabase reports during the test>
Emergency contacts:   <name — channel — phone>

Stop conditions:      - error rate above <N>% for more than <M> minutes
                      - p95 latency above <N> ms for real users
                      - any sign of real-user data exposure
                      - request from any emergency contact
Stop procedure:       Ctrl-C the runner; confirm traffic stopped in Cloudflare analytics;
                      notify contacts (see docs/security/INCIDENT_RESPONSE.md)
Rollback/recovery:    <e.g. delete test rows by prefix; revoke test sessions>

Data handling:        Evidence stored in <location>, access limited to <people>,
                      deleted on <date>. No real user data copied out.

Signed:               <authorizing party>  Date: <YYYY-MM-DD>
```

If any field is missing, the authorization is incomplete and the test does not run.

## Load-testing limits without a separate agreement

These defaults apply to the local and CI runs described in `docs/PERFORMANCE_TESTING.md`:

| Target | Allowed profiles | Ceiling |
|---|---|---|
| Local `vite preview` | all k6 profiles | machine limits |
| CI local preview (`performance.yml`) | `smoke.js`, `browser-smoke.js` | as written in the workflow |
| Cloudflare preview deployment | `smoke.js` only | 7 concurrent requests, once per PR |
| Production | none | needs the authorization above |
