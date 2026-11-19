import { useTranslation } from 'react-i18next'
import { LegalBody } from '@/components/LegalBody.tsx'
import { LEGAL_VERSIONS, type LegalDoc } from '@/features/auth/legal.ts'
import { Reading } from './Reading.tsx'

const COUNT = { privacy: 12, terms: 15 } as const

/** The document's version date, written out in the page's language. */
function effectiveDate(kind: LegalDoc, lang: string) {
  return new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${LEGAL_VERSIONS[kind]}T00:00:00Z`))
}

/** Privacy policy or terms: numbered sections with their contents list. */
export function LegalPage({ kind }: { kind: LegalDoc }) {
  const { t, i18n } = useTranslation()
  const sections = Array.from({ length: COUNT[kind] }, (_, i) => `s${i + 1}`)
  return (
    <Reading
      className="rd-legal"
      kicker={t('reading_kicker_legal')}
      title={t(`${kind}_title`)}
      intro={<><p className="rd-effective">{t('legal_effective', { date: effectiveDate(kind, i18n.language) })}</p><p>{t(`${kind}_intro`)}</p></>}
      toc={sections.map(id => ({ id, label: t(`${kind}_${id}_title`) }))}
    >
      {sections.map((id, i) => (
        <section key={id} id={id} className="rd-legal-section">
          <h2>
            <span>{String(i + 1).padStart(2, '0')}</span>
            {t(`${kind}_${id}_title`)}
          </h2>
          <LegalBody text={t(`${kind}_${id}_body`)} />
        </section>
      ))}
      <p className="rd-legal-contact">{t(`${kind}_contact`)}</p>
    </Reading>
  )
}
