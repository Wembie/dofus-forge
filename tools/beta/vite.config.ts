import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, sep } from 'node:path'
import { existsSync, readFileSync, createReadStream } from 'node:fs'

const root = resolve(process.cwd())
const data = resolve(root, 'tools/beta/data')
const required = ['version.json', 'spells-version.json', 'changes.json', 'class-names.json', 'passives.generated.ts', ...['en', 'es', 'fr', 'pt'].map(lang => `${lang}/dracorunes.json`)]
if (existsSync(resolve(data, '.sync-in-progress')) || required.some(file => !existsSync(resolve(data, file)))) {
  throw new Error('Run pnpm fetch-beta before pnpm dev:beta')
}
const version = JSON.parse(readFileSync(resolve(data, 'version.json'), 'utf8')).gameVersion
if (JSON.parse(readFileSync(resolve(data, 'spells-version.json'), 'utf8')).gameVersion !== version || JSON.parse(readFileSync(resolve(data, 'changes.json'), 'utf8')).betaVersion !== version || !readFileSync(resolve(data, 'passives.generated.ts'), 'utf8').includes(`gameVersion: '${version}'`)) {
  throw new Error('Beta datasets have different versions. Run pnpm fetch-beta again.')
}

function localFiles(): Plugin {
  return {
    name: 'beta-local-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
        if (pathname === '/' || pathname === '/beta' || pathname === '/beta/') {
          req.url = '/tools/beta/index.html'
          return next()
        }
        const dir = pathname.startsWith('/data/') ? data : pathname.startsWith('/char/') ? resolve(root, 'char-assets') : null
        if (!dir) return next()
        const relative = decodeURIComponent(pathname.slice(6))
        const file = resolve(dir, relative)
        if (!file.startsWith(dir + sep)) { res.statusCode = 403; return res.end() }
        if (!existsSync(file)) {
          // Shared stat/rune/class art stays in public/data; game catalogs
          // never fall back to live data when a beta file is absent.
          if (pathname.startsWith('/data/') && /^(stats|runes|classes)\//.test(relative)) return next()
          res.statusCode = 404
          return res.end()
        }
        const ext = file.split('.').pop() ?? ''
        const mime: Record<string, string> = { json: 'application/json', ts: 'text/javascript', png: 'image/png', webp: 'image/webp', bin: 'application/octet-stream' }
        res.setHeader('Content-Type', mime[ext] ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-store')
        createReadStream(file).pipe(res)
      })
    },
  }
}

export default defineConfig({
  root,
  envPrefix: 'BETA_LOCAL_',
  define: { __APP_VERSION__: JSON.stringify('local-beta'), __DOFUS_VERSION__: JSON.stringify(version) },
  plugins: [react(), localFiles()],
  resolve: {
    alias: [
      { find: '@/store/buildStore.ts', replacement: resolve(root, 'tools/beta/buildStore.ts') },
      { find: '@/lib/supabase.ts', replacement: resolve(root, 'tools/beta/noCloud.ts') },
      { find: './buildStore.ts', replacement: resolve(root, 'tools/beta/buildStore.ts') },
      { find: './RuneModal.tsx', replacement: resolve(root, 'tools/beta/RuneModal.tsx') },
      { find: '@/features/class-picker/classData.ts', replacement: resolve(root, 'tools/beta/classData.ts') },
      { find: './classData.ts', replacement: resolve(root, 'tools/beta/classData.ts') },
      { find: '../../../public/data/class-names.json', replacement: resolve(data, 'class-names.json') },
      { find: '@/data/passives.generated.ts', replacement: resolve(data, 'passives.generated.ts') },
      { find: '../data/passives.generated.ts', replacement: resolve(data, 'passives.generated.ts') },
      { find: '@', replacement: resolve(root, 'src') },
    ],
  },
  server: {
    host: '127.0.0.1', port: 5188, strictPort: true, fs: { allow: [root] },
    headers: { 'Content-Security-Policy': "connect-src 'self' ws://127.0.0.1:*; form-action 'none'" },
  },
})
