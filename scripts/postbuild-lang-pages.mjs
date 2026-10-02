// Generates real, physical index.html files for every crawlable route
// (language roots AND sub-routes like /explore) so GitHub Pages serves
// them as genuine 200-status static files.
//
// Why this exists: GitHub Pages has no server-side rewrites. A client-side
// SPA route like /dofus-forge/es/ or /dofus-forge/explore/ would otherwise
// 404 on direct load (a crawler, a bookmark, a page refresh) — and Google
// discards 404-status pages regardless of what HTML body they carry, so the
// usual "404.html redirects via JS" trick does NOT make a route indexable,
// only navigable for users already in a loaded session. Pre-generating a
// real file at that exact path sidesteps the problem entirely: it's a
// normal static file, served with a normal 200, same JS bundle, same React
// app — BrowserRouter reads the URL and renders the right route on mount.
//
// Each copy gets its own <title>/<meta description>/og:*/twitter:*/canonical
// (and hreflang alternates, and robots noindex where applicable) baked in
// statically, so even a crawler that doesn't execute JS sees correct
// metadata immediately. usePageSeo() then keeps it in sync client-side.
//
// Dynamic build/:id pages are NOT pre-generated here — they're DB-backed
// with unbounded ids and this script has no network access to enumerate
// them. They stay reachable via the 404.html JS-redirect trick (fine for
// human navigation) and rely on internal links from /explore for discovery;
// indexing those individually would need a build-time Supabase export.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = join(process.cwd(), 'dist')
const SITE = 'https://wembie.github.io/dofus-forge'
const LANGS = ['en', 'es', 'fr', 'pt']
const LANG_PATH = { en: '', es: '/es', fr: '/fr', pt: '/pt' }

const ROOT_META = {
  en: {
    title: 'Dofus Forge — Build Planner for Dofus 3',
    description: 'Plan your Dofus 3 builds online — item catalog, set bonuses, magesmithy runes, stat optimizer, and shareable build URLs. Free, fast, always up to date.',
  },
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

const EXPLORE_META = {
  en: {
    title: 'Explore Community Builds — Dofus Forge',
    description: 'Browse Dofus 3 builds shared by the community — filter by class, sort by rating, likes or views, and find inspiration for your own setup.',
  },
  es: {
    title: 'Explorar builds de la comunidad — Dofus Forge',
    description: 'Mirá builds de Dofus 3 compartidas por la comunidad — filtrá por clase, ordená por calificación, likes o vistas, y encontrá inspiración para tu propio setup.',
  },
  fr: {
    title: 'Explorer les builds de la communauté — Dofus Forge',
    description: "Parcourez les builds Dofus 3 partagées par la communauté — filtrez par classe, triez par note, likes ou vues, et trouvez l'inspiration pour votre propre setup.",
  },
  pt: {
    title: 'Explorar builds da comunidade — Dofus Forge',
    description: 'Veja builds de Dofus 3 compartilhadas pela comunidade — filtre por classe, ordene por avaliação, curtidas ou visualizações, e encontre inspiração para a sua própria build.',
  },
}

const MY_BUILDS_META = {
  en: { title: 'My Builds — Dofus Forge', description: 'Manage your saved Dofus 3 builds — sign in to view, edit, publish or share them.' },
  es: { title: 'Mis Builds — Dofus Forge', description: 'Gestioná tus builds guardadas de Dofus 3 — iniciá sesión para verlas, editarlas, publicarlas o compartirlas.' },
  fr: { title: 'Mes Builds — Dofus Forge', description: 'Gérez vos builds Dofus 3 enregistrées — connectez-vous pour les voir, les modifier, les publier ou les partager.' },
  pt: { title: 'Minhas Builds — Dofus Forge', description: 'Gerencie suas builds salvas de Dofus 3 — entre para visualizar, editar, publicar ou compartilhar.' },
}

const ABOUT_META = {
  en: { title: 'About Dofus Forge', description: 'Dofus Forge is a free, fan-made build planner for Dofus 3. Learn why it exists, where its data comes from, and who makes it.' },
  es: { title: 'Acerca de Dofus Forge', description: 'Dofus Forge es un planificador de builds gratuito y hecho por fans para Dofus 3. Enterate por qué existe, de dónde salen los datos y quién lo hace.' },
  fr: { title: 'À propos de Dofus Forge', description: "Dofus Forge est un planificateur de builds gratuit, créé par des fans pour Dofus 3. Découvrez pourquoi il existe, d'où viennent ses données et qui le fait." },
  pt: { title: 'Sobre o Dofus Forge', description: 'Dofus Forge é um planejador de builds gratuito, feito por fãs para Dofus 3. Saiba por que ele existe, de onde vêm os dados e quem o faz.' },
}

const HOWTO_META = {
  en: { title: 'How to Use Dofus Forge', description: 'A step-by-step guide to planning a Dofus 3 build — picking a class, equipping items, reading stats and set bonuses, forgemagie runes, the stat optimizer, and sharing your build.' },
  es: { title: 'Cómo usar Dofus Forge', description: 'Guía paso a paso para armar un build de Dofus 3 — elegir clase, equipar items, leer stats y bonus de set, runas de forjamagia, el optimizador, y compartir tu build.' },
  fr: { title: 'Comment utiliser Dofus Forge', description: "Guide pas à pas pour créer un build Dofus 3 — choisir une classe, équiper des objets, lire les stats et bonus de panoplie, les runes de forgemagie, l'optimiseur, et partager votre build." },
  pt: { title: 'Como usar o Dofus Forge', description: 'Um guia passo a passo para montar uma build de Dofus 3 — escolher classe, equipar itens, ler stats e bônus de conjunto, runas de forjamagia, o otimizador, e compartilhar sua build.' },
}

const baseHtml = readFileSync(join(DIST, 'index.html'), 'utf-8')

function patch(html, { lang, title, description, canonicalPath, noindex }) {
  const canonicalUrl = `${SITE}${canonicalPath}`

  html = html.replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)

  if (description) {
    html = html.replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${description}" />`
    )
    html = html.replace(
      /<meta property="og:description" content="[^"]*" \/>/,
      `<meta property="og:description" content="${description}" />`
    )
    html = html.replace(
      /<meta name="twitter:description" content="[^"]*" \/>/,
      `<meta name="twitter:description" content="${description}" />`
    )
  }

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
    `<meta property="og:title"       content="${title}" />`
  )
  html = html.replace(
    /<meta name="twitter:title"\s+content="[^"]*" \/>/,
    `<meta name="twitter:title"       content="${title}" />`
  )

  const subPath = canonicalPath.replace(new RegExp(`^${LANG_PATH[lang]}`), '')
  for (const code of LANGS) {
    const href = `${SITE}${LANG_PATH[code]}${subPath}`
    html = html.replace(
      new RegExp(`<link rel="alternate" hreflang="${code}"\\s+href="[^"]*" \\/>`),
      `<link rel="alternate" hreflang="${code}"        href="${href}" />`
    )
  }
  html = html.replace(
    /<link rel="alternate" hreflang="x-default" href="[^"]*" \/>/,
    `<link rel="alternate" hreflang="x-default" href="${SITE}${subPath}" />`
  )

  if (noindex) {
    html = html.replace('</head>', '    <meta name="robots" content="noindex, follow" />\n  </head>')
  }

  return html
}

