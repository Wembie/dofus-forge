// Renders board.html to board.png (2x). Run from the repo root:
//   node docs/brand/slot-icons/board.mjs && node docs/brand/slot-icons/shot.mjs
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
const page = new URL('./board.html', import.meta.url)
const b = await chromium.launch()
const p = await b.newPage({ deviceScaleFactor: 2, viewport: { width: 570, height: 800 } })
await p.goto(page.href)
await p.waitForTimeout(800)
await p.screenshot({ path: fileURLToPath(new URL('./board.png', import.meta.url)), fullPage: true })
await b.close()
