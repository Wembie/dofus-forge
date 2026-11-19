import { useTranslation } from 'react-i18next'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { LegalPage } from '@/features/reading/LegalPage.tsx'

export function TermsPage() {
  const { t, i18n } = useTranslation()
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'terms', {
    title: t('terms_seo_title'),
    description: t('terms_seo_description'),
  })
  return <LegalPage kind="terms" />
}

export default TermsPage
