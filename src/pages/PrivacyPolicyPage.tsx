import { useTranslation } from 'react-i18next'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { LegalPage } from '@/features/reading/LegalPage.tsx'

export function PrivacyPolicyPage() {
  const { t, i18n } = useTranslation()
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'privacy', {
    title: t('privacy_seo_title'),
    description: t('privacy_seo_description'),
  })
  return <LegalPage kind="privacy" />
}

export default PrivacyPolicyPage
