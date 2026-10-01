import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Volume2, VolumeX } from 'lucide-react'
import { isSoundEnabled, toggleSound, SOUND_EVENT_NAME } from '@/lib/sound.ts'

export function SoundToggle() {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(isSoundEnabled)

  useEffect(() => {
    const sync = () => setEnabled(isSoundEnabled())
    window.addEventListener(SOUND_EVENT_NAME, sync)
    return () => window.removeEventListener(SOUND_EVENT_NAME, sync)
  }, [])

  return (
    <button
      onClick={toggleSound}
      className="w-8 h-8 rounded-lg border border-metal-edge bg-surface-stone text-ink-muted hover:text-ink hover:border-gold-deep transition-colors flex items-center justify-center"
      aria-label={enabled ? t('sound_mute') : t('sound_unmute')}
      title={enabled ? t('sound_mute') : t('sound_unmute')}
    >
      {enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
    </button>
  )
}
