import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, X } from 'lucide-react'

// How often to re-check while the tab is open. Also re-checked immediately
// whenever the tab becomes visible again — that's the case that actually
// matters: a build-detail tab left open across a deploy, then revisited.
const POLL_MS = 10 * 60 * 1000

/**
 * Detects a newer deploy and prompts the user to refresh, instead of
 * letting them hit it the hard way: GitHub Pages has no server-side
 * rewrites, dynamic routes like /build/:id rely on the 404.html
 * redirect trick, and Vite content-hashes every JS chunk on each build
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

  const check = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json() as { version?: string }
      if (data.version && data.version !== __APP_VERSION__) setNewVersion(data.version)
    } catch {
      // Offline, or GitHub Pages hiccup — not worth surfacing, just skip this check.
    }
  }, [])

  useEffect(() => {
    check()
    const interval = setInterval(check, POLL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [check])

  if (!newVersion || dismissed) return null

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl"
      style={{
        background:  'var(--surface-raised)',
        border:      '1px solid var(--gold-deep)',
        boxShadow:   'var(--shadow-frame), 0 0 24px color-mix(in srgb, var(--gold) 20%, transparent)',
      }}
      role="status"
    >
      <RefreshCw size={14} style={{ color: 'var(--gold)' }} />
      <span className="text-xs" style={{ color: 'var(--ink)' }}>{t('update_available')}</span>
      <button
        onClick={() => window.location.reload()}
        className="px-2.5 py-1 rounded-lg text-xs font-semibold"
        style={{ background: 'var(--gold)', color: 'var(--surface-void)' }}
      >
        {t('update_reload')}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label={t('dismiss')}
        className="p-0.5 rounded"
        style={{ color: 'var(--ink-faint)' }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
