import { BRAND_MARK } from './brandMarkData.ts'

export type BrandMarkProps = {
  size?:      number
  className?: string
}

/** The brand mark (The Core), drawn inline in the theme's golds: it follows the light theme and paints
 *  with the HTML, without an image request. Decorative, the name is always live text next to it. */
export function BrandMark({ size = 34, className }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
      <path d={BRAND_MARK.lit}   fill="var(--gold-bright)" />
      <path d={BRAND_MARK.body}  fill="var(--gold)" />
      <path d={BRAND_MARK.shade} fill="var(--gold-deep)" />
      <path d={BRAND_MARK.hot}   fill="var(--brand-hot)" />
    </svg>
  )
}
