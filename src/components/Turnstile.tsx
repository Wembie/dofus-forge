import { useEffect, useRef } from 'react'

// Site keys are meant to be public (same model as reCAPTCHA) — only the
// secret, which validates the token server-side, is sensitive, and that one
// lives only in Supabase's Auth settings, never in the client.
const SITE_KEY = '0x4AAAAAAFRW1DVVsMlpYu0i'

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

type TurnstileWidgetId = string

type TurnstileApi = {
  render: (container: HTMLElement, options: {
    sitekey: string
    callback: (token: string) => void
    'expired-callback'?: () => void
    'error-callback'?: () => void
    theme?: 'light' | 'dark' | 'auto'
  }) => TurnstileWidgetId
  reset: (widgetId: TurnstileWidgetId) => void
  remove: (widgetId: TurnstileWidgetId) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile script'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

/** Renders a Cloudflare Turnstile challenge and reports the verification
 * token up via onVerify — pass that token as `captchaToken` in the
 * Supabase auth call (signUp/signInWithPassword) that this widget guards. */
export function Turnstile({ onVerify, onExpire }: { onVerify: (token: string) => void; onExpire?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef   = useRef<TurnstileWidgetId | null>(null)

  useEffect(() => {
    let cancelled = false
    loadScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: onVerify,
        'expired-callback': onExpire,
        theme: 'dark',
      })
    })
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} />
}
