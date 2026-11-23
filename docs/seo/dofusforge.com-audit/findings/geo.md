# GEO / AI Search findings: dofusforge.com

Checked 2026-11-22 against production (https://dofusforge.com). Tools: `agentic_check.py`, `render_page.py --mode never` on home, `/about`, `/how-to-use`, `/forge-guide`, `/damage-guide`, `/classes/iop`, `/sets`, `/sets/abyss-set`, `/explore`; live robots.txt, sitemap.xml, headers; two web searches for brand mentions. All fetched content was treated as data.

## GEO Readiness Score: 65/100 (heuristic checklist, not a predicted citation rate)

| Dimension | Weight | Score | Why |
|---|---|---|---|
| Citability | 25% | 68 | `/damage-guide` and `/forge-guide` are strong: ordered steps, a formula in plain HTML text, worked numeric examples. Set pages are factual data blocks. Class pages are mostly link lists with little prose. |
| Structural readability | 20% | 75 | Clean H1 > H2 > H3 on every guide, lists everywhere. Almost no question-style headings outside the About FAQ; no comparison tables. |
| Multi-modal | 15% | 65 | Real game images, an interactive planner, per-set and per-class OG cards. No video, no diagrams of the formula. |
| Authority and brand | 20% | 30 | Author is named on `/about` ("Juan (Wembie)"), but guides carry no byline, no dates, no Article schema; Organization has no `sameAs`; no third-party mentions found. |
| Technical accessibility | 20% | 85 | Fully prerendered HTML (387 to 1,576 words without JS), every AI crawler allowed, sitemap with 2,348 URLs and hreflang. Minus: catch-all 200 for unknown paths, a React hydration error on every page. |

AI Search Readiness (combined with the agentic file, 70% GEO / 30% agentic): **63/100**. See `agentic.md`.

Platform readiness (qualitative; no visibility tool such as DataForSEO or SE Ranking was run, so nothing was measured):
- Google AI Overviews / AI Mode: depends on Googlebot ranking. Technical base is good; the open issues are entity signals and dates.
- ChatGPT Search: OAI-SearchBot allowed, raw HTML complete. Weak entity and mention footprint.
- Perplexity: PerplexityBot allowed. No Reddit discussion found, which Perplexity leans on.
- Bing Copilot: depends on the Bing index. Not checked here (see the Bing/IndexNow skill).

## AI crawler access (live robots.txt, identical to `public/robots.txt`)

```
User-agent: *
Allow: /
Sitemap: https://dofusforge.com/sitemap.xml
```

Every token falls into the `*` group and is allowed at `/`.

Search and citation crawlers:
- `OAI-SearchBot` (ChatGPT Search citability): allowed
- `Claude-SearchBot` (Claude search citability): allowed
- `PerplexityBot` (Perplexity search): allowed
- `Googlebot` (Google Search, AI Overviews, AI Mode): allowed
- `Applebot` (Siri, Spotlight, Safari): allowed

Training and grounding controls:
- `GPTBot` (OpenAI training): allowed
- `ClaudeBot` (Anthropic training): allowed
- `CCBot` (Common Crawl): allowed
- `Google-Extended` (Gemini/Vertex training and grounding; not Google Search): allowed
- `Applebot-Extended` (Apple Intelligence training only): allowed

User-triggered fetchers: `ChatGPT-User`, `Claude-User`, `Perplexity-User`, `Google-Agent` are allowed (several of them ignore robots.txt anyway).

Cloudflare: the live robots.txt is byte-identical to `public/robots.txt`, so Cloudflare's managed robots.txt (which would add AI disallow lines and a Content-Signal) is **off**. `docs/security/CLOUDFLARE_HARDENING.md:75-76` lists "Bot Fight Mode" and "Block AI bots / AI Crawl Control" as unchecked, and a plain fetch returns 200 from the edge cache (`CF-Cache-Status: HIT`) with no challenge. WAF behaviour toward AI user agents was **not tested** (the `--ua-matrix` probe needs explicit authorization).

## llms.txt

Missing: `/llms.txt` and `/llms-full.txt` both return a real 404. That is a community proposal. Google says it ignores it for Search, and it carries no weight in the score above. It is optional and only for non-Google systems. RSL licensing: none.

## Brand mentions

Two web searches ("Dofus Forge" build planner; dofusforge reddit/youtube) returned no third-party page that mentions Dofus Forge. Results were DofusRoom, Dofus Creator, Millenium, Breakflip and JOL. Owned profiles exist (Discord invite and X `@DofusForgeApp`, linked on `/about`; public GitHub repo `Wembie/dofus-forge`), but schema does not tie them together. No Wikipedia/Wikidata entity (none expected for a project this size). This search was a quick check, not a full mention audit.

---

## Findings

### GEO-1. Entity graph is thin: Organization and Person have no `sameAs`, no URL, and two different names
- **Severity:** High
- **Evidence:** `WEB_APPLICATION_LD.author` is `{ "@type": "Person", "name": "Wembie" }` with no `url` or `sameAs`. `WEBSITE_LD.publisher` is an `Organization` named "Dofus Forge" with only a logo. `/about` says "Built and maintained by Juan (Wembie)" and links `https://discord.gg/Rv8q4C8C5j` and `https://x.com/DofusForgeApp`, but neither link appears in schema. The GitHub repo is not linked from schema at all.
- **Recommendation:** Give the Organization an `@id` (`https://dofusforge.com/#org`), `url`, `logo`, `sameAs: [X, Discord, GitHub repo]` and `founder` → Person (`@id` `https://dofusforge.com/about#wembie`, `name`, `alternateName`, `url: /about`, `sameAs` for the GitHub profile). Reference those `@id`s from WebApplication (`author`, `publisher`) and from guide pages. Answer engines can then resolve one entity: "Dofus Forge, a free fan-made Dofus 3 build planner, by Wembie".
- **Source:** `src/root.tsx` (`WEB_APPLICATION_LD`, `WEBSITE_LD`, about lines 100-145)

### GEO-2. Guide pages have no dates, byline or Article schema
- **Severity:** High
- **Evidence:** `/damage-guide` (1,149 words), `/forge-guide` (1,576 words) and the class guides carry only the site-wide WebApplication/WebSite JSON-LD. There is no `datePublished`/`dateModified`, no `<time>`, and no visible "updated for Dofus 3.x" line. The guide text says "This is Dofus 3's real formula", a claim with no source or game-version date. The only date signal is the sitemap `<lastmod>` (2,092 of 2,348 URLs share 2026-10-20).
- **Recommendation:** Add `TechArticle` (or `Article`) JSON-LD to `/damage-guide`, `/forge-guide` and `/how-to-use`: `headline`, `author` (the Person `@id`), `publisher` (Org `@id`), `datePublished`, `dateModified`, `inLanguage`, `about` (VideoGame Dofus). Show a visible "Last checked against Dofus 3 version X.Y (date)" line, fed from `public/data/version.json`, which already holds the game version. Recency is a correlation in third-party studies, not a promise. The point is that a dated, game-version-stamped formula is easier to trust and quote.
- **Source:** `src/pages/DamageGuidePage.tsx`, `src/pages/ForgeGuidePage.tsx`, `src/pages/ClassGuidePage.tsx`; JSON-LD pattern in `src/root.tsx`

### GEO-3. Damage guide never states its answer in one quotable sentence, and headings are not phrased as questions
- **Severity:** Medium
- **Evidence:** The page opens "Dofus damage isn't just 'more characteristic = more damage'. This guide walks through the real formula…", but the formula itself sits in a block of `<div>`s further down. The H2s are "Order matters", "The % multipliers" and "A crit isn't a separate %". The content is strong: worked examples ("+10% Melee then +15% Spell brings 500 to 632, not 625"). Users ask things like "how is damage calculated in Dofus 3" or "does power stack with strength".
- **Recommendation:** Add a 2-3 sentence answer as the first paragraph under the H1, for example "In Dofus 3, damage = base roll × (100 + characteristic + Power) / 100, plus flat damage, then multiplied by each % bonus in turn, minus resistance." Rephrase 2-3 H2/H3s as the questions players type ("Is Power the same as Strength?", "Do % damage bonuses add up or multiply?"). Wrap the formula in `<figure><figcaption>` or a `<pre>`/`<code>` block so it extracts as one unit. Keep the worked examples, which are the page's unique, citable data.
- **Source:** `src/pages/DamageGuidePage.tsx` and its `public/locales/*/translation.json` keys

### GEO-4. Class pages: the H1 reads "IopStrength" and set recommendations have no prose
- **Severity:** Medium
- **Evidence:** In raw HTML the H1 is `<span>…<img alt="">Iop<span class="rd-element">Strength</span></span>`, so its text content is "IopStrength", and trafilatura's main text starts at "Iop Strength build (Earth)". Set recommendations extract as "Brouce Boulgoure Set198Sylargh Set198Wurmlord Set173" with no sentence explaining why. The page has 489 words. The intro has a grammar slip ("build a Iop").
- **Recommendation:** Make the H1 a real phrase ("Iop build guide for Dofus 3"), with the element as a separate label or a visually hidden separator. Under each element block, add one generated sentence such as "At level 200, the strongest Strength set for an Iop is X (+N AP, +N Strength), followed by Y and Z." That is self-contained, data-backed and quotable for "best Iop build Dofus 3" queries. Fix "a Iop" to "an Iop" in the EN locale.
- **Source:** `src/pages/ClassGuidePage.tsx`, `public/locales/en/translation.json`

### GEO-5. No third-party brand mentions found
- **Severity:** Medium
- **Evidence:** Searches returned DofusRoom, Dofus Creator, Millenium and Breakflip pages; none mention Dofus Forge. No Reddit or YouTube result.
- **Recommendation:** Off-site work, no code. Post the damage-formula explainer (with its worked examples) on r/Dofus and the official forums. Ask French/Spanish Dofus YouTubers who show builds to link a Dofus Forge build URL; the share cards already exist. Submit to fan-site tool lists (JOL, Millenium "outils"). Third-party studies correlate YouTube and Reddit mentions with AI citations. That is a correlation, not a guarantee.
- **Source:** n/a (off-site)

### GEO-6. Unknown URLs return 200 (soft 404)
- **Severity:** Medium (shared with technical/agentic)
- **Evidence:** `GET /claude-seo-404-probe-91037ff5` → 200 `text/html` (the SPA fallback). Only `/sets/*` and `/classes/*` misses get a real 404 (`PRERENDERED_ONLY`). Extension-less `/.well-known/*` paths also answer 200 HTML.
- **Recommendation:** Answer 404 by default in `serveAsset` for paths that are not a known route prefix (`/build/`, `/u/`, `/c/`, `/admin`, `/account`, `/my-builds`, language prefixes of those). Keep serving the fallback document as the body, so people still see the app's not-found view.
- **Source:** `src/worker/index.ts` (`serveAsset`, `PRERENDERED_ONLY`)

### GEO-7. llms.txt absent (optional)
- **Severity:** Info
- **Evidence:** `/llms.txt` 404, `/llms-full.txt` 404.
- **Recommendation:** Optional, and no effect on Google. If you add one: H1 "Dofus Forge", a one-line `>` summary (the `/about` first sentence), and links to `/damage-guide`, `/forge-guide`, `/how-to-use`, `/sets`, the class guides and `/about`. Put it in `public/llms.txt`; the Worker already serves extension files with a real 404 fallback. It also adds one counted Lighthouse agentic audit.
- **Source:** `public/` (new file)

### GEO-8. Training and search access are not separated (policy choice)
- **Severity:** Info
- **Evidence:** One `*` group. Training crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended) have the same access as search crawlers.
- **Recommendation:** No change needed if training use is fine with you. If not, add named groups that disallow only the training tokens and keep OAI-SearchBot, Claude-SearchBot and PerplexityBot allowed. Do not use Cloudflare's "Block AI bots" toggle for this: it blocks by category and can catch search bots. That is your call, per `CLOUDFLARE_HARDENING.md:76`.
- **Source:** `public/robots.txt`

