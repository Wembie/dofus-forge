import { useTranslation } from 'react-i18next'

/** A crisp, correctly proportioned Colombian flag. */
export function ColombianMark() {
  const { t } = useTranslation()

  return (
    <svg width="32" height="16" viewBox="0 0 32 16" aria-hidden="true" className="flex-shrink-0">
      <title>{t('colombia_hover')}</title>
      <rect width="32" height="8" fill="#FCD116" />
      <rect y="8" width="32" height="4" fill="#003893" />
      <rect y="12" width="32" height="4" fill="#CE1126" />
      <rect x="0.5" y="0.5" width="31" height="15" rx="1" fill="none" stroke="rgba(255,255,255,.28)" />
    </svg>
  )
}
