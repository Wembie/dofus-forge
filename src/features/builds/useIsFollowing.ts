import { useEffect, useState } from 'react'
import { fetchIsFollowing } from './api.ts'

/**
 * Whether `viewerId` follows `profileId`, re-checked when either changes —
 * notably when the session is restored after the profile already loaded (a
 * page refresh), which used to leave "Follow" showing for someone you follow.
 * Returns the value plus a setter for the optimistic toggle.
 */
export function useIsFollowing(viewerId: string | null, profileId: string | null) {
  const [following, setFollowing] = useState(false)
  useEffect(() => {
    setFollowing(false)
    if (!viewerId || !profileId || viewerId === profileId) return
    let cancelled = false
    fetchIsFollowing(viewerId, profileId).then(r => { if (!cancelled) setFollowing(r.following) })
    return () => { cancelled = true }
  }, [viewerId, profileId])
  return [following, setFollowing] as const
}