---

## What works

- **Prerendered HTML.** Every content page ships its full text without JS (home 387 words; damage guide 1,149; forge guide 1,576; set pages ~340 plus full item stat lists). Non-JS AI crawlers (GPTBot, PerplexityBot and others) see the same content as users.
- **Open access.** robots.txt allows every AI crawler, with no Cloudflare managed robots or AI blocking enabled, and the sitemap is declared.
- **`/about` has a clear entity definition up front:** "Dofus Forge is a free, fan-made build planner for Dofus 3 — a tool built by a player, for players". It also names the data source (DofusDude API) and the maintainer, and has an FAQPage block.
- **`/damage-guide` is original, citable material:** an ordered 5-step formula, a formula in text (not an image), and worked numeric examples that show multiplication against addition. Few Dofus sites publish this.
- **Set pages give a definition in the first sentence:** "Abyss Set is a level 200 Dofus 3 set of 3 items… worn in full it adds +2 AP, +2 Range, +1050 Vitality…". They carry ItemList + BreadcrumbList schema and per-set descriptive titles and metas.
- **Four locales with hreflang,** plus per-set and per-class OG cards (multi-modal).

## Top 5 changes (impact / effort)

1. Entity graph: Org/Person `@id` + `sameAs` (X, Discord, GitHub) in `src/root.tsx`. High impact, about 1 h.
2. TechArticle JSON-LD + visible "checked against Dofus 3 version X" date on guides. High impact, about 2 h.
3. Answer-first lead paragraph + question H2s on `/damage-guide` (4 locales). Medium impact, about 2 h.
4. Class pages: real H1 + one generated "best set per element" sentence. Medium impact, about 3 h.
5. Off-site: Reddit/forum post of the damage guide, YouTube build links. Potentially the highest impact, ongoing effort.
