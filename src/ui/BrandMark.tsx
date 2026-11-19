import { BRAND_MARK } from './brandMarkData.ts'

export type BrandMarkProps = {
  size?:      number
  className?: string
}

/** The workshop mark inherits the page palette and paints with the HTML. */
export function BrandMark({ size = 34, className }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} className={className} aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
      <path d={BRAND_MARK.body} fill="var(--ink)" fillRule="evenodd" />
      <path d={BRAND_MARK.flame} fill="var(--gold)" fillRule="evenodd" />
    </svg>
  )
}
