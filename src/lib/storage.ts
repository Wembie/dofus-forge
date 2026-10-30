/**
 * localStorage read that is safe anywhere: null on the server (pages are
 * prerendered in Node) and when the browser blocks storage (private mode,
 * disabled site data), instead of throwing.
 */
export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
