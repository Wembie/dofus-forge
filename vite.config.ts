/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { reactRouter } from '@react-router/dev/vite'
import { resolve } from 'path'
import { readFileSync, existsSync, createReadStream } from 'fs'
import type { Plugin } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

// `ANALYZE=1 pnpm build` writes dist/stats.html (bundle treemap, gzip sizes).
const analyze = process.env.ANALYZE === '1'

const appVersion  = readFileSync('./VERSION', 'utf-8').trim()
const gameVersion = JSON.parse(readFileSync('./public/data/version.json', 'utf-8')).gameVersion as string

// Dev only: serve locally extracted character assets (scripts/extract-characters.py)
// from the same path the production worker serves them on.
function characterAssets(): Plugin {
  const root = resolve(__dirname, 'char-assets')
  const prefix = '/char/'
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

// Fetched with no-store by UpdateBanner so an open tab can tell a newer
// deploy is live and offer a refresh before its hashed chunks are gone.
function versionFile(): Plugin {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: appVersion }) })
    },
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__:   JSON.stringify(appVersion),
    __DOFUS_VERSION__: JSON.stringify(gameVersion),
  },
  plugins: [
    // The React Router plugin owns React (refresh, entries, prerender);
    // Vitest has no route modules to compile, so it keeps the plain plugin.
    process.env.VITEST ? react() : reactRouter(),
    characterAssets(),
    versionFile(),
    ...(analyze ? [visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true }) as Plugin] : []),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // dist/ is deployed as-is, so source maps here would be public. Nothing
    // consumes them in production; `SOURCEMAP=1 pnpm build` when debugging.
    sourcemap: process.env.SOURCEMAP === '1',
    rollupOptions: {
      output: {
        // Change far less often than app code, so they stay cached across
        // deploys; also keeps the entry chunk under the 500 kB warning.
        manualChunks: id =>
          id.includes('/node_modules/react-router/') ? 'router'
          : /\/node_modules\/(react|react-dom|scheduler)\//.test(id) ? 'react'
          : undefined,
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: [...configDefaults.exclude, 'e2e/**', '.claude/**'],
  },
})
