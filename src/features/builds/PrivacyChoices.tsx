import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Link2, Lock } from 'lucide-react'
import type { BuildVisibility } from './api.ts'
import './privacy.css'

const ICONS = { private: Lock, unlisted: Link2, public: Globe }

/** Who can see a build (private, link only, public) or a collection (private, public), each with what it means. */
export function PrivacyChoices({ value, onChange, collection = false, disabled = false }: {
  value: BuildVisibility
  onChange: (value: BuildVisibility) => void
  collection?: boolean
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const id = useId()
  const options: BuildVisibility[] = collection ? ['private', 'public'] : ['private', 'unlisted', 'public']
  return (
    <fieldset className="library-privacy-choices" disabled={disabled}>
      <legend>{t('publish_visibility_label')}</legend>
      {options.map(v => {
        const Icon = ICONS[v]
        return (
          <label key={v} className={value === v ? 'is-selected' : ''}>
            <input type="radio" name={id} value={v} checked={value === v} onChange={() => onChange(v)} />
            <Icon size={19} aria-hidden="true" />
            <span>
              <b>{t(collection ? (v === 'public' ? 'collections_public' : 'collections_private') : `publish_visibility_${v}`)}</b>
              <small>{t(collection ? (v === 'public' ? 'lib_public_collection_hint' : 'lib_private_collection_hint') : `publish_visibility_${v}_hint`)}</small>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
