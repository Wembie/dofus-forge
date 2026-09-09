/**
 * Normalizes text for search matching: lowercase + strip diacritics.
 * "Ámbar" / "ámbar" / "AMBAR" all normalize to "ambar", so searching
 * without accents still finds accented names (any language).
 */
export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritical marks (U+0300-U+036F)
    .toLowerCase()
}
