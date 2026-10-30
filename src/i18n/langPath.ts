/** English has no path prefix; es/fr/pt do (matches routes.ts). */
export function langPathPrefix(lang: string): string {
  const code = lang.slice(0, 2)
  return code === 'en' ? '' : `${code}/`
}

/** Returns the localized home path segment without a trailing slash. */
export function langPathRootSegment(lang: string): string {
  const code = lang.slice(0, 2)
  return code === 'en' ? '' : code
}

export type PathLang = 'en' | 'es' | 'fr' | 'pt'

/** The language a URL path is in: its /en /es /fr /pt prefix, else English. */
export function langFromPath(pathname: string): PathLang {
  const segment = pathname.split('/')[1]
  return segment === 'es' || segment === 'fr' || segment === 'pt' ? segment : 'en'
}