function write(dir, html) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html, 'utf-8')
  console.log(`✓ ${dir.replace(DIST, 'dist')}/index.html`)
}

// English has no /en path segment at the canonical root — its routes live
// directly under dist/. The explicit /en/* mirror (written separately,
// self-canonicalizing back to the no-prefix URL) is generated alongside it.
function langDir(lang, ...subpath) {
  return lang === 'en' ? join(DIST, ...subpath) : join(DIST, lang, ...subpath)
}

/**
 * Generates a static page for `slug` (empty string for a language root,
 * otherwise e.g. 'explore') across all 4 languages, plus a self-canonicalizing
 * /en/<slug> mirror (symmetry with /es /fr /pt — see the 0.3.21 changelog
 * entry for why that never creates duplicate-content competition with the
 * no-prefix URL).
 */
function generateRoute(slug, metaByLang, { noindex = false } = {}) {
  const suffix = slug ? `${slug}/` : ''
  for (const lang of LANGS) {
    if (lang === 'en' && slug === '') continue // dist/index.html is already correct from the Vite build
    const html = patch(baseHtml, { lang, ...metaByLang[lang], canonicalPath: `${LANG_PATH[lang]}/${suffix}`, noindex })
    write(langDir(lang, ...(slug ? [slug] : [])), html)
  }
  const html = patch(baseHtml, { lang: 'en', ...metaByLang.en, canonicalPath: `/${suffix}`, noindex })
  write(join(DIST, 'en', ...(slug ? [slug] : [])), html)
}

generateRoute('', ROOT_META)
generateRoute('explore', EXPLORE_META)
generateRoute('about', ABOUT_META)
generateRoute('how-to-use', HOWTO_META)
generateRoute('my-builds', MY_BUILDS_META, { noindex: true }) // private/auth-gated — real 200 for bookmarked direct loads, but noindex
