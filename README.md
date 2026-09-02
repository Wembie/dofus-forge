# ⚔️ Dofus Forge

> **Dofus 3 build planner** — plan your equipment, optimize your stats, and share builds with your guild.

**🔗 Live:** https://wembie.github.io/dofus-forge/

---

## ✨ Features

- **Equipment builder** — equip items across all slots (hat, weapon, shield, dofus, mounts, companions…)
- **Item catalog** — search and filter by name, level, element, set, and stat; hover tooltips with full item details
- **Set bonuses** — live tier tracking, next-bonus preview, equip-all button, item hover preview
- **Stat engine** — full Dofus 3 formulas: characteristic costs, set bonuses, caps (AP 12 / MP 6 / Range 6 / Res 50%), overcap indicators
- **Magesmithy runes** — add rune bonuses per slot, elemental weapon transform, craftsman signature
- **Optimizer** — find the best item combination for any stat profile with exo support (AP/MP/Range)
- **Spell viewer** — class spell cards with grades, cast conditions, and variants
- **Build sharing** — shareable URL snapshot + exportable image card
- **Compare mode** — side-by-side stat comparison between two builds
- **i18n** — Spanish, English, French, Portuguese
- **Dark / Light theme**

---

## 🛠️ Tech stack

| Layer | Tech |
|---|---|
| Framework | Vite 6 + React 18 + TypeScript (strict) |
| State | Zustand |
| Styling | TailwindCSS + CSS custom properties |
| Stat engine | Pure TypeScript, zero React — unit tested with Vitest |
| Data | Static JSON pre-generated from [DofusDude API](https://api.dofusdu.de), split by language |
| Deploy | GitHub Actions → `dist/` |

---

## 🚀 Local development

```bash
# Prerequisites: Node 22+, pnpm 11+
pnpm install
pnpm dev        # → http://localhost:5173/dofus-forge/
pnpm build      # production build → dist/
pnpm test       # vitest suite
```

---

## 🔄 Game data

Item data is auto-fetched from the public DofusDude API and cached as static JSON.

```bash
pnpm fetch-data           # skips if game version unchanged
pnpm fetch-data --force   # force full refresh
```

Generated files land in `public/data/`. A weekly CI workflow (`update-data.yml`) checks for game updates and auto-deploys when the version changes.

---

## 📄 License

MIT — see [LICENSE](./LICENSE).

Dofus, Krosmoz, and all related game assets are the property of **Ankama Games**.  
Item data sourced from the [DofusDude API](https://api.dofusdu.de). Images hotlinked from DofusDude's CDN.
