import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/ui'
import { CHANGELOG, DOFUS_GAME_VERSION } from '@/data/changelog.ts'
import './changelog.css'

const FIRST = 12
const MORE = 24

/** What's new: the game data version, then every release, newest first. */
export function ChangelogModal({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const [shown, setShown] = useState(FIRST)
  const day = useMemo(() => new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }), [i18n.language])

  return (
    <Modal open onClose={onClose} title={t('changelog_title')} size="3xl">
      <div className="notes">
        <p className="notes-data">
          {t('changelog_game_data')} <strong>{DOFUS_GAME_VERSION}</strong>
          <span>{t('changelog_versions', { count: CHANGELOG.length })}</span>
        </p>
        <ol>
          {CHANGELOG.slice(0, shown).map((entry, i) => (
            <li key={entry.version}>
              <div>
                <strong>{entry.version}</strong>
                <time dateTime={entry.date}>{day.format(new Date(`${entry.date}T00:00:00Z`))}</time>
                {i === 0 && <em>{t('changelog_current')}</em>}
              </div>
              <section>
                {entry.title && <h3 className="notes-headline">{entry.title}</h3>}
                <ul>
                  {entry.notes.map((note, n) => <li key={n}>{note}</li>)}
                </ul>
              </section>
            </li>
          ))}
        </ol>
        {shown < CHANGELOG.length && (
          <button type="button" onClick={() => setShown(shown + MORE)}>{t('changelog_older')}</button>
        )}
      </div>
    </Modal>
  )
}
