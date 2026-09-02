// Generates real, physical index.html files at dist/es/, dist/fr/, dist/pt/
// so GitHub Pages serves them as genuine 200-status static files.
//
// Why this exists: GitHub Pages has no server-side rewrites. A client-side
// SPA route like /dofus-forge/es/ would otherwise 404 on direct load (a
// crawler, a bookmark, a page refresh) — and Google discards 404-status
// pages regardless of what HTML body they carry, so the usual
// "404.html redirects via JS" trick does NOT make /es/ indexable, only
// navigable for users already in a loaded session. Pre-generating a real
// file at that exact path sidesteps the problem entirely: it's a normal
// static file, served with a normal 200, same JS bundle, same React app —
// BrowserRouter reads the URL and renders the right language on mount.
//
// Each copy gets its own <title>/<meta description>/og:*/twitter:*/canonical
// baked in statically, so even a crawler that doesn't execute JS sees the
// correct per-language metadata immediately.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = join(process.cwd(), 'dist')
const SITE = 'https://wembie.github.io/dofus-forge'

const META = {
  es: {
    title: 'Dofus Forge — Planificador de Builds para Dofus 3',
    description: 'Planifica tus builds de Dofus 3 online — catálogo de items, bonus de sets, runas de forjamagia, optimizador de stats y builds compartibles. Gratis y siempre actualizado.',
  },
  fr: {
    title: 'Dofus Forge — Planificateur de Builds pour Dofus 3',
    description: "Planifiez vos builds Dofus 3 en ligne — catalogue d'objets, bonus de panoplies, runes de forgemagie, optimiseur de stats et builds partageables. Gratuit, toujours à jour.",
  },
  pt: {
    title: 'Dofus Forge — Planejador de Builds para Dofus 3',
    description: 'Planeje suas builds de Dofus 3 online — catálogo de itens, bônus de conjuntos, runas de forjamagia, otimizador de stats e builds compartilháveis. Grátis e sempre atualizado.',
  },
}

const baseHtml = readFileSync(join(DIST, 'index.html'), 'utf-8')

for (const [code, m] of Object.entries(META)) {
  const canonicalUrl = `${SITE}/${code}/`
  let html = baseHtml

  html = html.replace(/<html lang="en">/, `<html lang="${code}">`)
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${m.title}</title>`)
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${m.description}" />`
  )
  html = html.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${canonicalUrl}" />`
  )
  html = html.replace(
    /<meta property="og:url"\s+content="[^"]*" \/>/,
    `<meta property="og:url"         content="${canonicalUrl}" />`
  )
  html = html.replace(
    /<meta property="og:title"\s+content="[^"]*" \/>/,
    `<meta property="og:title"       content="${m.title}" />`
  )
  html = html.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${m.description}" />`
  )
  html = html.replace(
    /<meta name="twitter:title"\s+content="[^"]*" \/>/,
    `<meta name="twitter:title"       content="${m.title}" />`
  )
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${m.description}" />`
  )

  const dir = join(DIST, code)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html, 'utf-8')
  console.log(`✓ dist/${code}/index.html`)
}
