import { useTranslation } from 'react-i18next'
import { Modal } from '@/ui'
import { CHANGELOG, DOFUS_GAME_VERSION } from '@/data/changelog.ts'

export function ChangelogModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()

  return (
    <Modal open onClose={onClose} title={t('changelog_title')} size="md">
      {/* Dofus game version badge */}
      <div className="px-4 pt-3 pb-0 flex items-center gap-2">
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded"
          style={{
            background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
            border:     '1px solid color-mix(in srgb, var(--gold) 25%, transparent)',
            color:      'var(--gold)',
          }}
        >
          {t('dofus_data_version', { version: DOFUS_GAME_VERSION })}
        </span>
      </div>

      {/* Entries */}
      <div className="overflow-y-auto max-h-[30rem] px-4 py-4 space-y-5">
        {CHANGELOG.map(entry => (
          <div key={entry.version}>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-mono text-[13px] font-bold" style={{ color: 'var(--gold)' }}>
                v{entry.version}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                {entry.date}
              </span>
            </div>
            <ul className="space-y-1">
              {entry.notes.map((note, i) => (
                <li key={i} className="flex gap-2 text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                  <span style={{ color: 'var(--gold-deep)', flexShrink: 0 }}>·</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  )
}
