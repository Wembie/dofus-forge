import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useCompareStore } from '@/store/compareStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { decodeBuild } from './codec.ts'

export function useCompareUrl() {
  const location   = useLocation()
  const loadBuild  = useCompareStore(s => s.loadBuild)
  const equipment  = useDataStore(s => s.equipment)
  const sets       = useDataStore(s => s.sets)
  const pendingRef = useRef<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const c = params.get('c')
    if (c) pendingRef.current = c
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pendingRef.current || !equipment?.length || !sets?.length) return
    const snap = decodeBuild(pendingRef.current)
    if (snap) {
      loadBuild(snap, 'Build B', equipment, sets)
      pendingRef.current = null
    }
  }, [equipment, sets, loadBuild])
}
