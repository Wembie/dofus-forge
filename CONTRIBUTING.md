<div align="center">
  <h1>Contributing to Dofus Forge</h1>

  <p><strong>Every good build starts with a clear plan. So does every good pull request.</strong></p>

  <p>
    <a href="https://github.com/Wembie/dofus-forge/issues"><strong>Browse issues ↗</strong></a>
    &nbsp;·&nbsp;
    <a href="./README.md">README</a>
    &nbsp;·&nbsp;
    <a href="./SECURITY.md">Security policy</a>
  </p>
</div>

<br>

> **Thanks for helping improve Dofus Forge.** Keep each change focused, explain the player problem it solves, and add screenshots when you change something visual.

<p align="center">
  <a href="#before-you-start">Before you start</a> &nbsp;·&nbsp;
  <a href="#set-up">Set up</a> &nbsp;·&nbsp;
  <a href="#make-your-change">Make your change</a> &nbsp;·&nbsp;
  <a href="#check-your-work">Check your work</a> &nbsp;·&nbsp;
  <a href="#open-the-pull-request">Pull request</a> &nbsp;·&nbsp;
  <a href="#project-conventions">Conventions</a>
</p>

---

## Before you start

| You want to… | Do this first |
|---|---|
| Fix a small bug or typo | Open the pull request directly |
| Add a feature or change behavior | Open an issue so we can agree on the direction before you invest time |
| Report a bug | Open an issue with the steps to reproduce, what you expected, what happened, and your browser/device |
| Report a **security** problem | **Don't open an issue.** Follow [SECURITY.md](./SECURITY.md) |

## Set up

### What you need

- Node.js **22 or newer**
- pnpm **11 or newer**
- *Optional:* Rust and `wasm-pack`, only if you change the optimizer
- *Optional:* the Supabase CLI and Docker, only if you change the database

### Run locally

```bash
git clone https://github.com/Wembie/dofus-forge.git
cd dofus-forge
pnpm install
pnpm dev
```

Copy `.env.example` to `.env` only when you need local environment values. Without Supabase variables the planner and the Forge still work; accounts and community features stay off.

> [!IMPORTANT]
> `.env` is ignored by Git. **Never commit credentials or private tokens.** Every variable prefixed with `VITE_` is compiled into the public browser bundle, so never put a secret in one.

## Make your change

1. Branch from the branch you intend to target: `dev` for normal work, `main` only when asked.
2. Keep the change focused. One pull request should solve one problem.
3. Follow the [project conventions](#project-conventions) below.
4. Add or update tests that prove the change works.

## Check your work

Pull requests to `dev` and `main` run the same checks. Run them locally first:

```bash
pnpm build
pnpm lint
pnpm test
```

### Browser end-to-end and accessibility tests

These run against the built app and include an axe-core accessibility scan of the public pages and the builder dialogs.

```bash
pnpm build
pnpm exec playwright install chromium   # first time only
pnpm test:e2e
```

The test starts a local Vite preview server when needed and checks:
- the public routes,
- a real optimizer run through the WASM worker,
- that there are no serious or critical WCAG 2.2 AA violations.

Set `A11Y_VERBOSE=1` to print every finding.

### Rust optimizer

If you change the optimizer, also run its tests and rebuild the checked-in WASM artifact:

```bash
cd rust-optimizer
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
cd ..
wasm-pack build rust-optimizer --target web --release --out-dir ../public/wasm --no-pack --locked
git diff --exit-code -- public/wasm
```

### What CI runs on your pull request

| Workflow | Checks |
|---|---|
| **PR Checks** | Version consistency · type check + build · Worker bundle dry run · lint · unit tests · gitleaks secret scan · `pnpm audit` (high/critical) · dependency review of new packages |
| **CodeQL** | Security analysis (`security-extended`) on every PR, on pushes to `main`/`dev` and weekly; results also gate merges into `main` |
| **Performance smoke** | k6 smoke against a local preview · Playwright e2e + axe accessibility scan |
| **Rust optimizer** | clippy · cargo tests · WASM build reproducibility |
| **Database** *(when `supabase/` changes)* | Local Supabase stack built from `schema.sql` · pgTAP isolation/RLS tests |
| **Workflow lint** *(when `.github/` changes)* | actionlint · zizmor security audit (results in the Security tab) |

PR workflows run without repository secrets, so they're safe for contributions from forks. Every action is pinned to a full commit SHA; Dependabot keeps the pins current.

**Docs-only pull requests** — every changed file is Markdown, under `docs/`, or `LICENSE` — skip build, tests, e2e and the Rust build. Those jobs show up as *skipped*, which counts as passing. The secret scan and CodeQL still run: a Markdown file can leak a token too, and `main`'s code-scanning rule needs a CodeQL result on every PR.

## Open the pull request

In the description:

- **Summarize** the change and the problem it solves.
- **List the checks** you ran.
- **Link** the related issue.
- **Show it.** For UI changes, attach a screenshot or a short recording.

## Project conventions

### Code and text

- The stack is React, TypeScript (strict), Vite and Tailwind CSS. Follow the style of the code around your change.
- Put **all player-facing text** in the locale files under `public/locales/`. Add every new key to **all four** languages (`es`, `en`, `fr`, `pt`) and use `t('key')` in code. A key missing from one language shows up as raw text in production.
- Accessibility is part of "done":
  - every control needs an accessible name;
  - informative images need a meaningful `alt`, decorative ones `alt=""`;
  - dialogs use the shared `Modal` / `useFocusTrap`;
  - colors must meet WCAG AA contrast.

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) in English: `type(scope): description`, with a subject of 72 characters or fewer.

