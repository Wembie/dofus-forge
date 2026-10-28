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
const SITE = 'https://dofusforge.com'
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

const ACCOUNT_META = {
  en: { title: 'Account Settings — Dofus Forge', description: 'Manage your Dofus Forge profile, password and account settings.' },
  es: { title: 'Mi cuenta — Dofus Forge', description: 'Gestioná tu perfil, contraseña y configuración de cuenta en Dofus Forge.' },
  fr: { title: 'Mon compte — Dofus Forge', description: 'Gérez votre profil, mot de passe et paramètres de compte sur Dofus Forge.' },
  pt: { title: 'Minha conta — Dofus Forge', description: 'Gerencie seu perfil, senha e configurações de conta no Dofus Forge.' },
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

const FORGE_GUIDE_META = {
  en: { title: 'The Forger guide — Dofus 3 build optimizer | Dofus Forge', description: "How to use Dofus Forge's build optimizer, The Forger: minimums, purity and caps, intensity, pinned and banned items, forgemagic, transcendence runes and exos, and how to read the results." },
  es: { title: 'Guía de La Forjadora — optimizador de builds de Dofus 3 | Dofus Forge', description: 'Cómo usar La Forjadora de Dofus Forge: mínimos, Ley y topes, intensidad, objetos fijados y excluidos, forjamagia, runas de transcendencia y exos, y cómo leer los resultados.' },
  fr: { title: 'Guide de La Forgeuse — optimiseur de builds Dofus 3 | Dofus Forge', description: "Comment utiliser La Forgeuse de Dofus Forge : minimums, aloi et plafonds, intensité, objets épinglés et exclus, forgemagie, runes de transcendance et exos, et lecture des résultats." },
  pt: { title: 'Guia da Forjadora — otimizador de builds de Dofus 3 | Dofus Forge', description: 'Como usar A Forjadora do Dofus Forge: mínimos, Lei e tetos, intensidade, itens fixados e excluídos, forjamagia, runas de transcendência e exos, e como ler os resultados.' },
}

const SHORTCUTS_META = {
  en: { title: 'Keyboard Shortcuts & Controls — Dofus Forge', description: 'Every Dofus Forge shortcut on desktop and mobile: drag to swap rings and Dofus, right-click to pin an item for The Forger, undo/redo, the command palette, and more.' },
  es: { title: 'Atajos de teclado y controles — Dofus Forge', description: 'Todos los atajos de teclado y controles de mouse/táctil de Dofus Forge: mover anillos y Dofus arrastrando, fijar items con click derecho, deshacer/rehacer, paleta de comandos y más.' },
  fr: { title: 'Raccourcis clavier et contrôles — Dofus Forge', description: "Tous les raccourcis de Dofus Forge sur ordinateur et mobile : glisser pour échanger anneaux et Dofus, clic droit pour épingler un objet pour La Forgeuse, annuler/rétablir, la palette de commandes, et plus." },
  pt: { title: 'Atalhos de teclado e controles — Dofus Forge', description: 'Todos os atalhos e controles de mouse/toque do Dofus Forge: mover anéis e Dofus arrastando, fixar itens com clique direito para A Forjadora, desfazer/refazer, paleta de comandos e mais.' },
}

const PRIVACY_META = {
  en: { title: 'Privacy Policy — Dofus Forge', description: 'How Dofus Forge collects, uses, and protects your data, including cookies and Google AdSense advertising.' },
  es: { title: 'Política de Privacidad — Dofus Forge', description: 'Cómo Dofus Forge recopila, usa y protege tus datos, incluyendo cookies y la publicidad de Google AdSense.' },
  fr: { title: 'Politique de confidentialité — Dofus Forge', description: 'Comment Dofus Forge collecte, utilise et protège vos données, y compris les cookies et la publicité Google AdSense.' },
  pt: { title: 'Política de Privacidade — Dofus Forge', description: 'Como o Dofus Forge coleta, usa e protege seus dados, incluindo cookies e a publicidade do Google AdSense.' },
}

const TERMS_META = {
  en: { title: 'Terms of Service — Dofus Forge', description: 'The terms that govern your use of Dofus Forge, including accounts, user content, and acceptable use.' },
  es: { title: 'Términos de Servicio — Dofus Forge', description: 'Los términos que rigen el uso de Dofus Forge, incluyendo cuentas, contenido de usuarios y uso aceptable.' },
  fr: { title: "Conditions d'utilisation — Dofus Forge", description: "Les conditions qui régissent votre utilisation de Dofus Forge, y compris les comptes, le contenu utilisateur et l'utilisation acceptable." },
  pt: { title: 'Termos de Serviço — Dofus Forge', description: 'Os termos que regem o uso do Dofus Forge, incluindo contas, conteúdo de usuários e uso aceitável.' },
}

// Pilot for /classes/:id (ClassGuidePage) — only Cra for now, see
// AboutPage's CLASS_GUIDE_PILOT. Names from public/data/class-names.json.
const CRA_META = {
  en: { title: 'Cra — Dofus 3 Spell Guide', description: 'All Cra spells in Dofus 3 — AP cost, range and effects at max level, plus a shortcut to start a Cra build.' },
  es: { title: 'Ocra — Guía de hechizos Dofus 3', description: 'Todos los hechizos de Ocra en Dofus 3 — coste en PA, alcance y efectos a nivel máximo, más un atajo para armar un build de Ocra.' },
  fr: { title: 'Crâ — Guide des sorts Dofus 3', description: "Tous les sorts de Crâ dans Dofus 3 — coût en PA, portée et effets au niveau maximum, plus un raccourci pour créer un build Crâ." },
  pt: { title: 'Cra — Guia de feitiços Dofus 3', description: 'Todos os feitiços de Cra no Dofus 3 — custo em PA, alcance e efeitos no nível máximo, além de um atalho para montar uma build de Cra.' },
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
  // No trailing slash: matches wrangler.jsonc's html_handling: "drop-trailing-slash"
  // and src/seo/useSeoMeta.ts's normalizePath() — a baked-in canonical tag with
  // a trailing slash would tell crawlers to prefer the URL form Cloudflare no
  // longer serves directly (it 307s /explore/ -> /explore instead).
  for (const lang of LANGS) {
    if (lang === 'en' && slug === '') continue // dist/index.html is already correct from the Vite build
    const canonicalPath = slug ? `${LANG_PATH[lang]}/${slug}` : (LANG_PATH[lang] || '/')
    const html = patch(baseHtml, { lang, ...metaByLang[lang], canonicalPath, noindex })
    write(langDir(lang, ...(slug ? [slug] : [])), html)
  }
  const html = patch(baseHtml, { lang: 'en', ...metaByLang.en, canonicalPath: slug ? `/${slug}` : '/', noindex })
  write(join(DIST, 'en', ...(slug ? [slug] : [])), html)
}

generateRoute('', ROOT_META)
generateRoute('explore', EXPLORE_META)
generateRoute('about', ABOUT_META)
generateRoute('how-to-use', HOWTO_META)
generateRoute('forge-guide', FORGE_GUIDE_META)
generateRoute('shortcuts', SHORTCUTS_META)
generateRoute('privacy', PRIVACY_META)
generateRoute('terms', TERMS_META)
generateRoute('my-builds', MY_BUILDS_META, { noindex: true }) // private/auth-gated — real 200 for bookmarked direct loads, but noindex
generateRoute('account', ACCOUNT_META, { noindex: true }) // private/auth-gated — same treatment as my-builds
generateRoute('classes/cra', CRA_META)

// Fetched at runtime (no-store) so the running app can detect a newer
// deploy and prompt the user to refresh instead of risking a stale
// index.html whose JS chunk references have since been deleted from the
// server (Vite content-hashes every chunk filename on each build — old
// ones aren't kept around). Read from the same VERSION file vite.config.ts
// already reads to bake in __APP_VERSION__, so the two can never drift.
{
  const appVersion = readFileSync(join(process.cwd(), 'VERSION'), 'utf-8').trim()
  writeFileSync(join(DIST, 'version.json'), JSON.stringify({ version: appVersion }), 'utf-8')
  console.log(`✓ dist/version.json (${appVersion})`)
}
