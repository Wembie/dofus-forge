import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './i18n/index.ts'
import './index.css'
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
