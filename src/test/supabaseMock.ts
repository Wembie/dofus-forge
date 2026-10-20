import { vi } from 'vitest'

/** One `supabase.from(table)…` chain: every builder method called, in order. */
export type QueryCall = { table: string; ops: [string, unknown[]][] }
export type QueryResult = { data?: unknown; error?: { message: string; code?: string } | null; count?: number | null }
type Responder = (call: QueryCall) => QueryResult | undefined

/**
 * Minimal stand-in for the Supabase client used by src/features/builds/api.ts:
 * `from(table)` returns a chainable builder that records each method call and,
 * when awaited, resolves with the first responder result that matches.
 */
export function createSupabaseMock() {
  const calls: QueryCall[] = []
  const responders: Responder[] = []

  function resolve(call: QueryCall): QueryResult {
    for (const r of responders) {
      const out = r(call)
      if (out) return { data: null, error: null, count: null, ...out }
    }
    return { data: null, error: null, count: null }
  }

  function from(table: string) {
    const call: QueryCall = { table, ops: [] }
    calls.push(call)
    const builder: unknown = new Proxy({}, {
      get(_target, prop) {
        if (prop === 'then') {
          return (onOk: (v: QueryResult) => unknown, onErr: (e: unknown) => unknown) => Promise.resolve(resolve(call)).then(onOk, onErr)
        }
        return (...args: unknown[]) => { call.ops.push([String(prop), args]); return builder }
      },
    })
    return builder
  }

  const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) }
  const client = {
    from: vi.fn(from),
    rpc: vi.fn(async () => ({ data: null, error: null })),
    auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => 'ok'),
  }

  return {
    client,
    channel,
    calls,
    /** Responds to calls on `table` whose ops include `op` (any op when omitted). */
    on(table: string, result: QueryResult | ((call: QueryCall) => QueryResult), op?: string) {
      responders.push(call => {
        if (call.table !== table) return undefined
        if (op && !call.ops.some(([name]) => name === op)) return undefined
        return typeof result === 'function' ? result(call) : result
      })
    },
    callsTo(table: string, op?: string) {
      return calls.filter(c => c.table === table && (!op || c.ops.some(([name]) => name === op)))
    },
  }
}

export function opArgs(call: QueryCall, op: string): unknown[] | undefined {
  return call.ops.find(([name]) => name === op)?.[1]
}
