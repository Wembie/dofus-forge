/** English has no path prefix; es/fr/pt do (matches App.tsx's route structure). */
export function langPathPrefix(lang: string): string {
  const code = lang.slice(0, 2)
  return code === 'en' ? '' : `${code}/`
}
