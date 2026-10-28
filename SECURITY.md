<div align="center">
  <h1>Security Policy</h1>

  <p><strong>Found a crack in the Forge? Tell us quietly, and we'll mend it together.</strong></p>

  <p>
    <a href="https://github.com/Wembie/dofus-forge/security/advisories/new"><strong>Report a vulnerability privately ↗</strong></a>
    &nbsp;·&nbsp;
    <a href="./docs/security/README.md">Security docs</a>
    &nbsp;·&nbsp;
    <a href="./CONTRIBUTING.md">Contribute</a>
  </p>
</div>

<br>

> **Please do not open a public issue, discussion or pull request for a security problem.** Report it privately using one of the channels below. A public report shows everyone how to exploit the problem before it is fixed.

<p align="center">
  <a href="#supported-versions">Supported versions</a> &nbsp;·&nbsp;
  <a href="#reporting-a-vulnerability">Reporting</a> &nbsp;·&nbsp;
  <a href="#what-happens-next">What happens next</a> &nbsp;·&nbsp;
  <a href="#scope">Scope</a> &nbsp;·&nbsp;
  <a href="#testing-rules-and-safe-harbor">Testing rules</a> &nbsp;·&nbsp;
  <a href="#how-dofus-forge-is-protected">How it's protected</a>
</p>

---

## Supported versions

Dofus Forge is a continuously deployed web app, not a library you install. Security fixes go to the live site; old versions are never patched.

