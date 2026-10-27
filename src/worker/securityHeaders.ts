// Static assets get these from public/_headers (copied to dist/), which the
// Worker never sees; responses the Worker builds get them from here.
// src/worker/__tests__/headers.test.ts keeps the two lists identical.
const SUPABASE = 'https://wkllwjxodqxhiptjaccj.supabase.co'

// Report-only first: browsers log violations without blocking anything. Make
// it enforcing (rename the header, in both places) once production shows no
// legitimate violations — see docs/security/CLOUDFLARE_HARDENING.md.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://pagead2.googlesyndication.com https://*.adtrafficquality.google https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${SUPABASE} ${SUPABASE.replace('https:', 'wss:')} https://assets.dofusforge.com https://api.dofusdu.de https://pagead2.googlesyndication.com https://*.adtrafficquality.google`,
  "frame-src https://challenges.cloudflare.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ')

export const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Content-Security-Policy-Report-Only': CSP,
}

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
