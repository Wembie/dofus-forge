import { useEffect, useState } from 'react'
import { getCharacterMode, MOTION_SETTINGS_EVENT } from '@/lib/motionSettings.ts'

function useCharacterMode() {
  const [mode, setMode] = useState(getCharacterMode)
  useEffect(() => {
    const sync = () => setMode(getCharacterMode())
    window.addEventListener(MOTION_SETTINGS_EVENT, sync)
    return () => window.removeEventListener(MOTION_SETTINGS_EVENT, sync)
  }, [])
  return mode
}

/** Animated character on/off; drops back to the 2D portrait once it fails to load. */
export function useCharacterStage() {
  const mode = useCharacterMode()
  const [failed, setFailed] = useState(false)
  return { show: mode === '3d' && !failed, fail: () => setFailed(true) }
}
