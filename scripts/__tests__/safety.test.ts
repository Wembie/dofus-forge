import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { checkedVersion, extractRegularFiles } from '../lib/safety.ts'

// Minimal ustar archive, built by hand so the fixture needs no tar binary
// (and no symlink privilege) to create.
function tarEntry(name: string, type: '0' | '1' | '2', body = '', linkname = ''): Buffer {
  const header = Buffer.alloc(512)
  const put = (s: string, off: number, len: number) => header.write(s.slice(0, len), off, 'ascii')
  put(name, 0, 100)
  put('0000644\0', 100, 8)
  put('0000000\0', 108, 8)
  put('0000000\0', 116, 8)
  put(body.length.toString(8).padStart(11, '0') + '\0', 124, 12)
  put('00000000000\0', 136, 12)
  put('        ', 148, 8)
  put(type, 156, 1)
  put(linkname, 157, 100)
  put('ustar\0', 257, 6)
  put('00', 263, 2)
  const sum = header.reduce((a, b) => a + b, 0)
  put(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8)
  const data = Buffer.alloc(Math.ceil(body.length / 512) * 512)
  data.write(body)
  return Buffer.concat([header, data])
}
const archive = (...entries: Buffer[]) => gzipSync(Buffer.concat([...entries, Buffer.alloc(1024)]))

let dir: string
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'df-safety-')) })
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('extractRegularFiles', () => {
  it('writes only the wanted regular-file members to their destinations', () => {
    const tar = join(dir, 'ok.tar.gz')
    writeFileSync(tar, archive(tarEntry('data/img/item/2x/1-128.png', '0', 'PNG'), tarEntry('data/img/item/2x/3-128.png', '0', 'other')))
    const dest = join(dir, 'one.png')
    expect(extractRegularFiles(tar, { 'data/img/item/2x/1-128.png': dest })).toEqual(['data/img/item/2x/1-128.png'])
    expect(readFileSync(dest, 'utf8')).toBe('PNG')
    expect(existsSync(join(dir, '3-128.png'))).toBe(false)
  })

  it.each([['symlink', '2'], ['hard link', '1']] as const)('refuses a %s member instead of handing its target to the uploader', (_, type) => {
    const secret = join(dir, 'config')
    writeFileSync(secret, 'extraheader = AUTHORIZATION: basic DUMMY')
    const tar = join(dir, 'evil.tar.gz')
    writeFileSync(tar, archive(tarEntry('data/img/item/2x/2-128.png', type, '', secret)))
    const dest = join(dir, '2-128.png')
    expect(() => extractRegularFiles(tar, { 'data/img/item/2x/2-128.png': dest })).toThrow(/non-regular/)
    expect(existsSync(dest)).toBe(false)
  })
})

describe('checkedVersion', () => {
  it('rejects a version that would retarget release download URLs', () => {
    expect(() => checkedVersion('../../../../attacker/repo/releases/download/t')).toThrow()
    expect(checkedVersion('3.7.1.0')).toBe('3.7.1.0')
  })
})
