import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'

export type PasswordInputProps = {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  leftIcon?: React.ReactNode
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
  required?: boolean
  minLength?: number
  id?: string
  describedBy?: string
}

/** Password field with a show/hide toggle — used anywhere a user types a
 * password (sign in/up, forgot/reset password, change password), so typos
 * in a field that normally hides its own content don't go unnoticed. */
export function PasswordInput({
  value, onChange, leftIcon, placeholder, autoComplete, autoFocus, required, minLength, id, describedBy,
}: PasswordInputProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      {leftIcon}
      <input
        id={id}
        aria-describedby={describedBy}
        type={visible ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full text-sm rounded-lg ${leftIcon ? 'pl-8' : 'pl-3'} pr-9 py-2 transition-colors focus:outline-none`}
        style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--metal-edge)')}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={t(visible ? 'auth_password_hide' : 'auth_password_show')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
        style={{ color: 'var(--ink-faint)' }}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}
