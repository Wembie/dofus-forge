/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync, existsSync, createReadStream } from 'fs'
import type { Plugin } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

// `ANALYZE=1 pnpm build` writes dist/stats.html (bundle treemap, gzip sizes).
const analyze = process.env.ANALYZE === '1'

const appVersion  = readFileSync('./VERSION', 'utf-8').trim()
const gameVersion = JSON.parse(readFileSync('./public/data/version.json', 'utf-8')).gameVersion as string
const base        = process.env.CF_PAGES || process.env.CLOUDFLARE_DEPLOY ? '/' : '/dofus-forge/'

// Dev only: serve locally extracted character assets (scripts/extract-characters.py)
// from the same path the production worker serves them on.
function characterAssets(): Plugin {
  const root = resolve(__dirname, 'char-assets')
  const prefix = `${base}char/`
  const types: Record<string, string> = { json: 'application/json', webp: 'image/webp', bin: 'application/octet-stream' }
  return {
    name: 'character-assets',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (!url.startsWith(prefix)) return next()
        const file = resolve(root, decodeURIComponent(url.slice(prefix.length)))
        if (!file.startsWith(root) || !existsSync(file)) {
          res.statusCode = 404
          return res.end()
        }
        res.setHeader('Content-Type', types[file.split('.').pop() ?? ''] ?? 'application/octet-stream')
        createReadStream(file).pipe(res)
      })
    },
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__:   JSON.stringify(appVersion),
    __DOFUS_VERSION__: JSON.stringify(gameVersion),
  },
  plugins: [
    react(),
    characterAssets(),
    ...(analyze ? [visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true }) as Plugin] : []),
  ],
  base,
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    // dist/ is deployed as-is, so source maps here would be public. Nothing
    // consumes them in production; `SOURCEMAP=1 pnpm build` when debugging.
    sourcemap: process.env.SOURCEMAP === '1',
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
