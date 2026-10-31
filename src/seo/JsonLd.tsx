import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { SITE } from './useSeoMeta.ts'

// "<" escaped so a name from the data can never close the script element.
const serialize = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')

/** Structured data for the page it is rendered in (Google reads JSON-LD anywhere in the document). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(data) }} />
}

export type Crumb = { label: string; to: string }

/** Visible breadcrumb trail plus its BreadcrumbList, from the home page to the current one (last crumb). */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const { t } = useTranslation()
  return (
    <>
      <nav aria-label={t('a11y_breadcrumbs')} className="flex flex-wrap items-center gap-1 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
        {crumbs.map((c, i) => (
          <span key={c.to} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={11} aria-hidden="true" className="flex-shrink-0" />}
            {i === crumbs.length - 1
              ? <span aria-current="page" className="truncate" style={{ color: 'var(--ink-muted)' }}>{c.label}</span>
              : <Link to={c.to} className="hover:text-gold transition-colors truncate">{c.label}</Link>}
          </span>
        ))}
      </nav>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: `${SITE}${c.to === '/' ? '' : c.to}` })),
      }} />
    </>
  )
}
