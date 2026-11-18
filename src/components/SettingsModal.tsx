import { useEffect, useState, type ElementType, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, Moon, SunMedium, Volume2, VolumeX, MousePointer2, Sparkles, PanelLeft, PanelRight, PersonStanding } from 'lucide-react'
import { Modal } from '@/ui'
import { LANGUAGES, useLanguageChange } from '@/ui/LanguageSwitcher.tsx'
import { getCurrentTheme, toggleTheme, THEME_EVENT_NAME } from '@/ui/ThemeToggle.tsx'
import { isSoundEnabled, toggleSound, SOUND_EVENT_NAME } from '@/lib/sound.ts'
import {
  isCursorEnabled, setCursorEnabled,
  isParticlesEnabled, setParticlesEnabled,
  getCharacterMode, setCharacterMode, type CharacterMode,
  MOTION_SETTINGS_EVENT,
} from '@/lib/motionSettings.ts'
import { getSidebarSide, setSidebarSide, LAYOUT_SETTINGS_EVENT, type SidebarSide } from '@/lib/layoutSettings.ts'

function Row({ Icon, title, hint, children }: { Icon: ElementType; title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="site-setting">
      <Icon size={18} aria-hidden="true" />
      <span>
        <b>{title}</b>
        {hint && <small>{hint}</small>}
      </span>
      {children}
    </div>
  )
}

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="site-switch" onClick={onToggle}>
      <i />
    </button>
  )
}

function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T
  options: { id: T; label: string; Icon?: ElementType }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="site-segmented" role="radiogroup" aria-label={label}>
      {options.map(({ id, label: text, Icon }) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} onClick={() => onChange(id)}>
          {Icon && <Icon size={15} aria-hidden="true" />}
          {text}
        </button>
      ))}
    </div>
  )
}

/** Preferences, saved on this device: language, theme, sound, cursor,
 * particles, 2D/3D character and the side of the stats sheet. */
export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const [lang, changeLanguage] = useLanguageChange()
  const [theme, setTheme]         = useState(getCurrentTheme)
  const [sound, setSound]         = useState(isSoundEnabled)
  const [cursor, setCursor]       = useState(isCursorEnabled)
  const [particles, setParticles] = useState(isParticlesEnabled)
  const [characterMode, setCharacterModeState] = useState(getCharacterMode)
  const [sidebarSide, setSidebarSideState] = useState(getSidebarSide)

  useEffect(() => {
    const syncTheme  = () => setTheme(getCurrentTheme())
    const syncSound  = () => setSound(isSoundEnabled())
    const syncMotion = () => { setCursor(isCursorEnabled()); setParticles(isParticlesEnabled()); setCharacterModeState(getCharacterMode()) }
    const syncLayout = () => setSidebarSideState(getSidebarSide())
    window.addEventListener(THEME_EVENT_NAME, syncTheme)
    window.addEventListener(SOUND_EVENT_NAME, syncSound)
    window.addEventListener(MOTION_SETTINGS_EVENT, syncMotion)
    window.addEventListener(LAYOUT_SETTINGS_EVENT, syncLayout)
    return () => {
      window.removeEventListener(THEME_EVENT_NAME, syncTheme)
      window.removeEventListener(SOUND_EVENT_NAME, syncSound)
      window.removeEventListener(MOTION_SETTINGS_EVENT, syncMotion)
      window.removeEventListener(LAYOUT_SETTINGS_EVENT, syncLayout)
    }
  }, [])

  return (
    <Modal open={open} onClose={onClose} title={t('settings_title')} size="md">
      <div className="site-settings">
        <h3>{t('settings_group_general')}</h3>
        <Row Icon={Languages} title={t('settings_language')}>
          <select aria-label={t('settings_language')} value={lang} onChange={e => changeLanguage(e.target.value)}>
            {LANGUAGES.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
          </select>
        </Row>
        <Row Icon={theme === 'dark' ? Moon : SunMedium} title={t('settings_theme')} hint={t(theme === 'dark' ? 'theme_label_dark' : 'theme_label_light')}>
          <Segmented
            label={t('settings_theme')}
            value={theme}
            onChange={next => { if (next !== theme) toggleTheme() }}
            options={[
              { id: 'dark', label: t('theme_dark'), Icon: Moon },
              { id: 'light', label: t('theme_light'), Icon: SunMedium },
            ]}
          />
        </Row>
        <Row Icon={sound ? Volume2 : VolumeX} title={t('settings_sound')} hint={t(sound ? 'sound_on' : 'sound_off')}>
          <Switch on={sound} onToggle={toggleSound} label={t('settings_sound')} />
        </Row>

        <h3>{t('settings_group_motion')}</h3>
        <Row Icon={MousePointer2} title={t('settings_cursor')} hint={t('settings_cursor_hint')}>
          <Switch on={cursor} onToggle={() => setCursorEnabled(!cursor)} label={t('settings_cursor')} />
        </Row>
        <Row Icon={Sparkles} title={t('settings_particles')} hint={t('settings_particles_hint')}>
          <Switch on={particles} onToggle={() => setParticlesEnabled(!particles)} label={t('settings_particles')} />
        </Row>
        <Row Icon={PersonStanding} title={t('settings_character')} hint={t('settings_character_hint')}>
          <Segmented<CharacterMode>
            label={t('settings_character')}
            value={characterMode}
            onChange={setCharacterMode}
            options={[{ id: '3d', label: '3D' }, { id: '2d', label: '2D' }]}
          />
        </Row>

        <h3>{t('settings_group_layout')}</h3>
        <Row Icon={sidebarSide === 'left' ? PanelLeft : PanelRight} title={t('settings_sidebar_side')} hint={t('settings_sidebar_side_hint')}>
          <Segmented<SidebarSide>
            label={t('settings_sidebar_side')}
            value={sidebarSide}
            onChange={setSidebarSide}
            options={[
              { id: 'left', label: t('sidebar_side_left'), Icon: PanelLeft },
              { id: 'right', label: t('sidebar_side_right'), Icon: PanelRight },
            ]}
          />
        </Row>
        <p className="site-muted">{t('settings_saved_hint')}</p>
      </div>
    </Modal>
  )
}
