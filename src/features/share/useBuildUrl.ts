import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBuildStore } from '@/store/buildStore.ts'
import { encodeBuild, decodeBuild } from './codec.ts'

/**
 * Syncs build state ↔ URL query param `b`.
 *
 * - On mount: reads `?b=` from hash URL, restores build via applySnapshot.
 *   Restoration is delayed until equipment data is loaded.
 * - On store change: updates `?b=` in URL (replace history — no back-button spam).
 */
export function useBuildUrl() {
  const navigate      = useNavigate()
  const location      = useLocation()
  const applySnapshot = useBuildStore(s => s.applySnapshot)
  const equipment     = useBuildStore(s => s._equipment)
  const pendingSnap   = useRef<ReturnType<typeof decodeBuild>>(null)
  const syncingRef    = useRef(false)  // prevents circular update

  // 1. Parse URL once on mount
  useEffect(() => {
    const params  = new URLSearchParams(location.search)
    const encoded = params.get('b')
    if (!encoded) return
    const snap = decodeBuild(encoded)
    if (!snap) return
    // Hold snapshot until equipment data is ready
    pendingSnap.current = snap
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Apply pending snapshot when equipment loads
  useEffect(() => {
    if (!pendingSnap.current || equipment.length === 0) return
    syncingRef.current = true
    applySnapshot(pendingSnap.current)
    pendingSnap.current = null
    syncingRef.current = false
  }, [equipment, applySnapshot])

  // 3. Push URL changes on every store mutation
  useEffect(() => {
    return useBuildStore.subscribe(state => {
      if (syncingRef.current || !state.selectedClass) return
      const encoded = encodeBuild(state)
      const params  = new URLSearchParams(location.search)
      if (params.get('b') === encoded) return
      // Preserve the current language path (/es, /fr, /pt) — hardcoding
      // '/' here would silently bounce the user back to English on
      // every build mutation.
      navigate(`${location.pathname}?b=${encoded}`, { replace: true })
    })
  }, [navigate, location.search])
}
