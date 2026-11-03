// Review board for the equipment slot icons. The shapes come from the site's own
// src/ui/slotIcons.ts (Node 22 strips the types), so the board shows exactly
// what ships. Run from the repo root:
//   node docs/brand/slot-icons/board.mjs && node docs/brand/slot-icons/shot.mjs
import { writeFileSync } from 'node:fs'
import { SLOT_ICON_SHAPES } from '../../../src/ui/slotIcons.ts'

const fr = s => (s.evenodd ? ' fill-rule="evenodd"' : '')
const wrap = (s, inner) => (s.rotate ? `<g transform="rotate(${s.rotate} 12 12)">${inner}</g>` : inner)

// What the site draws (SlotIcon.tsx): currentColor, base at .55, lit facets at 1.
function flat(s, size) {
  const chain = s.stroke ? `<path d="${s.stroke}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>` : ''
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}">${wrap(s, `${chain}<path d="${s.base}" fill="currentColor" opacity=".55"${fr(s)}/><path d="${s.lit}" fill="currentColor"${fr(s)}/>`)}</svg>`
}

const LABEL = { hat: 'Sombrero', cape: 'Capa', amulet: 'Amuleto', ring: 'Anillo', weapon: 'Arma', shield: 'Escudo', belt: 'Cinturón', boots: 'Botas', companion: 'Montura', sidekick: 'Compañero', dofus: 'Dofus' }
const tile = (inner, { light = false, px = 80 } = {}) =>
  `<div class="tile${light ? ' l' : ''}" style="width:${px}px;height:${px}px"><span class="ic">${inner}</span></div>`

const setRows = Object.entries(SLOT_ICON_SHAPES).map(([k, s]) => `<div class="row"><div class="name">${LABEL[k]}</div>
${tile(flat(s, 24))}${tile(flat(s, 24), { light: true })}<div class="big">${flat(s, 64)}</div></div>`).join('')

// The Dofus slots keep the game's Dofus icon (SlotIcon.tsx), shown here for the full set.
const DOFUS = '<img src="../../../public/data/stats/dofus.png" width="24" height="24">'
const dofusRow = `<div class="row"><div class="name">Dofus</div>${tile(DOFUS)}${tile(DOFUS, { light: true })}<div class="big"><img src="../../../public/data/stats/dofus.png" width="64" height="64"></div></div>`

writeFileSync(new URL('./board.html', import.meta.url), `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#0a0d13;color:#9aa0b0;font:12px Inter,system-ui,sans-serif;padding:24px;width:520px}
h1{font:700 15px Cinzel,serif;letter-spacing:.2em;color:#c9a24b;text-transform:uppercase;margin:0 0 4px}
p{margin:0 0 14px}
.row{display:grid;grid-template-columns:110px 96px 96px 96px;align-items:center;gap:10px;margin-bottom:8px}
.name{color:#e9e5da;font-weight:600}
.tile{border:1px dashed #2b3446;border-radius:12px;background:#0d111a;display:flex;align-items:center;justify-content:center;color:#9aa0b0}
.tile .ic{opacity:.2;transform:scale(1.1);display:flex}
.tile.l{background:#f3efe4;border-color:#c9bfa5;color:#6b6457}.tile.l .ic{opacity:.3}
.big{color:#9aa0b0;display:flex;justify-content:center}
</style><h1>Iconos de casillas</h1><p>Gris tenue, tal como se ven en una casilla vacía (oscuro / claro / grande).</p>
${setRows}${dofusRow}`)
