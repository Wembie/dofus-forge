/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const appVersion  = readFileSync('./VERSION', 'utf-8').trim()
const gameVersion = JSON.parse(readFileSync('./public/data/version.json', 'utf-8')).gameVersion as string

export default defineConfig({
  define: {
    __APP_VERSION__:   JSON.stringify(appVersion),
    __DOFUS_VERSION__: JSON.stringify(gameVersion),
  },
  plugins: [react()],
  base: '/dofus-forge/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
