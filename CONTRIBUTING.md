# Contributing to Dofus Forge

Thanks for helping improve Dofus Forge. Keep changes focused, explain the user problem they solve, and include screenshots for visual changes when useful.

## Getting started

- Use Node.js 22 or newer and pnpm 11 or newer.
- Install dependencies with `pnpm install`.
- Start the local app with `pnpm dev`.
- Copy `.env.example` to `.env` only when you need local environment values. `.env` is ignored by Git; never commit credentials or private tokens. Values prefixed with `VITE_` are included in the browser bundle, so do not put private secrets in them.

## Before opening a pull request

Create a focused branch based on the branch you intend to target, then open a pull request to `dev` or `main`. Pull requests to either branch run the repository checks.

Run the same validation locally:

```bash
pnpm build
pnpm lint
pnpm test
```

For changes to the Rust optimizer, also run its Rust tests and rebuild the checked-in WASM artifact:

```bash
cd rust-optimizer
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
cd ..
wasm-pack build rust-optimizer --target web --release --out-dir ../public/wasm --no-pack --locked
git diff --exit-code -- public/wasm
```

Browser end-to-end tests run against the built app. Build it first, install Chromium once, then run the test:

```bash
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

The test starts a local Vite preview server when needed and checks public routes plus a real optimizer run through the WASM worker.

In the pull request description, summarize the change, note the checks you ran, and link any related issue. For UI changes, include a screenshot or short recording when it clarifies the result.

## Project conventions

- The app is built with React, TypeScript, Vite, and Tailwind CSS. Keep user-facing text in the locale files under `public/locales/` rather than adding new hard-coded interface strings.
- `public/data/` contains generated game data. Update it through the fetch scripts (`pnpm fetch-data`, `pnpm fetch-spells`, and `pnpm fetch-images`) instead of hand-editing generated JSON.
- Character extraction assets under `char-assets/` are local/generated and should not be committed.
- Keep release notes in `docs/CHANGELOG.md` and the in-app history in `src/data/changelog.ts` in sync when a release is being prepared. The release version is read from `VERSION`; release workflow details are in `.github/workflows/release.yml`.
- X release announcements use GitHub Actions secrets. See [docs/X_POSTING.md](./docs/X_POSTING.md); do not put X credentials in `wrangler.jsonc` or any `VITE_` variable.

## Questions and bug reports

For bugs, include steps to reproduce, what you expected, what happened, and your browser/device when relevant. For larger feature proposals, open a discussion or issue before starting extensive work so the direction can be agreed on early.
