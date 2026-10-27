// Guards for third-party input handled by the scheduled data update
// (.github/workflows/update-data.yml), which runs with a write token and the
// Cloudflare API token in its environment.
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

/** Game versions look like 3.7.1.0; anything else never reaches a URL. */
export function checkedVersion(raw: unknown): string {
  if (typeof raw !== 'string' || !/^\d+(\.\d+){1,3}$/.test(raw)) throw new Error(`Unexpected game version: ${String(raw)}`)
  return raw
}

const field = (block: Buffer, offset: number, length: number) => block.toString('utf8', offset, offset + length).replace(/\0.*$/s, '')

/** Writes the wanted members of a .tar.gz to their destinations and returns
 * the members written. Parsed in-process rather than with the tar binary:
 * only regular-file contents are ever written, so a symlink or hard link
 * member (pointing at the runner's .git/config, /proc/self/environ, ...)
 * can't make the uploader or a commit pick up a file from outside the
 * archive — a check after a real extraction can't tell that apart on every
 * platform (MSYS tar copies the link target instead of linking). */
export function extractRegularFiles(tarPath: string, wanted: Record<string, string>): string[] {
  const tar = gunzipSync(readFileSync(tarPath))
  const written: string[] = []
  let longName: string | null = null
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every(b => b === 0)) break
    const size = parseInt(field(header, 124, 12).trim() || '0', 8)
    const type = String.fromCharCode(header[156])
    const body = tar.subarray(offset + 512, offset + 512 + size)
    offset += 512 + Math.ceil(size / 512) * 512

    if (type === 'L') { longName = field(body, 0, body.length); continue }
    if (type === 'x') {
      const path = /\d+ path=([^\n]*)\n/.exec(body.toString('utf8'))
      if (path) longName = path[1]
      continue
    }
    const prefix = field(header, 345, 155)
    const name = longName ?? (prefix ? `${prefix}/${field(header, 0, 100)}` : field(header, 0, 100))
    longName = null
    if (!(name in wanted)) continue
    if (type !== '0' && type !== '\0') throw new Error(`Refusing non-regular tar member: ${name}`)
    writeFileSync(wanted[name], body)
    written.push(name)
  }
  return written
}
