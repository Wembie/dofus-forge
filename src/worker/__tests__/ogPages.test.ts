import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { setFacts, setIdForSlug } from '../ogPages.ts'
import { fullSetTotals, setSlugs, statElements } from '../../data/setGuide.ts'
import type { WorkerAppItem, WorkerAppSet } from '../data.ts'

const data = (f: string) => JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', 'en', f), 'utf-8'))
const sets = data('sets.json') as WorkerAppSet[]
const equipment = data('equipment.json') as (WorkerAppItem & { level: number })[]

describe('set share card data', () => {
  it('resolves every set page slug the same way the prerender does', () => {
    const slugs = setSlugs(sets, new Set(equipment.map(it => it.ankama_id)))
    for (const [id, slug] of [...slugs].slice(0, 50)) expect(setIdForSlug(slug, sets, equipment)).toBe(id)
    expect(setIdForSlug('no-such-set', sets, equipment)).toBeUndefined()
  })

  it('shows the set page full-set totals, level and elements', () => {
    const set = sets.find(s => s.items.length >= 3)!
    const items = set.items.flatMap(id => equipment.filter(it => it.ankama_id === id))
    const facts = setFacts(set, equipment)
    const totals = fullSetTotals(set, items)
    expect(facts.items.length).toBe(items.length)
    expect(facts.level).toBe(Math.max(...items.map(it => it.level)))
    expect(facts.elements).toEqual(statElements(totals))
    for (const t of facts.totals) expect(totals.list()).toContainEqual(t)
  })
})
