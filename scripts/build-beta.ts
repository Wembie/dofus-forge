import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const crate = resolve(root, 'rust-optimizer')
const output = resolve(root, 'tools/beta/data/wasm')
const files = ['Cargo.toml', 'Cargo.lock', ...readdirSync(resolve(crate, 'src')).filter(file => file.endsWith('.rs')).sort().map(file => `src/${file}`)]
const hash = createHash('sha256')
for (const file of files) hash.update(file).update(readFileSync(resolve(crate, file)))
const stamp = hash.digest('hex')
const marker = resolve(output, 'source.sha256')
if (!process.argv.includes('--force') && existsSync(marker) && readFileSync(marker, 'utf8').trim() === stamp && ['dofus_forge_optimizer.js', 'dofus_forge_optimizer_bg.wasm'].every(file => existsSync(resolve(output, file)))) {
  console.log('Local beta optimizer is up to date.')
} else {
  execFileSync(process.platform === 'win32' ? 'wasm-pack.exe' : 'wasm-pack', ['build', crate, '--target', 'web', '--release', '--out-dir', output, '--no-pack', '--locked'], { cwd: root, stdio: 'inherit' })
  writeFileSync(marker, stamp)
}
