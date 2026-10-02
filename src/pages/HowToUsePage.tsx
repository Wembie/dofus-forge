import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'

const STEPS = [1, 2, 3, 4, 5, 6, 7, 8] as const

export function HowToUsePage() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'how-to-use', {
    title: t('howto_seo_title'),
    description: t('howto_seo_description'),
  })

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10 space-y-8">
        <div style={{ animation: 'col-rise 520ms var(--ease-out) 0ms both' }}>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--gold)' }}>
            {t('howto_title')}
          </h1>
          <p className="text-sm leading-relaxed mt-3 max-w-2xl" style={{ color: 'var(--ink-muted)' }}>
            {t('howto_intro')}
          </p>
        </div>

        <ol className="relative space-y-6 pl-8" style={{ borderLeft: '2px solid var(--metal-edge)' }}>
          {STEPS.map(n => (
            <li
              key={n}
              className="relative"
              style={{ animation: `col-rise 420ms var(--ease-out) ${n * 50}ms both` }}
            >
              <span
                className="absolute -left-[41px] top-0 flex items-center justify-center rounded-full font-display text-xs font-bold"
                style={{
                  width: 28, height: 28,
                  background: 'var(--surface-stone)',
                  border: '1px solid var(--gold)',
                  color: 'var(--gold)',
                }}
              >
                {n}
              </span>
              <h2 className="font-display text-sm font-bold" style={{ color: 'var(--ink)' }}>
                {t(`howto_step${n}_title`)}
              </h2>
              <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--ink-muted)' }}>
                {t(`howto_step${n}_body`)}
              </p>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-3">
          <Link
            to={`/${prefix}`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            style={{ borderColor: 'var(--metal-edge)', color: 'var(--gold)' }}
          >
            {t('howto_cta_start')}
          </Link>
          <Link
            to={`/${prefix}about`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            style={{ borderColor: 'var(--metal-edge)', color: 'var(--ink-muted)' }}
          >
            {t('howto_cta_about')}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
