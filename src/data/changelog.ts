export { DOFUS_GAME_VERSION } from './gameVersion.ts'

export type ChangelogEntry = {
  version: string
  date:    string
  notes:   string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.3.138',
    date: '2026-10-30',
    notes: [
      'Fix: search engines now see the real content of every page — the live site was showing them empty pages',
      'Feat: spell guides for all 19 classes, in all 4 languages, linked from the About page',
      'Deps: React Router 7 — first step toward rendering every page as real HTML for search engines',
      'Deps: React 19',
      'Perf: every public page now arrives as real HTML and becomes usable on top of it instead of being redrawn — on a slow phone, content shows up about 3× sooner and class guides no longer jump around while loading',
    ],
  },
  {
    version: '0.3.137',
    date: '2026-10-29',
    notes: [
      'Feat: La Forjadora can now count the combat passives of Dofus, Prysmaradites and legendary items — tick "Count item passives" in the order and choose at their best or as set in the planner. Pieces show "with passives" and the items whose passive counted',
      'Engine: passives are folded into each item once when the forge starts, so counting them does not slow the search down',
      'Feat: passives come in sections (Dofus, Prysmaradites, legendary items) — switch a whole section off, or open its gear to leave out only the passives that make no sense for how you play',
    ],
  },
  {
    version: '0.3.136',
    date: '2026-10-28',
    notes: [
      "Feat: new /shortcuts page (linked from the footer, header menu, planner menu and command palette, in all 4 languages) listing every control — dragging rings/Dofus to swap them, right-click to pin an item for La Forjadora, Ctrl+Z/Y undo-redo, Ctrl+K command palette, and the mobile-friendly equivalents (tap to open a slot's catalog, the Pin button inside La Forjadora instead of right-click; drag-and-drop swap is called out as desktop-only for now)",
    ],
  },
  {
    version: '0.3.135',
    date: '2026-10-27',
    notes: [
      'Security: link-preview images are rendered once per build version (an arbitrary query string no longer forces a new render), non-GET requests are refused, and an image stops being served as soon as its build turns private, is hidden by a moderator or is deleted',
      'Security: the item-icon fallback only serves real PNG/JPEG/WebP images from the third-party API, never HTML or SVG',
      'Security: every page and Worker response now sends HSTS, Permissions-Policy and a Content-Security-Policy in report-only mode, alongside the existing headers',
      'Security (database, run migration 20261027000000_security_audit_fixes.sql): new comments, builds and reports can no longer set likes, dates or review fields; revoking a rank assignment that was closed ahead of time now works and errors when nothing matched; anonymous build views and Forge runs are deduplicated per visitor IP; avatar uploads are limited to PNG/JPEG/WebP up to 2 MB on the server',
      'Security: the hourly game-data update validates the game version before using it in download URLs, extracts only plain files from downloaded archives, and keeps the write token out of the steps that process third-party data; wrangler is pinned',
      'Docs: new docs/security/ with the access-control matrix, Cloudflare hardening checklist, budget alerts runbook, testing authorization template and incident response; Dependabot and an opt-in daily Workers usage watch',
      'Accessibility: dialogs move focus in, trap Tab, close on Escape and return focus; every form field has a label and errors are announced; icon-only buttons are named in all 4 languages; skip link, labelled navs and <html lang> following the language; reduced-motion respected by the animated character; contrast fixes in the dark and light themes; an automated axe check of the public pages and builder dialogs now runs with the end-to-end tests',
      'Deps: react-router-dom 6.30.6 (open-redirect advisory fix)',
    ],
  },
  {
    version: '0.3.134',
    date: '2026-10-25',
    notes: [
      'Polish: special spell effects on item cards and tooltips now keep the selected language and appear in compact, readable rows with matching stat icons',
    ],
  },
  {
    version: '0.3.133',
    date: '2026-10-30',
    notes: [
      'Fix: item-specific spell effects are now visible in equipment cards, tooltips, set details and matching spell cards; supported equipped effects update AP, range, critical, damage and casts per turn, with regressions for the Prince of Thieves Set and all 19 class spell catalogs. Thanks to josegf for reporting this issue',
    ],
  },
  {
    version: '0.3.132',
    date: '2026-10-25',
    notes: [
      'Feat: right-clicking an equipped planner item toggles its La Forjadora pin without opening the browser context menu',
      'Tests: confirmed that six pinned or locked Dofus still leave other equipment slots available to forge',
    ],
  },
  {
    version: '0.3.131',
    date: '2026-10-24',
    notes: [
      'Fix: the rune/forgemagic window now opens at the top of the screen instead of being vertically centered inside the equipment section, and its rune list scrolls within the window',
    ],
  },
  {
    version: '0.3.130',
    date: '2026-10-24',
    notes: [
      'Polish: the item effect filter is now organized like La Forjadora — Main effects (with Power next to the characteristics), Damage (flat, percent, steal), Resistances (flat, percent) and Combat, in the same order',
    ],
  },
  {
    version: '0.3.129',
    date: '2026-10-24',
    notes: [
      'Feat: new page, The Forger guide (link at the bottom of every page and in the order screen), explaining every part of the optimizer: minimums, purity and caps, intensity, pinned and banned items, forgemagic, the forging screen, the results and an FAQ',
    ],
  },
  {
    version: '0.3.128',
    date: '2026-10-24',
    notes: [
      'Feat: La Forjadora now lets you pin items every build must wear (📌) and ban items it must never use (⛔), as many as you want. Search any item or set in the new Items section, pin your planner gear in one tap, or use the 📌 on any equipped slot of the planner and on forged results',
      'Engine: pinned items are fixed before the search starts, so La Forjadora only searches the other slots (faster, not slower) and still forgemages the pinned ones; sets of pinned pieces are tried first',
    ],
  },
  {
    version: '0.3.127',
    date: '2026-10-24',
    notes: [
      "Fix: La Forjadora's anvil animation had a stray diagonal line and the strike wasn't synced with the spark burst — fixed, the hit, the flash and the sparks now land on the same beat",
      'Feat: the item picker now has a "Legendary" filter for slots that have one of the game\'s legendary items',
    ],
  },
  {
    version: '0.3.126',
    date: '2026-10-24',
    notes: [
      "Polish: La Forjadora's anvil animation got a premium pass — the hammer strike now flashes and compresses the anvil on impact, sparks cool from white-hot to ember red as they fly, and steam rises from the piece (more of it while it cools). Purely visual, no change to forging itself",
    ],
  },
  {
    version: '0.3.125',
    date: '2026-10-24',
    notes: [
      'Fix: a tab the browser restored after turning the computer back on (or a tab left open across an update) could show a completely black page. It now reloads itself once and opens the current version',
    ],
  },
  {
    version: '0.3.124',
    date: '2026-10-22',
    notes: [
      'Fix: the preview image shown when sharing a build link (Discord, WhatsApp, X...) failed to generate and showed nothing. It works again, with every equipped item icon',
    ],
  },
  {
    version: '0.3.123',
    date: '2026-10-22',
    notes: [
      'Perf: live notifications moved from Postgres Changes to a private Realtime Broadcast channel. The old mechanism kept the database polling for changes around the clock (~68% of all database time); now it costs nothing while idle. The bell only holds a live connection while the tab is visible, stops polling while connected, and refetches the unread count on every reconnect so nothing is missed',
      'Perf: switching back to the tab (or the hourly session refresh) no longer refetches your profile and reloads the data of the page you are on; each page load also asks for your profile once instead of twice',
      'Perf: build cards (Explore, profiles, remixes, bookmarks, collections) download only the equipment they draw instead of the whole build, and the version history lists versions without downloading each full build — a version is loaded when you hover, open or restore it',
      'Perf: uploaded avatars are resized to 256px webp in the browser before upload (they display at most at 72px) and cached for a year; re-uploading in another format no longer leaves the old file behind',
      'Perf: link previews (Discord, WhatsApp...) of a build are no longer regenerated every time someone views, likes or rates it, only when the build itself changes',
      'Perf: new database indexes for Explore (also without a class filter), version history, ratings and deletions, and every access rule now checks who you are once per query instead of once per row; the Explore "Load more" button no longer recounts every matching build',
      'Perf: saving a build is now a single request (the database keeps the version history by itself), opening a build loads your like, bookmark, rating and comment likes in one request instead of four, and a public profile loads its numbers, membership and rank in one request instead of four',
      'Perf: views are counted once per visitor per hour also for visitors who are not signed in (refreshing the page no longer adds a view), and old view records are cleaned up automatically. Explore community stats are refreshed every 5 minutes instead of being recomputed on every visit',
      'Perf: shared build links fetch only what their preview needs and are cached at the edge for a minute',
      'Perf: the check for a new site version runs at most once a minute (switching tabs quickly fired one request each), never while the tab is hidden, and stops once an update is found',
      'Perf: item icons and the animated character can load straight from the Cloudflare cache (assets.dofusforge.com) instead of going through the site server for every file, so the first visit loads them faster',
      'Privacy policy: explains how views are counted without counting the same visitor twice (an irreversible hash of IP and browser, never the IP itself, deleted after an hour)',
    ],
  },
  {
    version: '0.3.122',
    date: '2026-10-22',
    notes: [
      'Perf: equipping an item, applying a rune, toggling a weapon elemental transform, or allocating a characteristic point could block the UI for 400–1000ms before the next frame painted — each one recomputes the whole build\'s stats and re-renders every panel synchronously. Those updates now run as a React transition so the click\'s own visual feedback paints immediately instead of waiting on that cascade',
    ],
  },
  {
    version: '0.3.121',
    date: '2026-10-21',
    notes: [
      'Fix: the date on a build card could get silently clipped (e.g. "30 sept 2026" showing as "30 sept 20") when a longer localized month name combined with wide stat counts overflowed the footer row — it now wraps instead of cutting content off',
    ],
  },
  {
    version: '0.3.120',
    date: '2026-10-21',
    notes: [
      'Fix: the elemental transform (Forgemagie) couldn\'t be applied to weapons whose neutral attack is a steal line instead of a plain damage line — e.g. Pandamonium Wand (Neutral Steal) and 37 other weapons showed "cannot transform" despite genuinely dealing neutral damage. Now recognizes both forms and keeps the result as a steal line when transforming a steal-based weapon',
    ],
  },
  {
    version: '0.3.119',
    date: '2026-10-21',
    notes: [
      'Fix: crawlable pages (home, About, How to Use, Explore, Privacy, Terms, the Cra class guide — all 4 languages) now ship with their real rendered content baked into the static HTML instead of an empty root shell, fixing an AdSense "low value content" rejection — real visitors still get the exact same interactive app',
    ],
  },
  {
    version: '0.3.118',
    date: '2026-10-20',
    notes: [
      'New: combat passives of Dofus, Prysmaradites and legendary items, with stacks, cases and turns',
      'Active passives count in spell and weapon damage and in the PvP arena',
      'New: % final damage, applied last in the damage formula',
      'Passive settings are saved with the build and shown on the build page',
      'Passive values come from the game data and update automatically with each game update',
      'Stats sheet: a With passives switch shows combat stats and what each passive adds',
      'Damage the targets suffer is its own multiplier after final damage, as in game',
      'Characteristics panel also shows passives (e.g. Dofusteuse +400 Strength) with the shared With passives switch',
      'Show stats: Gear or In combat, a selector above characteristics and stats',
    ],
  },
  {
    version: '0.3.117',
    date: '2026-10-20',
    notes: [
      'Fix: generic Damage from gear is no longer counted twice in spell and weapon damage',
    ],
  },
  {
    version: '0.3.116',
    date: '2026-10-20',
    notes: [
      'New: the build page shows the animated character of the build',
    ],
  },
  {
    version: '0.3.115',
    date: '2026-10-20',
    notes: [
      'Unlisted builds are link-only: the API can no longer list them',
      'Collections show unlisted builds you added from their link, only to you',
      'Moderators can restore hidden builds and comments; admins can feature builds',
      'A remix published later notifies the original author',
    ],
  },
  {
    version: '0.3.114',
    date: '2026-10-20',
    notes: [
      'Fix: spell and weapon damage follow the game formula, with % spell, weapon, ranged and melee damage as separate multipliers',
      'Fix: PvP arena resistances truncate like the game',
      'New: hover a spell or weapon damage value to see its full breakdown',
      'Fix: updating a published build works again',
      'Fix: rating a build works again',
      'Fix: version history no longer fills with copies from failed updates',
    ],
  },
  {
    version: '0.3.113',
    date: '2026-10-20',
    notes: [
      'Fix: Redo works from the header buttons, and undo no longer unlinks a build from its published version',
      'Fix: broken share links or stored builds no longer blank the page',
      'Fix: one copy of a set ring and one Prysmaradite at a time; re-picking an item keeps its forgemagie',
      'Fix: no stray unknown stats from spell-modifier lines; runes on empty slots and long emoji names handled',
      'Fix: female builds get the female portrait in share previews',
      'Fix: editing a build from another profile saves your own remix instead of failing to overwrite theirs',
      'Fix: password recovery links always open the new-password form',
      'Fix: Follow button shows the right state after a page refresh',
      'Fix: community pages no longer repeat or skip builds',
      'New: notifications arrive in real time',
      'Fix: follower, following and build counts on profiles update again',
      'Fix: database hardening for counters, likes, comments and views',
      'Fix: La Forjadora respects the character level and places exos without stealing rune slots',
      'Fix: La Forjadora caps, ley 0 minimums and level field behave as expected',
      'Fix: loading a La Forjadora result is a single undo step and never hangs',
      'Fix: best-element weapons count in the PvP arena; no NaN damage on weapons with AP-cost lines',
      'Fix: Equip all puts both set rings in different slots; catalog marks rings and Prysmaradite already worn',
      'Fix: catalog stat filter, no-cap max level, Escape and infinite scroll',
      'Fix: switching language during loading keeps the right language and spells',
      'Security: crafted share links can no longer inject special keys into build data',
    ],
  },
  {
    version: '0.3.112',
    date: '2026-10-19',
    notes: [
      'Fix: public collections no longer count private builds visitors cannot see; your private builds in them are marked "Only you see it"',
      'UI: the Update button in the header now matches the other header buttons',
      'Fix: closed a hole that let signed-in users send fake notifications',
      'Fix: builds hidden by moderators stay hidden, and moderators can still open them',
      'Fix: Remix and collections only for public builds; unlisted builds stay unlisted',
      'Fix: updating a build no longer risks erasing its tags',
      'Fix: no leftover data from the previous build when moving between build pages; faster filter changes in Explore show the right results',
      'Fix: Explore tag links no longer hang if tags fail to load; 1 build is no longer shown as 1 builds',
    ],
  },
  {
    version: '0.3.111',
    date: '2026-10-19',
    notes: [
      'UI: the Publish button reads Update when the build is already published',
    ],
  },
  {
    version: '0.3.110',
    date: '2026-10-19',
    notes: [
      'Feature: collections — group builds (yours or others\') into folders, public ones show on your profile',
      'Feature: report builds and comments from a form; moderators review the queue and hide or delete content',
      'Feature: notification bell — likes, comments, ratings, remixes, comment likes and new followers',
    ],
  },
  {
    version: '0.3.109',
    date: '2026-10-19',
    notes: [
      'Fix: the animated character now has the same hair, skin and clothes colors as in the game (they came out duller and darker)',
      'Fix: Snailmate, Snickermite, Bulbutting and Karmeleon colors match their icons',
      'Feature: Remix someone else\'s public build — your copy stays linked to the original and credits its author; builds show their remixes',
      'Feature: tag your builds (up to 5) and filter Explore by tag',
      'Feature: like comments on build pages',
      'Feature: version history for published builds — open or restore any of the last 20 versions',
    ],
  },
  {
    version: '0.3.108',
    date: '2026-10-19',
    notes: [
      'Feature: search box in the rune picker (Magesmithy) to find a stat by name instead of scrolling through all 51 — hides empty sections and shows a no-results message when nothing matches',
    ],
  },
  {
    version: '0.3.107',
    date: '2026-10-19',
    notes: [
      'Feature: 53 more pets walk beside the animated character (120 of 122), each with its real model and colors',
      'Feature: the Tortikoli petsmount can now be ridden',
      'Fix: pets with only an idle pose no longer disappear when the character walks or runs',
    ],
  },
  {
    version: '0.3.106',
    date: '2026-10-19',
    notes: [
      'Fix: if an open tab requests a JavaScript chunk removed by a newer deploy, the app reloads once instead of staying blank; missing assets now return 404 rather than the SPA HTML fallback',
    ],
  },
  {
    version: '0.3.105',
    date: '2026-10-19',
    notes: [
      'Fix: internal home links, language redirects and shared builder URLs now use canonical no-trailing-slash paths, avoiding Cloudflare redirect round-trips',
    ],
  },
  {
    version: '0.3.104',
    date: '2026-10-19',
    notes: [
      'Fix: a failed load of the sign-in / cloud library no longer leaves the account button or any page stuck loading; the next request retries it',
      'Perf: the Sets catalog opens and filters much faster (loads sets as you scroll)',
      'Perf: fewer needless re-renders in build cards, the rune window, Compare and The Forger',
      'Accessibility: closing a dialog returns focus where you were; the active menu item is announced as current',
      'Build: no public source maps in production; class icons served as WebP',
    ],
  },
  {
    version: '0.3.103',
    date: '2026-10-19',
    notes: [
      'Perf: pages now canonicalize to no-trailing-slash URLs (/explore instead of /explore/) across SEO tags, the sitemap, and Cloudflare\'s static asset serving — the previous convention forced a 307 redirect round-trip on any visit arriving via a bare URL (the common case), measured live at 86ms P75 in Cloudflare\'s Web Vitals',
    ],
  },
  {
    version: '0.3.102',
    date: '2026-10-19',
    notes: [
      'Fix: Srams, Xelors and Eliotropes riding a mount no longer hide their face under an oversized hood or hat',
      'Fix: the Snailmate pet shows its real colors',
    ],
  },
  {
    version: '0.3.101',
    date: '2026-10-19',
    notes: [
      'Performance: a reusable Grafana k6 baseline now covers smoke and browser checks for the real public routes, with configurable workload budgets',
      'CI: a dedicated PR performance workflow builds the app, serves a preview, runs the k6 smoke suite, and fails on latency/error thresholds',
      'Documentation: the repository now includes a performance-testing guide describing architecture, risks, and capacity-discovery procedures',
    ],
  },
  {
    version: '0.3.100',
    date: '2026-10-18',
    notes: [
      'Customization: the custom-rank catalog now offers 140 icons and 76 badge finishes in the admin editor, with all finishes rendered on public profile badges',
      'Admin: the custom-rank route checks the session and admin role, and gives localized feedback before redirecting unauthorized visitors',
      'Database: ordered migrations expand the icon and badge-finish catalogs; the canonical schema and database guide are updated',
    ],
  },
  {
    version: '0.3.99',
    date: '2026-10-18',
    notes: [
      'Customization: custom ranks support any hex color, 54 icons, 24 badge finishes, and an unlimited saved-build quota',
      'UI: the rank editor now separates identity, appearance, preview, benefits and visibility in a responsive layout with clear spacing and persistent save actions',
      'Database: the custom-rank extensions are consolidated into one migration after the original custom-ranks migration',
    ],
  },
  {
    version: '0.3.98',
    date: '2026-10-18',
    notes: [
      'UX: equipped Dofus are marked in the catalog with a check and their slot number; selecting one again no longer moves it from its current slot',
      'Admin: a centralized admin workspace brings tools together under one Admin entry, with Custom Ranks as its first section',
    ],
  },
  {
    version: '0.3.97',
    date: '2026-10-18',
    notes: [
      'Feature: Dofus Forge can now be installed as a standalone app on supported desktop and mobile browsers',
      'UI: crisp, full-bleed app icons for desktop, Android and iPhone, with no white or transparent corners',
      'Compatibility: the web app manifest uses relative paths for both the custom domain and GitHub Pages',
      'The installed app still needs an internet connection; no offline cache is enabled',
    ],
  },
  {
    version: '0.3.96',
    date: '2026-10-18',
    notes: [
      'Feature: private custom-rank studio for admins — create and archive ranks, preview safe badge icons/colors/styles, assign by username with optional dates and private notes, and retain revocation history',
      'Feature: active public custom ranks appear beside membership badges on profiles; custom ranks stay separate from account roles and membership plans',
      'Feature: admins can set a saved-build quota for each custom rank; the database enforces it and keeps the higher limit from the rank or membership',
      'UI: public profiles show a person’s bio under their name when they have one',
      'Security: admin-only row policies and server-checked assignment RPCs protect rank management; the public profile lookup returns badge fields only',
      'Database: apply supabase/migrations/20261018_custom_ranks.sql once before using the rank studio',
    ],
  },
  {
    version: '0.3.95',
    date: '2026-10-18',
    notes: [
      'UI: the footer now carries a Colombian signature with the flag, a 100% Colombian label, coffee and mountain icons, and a multicolored macaw; hovering the flag reveals a Colombian pride message',
    ],
  },
  {
    version: '0.3.94',
    date: '2026-10-18',
    notes: [
      'Fix: item icons are now mirrored into Dofus Forge\'s own storage instead of hotlinking DofusDude\'s live CDN — a future outage there (like the one that broke every equipped-item image on the site) no longer takes the catalog down with it',
      'Change: any item not yet mirrored still falls back to the live CDN automatically, and an hourly job keeps the mirror in sync with new items as the game updates',
      'Feature: public profiles now show a tier badge (Aprendiz/Artesano/Forjador/Maestro) for the upcoming supporter membership — first database groundwork only, no checkout exists yet so nobody has a paid tier today',
    ],
  },
  {
    version: '0.3.93',
    date: '2026-10-18',
    notes: [
      'Change: the animated 3D character is enabled by default; a saved 2D or 3D preference is still respected',
      'Feature: new releases can be announced automatically on X, with the first changelog note and a link to Dofus Forge',
      'Change: the footer now links to the Dofus Forge X account',
    ],
  },
  {
    version: '0.3.92',
    date: '2026-10-16',
    notes: [
      'Feature: equip a dragoturkey, seemyool, rhineetle or petsmount and the animated character rides it — walking, running and turning along',
      'Change: pets walk at the spot the game reserves for them, and the view zooms to fit a pet or a mount',
      'Fix: pets and mounts are drawn at their real size next to each class',
    ],
  },
  {
    version: '0.3.91',
    date: '2026-10-16',
    notes: [
      'Feature: the animated character shows your equipped pet beside it, walking, running and turning along (67 pets for now; the rest and petsmounts are coming)',
    ],
  },
  {
    version: '0.3.90',
    date: '2026-10-16',
    notes: [
      'Fix: The Forger can now be asked for Trap Damage, Trap Power, Reflected Damage, Pushback Resistance, % Melee / Ranged Resistance and MP Steal; Pushback Damage is easy to find',
      'UI: order form regrouped — Summons and Critical in Essentials, one Damage group and one Resistances group with clear sub-sections',
    ],
  },
  {
    version: '0.3.89',
    date: '2026-10-16',
    notes: [
      'Feature: animated character — Settings → Character switches the builder portrait between 2D and an animated character of your class and gender',
      'Feature: rotate the character through 8 facings and switch between standing, walking and running',
      'Feature: on mobile the animated character shows above the equipment slots',
    ],
  },
  {
    version: '0.3.88',
    date: '2026-10-15',
    notes: [
      'Change: the second magesmithy tab is now Transcendence and only offers transcendence runes; AP / MP / Range are back in the normal Runes grid',
    ],
  },
  {
    version: '0.3.87',
    date: '2026-10-15',
    notes: [
      'Feature: magesmithy now has a Runes tab and an Exotic tab — each item takes one exotic: an exo +1 AP / MP / Range or a transcendence rune, combined freely with normal runes',
      'Feature: transcendence runes apply the highest rank the item takes; ranks that do not fit are shown disabled with the reason',
      'UI: exotics show in gold in tooltips, slot badges and the active runes list',
      'UI: transcendence runes now use their own official rune art',
    ],
  },
  {
    version: '0.3.86',
    date: '2026-10-15',
    notes: [
      'Fix: Explore now counts every use of The Forger (each time the forge is lit), not only finished forges, and shows pieces forged separately',
      'Change: The Forger starts fully scrolled and with up to 3 exos by default',
    ],
  },
  {
    version: '0.3.85',
    date: '2026-10-15',
    notes: [
      'Fix: the new DMG tooltip broke the DMG column\'s alignment — fixed',
      'Fix: AP/MP/Range no longer disappear or go unflagged when a penalty pushes them negative — shown in red whenever non-zero',
    ],
  },
  {
    version: '0.3.84',
    date: '2026-10-15',
    notes: [
      'Feature: hovering the DMG number in Elements now shows a tooltip breaking down the element\'s own value vs. the flat "Damage" bonus shared across all elements',
    ],
  },
  {
    version: '0.3.83',
    date: '2026-10-15',
    notes: [
      'Feature: Explore now shows how many pieces have been forged with The Forger',
    ],
  },
  {
    version: '0.3.82',
    date: '2026-10-14',
    notes: [
      'Fix: the default forge now finds the best piece every time in validation — each thread keeps 24 islands and Standard / Quick use at least 4 threads (8/8 with runes in about 6 s, 8/8 without in about 2 s)',
      'Fix: The Forger now reaches the best piece far more reliably on demanding orders — on a real 11-minimum order with runes it finds the best build 15 of 16 times within 40 s (was 5–7 of 8)',
      'Performance: piece evaluation is about 3× faster',
      'Improvement: the forge systematically polishes hundreds of set combinations and tries every top set on the best piece',
      'Fix: Standard no longer tempers itself after only 30 s; minimum times are 15 s / 45 s / 2 min',
    ],
  },
  {
    version: '0.3.81',
    date: '2026-10-14',
    notes: [
      'Fix: The Forger now tempers itself once the piece stops improving noticeably — with transcendence runes it used to run to its 3-minute limit chasing +1/+2 rune swaps (same order: 180 s → ~34 s)',
      'Feature: order surplus — each piece shows how far it goes past every minimum and what that surplus is worth in purity',
      'Feature: the Eternal forge tells you when the piece looks finished',
      'UI: the header no longer wraps on narrower desktop screens',
    ],
  },
  {
    version: '0.3.80',
    date: '2026-10-14',
    notes: [
      'Fix: The Forger no longer settles into a decent build on demanding orders — Workers stop pulling each other into the first good result, stalled islands restart sooner, and on a real order the best build is now found 8/8 times with 8 threads (was 3/8)',
      'Fix: Quick / Standard / Master now forge for a minimum time (15 s / 60 s / 2½ min) before tempering on their own',
      'Improvement: smarter set handling (ranking by real gain per slot, starting "alloys" of 2–4 top sets), pruning of items beaten on every stat, and targeted repairs when a minimum is a few points short',
      'Feature: a Prysmaradite always goes in the first Dofus slot',
      'i18n: the tool name and the per-point value word are now consistent in every language',
      'UI: "New" badge on The Forger button; Explore and My Builds moved to the left, next to the version',
    ],
  },
  {
    version: '0.3.79',
    date: '2026-10-14',
    notes: [
      'Feature: exact purity values are back — minimum (≥), purity ⚖ (exact value per point) and soft or strict cap (≤) per stat; ◆ shortcuts fill the purity, and a warning shows when a minimum has purity 0',
      'Feature: the Smith\'s scale shows what each stat is worth next to the others ("1 AP ≈ 500 HP")',
      'Feature: Eternal forge that never goes out on its own, and a bellows button to stoke a stalled forge without losing the best piece',
      'Feature: Reforge starts from the current pieces, so the result never gets worse',
      'Improvement: far more consistent results — no cooling while minimums are missing, polishing during the whole run and a deeper final tempering (spread between runs on the hardest test: 26% → 1.4%)',
      'UI: animated forge (hammer, ember, sparks), smith\'s log with live events, hammer-strike counter, masterpiece ribbon with shine and staggered reveal',
    ],
  },
  {
    version: '0.3.78',
    date: '2026-10-14',
    notes: [
      'Feature: The Forger adds official transcendence runes (Tra / Pa / Ra) to the items it picks, one per forgeable item, sized by the line the item already has; loading a piece applies them',
      'Feature: characteristic points now also cover the chosen items\' own equip conditions (e.g. "Agility > 300")',
      'Feature: new forging flow — place an order (minimum, importance ◆ 1–5, soft or strict cap), pick Quick / Standard / Master, light the forge; it cools and tempers the result on its own, with a live checklist of minimums',
      'Improvement: wider and deeper search with ring migration between Workers and a final tempering pass over the best pieces',
      'Fix: alternatives that only differed in filler items are no longer listed separately',
      'Validated on the real catalog: 12 of 12 test runs meet every minimum, including the 11-requirement case',
    ],
  },
  {
    version: '0.3.77',
    date: '2026-10-14',
    notes: [
      'Architecture: The Forger runs on a new island-model engine that keeps its state between steps; several Workers (threads 1–8) search in parallel and share their best build',
      'Feature: conditions are now Goal / Weight / Max per stat — negative score while any goal is missing, weighted surplus once all are met; soft or absolute max; Power counts toward characteristic goals',
      'Feature: The Forger distributes characteristic points for every build and adds exo AP/MP/Range runes only where they close a goal; loading a build applies both',
      'Feature: real Start / Pause / Resume / Restart with a generation counter, score delta, score sparkline and the top 10 builds as alternatives; configurable threads and generation limit',
      'Feature: ban items from a result card; the ban list is editable under Advanced',
      'Fix: stopping the search early now really interrupts it (the old engine could not read the stop message until it had finished)',
      'Fix: item conditions on multi-word stats such as "% Critical" were always read as 0',
      'Real-catalog benchmark: the 11-requirement case reaches 10 of 11 in under a second (previous engine: 8 of 11 in 70–90 s)',
    ],
  },
  {
    version: '0.3.76',
    date: '2026-10-14',
    notes: [
      'Fix: flat Damage now amplifies whichever elemental damage stat is prioritized, same as Power already did',
      'Architecture: the optimizer now runs exclusively on the Rust/WASM engine, no more silent TypeScript fallback',
      'Architecture: replaced the bounded-exhaustive search with a genetic/memetic search engine (an evolving population of builds, refined each generation by the existing hill-climbing) — fixes very similar results across different priority weights, confirmed on the real catalog: builds now differ on 16-17 of 17 slots and strongly maximize whichever stat is weighted',
      'Fix: the search\'s scoring now rewards fully meeting a requirement, not just averaging how close each one is — closed a real gap against the previous engine on the hardest tested case (8 of 11 vs 11 requirements, matching the old engine) and improved every other benchmark',
      'Fix: "Exo AP/MP/Range" now actually credits the assumed forged bonus (a flat +1, only when a ring is equipped) instead of only raising the required minimum — closer to what the feature already described',
      'Feature: the optimizer shows live progress during the search (requirements met, a live preview of the best build found) and a "Use this result now" button to stop early instead of waiting for the full time budget',
      'Footer now includes a short disclaimer: Dofus Forge is not affiliated with Ankama Games',
    ],
  },
  {
    version: '0.3.75',
    date: '2026-10-13',
    notes: [
      'Fix: loading a recommended build now applies its scrolled state and clears stale forged runes on changed slots',
      "Fix: targeting HP alone now invests characteristic points in Vitality too, not just items",
      'Fix: targeting two different hard-minimum characteristics at once (e.g. Strength and Vitality together) could leave both unmet — the point allocator now reserves what each one needs first, before spending the rest as before',
      'Feature: the search is meaningfully deeper by default, now finding fully-satisfying combinations for tight multi-requirement requests; very demanding ones can take a few minutes',
      'Feature: redesigned loading screen with rotating status messages and an elapsed-time counter',
    ],
  },
  {
    version: '0.3.74',
    date: '2026-10-13',
    notes: [
      'Fix: the Rust/WASM engine could return an illegal build (a Trophy conflicting with an active set bonus) as its best result — fixed with a dedicated repair phase, mirrored in the TypeScript fallback',
      'Feature: the Rust engine now also searches exhaustive combinations of 4 different sets at once, not just up to 3',
      'Fix: the result card only showed up to 6 stats, silently hiding required stats past the 6th — now all required stats always show',
      'Feature: the result card shows a badge on items that carry forged runes from a locked slot',
    ],
  },
  {
    version: '0.3.73',
    date: '2026-10-13',
    notes: [
      'Feature: new Privacy Policy and Terms of Service pages, in all 4 languages',
      'Added ads.txt, Report link on comments, and footer contact/legal links — AdSense policy compliance fixes',
    ],
  },
  {
    version: '0.3.72',
    date: '2026-10-12',
    notes: [
      'Feature: Explore now shows a community stats bar — registered forgers, public builds, total builds created, total views, builds created this week, and total likes given',
      'Also shows catalog size (total items & sets catalogued), read directly from already-loaded game data',
    ],
  },
  {
    version: '0.3.71',
    date: '2026-10-10',
    notes: [
      'Feature: the Rust/WASM optimizer engine is now live — the Forge tries it first, falling back to the TypeScript engine automatically if WASM fails for any reason. Works in every locale. Also searches exhaustive triples of sets, finding legal builds the old engine could not reach',
      'No build-pipeline changes: the compiled WASM ships as a static asset, same as the existing game data JSON',
    ],
  },
  {
    version: '0.3.70',
    date: '2026-10-10',
    notes: [
      'Feature: the optimizer now also decides characteristic point allocation, not just equipment — previously a fresh build with zero points got evaluated with zero points spent anywhere. Uses a provably optimal greedy algorithm against each characteristic\'s real cost curve; leaves existing points untouched if none are prioritized',
      'Confirmed via real-catalog diffing that the 5 returned results are genuinely different builds (4-12 slots differing between most pairs), even for very demanding requests',
    ],
  },
  {
    version: '0.3.69',
    date: '2026-10-10',
    notes: [
      'Fix (major): a GM test item (+300 to every characteristic) leaked through the "non-obtainable" filter for every non-English player, because the filter matched English marker text and the translated item name drops that marker entirely in Spanish/French/Portuguese. Now matched by ankama_id (locale-proof) — two more items with the same leak are caught too',
      "Fix: forged rune (forgemagie) bonuses on kept/locked gear were never included in the optimizer's calculations — now included for locked slots",
      'Fix: Power (Potencia) now rides along with whichever elemental damage stat has the highest priority, instead of only counting when "Power" itself was explicitly weighted',
      'Change: removed the "I have a Dofus subscription" checkbox — subscription-gated items are no longer excluded at all',
      'Feature: the optimizer now shows a summary of the build it\'s calculating from (level, allocated points, scrolled characteristics)',
    ],
  },
  {
    version: '0.3.68',
    date: '2026-10-10',
    notes: [
      'Fix: the optimizer could look stuck on the same picks regardless of target — hard constraints (including Exo AP/MP/Range) only gave an all-or-nothing ranking bonus with no gradient toward feasibility. Replaced with a continuous satisfaction measure so the search can actually climb toward requirements instead of only falling off a cliff',
      'Fix: equip conditions beyond simple stat checks were ignored — character-level gates, subscription-only items (now excluded by default, opt-in checkbox added), and Trophy "no active set bonus" conditions are now all validated',
      'Feature: "Assume fully scrolled" checkbox for the optimizer',
      'Fix: clearing a stat\'s minimum now also resets its priority weight instead of leaving the card active with no visible reason',
    ],
  },
  {
    version: '0.3.67',
    date: '2026-10-10',
    notes: [
      'Fix: the optimizer never validated items\' own equip conditions (e.g. "Strength > 100") — it could recommend gear the character doesn\'t actually qualify to wear. Now treated as a hard constraint, same as an unmet stat minimum',
      'Feature: the Forge now requires a class first — opening it with none selected shows a locked gate with the class picker embedded, auto-advancing once chosen',
      'Change: the Exo AP/MP/Range checkboxes moved into their own labeled "Forgemagic" section, with a hint pointing to the Combat stat group for Summons and similar stats',
    ],
  },
  {
    version: '0.3.66',
    date: '2026-10-10',
    notes: [
      'Fix: the optimizer could silently cap results below what\'s achievable — its polish phase was skipped entirely whenever set search ran long, now it always runs',
    ],
  },
  {
    version: '0.3.65',
    date: '2026-10-09',
    notes: [
      'Rewrite: the build optimizer now exhaustively tries every set and every pair of sets (not a sample), then polishes the best candidates against the real stat engine — the old search could never "see" set bonuses while deciding which items to keep',
      'Fix: a few Game Master/QA-only items with absurd stats could be equipped by the optimizer — the obtainable-item filter only matched a French marker, not the English one actually in the data',
      'Fix: the "Exo AP/MP/Range" checkboxes did nothing — now apply a real 12/6/6 hard floor',
      'Feature: stats can be prioritized (0-5) independently of any hard minimum, instead of every active stat forcing an all-or-nothing requirement',
      'Feature: 5 results instead of 3, picked to be genuinely different builds',
    ],
  },
  {
    version: '0.3.64',
    date: '2026-10-09',
    notes: [
      'Change: account menu no longer repeats your name — just Edit Profile and Sign Out',
      'Feature: Account page username links to your public profile, shows member-since date, builds/followers/following are clickable',
    ],
  },
  {
    version: '0.3.63',
    date: '2026-10-09',
    notes: [
      'Feature: forgot-password flow — reset link by email, then set a new password',
      'Feature: change password from the new Account page',
      'Feature: show/hide toggle on every password field',
      'Change: "Edit Profile" is now its own page (/account) instead of a popup',
      'Security: avatar preview on the Account page now sanitized where it enters state, not just at render',
    ],
  },
  {
    version: '0.3.62',
    date: '2026-10-09',
    notes: [
      'Fix: the Level input couldn\'t be cleared to type a new number — same fix as the earlier rune-value inputs, buffers locally while focused and commits on blur',
      'Fix: equipping a set from the Sets catalog (card click or "Equip All" in the detail view) left the catalog open instead of returning to the planner',
    ],
  },
  {
    version: '0.3.61',
    date: '2026-10-08',
    notes: [
      'Fix: a build\'s shared image could stay stale after an edit since Discord/WhatsApp cache previews by image URL — now versioned with ?v=<updated_at> so it changes automatically',
    ],
  },
  {
    version: '0.3.60',
    date: '2026-10-08',
    notes: [
      'Fix: build-share image showed wrong stats for builds viewed in a non-English locale — localized item data was fed into the stat engine, which only recognizes English stat names; now always computes from English data like the planner does',
    ],
  },
  {
    version: '0.3.59',
    date: '2026-10-08',
    notes: [
      'Fix: build-share image ignored Magesmithy rune bonuses — now included in AP/MP/HP/Range and characteristics',
      'Fix: build-share image showed stale/wrong icons for 6 characteristics — regenerated from the real app icons',
      'Fix: build-share image cut off the equipment list past 11 items — now shows all equipped slots in 2 columns',
      'Fix: the Discord release-notes CI step crashed on its first run because the changelog body\'s backticks got interpreted as shell command substitution — now passed through a file, never shell-interpolated',
    ],
  },
  {
    version: '0.3.58',
    date: '2026-10-08',
    notes: [
      'Fix: GitHub Releases now post a real Discord embed (version + changelog) instead of Discord\'s bare one-line webhook message',
      'Fix: social-share image (og-preview) showed the old wembie.github.io URL and stale item/set counts — now shows dofusforge.com and real counts (4,095 items · 940 sets)',
      'Perf: social-share image converted from 489KB PNG to ~64KB JPEG, same quality',
      'Security: removed a debug fallback that could leak a private build\'s name in the OG-image route',
      'Security: error responses no longer expose raw stack traces',
      'Security: added X-Content-Type-Options, X-Frame-Options, and Referrer-Policy headers',
      'Change: updated the Discord invite link in the footer',
    ],
  },
  {
    version: '0.3.57',
    date: '2026-10-08',
    notes: [
      'Change: added a Discord link to the site footer, on its own line below the credits row',
    ],
  },
  {
    version: '0.3.56',
    date: '2026-10-08',
    notes: [
      "Fix: Compare panel's Build B field now also accepts a build's short link/id, not just the long encoded one",
      'Feature: Compare panel can load Build B from your real saved builds, not just an old local-only list',
    ],
  },
  {
    version: '0.3.55',
    date: '2026-10-08',
    notes: [
      'Feature: added Cloudflare Turnstile captcha to sign-up and sign-in to block bots',
    ],
  },
  {
    version: '0.3.54',
    date: '2026-10-07',
    notes: [
      'Change: build detail page now shows its creation date',
      'Change: comments now show date + time instead of nothing',
    ],
  },
  {
    version: '0.3.53',
    date: '2026-10-07',
    notes: [
      'Change: build cards in Explore and My Builds now show the creation date',
    ],
  },
  {
    version: '0.3.52',
    date: '2026-10-07',
    notes: [
      'Fix: "Equip All" from the item catalog left the catalog open behind the closed set modal',
      'Fix: set bonus tiers no longer all show "Active" at once — only the highest reached tier is',
    ],
  },
  {
    version: '0.3.51',
    date: '2026-10-07',
    notes: [
      'Change: "Equip All" in the set detail modal now closes it and returns to the planner',
      'Change: moved the "Equip All" button next to the Items section',
      'Design review by Living-Legend',
    ],
  },
  {
    version: '0.3.50',
    date: '2026-10-07',
    notes: [
      'Design: removed the default gold top-border accent from panel cards across the app',
      'Fix: Normal/Crítico damage columns in the spell panel no longer have a big gap between them',
      'Design review by Mila',
    ],
  },
  {
    version: '0.3.49',
    date: '2026-10-07',
    notes: [
      "Fix: rune value input couldn't be cleared to type a new number — Add is now disabled while empty/0",
      'Change: "% Critical" moved to the Primary section in the rune panel',
    ],
  },
  {
    version: '0.3.48',
    date: '2026-10-07',
    notes: [
      "Fix: loading a build into the planner could show the placeholder instead of its real name",
      'Fix: loading a build and refreshing before re-publishing could silently create a duplicate instead of updating it',
    ],
  },
  {
    version: '0.3.47',
    date: '2026-10-07',
    notes: [
      'Feature: shared build links now show a real preview image (name, class, equipped items, stats) when posted on Discord/WhatsApp/X/Facebook',
      'Fix: shared build page title now includes the build\'s own name when set',
      "Fix: the build name typed in the Publish modal wasn't synced back to the planner header after publishing/updating",
    ],
  },
  {
    version: '0.3.46',
    date: '2026-10-06',
    notes: [
      'Fix: some items showed raw unresolved text markup in their special ability description instead of a clean name',
    ],
  },
  {
    version: '0.3.45',
    date: '2026-10-06',
    notes: [
      'Fix: the equipment catalog is finally updated to Dofus 3.7.1.0 with correct stats - the game data provider fixed the outage on their end',
    ],
  },
  {
    version: '0.3.44',
    date: '2026-10-06',
    notes: [
      'Fix: items showed no stats at all - a bug on the game data provider\'s side with the 3.7 rollout. Rolled the equipment catalog back to the last working version while we wait for it to be fixed upstream',
    ],
  },
  {
    version: '0.3.43',
    date: '2026-10-06',
    notes: [
      'Chore: game data refreshed to Dofus 3.7.1.0 - equipment and sets catalog updated',
      'Fix: trap and glyph spells (Sram, Sadida, Feca...) were showing no damage numbers after the 3.7 update - fixed',
    ],
  },
  {
    version: '0.3.42',
    date: '2026-10-05',
    notes: [
      'Fix: your username is now always the primary name shown - on your profile page and account menu too, not just builds and comments',
      'Chore: game data refreshed to the latest Dofus version (3.6.12.16)',
    ],
  },
  {
    version: '0.3.41',
    date: '2026-10-05',
    notes: [
      'Fix: the account menu now always shows your username too, even when you have a display name set',
    ],
  },
  {
    version: '0.3.40',
    date: '2026-10-05',
    notes: [
      'Fix: builds and comments now always show your username as the author, never your optional display name',
      'Polish: the profile "display name" field was renamed to "Name (optional)" with a clearer explanation of where it shows up',
    ],
  },
  {
    version: '0.3.39',
    date: '2026-10-03',
    notes: [
      'Feat: new Settings option to move the characteristics sidebar to the left side of the planner (desktop)',
    ],
  },
  {
    version: '0.3.38',
    date: '2026-10-03',
    notes: [
      'Perf: the item picker no longer freezes on slower PCs - it now loads items gradually as you scroll instead of all at once',
      'Perf: equipping or tweaking a build now triggers fewer unnecessary re-renders across the page',
    ],
  },
  {
    version: '0.3.37',
    date: '2026-10-03',
    notes: [
      'Feat: a public total-builds counter now shows on the About page',
      'Feat: accounts are now limited to 50 builds each, enforced server-side',
      'Feat: publishing a build now defaults to public instead of private',
    ],
  },
  {
    version: '0.3.36',
    date: '2026-10-03',
    notes: [
      'Feat: the app now detects a newer deploy and shows a dismissible "update available" banner with a reload button',
      'Fix: the redirect page no longer leaves you stuck forever - a manual link appears if it does not navigate within 2.5s',
    ],
  },
  {
    version: '0.3.35',
    date: '2026-10-03',
    notes: [
      'Fix: translation files now cache-bust on app version - a new deploy no longer risks showing raw i18n keys from a stale cached copy',
    ],
  },
  {
    version: '0.3.34',
    date: '2026-10-03',
    notes: [
      'Fix: build detail page now correctly adds Power into Strength/Intelligence/Chance/Agility, same as the planner does - shown as a single total with the breakdown in a hover tooltip',
    ],
  },
  {
    version: '0.3.33',
    date: '2026-10-03',
    notes: [
      'Feat: build detail page now shows which characteristics were scrolled, like the planner already does',
    ],
  },
  {
    version: '0.3.32',
    date: '2026-10-03',
    notes: [
      'Feat: M52 - bookmark builds (save/unsave), with a new "Bookmarked" tab on My Builds',
    ],
  },
  {
    version: '0.3.31',
    date: '2026-10-02',
    notes: [
      'Feat: M51 - follow/unfollow users on their profile page',
      'Fix: Explore search now matches word prefixes ("Emp" finds "Empujes"), not just whole words',
    ],
  },
  {
    version: '0.3.30',
    date: '2026-10-02',
    notes: [
      'Feat: M50 - full-text search in Explore, using the existing indexed search_vector column, debounced 350ms',
    ],
  },
  {
    version: '0.3.29',
    date: '2026-10-02',
    notes: [
      'Fix: build card owner name no longer triggers the whole card\'s hover glow - has its own distinct hover style now',
      'Fix: comment author name now actually visibly reacts on hover (was blocked by a leftover inline style)',
    ],
  },
  {
    version: '0.3.28',
    date: '2026-10-02',
    notes: [
      'Feat: build card owner names (Explore, My Builds, profile page) are now clickable links to their profile too',
    ],
  },
  {
    version: '0.3.27',
    date: '2026-10-02',
    notes: [
      'Feat: new public profile page at /u/:username - public builds, likes received, comments posted, join date',
      'Feat: build owner and commenter names are now clickable links to their profile',
      'Perf: profile stats use a lightweight query instead of fetching full build rows just to count them',
    ],
  },
  {
    version: '0.3.26',
    date: '2026-10-02',
    notes: [
      'Fix: switching language from Settings no longer bounces you back to the planner - stays on the page you were on',
      'Polish: class spell guide cards now have labeled stats and more breathing room instead of cramped icon-only badges',
    ],
  },
  {
    version: '0.3.25',
    date: '2026-10-02',
    notes: [
      'Fix: About page\'s class list now shows the real per-language class name instead of always English',
      'Feat: new /classes/:id spell guide page (pilot: Cra only) - read-only spell data, no build needed',
      'Fix: invalid class page had the wrong "not found" message',
    ],
  },
  {
    version: '0.3.24',
    date: '2026-10-02',
    notes: [
      'Fix: homepage no longer has any marketing content below the planner - class list and FAQ moved into /about, joining the features grid that moved there last version',
    ],
  },
  {
    version: '0.3.23',
    date: '2026-10-02',
    notes: [
      'Fix: ShareBar\'s duplicate "My Builds" link removed - was showing twice next to BuilderPage\'s own nav',
      'Feat: added PNG favicon fallbacks and a WebSite/Organization logo schema for better branding in Google search results',
      'Polish: homepage content trimmed (features grid and how-it-works moved/removed, now live on /about and /how-to-use instead of duplicated on the planner)',
    ],
  },
  {
    version: '0.3.22',
    date: '2026-10-02',
    notes: [
      'Feat: new /about and /how-to-use pages in all 4 languages, with real content, their own SEO meta and a sitemap entry',
      'Feat: shared SiteFooter with Home/About/How to Use/Explore/My Builds links on every page',
      'Fix: SiteHeader brand mark was a duplicate <h1> on every page it\'s used on - now a <span>',
      'Fix: returning visitors with a saved language got bounced to the bare language root from any sub-route instead of their actual page',
      'Chore: removed the Ankama affiliation disclaimer/attribution',
    ],
  },
  {
    version: '0.3.21',
    date: '2026-10-02',
    notes: [
      'Fix: every page (Explore, My Builds, build detail) now sets its own title/description/canonical instead of inheriting the homepage\'s',
      'Fix: /explore and /my-builds now have real static pages on GitHub Pages (previously 404\'d on direct load/crawl, blocking indexing)',
      'Feat: added SEO content section on the homepage (what it does, features, classes, how it works, FAQ) in all 4 languages',
      'Feat: ?class=<id> deep link preselects a class on load - used by the new classes section, not just decorative text',
      'Fix: primary language in social preview metadata is now English, matching the actual homepage',
      'Chore: /explore added to sitemap.xml for all 4 languages',
      'Chore: expanded keywords/featureList (index.html) across all 4 languages',
      'Feat: /en is now reachable too, matching /es /fr /pt - / stays the canonical English URL, internal nav unchanged',
      'Chore: /en/* now gets real static pages on GitHub Pages, each self-canonicalizing back to the no-prefix URL',
    ],
  },
  {
    version: '0.3.20',
    date: '2026-10-02',
    notes: [
      'Fix: My Builds cards now open the build detail page on click, same as Explore - loading into the planner moved to its own "Edit" button',
    ],
  },
  {
    version: '0.3.19',
    date: '2026-10-01',
    notes: [
      'Feat: new Settings panel (gear icon) - language, theme, sound, magic cursor and particles all in one place',
      'Feat: magic cursor and particles can now be turned off individually, not just via reduced-motion',
      'Fix: sound, magic cursor and particles are now off by default - turn them on in Settings if you want them',
    ],
  },
  {
    version: '0.3.18',
    date: '2026-10-01',
    notes: [
      'Feat: equipped items that belong to a set now show a distinct gold/blue glow instead of the same look as any other item',
      'Feat: Dofus slots now have their own ambient glow when equipped ("Dofus Sanctum")',
      'Fix: stats now visibly flash when they change after equipping/unequipping gear',
      'Feat: the item picker opens as a bottom sheet on mobile instead of a floating panel',
      'Feat: command palette (Ctrl/Cmd+K) - search and run any major action without hunting through menus',
      'Feat: a small magic cursor glow now follows your mouse and reacts to buttons (desktop only, respects reduced-motion)',
      'Feat: subtle ambient gold particles drift in the background',
      'Feat: equipping gear and selecting a class now play a short sound - mute toggle in the header',
    ],
  },
  {
    version: '0.3.17',
    date: '2026-10-01',
    notes: [
      'Fix: comments/likes/ratings/bookmarks/follows from anyone other than a build\'s owner silently failed to update its counters — a comment from someone else would show up but comment_count stayed at 0, same for likes and average rating from non-owners',
      'Fix: on mobile/tablet, Explore/My Builds/Publish/Optimizer/Sets/Compare/Undo/Redo were hidden with no way to reach them — added a menu button for everything that disappears at each breakpoint',
      'Fix: header nav now highlights whichever page (Explore/My Builds) you\'re actually on',
      'Fix: My Builds\' visibility button now shows all 3 options (private/unlisted/public) instead of blindly cycling through them',
      'Fix: the delete button on My Builds cards is now visibly red, and all icon-only buttons have proper accessible labels',
      'Polish: build cards (Explore and My Builds) now use the same gold-bordered, glowing style as the rest of the app instead of a plain flat box, with the build name in bold gold',
      'Fix: your rating and the build\'s average rating are now shown together instead of split across the page',
      'Fix: posting a comment now shows "Posting..." instead of giving no feedback',
    ],
  },
  {
    version: '0.3.16',
    date: '2026-10-01',
    notes: [
      'Fix: header nav said just "Builds" — now says "My Builds" in every language',
      'Feat: each card in My Builds now has a comment icon that jumps straight to that build\'s detail page (ratings/comments/likes) — clicking the card itself still loads it into the planner like before',
      'Feat: My Builds and Explore cards now also show how many comments each build has, so you know at a glance if there\'s something new to check before opening it',
    ],
  },
  {
    version: '0.3.15',
    date: '2026-09-30',
    notes: [
      'Fix: Explore, My Builds and the build detail page each had their own bare "back to planner" header — now they share the same header as the builder (logo, Explore/My Builds nav, language switcher, theme toggle, account menu)',
    ],
  },
  {
    version: '0.3.14',
    date: '2026-09-30',
    notes: [
      'Feat: build detail page equipment now shows the real character layout (portrait in the middle, gear arranged around it, dofus row below) instead of a plain item list — same arrangement as the planner itself',
      'Feat: active sets now show on the build detail page (piece count, active tier bonuses), just like in the planner',
    ],
  },
  {
    version: '0.3.13',
    date: '2026-09-30',
    notes: [
      'Feat: build detail page — equipped items now show as full rows (image, name, level, stats) like the set-detail view, hovering one shows its complete tooltip including magesmithy runes and who crafted it',
      'Feat: build detail page now also shows the 6 base characteristics (Vitality, Wisdom, Strength, Intelligence, Chance, Agility), which were missing from the stats view',
    ],
  },
  {
    version: '0.3.12',
    date: '2026-09-30',
    notes: [
      'Polish: equipment icons on build cards/detail pages now match the real planner\'s look (gold glow, gradient, bigger) instead of flat cramped squares',
      'Feat: the build detail page now shows the full stat sheet (elemental damage/resistance table, crit, initiative, dodge/lock, magesmithy totals, everything) — the exact same panel as the real planner, not just a handful of numbers',
    ],
  },
  {
    version: '0.3.11',
    date: '2026-09-30',
    notes: [
      'Fix: publishing an already-published build created a duplicate instead of updating it (e.g. changing visibility). Re-publishing a build you loaded from My Builds, or your own build\'s page, now updates that same one instead',
    ],
  },
  {
    version: '0.3.10',
    date: '2026-09-30',
    notes: [
      'Fix: rating a build failed with a 500 error — an unaliased subquery in the database\'s "builds update" security policy accidentally matched every build instead of one, tripped by the rating system\'s own background update',
      'Feat: Explore cards and the build detail page now show the actual equipped items (icons) instead of just text — a build is its gear, not just a name and a level',
      'Feat: build detail page now shows real computed stats (HP/AP/MP/Range + the 6 characteristics) next to the equipment',
      'Feat: "My Builds" is now its own page (from the header) — bigger cards with item icons, click a visibility badge to cycle private/unlisted/public, copy link, delete',
    ],
  },
  {
    version: '0.3.9',
    date: '2026-09-30',
    notes: [
      '"My Builds" is now cloud-only — shows exactly the builds you own in the database (any visibility), no more separate local-only list. Sign in to see it',
    ],
  },
  {
    version: '0.3.8',
    date: '2026-09-30',
    notes: [
      'Feat: "My Builds" (ShareBar) now also shows your published cloud builds, with a badge for each one\'s visibility (private/unlisted/public) — click to load, trash icon to delete',
    ],
  },
  {
    version: '0.3.7',
    date: '2026-09-30',
    notes: [
      'Fix: Explore and build detail pages failed to load ("this build does not exist or is private") right after publishing — a Supabase query ambiguity (builds/build_comments link to profiles through more than one relationship), now fixed by naming the exact one to use',
    ],
  },
  {
    version: '0.3.6',
    date: '2026-09-30',
    notes: [
      'Feat: publish your build to the cloud — pick a name and visibility (private/unlisted/public) from the new "Publish" button',
      'Feat: Explore page — browse public builds by class, sorted by rating/likes/recent/views',
      'Feat: build detail page — like, rate (1-5 stars) and comment on public builds, or load one straight into your own planner',
    ],
  },
  {
    version: '0.3.5',
    date: '2026-09-30',
    notes: [
      'Fix: some accounts got "permission denied for table profiles" (and would have on every other table) — the database was missing basic Postgres GRANTs beneath the RLS policies, which is a separate, more fundamental permission layer that Supabase normally sets up automatically on a new project',
    ],
  },
  {
    version: '0.3.4',
    date: '2026-09-30',
    notes: [
      'Feat: full profile page (from the account menu) — edit your username, display name and bio in one place, plus your builds/followers/following counts',
      'Fix: a failed profile fetch (e.g. a missing profiles row) silently fell back to showing your raw email in the header with no way to diagnose it — now logs the real error to the console',
      'Fix: the profile page could open with blank fields even when you already had a username/display name/bio set, if it loaded before your profile data finished fetching',
    ],
  },
  {
    version: '0.3.3',
    date: '2026-09-30',
    notes: [
      'Feat: pick your own username at signup instead of getting an auto-generated one from your email — required field, checked for availability before creating the account',
    ],
  },
  {
    version: '0.3.2',
    date: '2026-09-30',
    notes: [
      'Fix: confirming a new account landed on the site but never logged you in automatically if you had a saved language preference — the redirect that bounces you to your language\'s URL was dropping the #access_token from the confirmation link',
      'Feat: change your username from the account menu (top-right) — display_name/username was already shown instead of your email everywhere, this lets you pick your own instead of the auto-generated one',
      'Polish: the account confirmation email is now in English (Supabase only allows one template, not one per language)',
    ],
  },
  {
    version: '0.3.1',
    date: '2026-09-30',
    notes: [
      'Fix: account confirmation emails redirected to http://localhost:3000 (Supabase\'s default "Site URL") instead of the real site. Sign-up now explicitly passes emailRedirectTo pointing at the current origin',
      'Polish: redesigned the login/sign-up window — branded header with icon, mail/lock icons in the inputs, nicer success screen after signing up, and a note to check the spam folder if the confirmation email doesn\'t show up',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09-30',
    notes: [
      'Feat: cloud accounts, powered by Supabase — the first step towards saved/shareable builds in the cloud (see docs/DATABASE.md for the full roadmap: profiles, likes, comments, follows, Explore...)',
      'Feat: M47 — sign up / sign in / sign out with email+password. New account button in the header (top-right, next to the language switcher)',
      'Chore: full Postgres schema designed and validated against the real app data model (19 tables, RLS, triggers) — see docs/DATABASE.md and the ready-to-run supabase/schema.sql',
    ],
  },
  {
    version: '0.2.138',
    date: '2026-09-17',
    notes: [
      'Fix (data): "Cire Momore\'s Curse" set showed 3 unlabeled "+19/+23/+26 Max." bonuses per tier with no name and the wrong number. Confirmed a bug in the upstream dofusdude API itself: that effect type has no real name ("Max.") and its min/max fields are swapped — the "value" shown was actually the Ankama characteristic id (Range/MP/Summons), not the real number. Fixed at the source: now shows "Range Max.", "MP Max." and "Summons Max." with the correct value',
    ],
  },
  {
    version: '0.2.137',
    date: '2026-09-15',
    notes: [
      'Fix (data): trap/glyph spells (Sram, Cra) showed only a "Places a trap" badge with no damage numbers — the trap\'s real damage lives on a completely separate hidden spell, triggered when it activates, that the ETL never followed. Reverse-engineered the link (a dedicated effectId whose values are the hidden spell\'s id + grade) and merged its real damage/steal/poison/push/charge effects into the placement spell. 172 trap/glyph spell levels across all classes now show their actual damage instead of just the trap-placement icon',
    ],
  },
  {
    version: '0.2.136',
    date: '2026-09-15',
    notes: [
      'Fix (big one): 82 spells with a fixed (non-range) damage/steal/poison value stored max=0 in the data — calcEffects() fed that 0 straight into the damage formula instead of falling back to min, showing a broken range like "104–0" instead of just "104" (e.g. Reprisal, Reflex, Misfortune, Bravado, and many more, across every class). Same fix applies everywhere calcEffects() is used: base damage, crit damage, and charge levels',
    ],
  },
  {
    version: '0.2.135',
    date: '2026-09-15',
    notes: [
      'Fix: charge-based spells (e.g. "Ojo por Ojo") showed a LOWER critical hit at charge 1+ than the base uncharged crit — the charge-set crit calc was missing the +critDamage flat bonus that the base crit row already included. Empirically re-verified every charge-having spell/grade/level across all classes (75 total): after the fix, none regress — each charge level\'s normal and crit damage both scale up monotonically as expected',
    ],
  },
  {
    version: '0.2.134',
    date: '2026-09-11',
    notes: [
      'Polish: PvP arena attack picker now groups spells into "Spells", "Variants" and "Common" (same categories as the main spell list) instead of one flat row, and wraps to multiple lines instead of hiding extras behind a horizontal scrollbar — much more usable on narrow/mobile widths',
    ],
  },
  {
    version: '0.2.133',
    date: '2026-09-11',
    notes: [
      'Fix: header buttons (undo/redo, The Forger, Sets, Compare, version badge) showed at 640px wide while the 2-column desktop layout only kicked in at 1024px — between those widths the header looked fully desktop but Characteristics/Stats were hidden behind mobile tabs. Both now switch at the same width',
      'Feat: PvP simulator arena is now collapsed by default — click its header to reveal the resistance inputs and attack picker',
    ],
  },
  {
    version: '0.2.132',
    date: '2026-09-11',
    notes: [
      'Redesign: M40 PvP simulator is now its own dedicated arena instead of extra lines scattered on every spell/weapon row — pick one spell or the weapon attack (shown with its real icon), type the dummy\'s resistances, and click the attack to "fire" a random hit at a target with a punch animation and a floating damage number',
    ],
  },
  {
    version: '0.2.131',
    date: '2026-09-10',
    notes: [
      'Feat: M40 — PvP dummy simulator. New collapsible panel at the top of the Spells section lets you type a target\'s fixed + % resistance per element; when enabled, every spell damage line (and its Σ total) and every weapon damage/steal row (and its Total) shows an extra 🎯 line with the real damage after those resistances',
    ],
  },
  {
    version: '0.2.130',
    date: '2026-09-09',
    notes: [
      'Feat: item, set, and stat search boxes now ignore accents — searching "ambar" finds "Ámbar", in any language',
    ],
  },
  {
    version: '0.2.129',
    date: '2026-09-09',
    notes: [
      'Fix: several other places still showed the 🥚 egg emoji instead of the real Dofus icon — item catalog fallback thumbnail (item with no image), set detail modal thumbnails/slot badges, equip toasts, and the compare panel\'s slot column',
    ],
  },
  {
    version: '0.2.128',
    date: '2026-09-08',
    notes: [
      'Fix: weapon attack panel showed "NaN–NaN" as the total and an untranslated "elem_mp" row for weapons that remove MP on hit (e.g. Espada diablina) — that effect is not elemental damage and was wrongly fed into the damage-mastery formula; now shown as its own "Retira PM" row with the correct icon, excluded from the damage total',
      'Feat: "Attracts by N cell" spell buffs now show an icon (pull.png) instead of a plain triangle, across all 4 languages',
    ],
  },
  {
    version: '0.2.127',
    date: '2026-09-08',
    notes: [
      'Fix: spell buff icons missing for several stats due to accented-word regex gaps — "% Crítico" (es/pt), Portuguese "Inteligência"/"Sorte" (Intelligence/Chance), and "vida" (life-transfer buffs) now show their correct icon instead of falling back to a plain triangle',
      'Fix: "best-element steal/damage" spell buffs (all 4 languages) now show the same icon used for that stat everywhere else in the app',
    ],
  },
  {
    version: '0.2.126',
    date: '2026-09-08',
    notes: [
      'Fix: Dofus slot icon was a hand-drawn SVG egg shape — now uses the real Dofus icon image',
      'Fix: Erosion spell effect used the wrong placeholder icon (damage reflect) — now uses the correct erosion icon',
    ],
  },
  {
    version: '0.2.125',
    date: '2026-09-08',
    notes: [
      'Fix: opening a shared compare link (?c=...) loaded Build B and activated compare mode, but never scrolled to the panel — now scrolls into view automatically, same as clicking Compare manually',
    ],
  },
  {
    version: '0.2.124',
    date: '2026-09-08',
    notes: [
      'Fix: Compare mode "load build from URL" rejected every current-format link (…/es/?b=...) as invalid — the parser only understood the old #/?b=... hash format. Now handles both',
      'Fix: Compare mode\'s "share comparison" button still generated the old #/?b=... hash link — now builds the correct per-language path',
    ],
  },
  {
    version: '0.2.123',
    date: '2026-09-07',
    notes: [
      'Fix: generic "Damage" (all elements) bonus was computed but never added to each elemental damage total in the stats panel — now correctly sums into Earth/Fire/Water/Air/Neutral Damage',
    ],
  },
  {
    version: '0.2.122',
    date: '2026-09-07',
    notes: [
      'Fix: elemental weapon transform rounded damage UP instead of DOWN (e.g. 45-53 Neutral at 85% showed as 39-46 instead of the correct 38-45)',
    ],
  },
  {
    version: '0.2.121',
    date: '2026-09-07',
    notes: [
      'Feat: new Magesmithy section in the stats panel (below Combat) — shows the combined total of every rune stat across all equipped items, since one stat can be boosted by runes on several different items',
    ],
  },
  {
    version: '0.2.120',
    date: '2026-09-07',
    notes: [
      'Fix: clicking the "Dofus Forge" logo reset the build but left the old encoded ?b= URL stuck in the address bar — now clears the URL to the clean language path',
    ],
  },
  {
    version: '0.2.119',
    date: '2026-09-07',
    notes: [
      'Fix: class names now show the real Ankama-localized name per language (e.g. Huppermage -> Hipermago in Spanish, Sacrier -> Sacrieur in French, Rogue -> Tymador/Ladino in Spanish/Portuguese) instead of always English — extracted directly from official game data',
    ],
  },
  {
    version: '0.2.118',
    date: '2026-09-07',
    notes: [
      'Feat: name your build — editable field in the class card, carried in shared build URLs',
      'Fix: class element (e.g. "multi" for Huppermage) was shown untranslated — now uses elem_* i18n keys',
    ],
  },
  {
    version: '0.2.117',
    date: '2026-09-06',
    notes: [
      'Chore: added Range, Summons, and % Critical to the "Main Effects" section of the stat filter dropdown',
    ],
  },
  {
    version: '0.2.116',
    date: '2026-09-06',
    notes: [
      'Fix: item stat filter matched items with a negative value for the filtered stat (e.g. searching "Range" showed a hat with -1 Range) — now only matches real bonuses',
      'Fix: stat filter dropdown mixed damages, fixed resistances, and % resistances into one generic "secondary" bucket — now split into Damage, Damage %, Resistance, and Resistance % sections',
    ],
  },
  {
    version: '0.2.115',
    date: '2026-09-06',
    notes: [
      'Feat: Sets Catalog cards now equip the full set in one click — a new eye icon opens the detailed view (individual items, all tier bonuses) instead',
      'Feat: hovering an item thumbnail in the Sets Catalog shows the full item tooltip (effects, weapon attack, conditions, lore) — thumbnails also made bigger',
      'Refactor: extracted the item hover tooltip into a shared component used by both SetDetailModal and the Sets Catalog',
    ],
  },
  {
    version: '0.2.114',
    date: '2026-09-06',
    notes: [
      'Feat: new Sets Catalog — browse every set in the game, search by name, filter by level range and piece count, sort by level/name/pieces; each card shows item thumbnails, top-tier bonus icons, and your equip progress; click to open the full set detail',
    ],
  },
  {
    version: '0.2.113',
    date: '2026-09-06',
    notes: [
      'Fix: rune_picker i18n key was missing from all 4 locales — RuneModal showed the raw key name instead of translated text',
    ],
  },
  {
    version: '0.2.112',
    date: '2026-09-06',
    notes: [
      'Fix: "Equip All" on a set with multiple items of the same slot type (e.g. 2 rings) only undid the last item on a single Undo — each item was equipped as a separate history step. Now equips all items in one atomic update, so Undo reverts the whole action at once',
    ],
  },
  {
    version: '0.2.111',
    date: '2026-09-03',
    notes: [
      'Perf: main JS bundle 676KB -> 376KB (-44%) — removed motion/framer-motion (replaced sliding tab indicator and modal/toast animations with CSS transitions), removed cross-fetch polyfill (native fetch backend for i18next), lazy-loaded ItemCatalog/RuneModal/SetDetailModal/SpellsPanel/ComparePanel/ExportCard',
      'Perf: fixed render-blocking Google Fonts (CSS @import chain -> non-blocking preload+swap link), est. 380-1650ms saved on first paint',
      'Perf: split DOFUS_GAME_VERSION out of changelog.ts so the eager bundle no longer carries the full changelog text just for one constant',
      'Fix: accessibility — ink-faint color token now meets WCAG AA contrast (4.5:1) in both themes; added missing aria-label on characteristic point input',
      'Fix: ShareBar share-URL still built the old #/?b= hash link — same bug as brandHref, now uses the correct language path',
    ],
  },
  {
    version: '0.2.110',
    date: '2026-09-02',
    notes: [
      'Fix: clicking EN in the language switcher looped back to the previous language — RootRoute was reading the stored language preference, which i18next itself keeps overwriting, so it always bounced back',
    ],
  },
  {
    version: '0.2.109',
    date: '2026-09-02',
    notes: [
      'Feat: real multi-language URLs (/es/ /fr/ /pt/ + / for English) — each is a genuine static file with its own title, description, canonical and hreflang, indexable and rankable per language in search engines',
      'Feat: switched HashRouter to BrowserRouter; language switcher and build-sharing links now preserve the language path',
      'Fix: build-sharing URL sync no longer force-navigates to "/" on every stat change (was silently dropping the language path)',
      'Chore: legacy hash-based shared links (#/?b=...) still resolve correctly via a compatibility redirect',
    ],
  },
  {
    version: '0.2.108',
    date: '2026-09-02',
    notes: [
      'Chore: added Google Search Console verification file',
    ],
  },
  {
    version: '0.2.107',
    date: '2026-09-02',
    notes: [
      'Add: og-preview.png social share image — anvil & hammer forge emblem, 1200x630',
    ],
  },
  {
    version: '0.2.106',
    date: '2026-09-02',
    notes: [
      'SEO: full meta tag suite (description, keywords, canonical, Open Graph, Twitter Card, JSON-LD schema)',
      'SEO: added robots.txt and sitemap.xml for search engine indexing',
    ],
  },
  {
    version: '0.2.105',
    date: '2026-09-02',
    notes: [
      'Polish: removed "unofficial" label from footer, export card, and all locales',
      'Docs: rewrote README with full feature list and clean presentation',
    ],
  },
  {
    version: '0.2.104',
    date: '2026-09-02',
    notes: [
      'Fix: weapon steals (Steals MP id=233, MP-steal-on-attack id=238, Fire heals id=261) now correctly shown under "WEAPON ATTACK" instead of EFFECTS',
      'Fix: item tooltip and SetDetailModal tooltip now have max-height (82vh) + scroll — all effects visible even on tall items near viewport bottom',
    ],
  },
  {
    version: '0.2.103',
    date: '2026-09-02',
    notes: [
      'Redesign: RuneModal add-controls always visible (fixed panel above scroll)',
      'Add: "Clear all runes" button in RuneModal active runes header',
    ],
  },
  {
    version: '0.2.102',
    date: '2026-09-02',
    notes: [
      'Fix: Range badge shows ▲N overcap indicator when range > 6 (cap), same as AP/MP badges',
    ],
  },
  {
    version: '0.2.101',
    date: '2026-09-02',
    notes: [
      "Fix: Range (Alcance) badge in StatsPanel now shows '+' prefix — it's a pure item bonus, not a base stat total like AP/MP",
    ],
  },
  {
    version: '0.2.100',
    date: '2026-09-02',
    notes: [
      'Feat: item tooltips now show a CONDITIONS section with stat requirements (e.g. Strength > 249) — icon, color, operator, and value per condition',
      'Fix: stat values now display "+" prefix for positives — "+1 Range", "+1 MP", "+351–400 Vitality" etc. in both slot tooltip and set modal hover tooltip',
    ],
  },
  {
    version: '0.2.99',
    date: '2026-09-01',
    notes: [
      'Feat: ItemCatalog "Ver Set" now opens the full SetDetailModal — replaced old basic local set modal with the proper component (progress bar, equip-all, tier bonuses, hover item tooltips)',
    ],
  },
  {
    version: '0.2.98',
    date: '2026-09-01',
    notes: [
      'UX: set name in slot tooltip is now a clickable link — clicking "X\'s Set" in the item hover tooltip opens SetDetailModal; removed separate Eye button',
    ],
  },
  {
    version: '0.2.97',
    date: '2026-09-01',
    notes: [
      'Feat: hover tooltip in SetDetailModal — hovering any item row shows full item tooltip (name, level, ability, all stats, lore) via portal with fixed positioning to escape modal overflow clipping',
    ],
  },
  {
    version: '0.2.96',
    date: '2026-09-01',
    notes: [
      'UX: CharacteristicsPanel split into two visual groups — Vitality/Wisdom at top (unaffected by Power), then a Power divider, then elemental stats (Strength/Intelligence/Chance/Agility) showing base | +power | =effective when Power > 0',
    ],
  },
  {
    version: '0.2.95',
    date: '2026-09-01',
    notes: [
      'Feat: drag & drop between compatible slots — drag an equipped item to any slot of the same type (ring1↔ring2, dofus1–dofus6) to swap or move it; runes, forjamago name and weapon transform travel with the item',
    ],
  },
  {
    version: '0.2.94',
    date: '2026-08-31',
    notes: [
      'Fix: rune badge (mini rune icons on slot) repositioned to inside the slot top-right corner — was placed at a fixed pixel offset to the right of the slot, which misaligned or clipped in grid layouts where cells are wider than the button',
    ],
  },
  {
    version: '0.2.93',
    date: '2026-08-31',
    notes: [
      'Fix: equipping or unequipping an item clears its slot\'s runes, forjamago name and weapon transform — rune data no longer leaks from a previous item',
    ],
  },
  {
    version: '0.2.92',
    date: '2026-08-31',
    notes: [
      'UX: Resistance section split into "Resistance" (flat: elemental + Crit + Push) and "% Resistance" (% elemental + % Melee + % Ranged) — clear flat vs % visual separation',
    ],
  },
  {
    version: '0.2.91',
    date: '2026-08-31',
    notes: [
      'Fix: Summons moved to Primary section in RuneModal (was incorrectly in Secondary)',
      'UX: RuneModal wider (640px) with auto-fill grid — desktop shows ~8 runes per row, mobile keeps ~5 columns',
    ],
  },
  {
    version: '0.2.90',
    date: '2026-08-31',
    notes: [
      'Feat: 15 missing runes added — AP/MP Parry, % Spell/Weapon/Melee/Ranged Damage, % Melee/Ranged Resistance, Pushback Damage/Resistance, Trap Damage, Power (traps), Summons, Pod, reflected damage',
      'Feat: RuneModal picker reorganized into 4 labeled sections: Primary / Damage / Resistance / Secondary; 5-column grid per section',
      'Fix: % damage runes (Spell/Weapon/Melee/Ranged) and % Critical now use [1,2,3,4,5] quick-value presets',
    ],
  },
  {
    version: '0.2.89',
    date: '2026-08-31',
    notes: [
      'Feat: full mobile responsiveness — flat 5-column equipment grid without character center, compact dofus row, icon-only ShareBar on small screens',
      'Fix: unequip × and active rune button now always visible on touch devices (were hover-only)',
      'Fix: viewport minimum-scale=1 + overflow-x:hidden prevent browser zoom-out; iOS input auto-zoom suppressed',
      'UX: undo/redo/optimizer/compare hidden on mobile header to prevent overflow',
    ],
  },
  {
    version: '0.2.88',
    date: '2026-08-31',
    notes: [
      'Feat: "All" button in ScrollToggles — one click activates or deactivates all 6 characteristic scrolls at once',
      'Fix: allocation input no longer commits mid-type — value only applies on blur or Enter, preventing double-step jumps',
    ],
  },
  {
    version: '0.2.87',
    date: '2026-08-28',
    notes: [
      'Fix: weapon AP cost (effect_id=179) excluded from character stats — was incorrectly reducing player AP on weapons like Mekstagob Spade',
      'Fix: AP/MP overcap badge no longer shows MAX at cap — only ▲N when truly above cap',
    ],
  },
  {
    version: '0.2.86',
    date: '2026-08-28',
    notes: [
      'CharacteristicsPanel: allocation grid always visible — removed hover-to-reveal; +/- controls permanently shown',
    ],
  },
  {
    version: '0.2.85',
    date: '2026-08-28',
    notes: [
      'RuneModal: smart quick-value presets per rune type — % Resistance runes show [1,2,3,4,5]; AP/MP/Range show [1]; others keep [1,5,10,25,50,100]; switching rune type resets value to first preset',
    ],
  },
  {
    version: '0.2.84',
    date: '2026-08-28',
    notes: [
      'Fix: RES% and AP/MP overcap badges now correctly show excess — stats were being capped before display; raw pre-cap values now stored in StatBlock for accurate ▲N calculation',
      'Cleanup: removed unused *ResPercentRune fields from StatBlock (rune-only RES% tracking was never used in display)',
    ],
  },
  {
    version: '0.2.83',
    date: '2026-08-28',
    notes: [
      'StatsPanel: RES% overcap badge (▲N) is now hover-only — table stays clean; hover a gold value above 50% to see wasted excess',
    ],
  },
  {
    version: '0.2.82',
    date: '2026-08-28',
    notes: [
      'StatsPanel: RES% shows MAX badge at exactly the 50% cap — previously only changed color; ▲N still appears when above cap',
    ],
  },
  {
    version: '0.2.81',
    date: '2026-08-28',
    notes: [
      'StatsPanel: AP and MP badges show overcap indicator — gold ▲N pill when value exceeds in-game cap (AP≥12, MP≥6)',
    ],
  },
  {
    version: '0.2.80',
    date: '2026-08-27',
    notes: [
      'StatsPanel: RES% now shows overcap — value appears in gold with a ▲N badge when it exceeds the 50% cap, indicating how many resistance points don\'t apply in-game',
    ],
  },
  {
    version: '0.2.79',
    date: '2026-08-27',
    notes: [
      'StatsPanel: elemental table gains a ✦ % column — shows in blue the % resistance contributed only by magesmithy runes, separate from the item-based RES%',
      'RuneModal: adds elemental % Resistance runes (Neutral, Earth, Fire, Water, Air)',
    ],
  },
  {
    version: '0.2.78',
    date: '2026-08-18',
    notes: [
      'Optimizer repair: expanded candidate pool per constrained stat (top-60 by that stat, not just score rank) — finds items that satisfy constraints even if they rank low in overall score',
      'Repair now tries all violated constraints each pass, not just the worst — makes progress on secondary constraints when primary is stuck',
      'Increased repair passes (10→25) and builds-to-repair (12→20)',
    ],
  },
  {
    version: '0.2.77',
    date: '2026-08-18',
    notes: [
      'Optimizer config persists across sessions — stat minimums, exo, max level, and locked slots are saved to localStorage',
      'Reopening the optimizer restores the last search; groups with active stats auto-expand; Clear resets everything',
    ],
  },
  {
    version: '0.2.76',
    date: '2026-08-18',
    notes: [
      'Optimizer: items with "(MJ)" in name are excluded — GM/test items no longer appear in results',
    ],
  },
  {
    version: '0.2.75',
    date: '2026-08-18',
    notes: [
      'Optimizer: hover tooltip on all stat cards explains what each stat does (53 stats, 4 locales)',
      'Clarifies confusing stats: PV vs Vitalidad, DMG Mejor Elem (virtual), Potencia (%), etc.',
    ],
  },
  {
    version: '0.2.74',
    date: '2026-08-18',
    notes: [
      'Fix: stat inputs accept continuous typing — Modal focus trap was re-stealing focus on every render due to unstable onClose ref',
      'Fix: "Exo Rango" → "Exo Alcance" in Spanish to match official Dofus stat name',
    ],
  },
  {
    version: '0.2.73',
    date: '2026-08-18',
    notes: [
      'Optimizer modal enlarged to max-w-4xl (896px) — stat grid fully visible without cut-off cards',
      'Validation: shows error if all slots are locked before running optimizer',
    ],
  },
  {
    version: '0.2.72',
    date: '2026-08-18',
    notes: [
      'Optimizer: greedy repair phase guarantees constraint satisfaction — if beam search misses, top builds are repaired slot-by-slot toward each violated constraint',
      'Repair uses character base stats (scrolled + allocated) to know exactly how much more items must contribute',
    ],
  },
  {
    version: '0.2.71',
    date: '2026-08-18',
    notes: [
      'Optimizer redesign: all stats visible in 9 collapsible groups — no more add/remove stat flow',
      'Slots panel collapsible; max level + exo inline; "Clear all" button resets everything',
      'Algorithm: pre-initialized stats at weight=0 use BASE_WEIGHT; active stats auto-weight=5',
    ],
  },
  {
    version: '0.2.70',
    date: '2026-08-18',
    notes: [
      'Optimizer: dual beam search — constraint beam (6× weight boost on minVal stats) runs alongside primary beam to guarantee constraint-satisfying builds are found',
      'Pre-filter merges normal top-50 + constraint-biased top-30 per slot — items critical for hard constraints survive pruning',
      'Results: constraint-meeting builds always rank first, then best-score builds',
    ],
  },
  {
    version: '0.2.69',
    date: '2026-08-18',
    notes: [
      'Fix: optimizer minimum input uses type="text" — fixes browser quirks preventing continuous number typing',
    ],
  },
  {
    version: '0.2.68',
    date: '2026-08-18',
    notes: [
      'Optimizer redesign: combined weight + minimum into single stat row — no more duplicate additions',
      'Fix: ring, dofus, companion, sidekick slots now find correct items (were returning empty)',
      'Algorithm: all stats score with BASE_WEIGHT so high-level diverse items rank correctly',
      'Algorithm: level bonus prevents low-level items beating high-level equivalents',
      'Increased TOP_K to 50 and BEAM_WIDTH to 120 for better result coverage',
      'UX: min value input keeps focus while typing (local string state)',
      '⚡ "Equip best build" button instantly loads top result',
    ],
  },
  {
    version: '0.2.67',
    date: '2026-08-18',
    notes: [
      'Fix: rune badge now appears outside and to the right of the slot (was overlapping inside)',
    ],
  },
  {
    version: '0.2.66',
    date: '2026-08-18',
    notes: [
      'M42 — The Forger (Build Optimizer): header button opens the "The Forger" modal',
      'Configure soft weights (sliders) to maximize any build stat',
      'Configure hard requirements (≥ minimum) — builds that don\'t meet them are dropped',
      'Exo AP/MP/Range checkboxes for future forged-item integration',
      'Max level selection and per-slot checkboxes for which slots to optimize',
      'Beam search algorithm (width=50) with a greedy top-25-per-slot pre-filter',
      'Web Worker doesn\'t block the UI — real-time % progress bar',
      'Top-3 results with item images, key stats, and a "Load this build" button',
      'Full i18n: ES (The Forger) / EN (The Forger) / FR (La Forgeuse) / PT (A Forjadora)',
    ],
  },
  {
    version: '0.2.65',
    date: '2026-08-18',
    notes: [
      'WeaponCard: transformation potion icon now appears in the weapon\'s corner when a transform is active',
    ],
  },
  {
    version: '0.2.64',
    date: '2026-08-18',
    notes: [
      'Fix: transformation badge no longer appears on weapons with no Neutral damage (stale store)',
      'Fix: pushback effects excluded from WeaponCard\'s damage rows — was causing NaN in totals',
    ],
  },
  {
    version: '0.2.63',
    date: '2026-08-17',
    notes: [
      'Feat: weapon magesmithy — transforms Neutral damage into an element (Fire/Earth/Water/Air) at 85%, 68%, or 50%',
      'RuneModal: "Elemental Transformation" section with potion icons (Wildfire/Earthquake/Tsunami/Hurricane)',
      'WeaponCard: Neutral damage replaced by the transformed element — scales with the correct element\'s mastery',
      'WeaponCard: element+% badge in the header when a transformation is active',
      'URL share: wt field preserves the transformation when sharing a build',
    ],
  },
  {
    version: '0.2.62',
    date: '2026-08-17',
    notes: [
      'UI: hardcoded effects (AP/MP steal, AP/MP gain, pushback, erosion, heal mod, spell buff) now shown as colored chips with a stat icon',
      'UI: correct icon per effect — ap_reduction, mp_reduction, ap, mp, push_damage, damage_reflect, heals',
      'UI: heal row (steal) replaces ♥ with the heals.webp icon in SpellCard, WeaponCard and Σ rows',
    ],
  },
  {
    version: '0.2.61',
    date: '2026-08-17',
    notes: [
      'Fix: spell buffs and description now appear in the selected language (the lang overlay only copied the name)',
      'Fix: ETL filters out buffs with unresolved placeholders (#3, #4) — "Disparos Lejanos" no longer generates 70+ status entries',
      'Fix: ETL filters out buffs with 5+ digit status IDs embedded in the text',
      'Fix: ETL deduplicates identical buffs by text at each spell level',
      'UI: buffs shown as colored chips with stat icons — red for debuffs, blue for buffs, gold for neutral',
    ],
  },
  {
    version: '0.2.60',
    date: '2026-08-17',
    notes: [
      'Feat: ETL extracts generic buffs/debuffs (range, crit, heals, etc.) via effects.json + per-language templates',
      'Feat: spell description now shown at the bottom of SpellCard',
      'Feat: renderEffectLabel template engine converts effectId+values into a localized string',
    ],
  },
  {
    version: '0.2.59',
    date: '2026-08-17',
    notes: [
      'Fix: Flecha de Expiación — Charge 2 = double the Charge 1 bonus (scales by stack/baseStack when every buff.min is equal)',
      'Fix: element:mixed spells (Bumerán Pérfido) — no Σ total; each hit is a random element, not additive',
    ],
  },
  {
    version: '0.2.58',
    date: '2026-08-17',
    notes: [
      'Fix: corrected pushback damage coefficient — floor(level/6) per cell (was ×3/20); at level 200: 33/cell × 3 cells = 99, matching the game exactly',
    ],
  },
  {
    version: '0.2.57',
    date: '2026-08-17',
    notes: [
      'Fix: pushback (collision) damage uses a deterministic formula — floor(level×3/20 + pushbackDamage/4)/cell, no dice rolls — matches the game (~30/cell at level 200)',
      'Fix: Σ↷ crit no longer double-counts critDamage (already included in critTotalMin via calcEffects)',
      'Fix: bestElemDamage included in flatBonus — "best-element damage" wasn\'t being applied to the formula',
    ],
  },
  {
    version: '0.2.56',
    date: '2026-08-16',
    notes: [
      'Fix: critDamage stat added as a flat bonus in spell critical effect calculations',
      'Fix: Σ↷ crit now includes critDamage in pushback collision damage',
    ],
  },
  {
    version: '0.2.55',
    date: '2026-08-16',
    notes: [
      'SpellCard: pushback shows "(on collision: min–max)" per cell — formula (8+1d8×level/50+stat×0.25) × cells',
      'Σ↷: second Σ row that sums elemental + total collision damage (all-cells-blocked scenario)',
      'Normal Σ no longer includes push — pushback damage only occurs on collision, not on a free push',
    ],
  },
  {
    version: '0.2.54',
    date: '2026-08-16',
    notes: [
      'Fix: pushback damage formula — 25% of the stat per cell (was /3 ≈ 33% — incorrect)',
    ],
  },
  {
    version: '0.2.53',
    date: '2026-08-16',
    notes: [
      'Fix: Discharge spells no longer show a Σ total — damage rows are per charge level (alternative, not additive)',
    ],
  },
  {
    version: '0.2.52',
    date: '2026-08-16',
    notes: [
      'Fix: Σ for Discharge spells no longer sums steal (charge) + discharge — now only shows the discharge total',
      'Heal Σ (♥) removed from the Σ block for Discharge spells — each steal heals separately',
    ],
  },
  {
    version: '0.2.51',
    date: '2026-08-16',
    notes: [
      'Poison (DoT): effects with triggers=TE and effectTriggerDuration>0 now detected as kind:poison in the ETL',
      'SpellCard: "Poison (Xt)" label shown before the first DoT effect when normal damage is also present',
      'Flecha Tiránica / similar: normal damage + Poison (2t) separator + DoT damage, clearly distinguished',
      'Damage formula applied to poison — amplified by mastery just like damage',
    ],
  },
  {
    version: '0.2.50',
    date: '2026-08-16',
    notes: [
      'SpellCard: deduplicates identical effects (64 spells across all classes)',
      'Tyrannical Arrow / similar: duplicate collapsed — 3 fire effects → 2 correct rows',
      'Discharge: separator between the steal phase (charge) and the damage phase on spells like Devouring Arrow',
    ],
  },
  {
    version: '0.2.49',
    date: '2026-08-16',
    notes: [
      'Charge spells: damage now calculated per charge level (Charge 1, Charge 2…) in SpellCard',
      'Explicit charges (e.g. Flecha Castigadora): rows per stack with normal and crit damage',
      'Stacking charges (e.g. Flecha Helada): shows up to min(turns, 3) rows with bonus × N',
      'Charge bonus is added to the base RAW value before the formula — scales with character mastery',
    ],
  },
  {
    version: '0.2.48',
    date: '2026-08-16',
    notes: [
      'Compare: full redesign — hero cards with portrait + badges (AP/MP/HP/Range/Crit)',
      'Equipment diff: aligned per-slot rows, matching items dimmed, differing ones highlighted',
      'Stats table: grouped sections with green/red coloring per comparison',
      'Share button: encodes both builds into the URL as #/?b=A&c=B',
      'Auto-loads Build B from the URL\'s c= parameter',
      'Modal overlay to switch Build B',
    ],
  },
  {
    version: '0.2.47',
    date: '2026-08-16',
    notes: [
      'Catalog: weapons now show a "Weapon Attack" section separate from "Effects" (like the slot tooltip)',
      'Classification by effect_id, same as the tooltip — consistent across the whole UI',
    ],
  },
  {
    version: '0.2.46',
    date: '2026-08-16',
    notes: [
      'Brand "Dofus Forge": right-click / middle-click opens a new tab with the current build',
      'Left-click still resets the build',
    ],
  },
  {
    version: '0.2.45',
    date: '2026-08-16',
    notes: [
      'Compare: clicking ⚖ now auto-scrolls to the compare panel',
      'Compare: field to paste a shared URL — loads Build B without saving it locally',
    ],
  },
  {
    version: '0.2.44',
    date: '2026-08-16',
    notes: [
      'Fix: Mount/Companion now shows items in every language (ES/FR/PT/DE)',
      'Cause: the ETL stored the localized type ("Dragopavo", "Mascota") instead of the canonical EN name',
      'Fix: ETL now fetches EN types first and applies them as the canonical type+slot across every language',
    ],
  },
  {
    version: '0.2.43',
    date: '2026-08-16',
    notes: [
      'Compare mode: ⚖ header button activates side-by-side comparison of two builds',
      'Panel shows Build A vs Build B equipment side by side with icons and names',
      'A vs B stats table with a Δ column — green = B better, red = A better',
      'Build B loads from saved builds, stats recalculated with the same engine',
    ],
  },
  {
    version: '0.2.42',
    date: '2026-08-16',
    notes: [
      'Spells validated: AP/MP steal vs gain correctly distinguished (effectIds 84/111/127/128/169)',
      'New effects rendered: +AP gained, +MP gained, % Erosion, Heals ×%, stackable spell buffs (⭐ Spell: +N base)',
      'ETL regenerated: 19 classes + common spells with correct effectId mappings in ES/EN/FR/PT',
    ],
  },
  {
    version: '0.2.41',
    date: '2026-08-15',
    notes: [
      'Equipped tooltip: special ability (gold box) + lore description on hover',
      'i18n ability/description: ability and lore text now respects the selected language',
      'Noise effects filtered: "-special spell-" and "Attitude" no longer show up in the tooltip',
    ],
  },
  {
    version: '0.2.40',
    date: '2026-08-15',
    notes: [
      'Full-width layout: no more empty side margins on large screens',
      'Right sidebar widened from 300px to 360px — more room for stats and characteristics',
    ],
  },
  {
    version: '0.2.39',
    date: '2026-08-15',
    notes: [
      'Fix: "Weapon Attack" now only shows the weapon\'s real damage — passive stats go to "Effects"',
      'The same "Air damage" stat had two IDs: 189 = weapon attack, 47 = passive bonus — now distinguished by ID',
      'Stats panel: passive damage bonuses on weapons are no longer excluded from the calculation',
    ],
  },
  {
    version: '0.2.38',
    date: '2026-08-15',
    notes: [
      'Magesmithy disabled for Dofus (1–6) and Mount — the ✦ button no longer appears on those slots',
    ],
  },
  {
    version: '0.2.37',
    date: '2026-08-15',
    notes: [
      'Equip toast: a "Slot: Item" notification appears bottom-right for 2.8s',
      'No duplicate Dofus: equipping one already equipped in another slot moves it automatically',
      'Numbered slot labels: "Dofus 1"–"Dofus 6", "Ring 1"/"Ring 2" in every language',
    ],
  },
  {
    version: '0.2.36',
    date: '2026-08-15',
    notes: [
      'Fix: weapon attack effects (Arco, Espada, etc.) now correctly appear under "Weapon Attack" in every language',
      'ETL normalizeItem uses the API\'s is_weapon flag to assign slot:weapon — no longer depends on the type name, which varies per language',
    ],
  },
  {
    version: '0.2.35',
    date: '2026-08-15',
    notes: [
      'Set modal: items split into "You Have" and "Still Need" with distinct colors',
      'Missing items show a slot badge (e.g. 🎩 Hat) so you know what to free up',
      'Set bonuses now use the same colors and icons as the active-sets panel',
    ],
  },
  {
    version: '0.2.34',
    date: '2026-08-15',
    notes: [
      'Active sets: 3 columns for 3+ sets, 2 columns for 2 sets',
      'Stats panel: "Elementos" and "Combate" titles made larger',
    ],
  },
  {
    version: '0.2.33',
    date: '2026-08-15',
    notes: [
      'Spells panel enlarged: 52px icon, larger name/stat/damage text',
      'Active sets panel enlarged: bigger dots, text, tier badge and grid',
    ],
  },
  {
    version: '0.2.32',
    date: '2026-08-15',
    notes: [
      'Stats panel — combat section in a single column: full names visible without truncation',
    ],
  },
  {
    version: '0.2.31',
    date: '2026-08-15',
    notes: [
      'Stats panel — larger element icons and combat rows',
    ],
  },
  {
    version: '0.2.30',
    date: '2026-08-15',
    notes: [
      'HP badge: removed the truncate that showed "4,..." — number now fully visible',
    ],
  },
  {
    version: '0.2.29',
    date: '2026-08-14',
    notes: [
      'Desktop layout: 3 columns → 2 columns (equipment + spells on the left, right sidebar with class + characteristics + stats)',
      'HP badge: removed overflow clip, numbers scale down better in tight spaces',
    ],
  },
  {
    version: '0.2.27',
    date: '2026-08-14',
    notes: [
      'Full i18n: every string translated in EN / ES / FR / PT',
      'Undo/Redo, modal close, sort labels, SpellsPanel, LanguageSwitcher — all localized',
    ],
  },
  {
    version: '0.2.26',
    date: '2026-08-14',
    notes: [
      'i18n: Modal, ClassPicker, CharacteristicsPanel, SetDetailModal, ItemCatalog, EquipmentGrid',
      'Forjamago signature now saved in the URL when sharing',
    ],
  },
  {
    version: '0.2.25',
    date: '2026-08-13',
    notes: [
      'Tooltip: weapon attack effects separated from item stats',
    ],
  },
  {
    version: '0.2.24',
    date: '2026-08-13',
    notes: [
      'Catalog: multi-select stat filter across all equipment',
      'Dofus keeps the catalog open to equip the next slot automatically',
    ],
  },
  {
    version: '0.2.23',
    date: '2026-08-12',
    notes: [
      'Reusable StatFilter component with categorized stat groups',
      'Stat filter includes every non-ignored stat',
    ],
  },
  {
    version: '0.2.22',
    date: '2026-08-11',
    notes: [
      'Active sets: panel with per-tier set bonuses',
      'Weapon tooltip shows a damage table with/without crit',
    ],
  },
  {
    version: '0.2.20',
    date: '2026-08-10',
    notes: [
      'Export build as a PNG image',
      'Share build via URL',
    ],
  },
  {
    version: '0.2.15',
    date: '2026-08-05',
    notes: [
      'Magesmithy: add runes to equipped items',
      'Spells panel with damage calculation based on character stats',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-07-20',
    notes: [
      'Item catalog with search, filters and sorting',
      'Stats panel with full character calculation',
      'Multi-language support: ES / EN / FR / PT',
    ],
  },
  {
    version: '0.1.97',
    date: '2026-08-11',
    notes: ['Fix: prospecting/summons base, air damage, HP display'],
  },
  {
    version: '0.1.96',
    date: '2026-08-10',
    notes: ['M16 - full visual overhaul: JetBrains Mono font, dominant badges, bigger slots'],
  },
  {
    version: '0.1.95',
    date: '2026-08-10',
    notes: ['Single hover panel for the 6 characteristic allocators, removed the steal column'],
  },
  {
    version: '0.1.94',
    date: '2026-08-10',
    notes: ['Fix: instant popover close + unified scroll toggles'],
  },
  {
    version: '0.1.93',
    date: '2026-08-10',
    notes: ['Hover popover for allocation controls + fixed HP badge font'],
  },
  {
    version: '0.1.92',
    date: '2026-08-10',
    notes: ['Fix: removed the 100% cap on effective crit display - crit can exceed 100% in Dofus 3'],
  },
  {
    version: '0.1.91',
    date: '2026-08-10',
    notes: ['Fix: removed the critChance cap - crit% has no official limit in Dofus 3'],
  },
  {
    version: '0.1.90',
    date: '2026-08-10',
    notes: ['Fix: apply Dofus 3 official stat caps in computeStats'],
  },
  {
    version: '0.1.89',
    date: '2026-08-10',
    notes: ['Fix: row overflow - two-row layout for stat rows'],
  },
  {
    version: '0.1.88',
    date: '2026-08-10',
    notes: ['M17 - steal/heal rows, shield condition group, fixed Σ total'],
  },
  {
    version: '0.1.87',
    date: '2026-08-10',
    notes: ['Fix: corrected the pushback damage formula - floor(pushbackDamage/3) × cells'],
  },
  {
    version: '0.1.86',
    date: '2026-08-10',
    notes: ['Fix: match critical effects by index, not by element'],
  },
  {
    version: '0.1.85',
    date: '2026-08-10',
    notes: ['Fix: apply weapon crit_bonus as base damage amplified by the mastery formula'],
  },
  {
    version: '0.1.84',
    date: '2026-08-10',
    notes: ['Weapon Mastery - checkbox with separate normal/crit values'],
  },
  {
    version: '0.1.83',
    date: '2026-08-10',
    notes: ['Fix: use meleeDamagePercent for weapons/spells with maxRange <= 1'],
  },
  {
    version: '0.1.82',
    date: '2026-08-10',
    notes: ['Fix: include weapon crit_bonus in the critical damage calculation'],
  },
  {
    version: '0.1.81',
    date: '2026-08-10',
    notes: ['Redesigned WeaponCard - table layout, steal/heal split, Weapon Mastery'],
  },
  {
    version: '0.1.80',
    date: '2026-08-09',
    notes: ['Fix: show the equipment bonus delta per characteristic'],
  },
  {
    version: '0.1.79',
    date: '2026-08-09',
    notes: ['Fix: widen the right stats panel from 240px to 300px'],
  },
  {
    version: '0.1.78',
    date: '2026-08-09',
    notes: ['Fix: fixed all broken Tailwind opacity-modifier classes in catalog/modal'],
  },
  {
    version: '0.1.77',
    date: '2026-08-09',
    notes: ['Fix: replaced all broken Tailwind opacity-modifier classes across the visible UI'],
  },
  {
    version: '0.1.76',
    date: '2026-08-09',
    notes: ['Spells visual polish - element left border, gold-accented section labels'],
  },
  {
    version: '0.1.75',
    date: '2026-08-09',
    notes: ['Compact selected-class header with progressive disclosure'],
  },
  {
    version: '0.1.74',
    date: '2026-08-09',
    notes: ['Removed duplicate stat display between the left/right panels'],
  },
  {
    version: '0.1.73',
    date: '2026-08-09',
    notes: ['Phase 3 - visual overhaul: TopBadge, SectionHeader, Crucible, parchment'],
  },
  {
    version: '0.1.72',
    date: '2026-08-09',
    notes: ['Phase 3 - Grimoire & Forge visual identity: The Crucible and materiality'],
  },
  {
    version: '0.1.71',
    date: '2026-08-09',
    notes: ['Phase 2 - migrated ItemCatalog and RuneModal to CSS variable tokens'],
  },
  {
    version: '0.1.70',
    date: '2026-08-09',
    notes: ['Design system Phase 1 - core UI primitives (Grimoire & Forge)'],
  },
  {
    version: '0.1.69',
    date: '2026-08-09',
    notes: ['Design system Phase 0 - token consolidation (Grimoire & Forge)'],
  },
  {
    version: '0.1.68',
    date: '2026-08-09',
    notes: ['Fix: weapon crit damage now uses stats.critDamage, not crit_bonus'],
  },
  {
    version: '0.1.67',
    date: '2026-08-09',
    notes: ['Fix: load spell names in the selected language'],
  },
  {
    version: '0.1.66',
    date: '2026-08-09',
    notes: ['Fix: show the pushback damage value in the spell card'],
  },
  {
    version: '0.1.65',
    date: '2026-08-09',
    notes: ['Fix: +1 AP bonus at level 100 (Dofus 2 mechanic)'],
  },
  {
    version: '0.1.64',
    date: '2026-08-09',
    notes: ['Fix: weapon attack damage excluded from the passive stat block; per-slot forjamago name; tooltip hover timer'],
  },
  {
    version: '0.1.63',
    date: '2026-08-09',
    notes: ['View-set button, equip all, forjamago signature, i18n name fixes'],
  },
  {
    version: '0.1.62',
    date: '2026-08-09',
    notes: ['Fix: Wisdom also derives AP/MP Removal'],
  },
  {
    version: '0.1.61',
    date: '2026-08-09',
    notes: ['Fix: add Chance → Prospecting derivation (+1 per 10 Chance)'],
  },
  {
    version: '0.1.60',
    date: '2026-08-09',
    notes: ['Fix: remove Power double-counting; derive secondary stats from characteristics'],
  },
  {
    version: '0.1.59',
    date: '2026-08-09',
    notes: ['Fix: apply the % melee/ranged damage bonus in spell and weapon calculations'],
  },
  {
    version: '0.1.58',
    date: '2026-08-09',
    notes: ['Fix: correct the damage formula - multiplicative, not additive'],
  },
  {
    version: '0.1.57',
    date: '2026-08-09',
    notes: ['Redesigned element rows - CSS grid chips with per-column icons'],
  },
  {
    version: '0.1.56',
    date: '2026-08-09',
    notes: ['Element rows with three icons: mastery, damage and resistance per column'],
  },
  {
    version: '0.1.55',
    date: '2026-08-09',
    notes: ['Fix: show melee/ranged resistance % in CharacteristicsPanel modifiers'],
  },
  {
    version: '0.1.54',
    date: '2026-08-09',
    notes: ['Fix: use statIconUrl() in CharacteristicsPanel, StatsPanel and ExportCard'],
  },
  {
    version: '0.1.53',
    date: '2026-08-09',
    notes: ['Fix: add Water steal mapping and i18n keys, audit all stat names'],
  },
  {
    version: '0.1.52',
    date: '2026-08-09',
    notes: ['Fix: add % Spell/Weapon Resistance entries with placeholder icons'],
  },
  {
    version: '0.1.51',
    date: '2026-08-09',
    notes: ['Fix: use dedicated element damage icons for damage/steal stats'],
  },
  {
    version: '0.1.50',
    date: '2026-08-09',
    notes: ['Fix: wire new webp stat icons, fix broken icon mappings'],
  },
  {
    version: '0.1.49',
    date: '2026-08-09',
    notes: ['M30 - critical damage display in SpellCard and WeaponCard'],
  },
  {
    version: '0.1.48',
    date: '2026-08-09',
    notes: ['M29 - rune images throughout the Magesmithy UI'],
  },
  {
    version: '0.1.47',
    date: '2026-08-09',
    notes: ['M27+M28 - weapon attack card + common spells panel'],
  },
  {
    version: '0.1.46',
    date: '2026-08-09',
    notes: ['Pushback/AP/MP effects + Support badge for utility spells'],
  },
  {
    version: '0.1.45',
    date: '2026-08-09',
    notes: ['Fix: rewrite image_url to include BASE_URL at fetch time'],
  },
  {
    version: '0.1.44',
    date: '2026-08-09',
    notes: ['Two-column spell redesign with images and variants'],
  },
  {
    version: '0.1.43',
    date: '2026-08-09',
    notes: ['Set modal stays open on equip/unequip, added an unequip button'],
  },
  {
    version: '0.1.42',
    date: '2026-08-09',
    notes: ['Fix: negative range separator i18n via the range_sep_neg key'],
  },
  {
    version: '0.1.41',
    date: '2026-08-09',
    notes: ['Fix: negative ranges now show the smaller absolute value first'],
  },
  {
    version: '0.1.40',
    date: '2026-08-09',
    notes: ['Fix: equip any set item from the set modal, not just the current slot'],
  },
  {
    version: '0.1.39',
    date: '2026-08-08',
    notes: ['Set detail modal - click the set name to view its items, bonuses and equip'],
  },
  {
    version: '0.1.38',
    date: '2026-08-08',
    notes: ['Fix: version-based cache busting for all JSON data files'],
  },
  {
    version: '0.1.37',
    date: '2026-08-08',
    notes: ['Fix: description/ability visibility - colors were too dark to read'],
  },
  {
    version: '0.1.36',
    date: '2026-08-08',
    notes: ['Item description, passive ability and lore now shown in catalog cards'],
  },
  {
    version: '0.1.35',
    date: '2026-08-08',
    notes: ['Auto type-filter tabs for all multi-type slots'],
  },
  {
    version: '0.1.34',
    date: '2026-08-08',
    notes: ['Fix: renamed companion slot label to Mount in every language'],
  },
  {
    version: '0.1.33',
    date: '2026-08-08',
    notes: ['Merged pet/petsmount/mount into a single companion slot with type-filter tabs'],
  },
  {
    version: '0.1.32',
    date: '2026-08-08',
    notes: ['M23 - card grid catalog layout with every stat visible'],
  },
  {
    version: '0.1.31',
    date: '2026-08-08',
    notes: ['Petsmount, Mount and Sidekick slots added to the equipment grid'],
  },
  {
    version: '0.1.30',
    date: '2026-08-08',
    notes: ['Fix: translate item stat labels in tooltips, stat filter and rune modal'],
  },
  {
    version: '0.1.29',
    date: '2026-08-08',
    notes: ['Footer credits added: server Tal Kasha, creator Juan/Wembie, in-game Raik-Luck'],
  },
  {
    version: '0.1.28',
    date: '2026-08-08',
    notes: ['M22 - mobile responsive layout with bottom tab navigation'],
  },
  {
    version: '0.1.27',
    date: '2026-08-08',
    notes: ['Fix: full i18n pass - all hardcoded EN/ES strings replaced with t()'],
  },
  {
    version: '0.1.26',
    date: '2026-08-08',
    notes: ['M18 - export build as a PNG image'],
  },
  {
    version: '0.1.25',
    date: '2026-08-08',
    notes: ['Fix: multilingual data - English base with a translated-names overlay'],
  },
  {
    version: '0.1.24',
    date: '2026-08-08',
    notes: ['Fix: always load EN data as the base; persist runes in the URL snapshot'],
  },
  {
    version: '0.1.23',
    date: '2026-08-08',
    notes: ['Fix: set bonuses apply only at the highest tier; Power now displays without %'],
  },
  {
    version: '0.1.22',
    date: '2026-08-08',
    notes: ['M15 polish - Magesmithy UX redesign + game-faithful tooltip'],
  },
  {
    version: '0.1.21',
    date: '2026-08-08',
    notes: ['Fix: Power distributes flat to elemental stats, not as a percentage multiplier'],
  },
  {
    version: '0.1.20',
    date: '2026-08-08',
    notes: ['M15 - Magesmithy rune system: per-slot rune management integrated into the stat engine'],
  },
  {
    version: '0.1.19',
    date: '2026-08-08',
    notes: [
      'Fix: tooltip now shows every stat, side positioning (right/left/top) avoids overflow-hidden clipping',
      'Fix: use the max value for ranged item stats in the computation',
    ],
  },
  {
    version: '0.1.18',
    date: '2026-08-08',
    notes: ["Fix: fmtValue uses a dash instead of the French 'à'; SetBonusesPanel redesigned with tier cards, dots and a modal button"],
  },
  {
    version: '0.1.17',
    date: '2026-08-08',
    notes: [
      'M14 - item favorites (star toggle + favorites-only filter)',
      'M20+M21 - grade selector (1-6) + damage calculated from build stats',
    ],
  },
  {
    version: '0.1.16',
    date: '2026-08-07',
    notes: ['Fix: removed unused ALL_SLOTS import, static codec import in useHistory'],
  },
  {
    version: '0.1.15',
    date: '2026-08-06',
    notes: [
      'M08+M09+M10 - set badge, set filter, set detail modal',
      'M24 - set name and progress in the slot tooltip',
      'M12 - stat filter with icon dropdown in the catalog',
      'M17 - undo/redo (Ctrl+Z/Y) with header buttons, 40-state history',
      'M11 - improved comparison delta (icons + color + label)',
    ],
  },
  {
    version: '0.1.14',
    date: '2026-08-06',
    notes: ['Version bump only - no associated code change in this commit'],
  },
  {
    version: '0.1.13',
    date: '2026-08-05',
    notes: ['Game-faithful stats panel + item stat icons + element filters'],
  },
  {
    version: '0.1.12',
    date: '2026-08-05',
    notes: ['Corrected stat icons + full combat stats panel'],
  },
  {
    version: '0.1.11',
    date: '2026-08-05',
    notes: ['Gender toggle, real female portraits, spell element filter with expand'],
  },
  {
    version: '0.1.10',
    date: '2026-08-05',
    notes: ['Dofus-faithful redesign: real game icons, direct stat input, bigger equipment slots'],
  },
  {
    version: '0.1.9',
    date: '2026-08-05',
    notes: ['Dofus-style characteristic icons + dynamic point allocation (hold to repeat, shift/ctrl click)'],
  },
  {
    version: '0.1.8',
    date: '2026-08-05',
    notes: [
      'Fix: resolve class slugs from en.json instead of the current language',
      'Dofus-faithful character screen layout (left/center/right columns like the real game)',
    ],
  },
  {
    version: '0.1.7',
    date: '2026-08-05',
    notes: ['M7 - spell viewer with per-class lazy loading'],
  },
  {
    version: '0.1.6',
    date: '2026-08-05',
    notes: ['M6 - set bonuses panel, element filter, stat delta, virtual list, keyboard navigation'],
  },
  {
    version: '0.1.5',
    date: '2026-08-05',
    notes: ['M5 - i18n (ES/EN/FR/PT), light/dark theme, accessibility and reduced-motion support'],
  },
  {
    version: '0.1.4',
    date: '2026-08-05',
    notes: ['M4 - share build via URL and builds saved in localStorage'],
  },
  {
    version: '0.1.3',
    date: '2026-08-05',
    notes: ['M3 - builder UI core: class picker, equipment grid, characteristics panel, stats panel'],
  },
  {
    version: '0.1.2',
    date: '2026-08-05',
    notes: ['M2 - pure stat engine with 27 Vitest tests (characteristics, stat map, computeStats)'],
  },
  {
    version: '0.1.1',
    date: '2026-08-05',
    notes: ['M1 - ETL pipeline fetching live DofusDude data (equipment, sets, mounts, consumables for ES/EN/FR/PT/DE)'],
  },
  {
    version: '0.1.0',
    date: '2026-08-05',
    notes: [
      'M0 - initial scaffold: Vite 6 + React 18 + TypeScript, TailwindCSS with the forge color palette, Zustand/i18next/react-router, GitHub Actions CI (deploy + weekly data update), ETL skeleton',
      'App version injected from the VERSION file via Vite define',
    ],
  },
]
