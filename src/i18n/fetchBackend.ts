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
    fetch(`${base}locales/${language}/${namespace}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load ${language}/${namespace}: ${res.status}`)
        return res.json()
      })
      .then(data => callback(null, data))
      .catch((err: Error) => callback(err, null))
  },
}
