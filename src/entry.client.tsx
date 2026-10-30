import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'
import { initI18n } from './i18n/index.ts'
import { langFromPath } from './i18n/langPath.ts'
import { initTheme } from './ui/ThemeToggle.tsx'
import { installItemImageFallback } from './data/loaders.ts'

const preloadRecoveryKey = 'vite-preload-recovery'

window.addEventListener('vite:preloadError', event => {
  event.preventDefault()

  if (sessionStorage.getItem(preloadRecoveryKey)) return
  sessionStorage.setItem(preloadRecoveryKey, '1')
  window.location.reload()
})

window.addEventListener('load', () => {
  window.setTimeout(() => sessionStorage.removeItem(preloadRecoveryKey), 30_000)
}, { once: true })

initTheme()
installItemImageFallback()

// The page's text is already on screen from the HTML. Hydrating only once
// its language is loaded makes the first client render match it exactly.
initI18n(langFromPath(window.location.pathname)).finally(() => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    )
  })
})
