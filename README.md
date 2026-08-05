# Dofus Forge

Unofficial, self-updating static Dofus build planner — hosted on GitHub Pages.

**Live:** https://wembie.github.io/dofus-forge/

## Disclaimer / NOTICE

Dofus, Krosmoz, and all related game assets (images, data, names) are the property of **Ankama Games**.  
This project is an **unofficial fan tool** with no affiliation with Ankama Games.  
Item data is sourced from the public [DofusDude API](https://api.dofusdu.de).  
This project does not host or redistribute game assets — images are hotlinked from DofusDude's CDN.

## Local development

```bash
# Prerequisites: Node 22+, pnpm 11+
pnpm install
pnpm dev          # http://localhost:5173/dofus-forge/
pnpm build        # production build -> dist/
pnpm test         # run vitest suite
```

## Fetching / updating game data

```bash
pnpm fetch-data           # skips if game version unchanged
pnpm fetch-data --force   # force full refresh
```

Generated files land in `public/data/`. The CI workflow `update-data.yml` runs this weekly.

## Architecture

- **Framework:** Vite + React + TypeScript
- **State:** Zustand
- **Styling:** TailwindCSS
- **Routing:** HashRouter (GitHub Pages compatible)
- **Data:** Static JSON pre-generated from DofusDude, split by language
- **Stat engine:** Pure TypeScript, zero React imports, unit-tested with Vitest

## Data update strategy

`update-data.yml` runs weekly. If the upstream game version changed, it commits the regenerated `public/data/**` directly to `main`, which triggers `deploy.yml` for a new deployment. Manual dispatch available via the Actions tab.

## License

MIT — see [LICENSE](./LICENSE). Game data and images belong to Ankama Games.
