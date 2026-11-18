import type { ElementType } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { BookOpen, Columns2, Hammer, Redo2, Undo2 } from 'lucide-react'
import { useBuildStore } from '@/store/buildStore.ts'
import { useHistoryStore } from '@/store/historyStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { ShareBar } from '@/features/share/ShareBar.tsx'
import { DOFUS_GAME_VERSION } from '@/data/gameVersion.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'

export type WorkshopTool = 'characteristics' | 'passives' | 'spells' | 'pvp' | 'sets' | 'bonuses' | 'compare'

const TOOLS: WorkshopTool[] = ['characteristics', 'passives', 'spells', 'pvp', 'sets', 'bonuses', 'compare']

/** The workshop's heading: where the build lives, its name, class element and
 * level, that it is kept on this device, and the build-wide actions. */
export function WorkshopBar({ onForge, onCompare, compareActive, onPublish, publishLabel, PublishIcon }: {
  onForge: () => void
  onCompare: () => void
  compareActive: boolean
  onPublish: () => void
  publishLabel: string
  PublishIcon: ElementType
}) {
  const { t } = useTranslation()
  const selectedClass = useBuildStore(s => s.selectedClass)
  const buildName     = useBuildStore(s => s.buildName)
  const level         = useBuildStore(s => s.level)
  const linked        = useBuildStore(s => s.linkedBuildId !== null)
  const className     = useClassName(selectedClass)
  const element       = CLASS_DATA.find(c => c.id === selectedClass)?.element
  const canUndo = useHistoryStore(s => s.canUndo)
  const canRedo = useHistoryStore(s => s.canRedo)
  const undo    = useHistoryStore(s => s.undo)
  const redo    = useHistoryStore(s => s.redo)
  const loading = useDataStore(s => s.loading)
  const error   = useDataStore(s => s.error)

  return (
    <div className="workshop-bar">
      <div className="workshop-identity">
        <span className="workshop-breadcrumb">
          {t('workshop_my_workshop')} <span aria-hidden="true">/</span> {t(linked ? 'workshop_linked' : 'workshop_local')}
          {loading && <span className="workshop-loading" role="status" aria-live="polite">{t('loading_data')}</span>}
          {error && <span className="workshop-error" role="alert">{t('error_loading')}</span>}
        </span>
        <div className="workshop-title">
          {selectedClass ? (
            <h1>
              {buildName || className}
              {element && <><span aria-hidden="true"> · </span><span className="workshop-element">{t(`elem_${element}`)}</span></>}
            </h1>
          ) : (
            <h1>{t('workshop_heading_empty')}</h1>
          )}
          {selectedClass && <span className="workshop-level" title={t('level')}>{level}</span>}
        </div>
      </div>
      <div className="workshop-actions">
        <button type="button" className="site-icon" onClick={undo} disabled={!canUndo} aria-label={t('undo')} title={t('undo_title')}>
          <Undo2 size={18} />
        </button>
        <button type="button" className="site-icon" onClick={redo} disabled={!canRedo} aria-label={t('redo')} title={t('redo_title')}>
          <Redo2 size={18} />
        </button>
        <button type="button" className="workshop-forge" onClick={onForge} title={t('optimizer_open')}>
          <Hammer size={16} aria-hidden="true" />
          <span>{t('optimizer_title')}</span>
        </button>
        <button type="button" className="workshop-action" onClick={onCompare} aria-pressed={compareActive} title={t('compare_mode')}>
          <Columns2 size={16} aria-hidden="true" />
          <span>{t('compare')}</span>
        </button>
        <button type="button" className="workshop-action" onClick={onPublish} disabled={!selectedClass}
          title={t(linked ? 'publish_update_hint' : 'publish_open')}>
          <PublishIcon size={16} aria-hidden="true" />
          <span>{publishLabel}</span>
        </button>
        <ShareBar />
      </div>
    </div>
  )
}

/** Tool shortcuts under the heading; each one opens or reaches its tool. */
export function WorkshopTools({ onSelect, compareActive }: { onSelect: (tool: WorkshopTool) => void; compareActive: boolean }) {
  const { t } = useTranslation()
  return (
    <nav className="workshop-tools" aria-label={t('workshop_tools')}>
      {TOOLS.map(tool => (
        <button key={tool} type="button" onClick={() => onSelect(tool)}
          aria-pressed={tool === 'compare' ? compareActive : undefined}>
          {t(`tool_${tool}`)}
        </button>
      ))}
    </nav>
  )
}

/** Strip under the workshop panels: where the build is kept, the game data
 * version, news and help. */
export function WorkshopStatus({ onChangelog }: { onChangelog: () => void }) {
  const { t, i18n } = useTranslation()
  return (
    <div className="workshop-status">
      <span className="workshop-saved"><i aria-hidden="true" />{t('workshop_saved_device')}</span>
      <span>{t('workshop_game_data', { version: DOFUS_GAME_VERSION })}</span>
      <span className="workshop-status-end">
        <button type="button" onClick={onChangelog} title={t('open_changelog')}>
          {t('changelog_title')} <span className="workshop-version">v{__APP_VERSION__}</span>
        </button>
        <Link to={`/${langPathPrefix(i18n.language)}shortcuts`}>
          {t('workshop_help_shortcuts')} <BookOpen size={13} aria-hidden="true" />
        </Link>
      </span>
    </div>
  )
}
