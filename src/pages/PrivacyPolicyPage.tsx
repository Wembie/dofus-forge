import { useTranslation } from 'react-i18next'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { LegalBody } from '@/components/LegalBody.tsx'

const SECTIONS = Array.from({ length: 12 }, (_, i) => i + 1)

export function PrivacyPolicyPage() {
  const { t, i18n } = useTranslation()
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'privacy', {
    title: t('privacy_seo_title'),
    description: t('privacy_seo_description'),
  })

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />

      <main id="main-content" className="flex-1 max-w-3xl w-full mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--gold)' }}>
            {t('privacy_title')}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>{t('legal_effective')}</p>
          <p className="text-sm leading-relaxed mt-3 max-w-2xl" style={{ color: 'var(--ink-muted)' }}>
            {t('privacy_intro')}
          </p>
        </div>

        <div className="space-y-5">
          {SECTIONS.map(n => (
            <section key={n} id={`s${n}`} className="scroll-mt-20">
              <h2 className="font-display text-sm font-bold" style={{ color: 'var(--ink)' }}>
                {t(`privacy_s${n}_title`)}
              </h2>
              <LegalBody text={t(`privacy_s${n}_body`)} />
            </section>
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

export default PrivacyPolicyPage
