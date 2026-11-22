# Agentic browsing readiness: dofusforge.com

Checked 2026-11-22 against https://dofusforge.com/. Vendor facts come from the claude-seo vendor matrix (last full check 2026-09-23, 60 days old today), so treat the standards-status lines as due for a refresh.

## Summary

- **Lighthouse Agentic Browsing (Lighthouse 13.5.0, local CLI, HeadlessChrome 157, home page):**
  - mobile **2/2**
  - desktop **1/2**
  - PSI v5 could not run: HTTP 429, the anonymous daily quota was exhausted. Lighthouse 13.5.0 was run locally instead (`npx lighthouse@13.5.0 --only-categories=agentic-browsing`, then `lighthouse_agentic.py --from-json`).
- **Agent-UX heuristic** (`agent_ux_check.py`, kept separate from the fraction): **100/100**, status complete.
  - 563 accessibility-tree nodes, 81 interactive, 0 unnamed.
  - 0 div-onclick widgets, 0 unlabeled inputs, 22 landmarks.
- **P0 failures:** 1. Desktop CLS 1.006 fails the counted `cumulative-layout-shift` audit. It is caused by a React hydration error (#418) that re-renders the whole document on every page tested.
- **What most limits agents today:** that one desktop layout shift (the whole page jumps about 4 s after load). Everything else agents need is already there: server HTML, a clean accessibility tree, and open robots.

AI Search Readiness (GEO 70% + agentic 30%, heuristic): **63/100**. The agentic part scores about 60 while the P0 CLS failure is open.

## Lighthouse audits

| Audit | Mobile | Desktop | Counted |
|---|---|---|---|
| `agent-accessibility-tree` | pass (all 33 axe rules) | pass | yes |
| `cumulative-layout-shift` | pass (0.002) | **fail (1.006)**; rerun twice: 1.006, 1.005 | yes |
| `llms-txt` | N/A (404) | N/A | no |
| `ard-schema` | N/A (no catalog) | N/A | no |
| `webmcp-form-coverage` | N/A (no forms / no WebMCP in test browser) | N/A | no |
| `webmcp-registered-tools` | N/A | N/A | no (always informative) |
| `webmcp-schema-validity` | N/A | N/A | no |

The tool lists two ways to add a counted audit. These are options, not goals:
- Serve a valid `/llms.txt`.
- Publish `/.well-known/ai-catalog.json`, only if you have agent resources to list.

## Access policy

- **Training** (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended): allowed through `User-agent: *`. No Content-Signal is declared.
- **Search** (OAI-SearchBot, Claude-SearchBot, PerplexityBot, Googlebot): allowed.
- **User-triggered** (ChatGPT-User, Claude-User, Perplexity-User, Google-Agent): allowed. Private areas (`/account`, `/admin`, `/my-builds`) are protected by Supabase auth, not robots.txt, which is the right model.
- **WAF:** not tested (no `--ua-matrix` authorization). Signals:
  - a plain fetch returns 200 from cache with no challenge;
  - the live robots.txt equals `public/robots.txt`, so Cloudflare managed robots is off;
  - `docs/security/CLOUDFLARE_HARDENING.md:75-76` shows Bot Fight Mode and Block AI bots / AI Crawl Control not enabled.

---

## Findings by priority

### AG-1 (P0). Desktop CLS 1.006 from a hydration mismatch that rebuilds the document
- **Severity:** High
- **Evidence:**
  - Lighthouse desktop `cumulative-layout-shift` 1.006. The `layout-shifts` audit names `<body>` (score 1.0) as the culprit.
  - A Playwright probe at 1350×940 reproduces it: one shift of value 1.0 at about 3.9 s, `BODY` moving from y=8/width 1335 to y=0/width 1350. The 8 px is the browser's default body margin, which is visible only while no stylesheet applies. The hidden-until-`lg` workshop grid appears at the same time.
  - `/damage-guide` shows the same: desktop CLS 0.76. A mobile probe without throttling gives about 0.29 (Lighthouse mobile 0.002, so it is timing-dependent).
  - The console on both `/` and `/damage-guide` shows **"Minified React error #418 (args: text)"**, a hydration text mismatch. React then client-renders the root.
  - A MutationObserver trace shows the whole `<head>` being torn down and rebuilt about 1.4-3.4 s after load: canonical, all hreflang links, favicons and manifest removed; the 5 stylesheet `<link>`s re-added (styleSheets count goes 5 → 11, including duplicates `AccessParts-*.css` with and without a trailing `#`).
  - The final DOM has canonical, 5 hreflang and 4 JSON-LD blocks again, so SEO tags recover. Layout stability does not.
- **Why it matters for agents:** agents that click by screen position (Gemini in Chrome, Comet, ChatGPT's browser) can hit the wrong target during the jump. CLS above 0.1 is a P0 in the agentic checklist and a counted Lighthouse failure.
- **Recommendation:**
  1. Find the mismatching text node. Run a dev build of the prerendered output (`pnpm build` with React dev / un-minified, or `vite preview` in development mode) and read the full #418 message. Likely candidates are text in the shell rendered from `localStorage`, `Date`, auth state, theme, or the build-from-storage on `/`, which differs between the prerender and the first client render.
  2. Render that value after mount (a `useEffect` + state), or mark that single node `suppressHydrationWarning`.
  3. Then confirm the head links are no longer re-inserted (no `AccessParts-*.css#` duplicates) and rerun `npx lighthouse@13.5.0 https://dofusforge.com/ --preset=desktop --only-categories=agentic-browsing` until desktop reads 2/2.
- **Source:** `src/root.tsx` (`Layout`, `SeoHead`, `App`), shell components under `src/` rendered on every route; ROADMAP M150 notes earlier head-hydration work.

### AG-2 (P1). Catch-all 200 for unknown URLs and `/.well-known/*`
- **Severity:** Medium
- **Evidence:**
  - `/claude-seo-404-probe-…` returns 200 `text/html`.
  - `/.well-known/api-catalog`, `/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server` and `/.well-known/ucp` all return 200 HTML (soft 404).
  - Paths with a file extension do 404 correctly (`/llms.txt`, `/.well-known/ai-catalog.json`, `/.well-known/agent-card.json`).
  - Lighthouse marks `llms-txt` and `ard-schema` as failing on catch-all pages. Here they were N/A only because those paths have extensions.
- **Recommendation:** in `serveAsset`, return 404 for any `/.well-known/` miss. Also return 404 for paths outside the known client-only route prefixes (`/build/`, `/u/`, `/c/`, `/account`, `/my-builds`, `/admin`, with optional language prefix). Keep the fallback HTML as the 404 body. Confirm with `agentic_check.py` (`http-404`, `well-known:*` should become pass/na).
- **Source:** `src/worker/index.ts` (`serveAsset`, `PRERENDERED_ONLY`, `FILE_EXTENSION`)

### AG-3 (P1). No Content-Signal in robots.txt
- **Severity:** Low
- **Evidence:** No `Content-Signal` line in the single `*` group, and no `Content-Signal` response header.
- **Recommendation:** Optional. Content-Signal is a preference, not enforcement, and Google does not act on it. If you want to state a policy, add a line inside the `*` group, for example `Content-Signal: search=yes, ai-input=yes, ai-train=<yes|no>`. Choose `ai-train` yourself; this audit does not decide it. Draft with `agentic_fix.py robots https://dofusforge.com --signal "..."`. Status: Cloudflare CC0 policy; the IETF individual draft expired 2026-04-04 (vendor matrix, checked 2026-09-23).
- **Source:** `public/robots.txt`

### AG-4 (P1). llms.txt absent
- **Severity:** Low (absence is informational)
- **Evidence:** `/llms.txt` 404, so the Lighthouse `llms-txt` audit is N/A.
- **Recommendation:** Optional. A valid file (an H1, a `>` summary, at least one Markdown link, 50+ characters) adds one counted Lighthouse audit (mobile 3/3 once AG-1 is fixed). It has no effect on Google Search. No consumer agent is confirmed to read it. Suggested links: `/about`, `/how-to-use`, `/damage-guide`, `/forge-guide`, `/sets`, `/classes/*`. Draft with `agentic_fix.py llms https://dofusforge.com/`.
- **Source:** `public/llms.txt` (new)

### AG-5 (P1). No Markdown delivery
- **Severity:** Info
- **Evidence:**
  - `Accept: text/markdown` on `/damage-guide` returns `text/html`, with no `Vary: Accept`.
  - `/index.md` returns 404, and there is no `rel="alternate" type="text/markdown"` link.
- **Recommendation:** Optional and low priority. No public source shows a consumer agent sending `Accept: text/markdown`. If added later, the guides (`/damage-guide`, `/forge-guide`) are the only pages worth it. They could be generated at build time as `.md` siblings from the same locale strings and linked with `rel=alternate`.
- **Source:** prerender pipeline (`react-router.config.ts` / build scripts), `src/worker/index.ts`

### AG-6 (P2/P3). WebMCP, ai-catalog.json, A2A card: none
- **Severity:** Info
- **Evidence:**
  - 0 `<form>` elements on `/`, no `registerTool` call sites, no `document.modelContext`.
  - No `/.well-known/ai-catalog.json` (404), no agent card (404).
- **Recommendation:** None needed now. Absence is an opportunity, not a defect. The candidates for imperative WebMCP tools, if you ever want them, are read-only actions such as "search items", "open set", and "load build by URL"; mutations would need a confirmation step. Status: WebMCP is a W3C Community Group draft, Chrome origin trial M149-M156; WebKit opposes, Mozilla is neutral; only ChatGPT desktop calls tools by default (vendor matrix, 2026-09-23). ARD/ai-catalog is a proposal; publish only if you run agent resources (an MCP server, for example).
- **Source:** n/a

---

## What works

- **Accessibility tree passes all 33 axe rules** Lighthouse uses for agents.
  - 103 real `<button>`s, 23 real anchors, zero div-onclick widgets.
  - Every interactive node is named; inputs are labeled.
  - Skip link to `#main-content`; `nav` has `aria-label="Main navigation"`.
- **Server-rendered content:** 387 words on `/` without JS, and over 1,000 on the guides. Text-only agents and non-JS crawlers get the real page.
- **Mobile CLS 0.002** in Lighthouse.
- **Extension paths 404 correctly**, so `llms-txt`/`ard-schema` stay N/A instead of failing on the SPA shell. `/.well-known/security.txt` and `/.well-known/traffic-advice` are real files.
- **Robots policy is open and explicit,** with a sitemap. Private pages are protected by auth rather than robots.txt.
- **No WAF friction seen:** no challenge on normal fetches; Bot Fight Mode and AI blocking are off, as documented in `docs/security/CLOUDFLARE_HARDENING.md`.

## How to confirm fixes

- AG-1: `npx lighthouse@13.5.0 https://dofusforge.com/ --preset=desktop --only-categories=agentic-browsing --output=json`, then `claude-seo run lighthouse_agentic.py --from-json <file>` → desktop 2/2. The console should be free of React #418.
- AG-2: `claude-seo run agentic_check.py https://dofusforge.com/ --json` → `http-404` pass, `well-known:*` na.
- AG-4: rerun Lighthouse → `llms-txt` pass, fraction 3/3.
