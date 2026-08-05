import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './i18n/index.ts'
import './index.css'
import { initTheme } from './ui/ThemeToggle.tsx'

initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
