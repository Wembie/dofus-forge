import { describe, it, expect } from 'vitest'
import type { ReportRow } from '@/features/builds/api.ts'
import { isRestorable, markRestored, targetOf } from '../restore.ts'

const base = { reason: 'spam', detail: null, status: 'actioned', created_at: '', reporter: null } as const
const buildReport = (id: string, buildId: string, hidden: boolean): ReportRow =>
  ({ ...base, id, kind: 'build', build: { id: buildId, name: 'B', visibility: 'private', moderation_hidden: hidden }, comment: null })
const commentReport = (id: string, commentId: string, deleted: boolean): ReportRow =>
  ({ ...base, id, kind: 'comment', build: null, comment: { id: commentId, content: 'x', build_id: 'b', deleted_at: deleted ? '2026-10-20' : null } })

describe('moderation restore helpers', () => {
  it('only hidden content can be restored', () => {
    expect(isRestorable(buildReport('r1', 'b1', true))).toBe(true)
    expect(isRestorable(buildReport('r2', 'b1', false))).toBe(false)
    expect(isRestorable(commentReport('r3', 'c1', true))).toBe(true)
    expect(isRestorable(commentReport('r4', 'c1', false))).toBe(false)
    expect(isRestorable({ ...buildReport('r5', 'b1', true), build: null })).toBe(false)
  })

  it('every report on the same content shows it restored; others are untouched', () => {
    const reports = [buildReport('r1', 'b1', true), buildReport('r2', 'b1', true), buildReport('r3', 'b2', true), commentReport('r4', 'b1', true)]
    const next = markRestored(reports, 'build', 'b1')
    expect(next.map(isRestorable)).toEqual([false, false, true, true])
    expect(next.map(r => r.status)).toEqual(reports.map(r => r.status))
    expect(targetOf(next[3])).toBe('b1')
  })
})
