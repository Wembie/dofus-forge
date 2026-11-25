import type { OptimizerConfig } from './types.ts'
import { DEFAULTS_REV, isActive, parseConfig } from './forgeConfig.ts'
import { sanitizePicks, type ForgePicks } from './forgePicks.ts'
import { sanitizeSnapshot } from '@/engine/snapshot.ts'
import type { BuildSnapshot } from '@/store/buildStore.ts'

// A Forge order as a link or a code a friend pastes: the same goals, rules,
// picks and passives, and optionally the build (level, gear, runes) with the
// pieces it keeps locked. Everything read back goes through the same checks
// as a saved order: a hand-edited code can only produce a valid order.
export const ORDER_PREFIX = 'f1.'
const MAX_CODE = 24000

export type SharedOrder = { config: OptimizerConfig; picks: ForgePicks; build: BuildSnapshot | null }

function toBase64Url(text: string): string {
  let bin = ''
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(code: string): string {
  const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)))
}

export function encodeOrder(config: OptimizerConfig, picks: ForgePicks, build: BuildSnapshot | null): string {
  const { stats, lockedSlots, ...rules } = config
  const payload = {
    o: rules,
    s: stats.filter(isActive).map(r => [r.stat, r.minimum, r.weight, r.cap ?? 0, r.strictCap ? 1 : 0]),
    r: picks.required.length ? picks.required : undefined,
    x: picks.banned.length ? picks.banned : undefined,
    ...(build ? { k: [...lockedSlots], b: build } : {}),
  }
  return ORDER_PREFIX + toBase64Url(JSON.stringify(payload))
}

/** The order code in a pasted code or link, if there is one. */
export function orderCode(text: string): string | null {
  const trimmed = text.trim()
  const fromLink = /[?&]forge=([^&#\s]+)/.exec(trimmed)
  let code = trimmed
  try {
    if (fromLink) code = decodeURIComponent(fromLink[1])
  } catch {
    return null
  }
  return code.startsWith(ORDER_PREFIX) && code.length <= MAX_CODE ? code : null
}

export function decodeOrder(text: string): SharedOrder | null {
  const code = orderCode(text)
  if (!code) return null
  try {
    const p: unknown = JSON.parse(fromBase64Url(code.slice(ORDER_PREFIX.length)))
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null
    const { o, s, r, x, k, b } = p as Record<string, unknown>
    if (!Array.isArray(s)) return null
    const stats = s.filter(Array.isArray).map(([stat, minimum, weight, cap, strict]) => ({
      stat,
      minimum,
      weight,
      cap: typeof cap === 'number' && cap > 0 ? cap : null,
      strictCap: strict === 1,
    }))
    const rules = o && typeof o === 'object' && !Array.isArray(o) ? o : {}
    const build = b ? sanitizeSnapshot(b) : null
    if (b && !build) return null
    const config = parseConfig({ ...rules, stats, lockedSlots: build && Array.isArray(k) ? k : [], defaultsRev: DEFAULTS_REV })
    return { config, picks: sanitizePicks({ required: r, banned: x }), build }
  } catch {
    return null
  }
}
