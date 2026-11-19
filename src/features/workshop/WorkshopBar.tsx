import { useEffect, useRef, useState, type ElementType } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { BarChart3, BookOpen, Columns2, Hammer, Redo2, Share2, Swords, Undo2 } from 'lucide-react'
import { useBuildStore } from '@/store/buildStore.ts'
import { BUILD_NAME_MAX } from '@/features/builds/defaultName.ts'
import { useHistoryStore } from '@/store/historyStore.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { DOFUS_GAME_VERSION } from '@/data/gameVersion.ts'
import { Modal } from '@/ui'
import { langPathPrefix } from '@/i18n/langPath.ts'

export type WorkshopTool = 'characteristics' | 'passives' | 'spells' | 'pvp' | 'sets' | 'bonuses' | 'compare' | 'share'

const TOOLS: WorkshopTool[] = ['characteristics', 'passives', 'spells', 'pvp', 'sets', 'bonuses', 'compare', 'share']

/** The workshop's heading: where the build lives, its name, class element and
 * level, that it is kept on this device, and the build-wide actions. */
export function WorkshopBar({ onForge, onCompare, compareActive, onPublish, publishLabel, PublishIcon, onIdentity, onShare }: {
  onForge: () => void
  onCompare: () => void
  compareActive: boolean
  onPublish: () => void
  publishLabel: string
  PublishIcon: ElementType
  onIdentity: () => void
  onShare: () => void
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
          {selectedClass && <button type="button" className="workshop-level" onClick={onIdentity} aria-label={t('identity_edit', { level })} title={t('tool_identity')}>{level}</button>}
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
        <button type="button" className="workshop-action" onClick={onShare} disabled={!selectedClass} title={t('copy_url_title')}>
          <Share2 size={16} aria-hidden="true" />
          <span>{t('share')}</span>
        </button>
      </div>
    </div>
  )
}

/** Tool shortcuts under the heading; each one opens or reaches its tool. */
export function WorkshopTools({ onSelect, compareActive }: { onSelect: (tool: WorkshopTool) => void; compareActive: boolean }) {
  const { t } = useTranslation()
  const pointsLeft = useBuildStore(s => (s.selectedClass && s.stats ? s.stats.pointsBudget - s.stats.pointsSpent : 0))
  return (
    <nav className="workshop-tools" aria-label={t('workshop_tools')}>
      {TOOLS.map(tool => (
        <button key={tool} type="button" onClick={() => onSelect(tool)}
          aria-pressed={tool === 'compare' ? compareActive : undefined}>
          {t(`tool_${tool}`)}
          {tool === 'characteristics' && pointsLeft > 0 && (
            <span className="workshop-tool-badge" title={t('stats_points_left', { count: pointsLeft, n: pointsLeft })}>{pointsLeft}</span>
          )}
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

/** Build name and level, opened from the level in the heading. */
export function WorkshopIdentity({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const buildName    = useBuildStore(s => s.buildName)
  const setBuildName = useBuildStore(s => s.setBuildName)
  const level        = useBuildStore(s => s.level)
  const setLevel     = useBuildStore(s => s.setLevel)
  // Buffered while typing so clearing the field to type "20" does not snap
  // to the clamped "1"; committed (and clamped to 1–200) on blur or Enter.
  const [draft, setDraft] = useState(String(level))
  const focused = useRef(false)
  useEffect(() => { if (!focused.current) setDraft(String(level)) }, [level])
  const commit = () => {
    focused.current = false
    const n = parseInt(draft, 10)
    if (Number.isFinite(n)) { setLevel(n); setDraft(String(Math.max(1, Math.min(200, n)))) }
    else setDraft(String(level))
  }
  return (
    <Modal open={open} onClose={onClose} title={t('tool_identity')} size="sm">
      <form className="workshop-identity-form" onSubmit={e => { e.preventDefault(); commit(); onClose() }}>
        <label>
          {t('build_name_label')}
          <input value={buildName} maxLength={BUILD_NAME_MAX} placeholder={t('build_name_placeholder')} onChange={e => setBuildName(e.target.value)} />
        </label>
        <label>
          {t('level')}
          <span className="workshop-level-input">
            <button type="button" onClick={() => setLevel(level - 1)} disabled={level <= 1} aria-label={t('level_decrease')}>−</button>
            <input type="text" inputMode="numeric" value={draft}
              onFocus={() => { focused.current = true }}
              onChange={e => { if (/^\d{0,3}$/.test(e.target.value)) setDraft(e.target.value) }}
              onBlur={commit} />
            <button type="button" onClick={() => setLevel(level + 1)} disabled={level >= 200} aria-label={t('level_increase')}>+</button>
          </span>
        </label>
        <p>{t('identity_level_hint')}</p>
        <button type="submit" className="site-primary">{t('identity_done')}</button>
      </form>
    </Modal>
  )
}

export type WorkshopView = 'equipment' | 'stats'

/** Mobile bottom bar: The Forger, the two views, compare, publish. */
export function WorkshopMobileNav({ view, onView, onForge, onCompare, compareActive, onPublish, publishLabel, PublishIcon, canPublish }: {
  view: WorkshopView
  onView: (view: WorkshopView) => void
  onForge: () => void
  onCompare: () => void
  compareActive: boolean
  onPublish: () => void
  publishLabel: string
  PublishIcon: ElementType
  canPublish: boolean
}) {
  const { t } = useTranslation()
  return (
    <nav className="workshop-mobile-nav" aria-label={t('workshop_views')}>
      <button type="button" className="is-forge" onClick={onForge}>
        <Hammer size={20} aria-hidden="true" />
        {t('workshop_forge_short')}
      </button>
      <button type="button" aria-current={view === 'equipment' ? 'page' : undefined} onClick={() => onView('equipment')}>
        <Swords size={20} aria-hidden="true" />
        {t('equipment')}
      </button>
      <button type="button" aria-current={view === 'stats' ? 'page' : undefined} onClick={() => onView('stats')}>
        <BarChart3 size={20} aria-hidden="true" />
        {t('stats')}
      </button>
      <button type="button" aria-pressed={compareActive} onClick={onCompare}>
        <Columns2 size={20} aria-hidden="true" />
        {t('compare')}
      </button>
      <button type="button" onClick={onPublish} disabled={!canPublish}>
        <PublishIcon size={20} aria-hidden="true" />
        {publishLabel}
      </button>
    </nav>
  )
}