| Type | For |
|---|---|
| `feat` | New player-facing capability |
| `fix` | Bug fix |
| `refactor` · `perf` · `style` | Internal changes with no behavior change |
| `docs` · `chore` | Documentation, tooling |

Explain the **why** in the commit body.

### Data and generated files

- `public/data/` holds generated game data. Update it with the fetch scripts (`pnpm fetch-data`, `pnpm fetch-spells`, `pnpm fetch-images`) instead of editing the JSON by hand.
- Character extraction assets under `char-assets/` are local or generated and must not be committed.

### Database (Supabase)

Changes to tables, policies or functions must:

1. ship as an **idempotent** migration in `supabase/migrations/<timestamp>_<name>.sql`;
2. be **appended** to `supabase/schema.sql`, which is the full schema a fresh database is built from;
3. come with a guard in `src/test/schema.test.ts`, and where possible a pgTAP case in `supabase/tests/database/`.

Clients are untrusted: RLS and the database functions are the only authorization boundary. Read [docs/security/ACCESS_CONTROL.md](./docs/security/ACCESS_CONTROL.md) before changing any of them.

### Cloudflare Worker

- Keep the security headers in `src/worker/securityHeaders.ts` and `public/_headers` identical. A test fails if they drift apart.
- Any work an anonymous visitor can trigger must be bounded: cache by content, never by request input.

### Releases

The release version is read from `VERSION`, and `package.json` must match it (CI checks this). Keep the release notes in `docs/CHANGELOG.md` and the in-app history in `src/data/changelog.ts` in sync. The maintainer handles version bumps and changelog entries when preparing a release, so you don't need to touch them unless asked. Release workflow details are in `.github/workflows/release.yml`.

X release announcements use GitHub Actions secrets; see [docs/X_POSTING.md](./docs/X_POSTING.md). Never put X credentials in `wrangler.jsonc` or any `VITE_` variable.

### Load and security testing

Run heavy k6 profiles and security tooling **only locally**. Testing the live site or previews needs written permission first; see [docs/security/TESTING_AUTHORIZATION.md](./docs/security/TESTING_AUTHORIZATION.md).

<p align="center">
  <sub>Small, careful changes make a strong Forge.</sub>
  <br>
  <sub>Maintained by <a href="https://github.com/Wembie">Juan (Wembie)</a>.</sub>
</p>
