import type { ReportRow } from '@/features/builds/api.ts'

/** The build or comment a report points at. */
export const targetOf = (r: ReportRow) => (r.kind === 'build' ? r.build?.id : r.comment?.id)

/** Content a moderator hid that is still hidden (a build flag, a soft-deleted comment). */
export const isRestorable = (r: ReportRow) => (r.kind === 'build' ? Boolean(r.build?.moderation_hidden) : Boolean(r.comment?.deleted_at))

/** Every report on the restored content shows it visible again; statuses stay as they were. */
export function markRestored(reports: ReportRow[], kind: ReportRow['kind'], targetId: string): ReportRow[] {
  return reports.map(r => {
    if (r.kind !== kind || targetOf(r) !== targetId) return r
    if (r.kind === 'build' && r.build) return { ...r, build: { ...r.build, moderation_hidden: false } }
    if (r.comment) return { ...r, comment: { ...r.comment, deleted_at: null } }
    return r
  })
}
