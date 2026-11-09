import type { User } from '@supabase/supabase-js'

/** Effective date of each document. Bump one when its text changes in
 * substance: every signed-in user is asked to accept that document again. */
export const LEGAL_VERSIONS = {
  terms:   '2026-11-09',
  privacy: '2026-11-09',
} as const

export type LegalDoc = keyof typeof LEGAL_VERSIONS
export const LEGAL_DOCS: LegalDoc[] = ['terms', 'privacy']

/** Stored in the user's auth metadata, which is the record of when and to
 * which version they agreed (proof of consent under GDPR art. 7 and
 * Colombian Law 1581). */
export type LegalAcceptance = Partial<Record<`${LegalDoc}_version` | `${LegalDoc}_accepted_at`, string>>

export function legalAcceptance(docs: LegalDoc[], now = new Date()): LegalAcceptance {
  const acceptance: LegalAcceptance = {}
  for (const doc of docs) {
    acceptance[`${doc}_version`] = LEGAL_VERSIONS[doc]
    acceptance[`${doc}_accepted_at`] = now.toISOString()
  }
  return acceptance
}

/** Documents the user has not accepted in their current version. */
export function pendingLegalDocs(user: Pick<User, 'user_metadata'> | null | undefined): LegalDoc[] {
  if (!user) return []
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  return LEGAL_DOCS.filter(doc => meta[`${doc}_version`] !== LEGAL_VERSIONS[doc])
}
