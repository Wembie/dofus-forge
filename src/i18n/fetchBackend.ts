import type { BackendModule } from 'i18next'

// Replaces i18next-http-backend. That package unconditionally bundles
// cross-fetch (a ~20 KB fetch polyfill nobody targeting a modern browser
// needs) via a `require('cross-fetch')` fallback that bundlers can't
// tree-shake away. All we actually need is "fetch a static JSON file" —
// every supported browser has native fetch, so this is ~15 lines instead
// of two extra dependencies.
export const fetchBackend: BackendModule = {
  type: 'backend',
  init() {},
  read(language, namespace, callback) {
    const base = import.meta.env.BASE_URL
    // Cache-bust on app version: translation.json has no content hash in its
    // filename (unlike the JS bundle chunks), so without this the browser's
    // normal HTTP cache can keep serving a pre-deploy copy for its full
    // max-age after a new version ships — missing/renamed keys then render
    // as the raw key string until the cache naturally expires. Bumping
    // VERSION on every change (already this project's convention) changes
    // this URL, forcing a fresh fetch instead of waiting out the cache.
    fetch(`${base}locales/${language}/${namespace}.json?v=${__APP_VERSION__}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load ${language}/${namespace}: ${res.status}`)
        return res.json()
      })
      .then(data => callback(null, data))
      .catch((err: Error) => callback(err, null))
  },
}