| Version | Where it runs | Supported |
|---|---|---|
| Latest release on `main` | [dofusforge.com](https://dofusforge.com) | :white_check_mark: |
| `dev` branch | Preview deployments | :white_check_mark: Fixes land here first |
| Any earlier `0.x` release | — | :x: Superseded by the next deploy |
| Forks and self-hosted copies | Your own infrastructure | :x: Pull fixes from `main` |

The current version is in [`VERSION`](./VERSION) and in the app's *What's new* dialog.

## Reporting a vulnerability

| Channel | When to use it |
|---|---|
| **[GitHub private vulnerability report](https://github.com/Wembie/dofus-forge/security/advisories/new)** | Preferred. Opens a private advisory that only you and the maintainer can see, and lets us work on the fix together. |
| **contact@dofusforge.com** | Use this if you can't use GitHub. Put `[SECURITY]` at the start of the subject line. |

A good report includes:

- **What** is affected: the URL, Worker route, Supabase table or RPC, workflow, or file and line number.
- **Impact**: what an attacker can read, change or break, and whose data or account is affected.
- **Steps to reproduce**, using only your own test accounts and data.
- **Proof**: request and response pairs, screenshots or a short recording. Redact any token, cookie or personal data.
- **Suggested fix**, if you have one. This is welcome but not required.

Please don't send real user data, other people's credentials, or anything you got by accessing an account that isn't yours.

## What happens next

Dofus Forge is maintained by one person in their own time. The timings below are goals the maintainer works toward, not a contractual service level.

| Step | Target |
|---|---|
| Acknowledge your report | within **3 business days** |
| First assessment (valid, severity, scope) | within **7 days** |
| Fix for critical / high issues | as fast as possible, usually within **14 days** |
| Fix for medium / low issues | in a regular release, usually within **60 days** |
| Status updates while it's open | at least **every 14 days** |

**If the report is accepted:**

1. The fix is developed privately and tested.
2. It ships through the normal `dev` → `main` deploy. A database change ships as a migration under `supabase/migrations/`.
3. A GitHub security advisory is published once the fix is live. You are credited by name or handle if you want to be.
4. The *What's new* changelog mentions the fix without exploit details.

**If the report is declined** (out of scope, intended behavior, or no realistic impact), you get a short explanation. If you disagree, reply with more detail and the report will be reviewed again.

Please give us a reasonable chance to fix the issue before you disclose it publicly. Coordinated disclosure normally happens when the fix is live, or after **90 days** if no fix has shipped, whichever comes first. Agree the date with the maintainer.

There is no paid bug bounty. Good reports get public thanks and a credit in the advisory.

## Scope

### In scope

| Target | Examples of what we care about |
|---|---|
| **dofusforge.com** and its Cloudflare Worker (`src/worker/`) | XSS, cache poisoning or cache deception, a private build leaking through `/og/` or `/build/` |
| **Supabase access rules** (`supabase/schema.sql`, `supabase/migrations/`) | reading or changing another user's private builds, notifications, ratings or profile; becoming moderator or admin; bypassing the build limit |
| **Authentication flows** in the app | taking over an account, password-reset flaws, session fixation or session swapping |
| **This repository's CI/CD** (`.github/workflows/`, `scripts/`) | leaking a secret, running untrusted code with write permissions, supply-chain injection through game data |
| **The browser app** (`src/`) | DOM XSS, prototype pollution from shared build links, unsafe handling of other users' content |

### Out of scope

- **Third-party services**: the DofusDude API, Google AdSense and Fonts, Cloudflare Turnstile, Discord, GitHub, and the Supabase and Cloudflare platforms themselves. Report problems in those to the vendor.
- **Denial of service**, load or stress testing, and any spam or volume attack against production.
- **Things that are public by design:**
  - the Supabase URL and **anon (publishable) key** in the browser bundle;
  - public builds, profiles and comments;
  - anyone who knows an **unlisted** build's link can read that build. The link itself is the access key.
- Findings that only report something missing, with no demonstrated impact: a header, an SPF/DMARC record, a cookie flag, a rate limit, or a CSP still in report-only mode.
- Self-XSS, clickjacking on pages with no state-changing action, CSV injection, or reports that only work in an outdated or modified browser.
- Social engineering, phishing, or physical attacks against the maintainer, contributors or users.
- Problems in forks or self-hosted copies that are not in this repository's code.

Not sure whether something is in scope? Report it anyway, privately.

## Testing rules and safe harbor

If you research in good faith and follow these rules, we will not pursue or support legal action against you, and we will treat your report as authorized:

- **Use your own accounts.** Create two test accounts and use one as the attacker and the other as the victim. Never touch real users' data, sessions or accounts.
- **Prove the issue with as little as possible.** Stop once you have shown the problem exists. Don't pivot further, dump data or keep access.
- **Don't degrade the service.** No DoS, no flooding, and no automated scanner pointed at production at volume. Keep any scripted checks to a handful of requests.
- **Don't change or delete other people's content**, and clean up the test content you created.
- **Prefer local testing.** Everything in this repo runs locally: `pnpm dev`, `pnpm test`, and `supabase start` loaded with `supabase/schema.sql`. You can reproduce most database issues against a local stack instead of production.
- **Keep the details private** until the fix is live.

Active testing beyond these limits, such as load tests or anything against infrastructure we don't own, needs written permission first. See [docs/security/TESTING_AUTHORIZATION.md](./docs/security/TESTING_AUTHORIZATION.md). This safe harbor covers Dofus Forge only. It does not authorize testing of third-party services, and it does not override their terms.

## How Dofus Forge is protected

A short description of the security model, so researchers can spend their time where it matters. The full picture is in [docs/security/](./docs/security/README.md).

```
Browser (React SPA) ──anon key / user JWT──► Supabase: Postgres RLS · column grants · SECURITY DEFINER RPCs
        │
        └──► dofusforge.com (Cloudflare) ──► static assets (public/_headers)
                                         └─► Worker: /og · /build · /img/item · /char
```

| Layer | What protects it |
|---|---|
| **Authorization** | There is no app server. The browser calls Supabase directly, so the boundary is Postgres row-level security on every table, ownership from `auth.uid()`, column-level UPDATE grants, and triggers that reset server-owned columns on INSERT. Moderator and admin rights are checked inside the RPCs; the admin pages hiding buttons is not a security control. |
| **Unlisted builds** | Readable only through their link: the `x-build-id` header must match the row. They can't be listed through the API. |
| **Worker** | Strict UUID checks before any Supabase query. OG images are cached by build version, and visibility is re-checked before a cached image is served. Only real images come back from the third-party icon fallback. Security headers are sent on every response. |
| **Browser** | React escaping and no HTML sinks for user content. Shared build links pass through a sanitizer. Avatar URLs are checked at render. HSTS, `nosniff`, `frame-ancestors`, Permissions-Policy, and a CSP rolling out from report-only. |
| **Auth** | Supabase Auth with email and password, with a Cloudflare Turnstile token on sign-up, sign-in and password reset. |
| **Supply chain** | `pnpm install --frozen-lockfile`. Dependency build scripts are allow-listed. Dependabot is on. The third-party game data is checked for a valid version format and unpacked in-process, writing regular files only. The scheduled job's write token reaches only its push step. |
| **CI gates** | Every PR runs gitleaks secret scanning, CodeQL (`security-extended`), `pnpm audit` (high/critical), type checking, unit tests including static guards on the database schema, and Playwright with an axe accessibility scan. PR workflows never receive repository secrets. |
| **Data** | Nightly database backups go to a private R2 bucket. There are no analytics on user content, and no service-role key in the app or Worker. |

The most recent full audit was on **2026-10-27**: a source-level review with independent verification of every lead. The fixes shipped in `0.3.135`; see the [CHANGELOG](./docs/CHANGELOG.md).

## For contributors

- **Never commit secrets.** `.env` is ignored by Git. Anything prefixed with `VITE_` ends up in the public browser bundle.
- **Database changes** ship as an idempotent migration in `supabase/migrations/`, are appended to `supabase/schema.sql`, and get a guard in `src/test/schema.test.ts`. Read [docs/security/ACCESS_CONTROL.md](./docs/security/ACCESS_CONTROL.md) before touching RLS.
- **Worker changes** keep `src/worker/securityHeaders.ts` and `public/_headers` in sync. A test fails if they drift apart.

More in [CONTRIBUTING.md](./CONTRIBUTING.md).

<p align="center">
  <sub>Thank you for helping keep every adventurer's builds safe.</sub>
  <br>
  <sub>Maintained by <a href="https://github.com/Wembie">Juan (Wembie)</a>.</sub>
</p>
