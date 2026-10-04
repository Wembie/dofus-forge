import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, Moon, SunMedium, Volume2, VolumeX, MousePointer2, Sparkles, PanelLeft, PanelRight } from 'lucide-react'
import { Modal } from '@/ui'
import { LanguageSwitcher } from '@/ui/LanguageSwitcher.tsx'
import { getCurrentTheme, toggleTheme, THEME_EVENT_NAME } from '@/ui/ThemeToggle.tsx'
import { isSoundEnabled, toggleSound, SOUND_EVENT_NAME } from '@/lib/sound.ts'
import {
  isCursorEnabled, setCursorEnabled,
  isParticlesEnabled, setParticlesEnabled,
  MOTION_SETTINGS_EVENT,
} from '@/lib/motionSettings.ts'
import { getSidebarSide, setSidebarSide, LAYOUT_SETTINGS_EVENT, type SidebarSide } from '@/lib/layoutSettings.ts'

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className="relative flex-shrink-0 rounded-full transition-colors"
      style={{
        width: 40, height: 22,
        background: on ? 'var(--gold)' : 'var(--surface-void)',
        border: `1px solid ${on ? 'var(--gold-deep)' : 'var(--metal-edge)'}`,
      }}
    >
      <span
        className="absolute rounded-full transition-transform"
        style={{
          top: 2, left: 2, width: 16, height: 16,
          background: on ? 'var(--ink-invert)' : 'var(--ink-faint)',
          transform: on ? 'translateX(18px)' : 'translateX(0)',
        }}
      />
    </button>
  )
}

function SideToggle({ side, onChange }: { side: SidebarSide; onChange: (side: SidebarSide) => void }) {
  const { t } = useTranslation()
  const options: { id: SidebarSide; label: string; Icon: React.ElementType }[] = [
    { id: 'left',  label: t('sidebar_side_left'),  Icon: PanelLeft },
    { id: 'right', label: t('sidebar_side_right'), Icon: PanelRight },
  ]
  return (
    <div className="flex gap-1 flex-shrink-0">
      {options.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          aria-pressed={side === id}
          title={label}
          className="flex items-center justify-center rounded-md border transition-colors"
          style={{
            width: 30, height: 30,
            background: side === id ? 'color-mix(in srgb, var(--gold) 15%, transparent)' : 'var(--surface-void)',
            borderColor: side === id ? 'var(--gold-deep)' : 'var(--metal-edge)',
            color: side === id ? 'var(--gold)' : 'var(--ink-faint)',
          }}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  )
}

function SettingRow({ Icon, title, hint, children }: { Icon: React.ElementType; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--metal-edge)' }}>
      <div
        className="flex items-center justify-center flex-shrink-0 rounded-lg"
        style={{ width: 32, height: 32, background: 'var(--surface-void)', border: '1px solid var(--metal-edge)', color: 'var(--gold)' }}
      >
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{title}</p>
        {hint && <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{hint}</p>}
      </div>
      {children}
    </div>
  )
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const [theme, setTheme]         = useState(getCurrentTheme)
  const [sound, setSound]         = useState(isSoundEnabled)
  const [cursor, setCursor]       = useState(isCursorEnabled)
  const [particles, setParticles] = useState(isParticlesEnabled)
  const [sidebarSide, setSidebarSideState] = useState(getSidebarSide)

  useEffect(() => {
    const syncTheme     = () => setTheme(getCurrentTheme())
    const syncSound     = () => setSound(isSoundEnabled())
    const syncMotion    = () => { setCursor(isCursorEnabled()); setParticles(isParticlesEnabled()) }
    const syncLayout    = () => setSidebarSideState(getSidebarSide())
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
    <Modal open={open} onClose={onClose} title={t('settings_title')} size="sm">
      <div className="p-4">
        <SettingRow Icon={Languages} title={t('settings_language')}>
          <LanguageSwitcher />
        </SettingRow>

        <SettingRow
          Icon={theme === 'dark' ? Moon : SunMedium}
          title={t('settings_theme')}
          hint={theme === 'dark' ? t('theme_label_dark') : t('theme_label_light')}
        >
          <Switch on={theme === 'light'} onToggle={toggleTheme} label={t('settings_theme')} />
        </SettingRow>

        <SettingRow
          Icon={sound ? Volume2 : VolumeX}
          title={t('settings_sound')}
          hint={sound ? t('sound_unmute') : t('sound_mute')}
        >
          <Switch on={sound} onToggle={toggleSound} label={t('settings_sound')} />
        </SettingRow>

        <SettingRow Icon={MousePointer2} title={t('settings_cursor')} hint={t('settings_cursor_hint')}>
          <Switch on={cursor} onToggle={() => setCursorEnabled(!cursor)} label={t('settings_cursor')} />
        </SettingRow>

        <SettingRow Icon={Sparkles} title={t('settings_particles')} hint={t('settings_particles_hint')}>
          <Switch on={particles} onToggle={() => setParticlesEnabled(!particles)} label={t('settings_particles')} />
        </SettingRow>

        <SettingRow
          Icon={sidebarSide === 'left' ? PanelLeft : PanelRight}
          title={t('settings_sidebar_side')}
          hint={t('settings_sidebar_side_hint')}
        >
          <SideToggle side={sidebarSide} onChange={setSidebarSide} />
        </SettingRow>
      </div>
    </Modal>
  )
}
