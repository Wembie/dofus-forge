// Single source of truth for brand asset paths. To swap the logo, rebuild and apply a concept
// (python docs/brand/dofus-forge/build.py --apply <id>) or drop replacements with the same names
// into public/brand/ — /brand/* is not served immutable, so a replaced file is picked up on the
// next request. Root favicons keep their conventional names because browsers and crawlers
// request them without reading the page.
export const BRAND = {
  icon: '/brand/icon.svg',
  mark: '/brand/mark.svg',
  wordmark: '/brand/wordmark.svg',
  wordmarkAspect: 1064 / 108,
  ogImage: '/brand/og-preview.jpg',
  logo512: '/brand/icon-512.png',
  favicon: {
    svg: '/favicon.svg',
    ico: '/favicon.ico',
    png48: '/favicon-48.png',
    png192: '/favicon-192.png',
    appleTouch: '/apple-touch-icon.png',
  },
} as const
