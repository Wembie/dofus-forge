import { useTranslation } from 'react-i18next'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'

const SECTIONS = [1, 2, 3, 4, 5, 6, 7] as const

export function PrivacyPolicyPage() {
  const { t, i18n } = useTranslation()
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'privacy', {
    title: t('privacy_seo_title'),
    description: t('privacy_seo_description'),
  })

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--gold)' }}>
            {t('privacy_title')}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>{t('privacy_updated')}</p>
          <p className="text-sm leading-relaxed mt-3 max-w-2xl" style={{ color: 'var(--ink-muted)' }}>
            {t('privacy_intro')}
          </p>
        </div>

        <div className="space-y-5">
          {SECTIONS.map(n => (
            <div key={n}>
              <h2 className="font-display text-sm font-bold" style={{ color: 'var(--ink)' }}>
                {t(`privacy_s${n}_title`)}
              </h2>
              <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--ink-muted)' }}>
                {t(`privacy_s${n}_body`)}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs leading-relaxed pt-2" style={{ color: 'var(--ink-muted)', borderTop: '1px solid var(--metal-edge)' }}>
          {t('privacy_contact')}
        </p>
      </main>

      <SiteFooter />
    </div>
  )
}
