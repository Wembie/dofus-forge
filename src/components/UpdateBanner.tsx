import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, X } from 'lucide-react'

// How often to re-check while the tab is open. Also re-checked immediately
// whenever the tab becomes visible again — that's the case that actually
// matters: a build-detail tab left open across a deploy, then revisited.
const POLL_MS = 10 * 60 * 1000
// Quick tab switches fired one check each; a deploy is never that fresh.
const MIN_GAP_MS = 60 * 1000

/**
 * Detects a newer deploy and prompts the user to refresh, instead of
 * letting them hit it the hard way: Vite content-hashes every JS chunk on each build
 * (old chunk files aren't kept around) — a stale cached index.html from
 * before a deploy can end up referencing chunks that no longer exist,
 * which is what a report of getting stuck on a blank/stuck page after
 * a version bump pointed back to.
 *
 * version.json is generated fresh on every build (scripts/postbuild-
 * lang-pages.mjs, from the same VERSION file __APP_VERSION__ is baked
 * from) and always fetched with cache: 'no-store' — the one request in
 * the app that deliberately bypasses the browser cache, since its whole
 * job is detecting when the cache is lying.
 */
export function UpdateBanner() {
  const { t } = useTranslation()
  const [newVersion, setNewVersion] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const lastCheck = useRef(0)
  const found = useRef(false)

  const check = useCallback(async () => {
    if (found.current || document.visibilityState !== 'visible') return
    if (Date.now() - lastCheck.current < MIN_GAP_MS) return
    lastCheck.current = Date.now()
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json() as { version?: string }
      if (data.version && data.version !== __APP_VERSION__) {
        found.current = true
        setNewVersion(data.version)
      }
    } catch {
      // Offline, or GitHub Pages hiccup — not worth surfacing, just skip this check.
    }
  }, [])

  useEffect(() => {
    check()
    const interval = setInterval(check, POLL_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', check)
    }
  }, [check])

  if (!newVersion || dismissed) return null

  return (
    <div className="site-update" role="status">
      <RefreshCw size={17} aria-hidden="true" />
      <span>
        <b>{t('update_available')}</b>
        <small>{t('update_hint')}</small>
      </span>
      <button type="button" className="site-primary" onClick={() => window.location.reload()}>
        {t('update_reload')}
      </button>
      <button type="button" className="site-icon" onClick={() => setDismissed(true)} aria-label={t('dismiss')}>
        <X size={17} />
      </button>
    </div>
  )
}
