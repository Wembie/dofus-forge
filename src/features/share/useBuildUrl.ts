import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBuildStore } from '@/store/buildStore.ts'
import { encodeBuild, decodeBuild } from './codec.ts'

/**
 * Syncs build state ↔ URL query params `b` (snapshot) and `edit` (linked
 * build id).
 *
 * - On mount: reads `?b=` from hash URL, restores build via applySnapshot.
 *   Restoration is delayed until equipment data is loaded. `?edit=` is
 *   restored alongside it.
 * - On store change: updates `?b=`/`?edit=` in URL (replace history — no
 *   back-button spam).
 *
 * `linkedBuildId` isn't part of BuildSnapshot (it has no meaning for a
 * build loaded from a plain share link), but it still needs to survive a
 * refresh after "Load"/"Edit" from My Builds or a build's own page —
 * otherwise hitting Update post-refresh silently published a duplicate
 * instead of updating the original, since the planner had no way left to
 * know which build it was editing.
 */
export function useBuildUrl() {
  const navigate        = useNavigate()
  const location        = useLocation()
  const applySnapshot   = useBuildStore(s => s.applySnapshot)
  const setLinkedBuildId = useBuildStore(s => s.setLinkedBuildId)
  const equipment       = useBuildStore(s => s._equipment)
  const pendingSnap     = useRef<ReturnType<typeof decodeBuild>>(null)
  const pendingEditId   = useRef<string | null>(null)
  const syncingRef      = useRef(false)  // prevents circular update

  // 1. Parse URL once on mount
  useEffect(() => {
    const params  = new URLSearchParams(location.search)
    const encoded = params.get('b')
    pendingEditId.current = params.get('edit')
    if (!encoded) return
    const snap = decodeBuild(encoded)
    if (!snap) return
    // Hold snapshot until equipment data is ready
    pendingSnap.current = snap
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Apply pending snapshot (and linked build id) when equipment loads
  useEffect(() => {
    if (!pendingSnap.current || equipment.length === 0) return
    syncingRef.current = true
    applySnapshot(pendingSnap.current)
    if (pendingEditId.current) setLinkedBuildId(pendingEditId.current)
    pendingSnap.current = null
    pendingEditId.current = null
    syncingRef.current = false
  }, [equipment, applySnapshot, setLinkedBuildId])

  // 3. Push URL changes on every store mutation
  useEffect(() => {
    return useBuildStore.subscribe(state => {
      if (syncingRef.current || !state.selectedClass) return
      const encoded = encodeBuild(state)
      const params  = new URLSearchParams(location.search)
      const sameB   = params.get('b') === encoded
      const sameEdit = (params.get('edit') ?? null) === (state.linkedBuildId ?? null)
      if (sameB && sameEdit) return
      const query = new URLSearchParams()
      query.set('b', encoded)
      if (state.linkedBuildId) query.set('edit', state.linkedBuildId)
      // Preserve the current language path (/es, /fr, /pt) — hardcoding
      // '/' here would silently bounce the user back to English on
      // every build mutation.
      navigate(`${location.pathname}?${query.toString()}`, { replace: true })
    })
  }, [navigate, location.search])
}
