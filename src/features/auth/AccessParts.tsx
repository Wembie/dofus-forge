import { useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Eye, EyeOff, X } from 'lucide-react'
import { useBuildStore } from '@/store/buildStore.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { BRAND } from '@/data/brand.ts'
import { itemImageUrl } from '@/data/loaders.ts'
import { PASSWORD_MIN_LENGTH } from './authRules.ts'
import type { LegalDoc } from './legal.ts'
import './auth.css'

const PAGE: Record<LegalDoc, string> = { terms: 'terms', privacy: 'privacy' }
/** Crimson, Emerald and Turquoise Dofus icons, the story column's ornament. */
const DOFUS = ['/img/item/23001-128.png', '/img/item/23002-128.png', '/img/item/23003-128.png'].map(url => itemImageUrl(url) ?? url)

/** The access window: why an account helps on the left, the form on the right. */
export function AccessLayout({ onClose, children }: { onClose?: () => void; children: ReactNode }) {
  const { t } = useTranslation()
  const selectedClass = useBuildStore(s => s.selectedClass)
  const level = useBuildStore(s => s.level)
  const className = useClassName(selectedClass)
  return (
    <div className="access-scroll">
      {onClose && (
        <button type="button" className="access-close" onClick={onClose} aria-label={t('modal_close')}>
          <X size={18} aria-hidden="true" />
        </button>
      )}
      <div className="access-layout">
        <aside className="access-story">
          <div className="access-brand">
            <img src={BRAND.mark} alt="" />
            <span>DOFUS FORGE</span>
          </div>
          <div>
            <p className="access-eyebrow">{t('auth_eyebrow')}</p>
            <h3>{t('auth_story_title')}</h3>
            <p>{t('auth_story_body')}</p>
          </div>
          {selectedClass && (
            <div className="access-build">
              <span className="access-dot" />
              <div>
                <b>{t('auth_context')}</b>
                <span>{className} · {level}</span>
              </div>
            </div>
          )}
          <div className="access-dofus" aria-hidden="true">
            {DOFUS.map(src => <img key={src} src={src} alt="" loading="lazy" />)}
          </div>
        </aside>
        <section className="access-main" aria-label={t('auth_eyebrow')}>{children}</section>
      </div>
    </div>
  )
}

/** Password field with show/hide, and an optional hint below. */
export function AccessPassword({ id, label, value, onChange, hint, autoComplete = 'new-password', autoFocus }: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  autoComplete?: string
  autoFocus?: boolean
}) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  return (
    <div className="access-field">
      <label htmlFor={id}>{label}</label>
      <div className="access-password">
        <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete}
          autoFocus={autoFocus} required minLength={PASSWORD_MIN_LENGTH} aria-describedby={hint ? `${id}-hint` : undefined} />
        <button type="button" aria-label={t(visible ? 'auth_password_hide' : 'auth_password_show')} aria-pressed={visible} onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  )
}

/** One required checkbox per legal document, each linking to its page (a separate
 * consent each: the Terms are a contract, the Privacy Policy an authorization). */
export function AccessLegalChecks({ docs, accepted, onChange }: {
  docs: LegalDoc[]
  accepted: Partial<Record<LegalDoc, boolean>>
  onChange: (doc: LegalDoc, value: boolean) => void
}) {
  const { i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  return (
    <fieldset className="access-consent">
      {docs.map(doc => (
        <label key={doc}>
          <input type="checkbox" required checked={!!accepted[doc]} onChange={e => onChange(doc, e.target.checked)} />
          <span>
            <Trans i18nKey={`consent_${doc}_label`} components={{ anchor: <a href={`/${prefix}${PAGE[doc]}`} target="_blank" rel="noopener noreferrer" /> }} />
          </span>
        </label>
      ))}
    </fieldset>
  )
}
