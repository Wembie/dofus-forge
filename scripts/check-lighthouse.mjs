// Asserts Lighthouse JSON reports (lighthouse@13 CLI, mobile, simulated
// throttling; see .github/workflows/performance.yml) against fixed budgets.
// Each URL runs more than once and its best run counts, as Lighthouse CI
// does by default: one slow run on a shared CI machine is noise, every run
// over budget is a regression. Usage: node scripts/check-lighthouse.mjs <dir>
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2] ?? 'lighthouse-reports'

// Core Web Vitals "good" thresholds (lab), and category floors. Exact scores
// move between Lighthouse versions; these do not.
const MAX = { 'largest-contentful-paint': 2500, 'cumulative-layout-shift': 0.1 }
const WARN_MAX = { 'total-blocking-time': 200 }
const MIN_CATEGORY = { accessibility: 0.95, seo: 0.95 }
// Regressions this audit fixed once (M150): any failure is an error.
const MUST_PASS = ['canonical', 'target-size', 'color-contrast', 'document-title', 'meta-description', 'image-alt', 'button-name', 'link-name']

const byUrl = new Map()
for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const lhr = JSON.parse(readFileSync(join(dir, file), 'utf-8'))
  if (lhr.runtimeError) throw new Error(`${file}: ${lhr.runtimeError.message}`)
  const runs = byUrl.get(lhr.requestedUrl) ?? []
  runs.push(lhr)
  byUrl.set(lhr.requestedUrl, runs)
}
if (byUrl.size === 0) throw new Error(`No Lighthouse reports in ${dir}`)

const errors = []
const warnings = []
for (const [url, runs] of byUrl) {
  const best = (fn, pick) => pick(...runs.map(fn))
  const line = []
  for (const [id, max] of Object.entries({ ...MAX, ...WARN_MAX })) {
    const value = best(r => r.audits[id].numericValue, Math.min)
    line.push(`${id.split('-').map(w => w[0]).join('').toUpperCase()} ${id === 'cumulative-layout-shift' ? value.toFixed(3) : Math.round(value)}`)
    if (value > max) (id in MAX ? errors : warnings).push(`${url} ${id} ${value.toFixed(3)} > ${max}`)
  }
  for (const [category, min] of Object.entries(MIN_CATEGORY)) {
    const score = best(r => r.categories[category].score, Math.max)
    line.push(`${category} ${Math.round(score * 100)}`)
    if (score < min) errors.push(`${url} ${category} ${score} < ${min}`)
  }
  for (const id of MUST_PASS) {
    const score = best(r => r.audits[id]?.score ?? 1, Math.max)
    if (score !== null && score < 1) errors.push(`${url} audit "${id}" fails`)
  }
  console.log(`${url} (${runs.length} runs, best): ${line.join(', ')}`)
}

for (const w of warnings) console.log(`::warning::${w}`)
for (const e of errors) console.log(`::error::${e}`)
if (errors.length) process.exit(1)
