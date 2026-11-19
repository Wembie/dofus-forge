import { useTranslation } from 'react-i18next'
import { LegalBody } from '@/components/LegalBody.tsx'
import { Reading } from './Reading.tsx'

const COUNT = { privacy: 12, terms: 15 } as const

/** Privacy policy or terms: numbered sections with their contents list. */
export function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const { t } = useTranslation()
  const sections = Array.from({ length: COUNT[kind] }, (_, i) => `s${i + 1}`)
  return (
    <Reading
      className="rd-legal"
      kicker={t('reading_kicker_legal')}
      title={t(`${kind}_title`)}
      intro={<><p className="rd-effective">{t('legal_effective')}</p><p>{t(`${kind}_intro`)}</p></>}
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
