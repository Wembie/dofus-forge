import { useId } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { langPathPrefix } from '@/i18n/langPath.ts'
import type { LegalDoc } from './legal.ts'

const PAGE: Record<LegalDoc, string> = { terms: 'terms', privacy: 'privacy' }

/** One required checkbox per legal document. Each is its own consent: the
 * Terms are a contract, the Privacy Policy an authorization to process
 * personal data, and the law asks that the two are not bundled. */
export function LegalConsentChecks({ docs, checked, onChange }: {
  docs:     LegalDoc[]
  checked:  Partial<Record<LegalDoc, boolean>>
  onChange: (doc: LegalDoc, value: boolean) => void
}) {
  const { i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const id = useId()

  return (
    <fieldset className="space-y-2">
      {docs.map(doc => (
        <div key={doc} className="flex items-start gap-2">
          <input
            id={`${id}-${doc}`}
            type="checkbox"
            required
            checked={!!checked[doc]}
            onChange={e => onChange(doc, e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 cursor-pointer"
            style={{ accentColor: 'var(--gold)' }}
          />
          <label htmlFor={`${id}-${doc}`} className="text-[11px] leading-snug cursor-pointer" style={{ color: 'var(--ink-muted)' }}>
            <Trans
              i18nKey={`consent_${doc}_label`}
              components={{
                anchor: (
                  <a
                    href={`/${prefix}${PAGE[doc]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2"
                    style={{ color: 'var(--gold)' }}
                  />
                ),
              }}
            />
          </label>
        </div>
      ))}
    </fieldset>
  )
}
