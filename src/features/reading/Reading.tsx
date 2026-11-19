import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import './reading.css'

/** The section on screen, for the contents list. */
function useActive(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  const key = ids.join()
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(entries => {
      for (const e of entries) seen.set(e.target.id, e.isIntersecting)
      const first = ids.find(id => seen.get(id))
      if (first) setActive(first)
    }, { rootMargin: '-15% 0px -60% 0px' })
    ids.forEach(id => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return active
}

export type TocEntry = { id: string; label: string; Icon?: LucideIcon }

/** The reading layout: title block, contents beside the text on wide screens, folded on narrow ones. */
export function Reading({ kicker, title, intro, toc, tocLabel, hero, children, className = '' }: {
  kicker: string
  title: ReactNode
  intro?: ReactNode
  toc?: TocEntry[]
  tocLabel?: string
  hero?: ReactNode
  children: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const active = useActive(toc?.map(s => s.id) ?? [])
  const label = tocLabel ?? t('class_guide_nav_label')
  const list = toc && (
    <ol>
      {toc.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} aria-current={active === s.id ? 'location' : undefined}>
            <span>{s.Icon ? <s.Icon size={14} aria-hidden="true" /> : String(i + 1).padStart(2, '0')}</span>
            {s.label}
          </a>
        </li>
      ))}
    </ol>
  )
  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />
      <main id="main-content" className="rd-page flex-1">
        <div className={`rd-study ${className}`}>
          <div className="rd-head">
            <div>
              <p className="account-eyebrow">{kicker}</p>
              <h1>{title}</h1>
              {intro && <div className="rd-intro">{intro}</div>}
            </div>
            {hero}
          </div>
          <div className={toc ? 'rd-layout' : 'rd-layout is-single'}>
            {toc && (
              <>
                <nav className="rd-toc" aria-label={label}>
                  <p>{label}</p>
                  {list}
                </nav>
                <details className="rd-toc-mobile">
                  <summary>{label}</summary>
                  <nav aria-label={`${label} · ${t('reading_mobile_nav')}`}>{list}</nav>
                </details>
              </>
            )}
            <div className="rd-content">{children}</div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className="rd-actions">{children}</div>
}

export function GoLink({ to, primary, children }: { to: string; primary?: boolean; children: ReactNode }) {
  return <Link to={to} className={primary ? 'site-primary' : 'rd-button'}>{children}</Link>
}

/** A section heading with its icon. */
export function SectionHead({ Icon, children }: { Icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className="rd-section-head">
      {Icon && <span className="rd-section-icon"><Icon size={18} aria-hidden="true" /></span>}
      <h2>{children}</h2>
    </div>
  )
}
