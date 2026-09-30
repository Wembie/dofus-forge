import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { useAuthStore } from '@/store/authStore.ts'
import { encodeBuild, decodeBuild } from './codec.ts'
import { saveBuild, listBuilds, deleteBuild, type SavedBuild } from './savedBuilds.ts'
import { fetchMyBuilds, deleteBuild as deleteCloudBuild, type MyBuildRow } from '@/features/builds/api.ts'
import type { ExportData } from './ExportCard.tsx'
import { useClassName } from '@/features/class-picker/useClassName.ts'

export function ShareBar() {
  const { t, i18n } = useTranslation()
  const store       = useBuildStore()
  const stats       = useBuildStore(s => s.stats)
  const equipment   = useBuildStore(s => s._equipment)
  const classLabel  = useClassName(store.selectedClass)
  const [copied,    setCopied]    = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saveName,  setSaveName]  = useState('')
  const [builds,    setBuilds]    = useState<SavedBuild[]>(listBuilds)
  const [showPanel, setShowPanel] = useState(false)
  const session        = useAuthStore(s => s.session)
  const [cloudBuilds, setCloudBuilds] = useState<MyBuildRow[]>([])
  const [loadingCloud, setLoadingCloud] = useState(false)

  const hasClass = Boolean(store.selectedClass)

  useEffect(() => {
    if (!showPanel || !session) return
    setLoadingCloud(true)
    fetchMyBuilds(session.user.id).then(({ data }) => {
      setCloudBuilds(data)
      setLoadingCloud(false)
    })
  }, [showPanel, session])

  const handleLoadCloud = useCallback((snap: MyBuildRow['snapshot']) => {
    store.applySnapshot(snap)
    setShowPanel(false)
  }, [store])

  const handleDeleteCloud = useCallback(async (id: string) => {
    await deleteCloudBuild(id)
    setCloudBuilds(prev => prev.filter(b => b.id !== id))
  }, [])

  const shareUrl = useCallback(() => {
    if (!hasClass) return ''
    const encoded  = encodeBuild(store)
    const lang     = i18n.language.slice(0, 2)
    const langPath = lang === 'en' ? '' : `${lang}/`
    return `${location.origin}${import.meta.env.BASE_URL}${langPath}?b=${encoded}`
  }, [store, hasClass, i18n.language])

  const handleCopy = useCallback(async () => {
    const url = shareUrl()
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareUrl])

  const handleSave = useCallback(() => {
    if (!hasClass) return
    const encoded = encodeBuild(store)
    saveBuild(saveName, encoded)
    setSaveName('')
    setBuilds(listBuilds())
  }, [store, hasClass, saveName])

  const handleDelete = useCallback((id: string) => {
    deleteBuild(id)
    setBuilds(listBuilds())
  }, [])

  const handleLoad = useCallback((encoded: string) => {
    const snap = decodeBuild(encoded)
    if (snap) store.applySnapshot(snap)
    setShowPanel(false)
  }, [store])

  const handleExport = useCallback(async () => {
    if (!store.selectedClass || !stats) return
    setExporting(true)
    try {
      // Dynamic import: ExportCard + html-to-image (~20 KB) are only
      // needed when the user actually clicks export, not on every load.
      const { triggerExport } = await import('./ExportCard.tsx')
      const equipMap = new Map(equipment.map(it => [it.ankama_id, it.name]))
      const equippedNames = Object.fromEntries(
        Object.entries(store.equipped).map(([slot, id]) => [slot, equipMap.get(id as number) ?? ''])
      ) as ExportData['equipped']
      await triggerExport({
        classLabel: classLabel || store.selectedClass,
        classSlug:  store.selectedClass,
        level:      store.level,
        gender:     store.gender,
        equipped:   equippedNames,
        stats,
      })
    } finally {
      setExporting(false)
    }
  }, [store, stats, equipment, classLabel])

  return (
    <div className="flex items-center gap-2">
      {/* Export as image */}
      <button
        onClick={handleExport}
        disabled={!hasClass || !stats || exporting}
        title={t('export_btn_title')}
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-metal-edge bg-surface-stone text-ink-muted hover:text-ink hover:border-gold-deep disabled:opacity-30 text-xs transition-colors"
      >
        <span>{exporting ? '⏳' : '🖼'}</span>
        <span className="hidden sm:inline">{exporting ? t('exporting') : t('export_btn')}</span>
      </button>

      {/* Copy URL */}
      <button
        onClick={handleCopy}
        disabled={!hasClass}
        title={t('copy_url_title')}
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-metal-edge bg-surface-stone text-ink-muted hover:text-ink hover:border-gold-deep disabled:opacity-30 text-xs transition-colors"
      >
        <span>{copied ? '✓' : '🔗'}</span>
        <span className="hidden sm:inline">{copied ? t('copied') : t('share')}</span>
      </button>

      {/* My Builds */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-metal-edge bg-surface-stone text-ink-muted hover:text-ink hover:border-gold-deep text-xs transition-colors"
      >
        <span>📋</span>
        <span className="hidden sm:inline">{t('my_builds')}</span>
        {builds.length > 0 && <span className="text-forge-gold">({builds.length})</span>}
      </button>

      {/* Builds panel */}
      {showPanel && (
        <div className="absolute right-4 top-14 z-50 w-80 bg-forge-card border border-forge-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between p-3 border-b border-forge-border">
            <span className="font-display text-forge-gold text-sm">{t('my_builds')}</span>
            <button onClick={() => setShowPanel(false)} className="text-forge-muted hover:text-forge-text text-lg leading-none">×</button>
          </div>

          {/* Save current */}
          {hasClass && (
            <div className="p-3 border-b border-forge-border flex gap-2">
              <input
                type="text"
                placeholder={t('build_name_placeholder')}
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                className="flex-1 bg-surface-stone border border-metal-edge rounded px-2 py-1 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-gold"
              />
              <button
                onClick={handleSave}
                className="px-3 py-1 rounded bg-forge-gold text-forge-bg text-xs font-semibold hover:bg-forge-gold-light transition-colors"
              >{t('save')}</button>
            </div>
          )}

          {/* List */}
          <ul className="max-h-64 overflow-y-auto divide-y divide-metal-edge">
            {builds.length === 0 && (
              <li className="p-4 text-center text-forge-muted text-xs">{t('no_saved_builds')}</li>
            )}
            {builds.map(b => (
              <li key={b.id} className="flex items-center gap-2 p-2.5 hover:bg-surface-stone transition-colors">
                <button
                  className="flex-1 text-left text-xs text-forge-text truncate hover:text-forge-gold transition-colors"
                  onClick={() => handleLoad(b.encoded)}
                  title={t('load_build_title')}
                >
                  {b.name}
                </button>
                <span className="text-[10px] text-ink-faint flex-shrink-0">
                  {new Date(b.savedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="text-forge-muted hover:text-red-400 transition-colors text-xs flex-shrink-0"
                  aria-label={t('delete_build', { name: b.name })}
                >🗑</button>
              </li>
            ))}
          </ul>

          {/* Cloud builds — only when signed in */}
          {session && (
            <>
              <div className="px-3 py-2 border-t border-forge-border text-[10px] uppercase tracking-wider text-ink-faint">
                {t('my_builds_cloud')}
              </div>
              <ul className="max-h-64 overflow-y-auto divide-y divide-metal-edge">
                {loadingCloud && (
                  <li className="p-4 text-center text-forge-muted text-xs">{t('auth_loading')}</li>
                )}
                {!loadingCloud && cloudBuilds.length === 0 && (
                  <li className="p-4 text-center text-forge-muted text-xs">{t('no_saved_builds')}</li>
                )}
                {cloudBuilds.map(b => (
                  <li key={b.id} className="flex items-center gap-2 p-2.5 hover:bg-surface-stone transition-colors">
                    <button
                      className="flex-1 text-left text-xs text-forge-text truncate hover:text-forge-gold transition-colors"
                      onClick={() => handleLoadCloud(b.snapshot)}
                      title={t('load_build_title')}
                    >
                      {b.name}
                    </button>
                    <span
                      className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ color: 'var(--ink-faint)', background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
                    >
                      {t(`publish_visibility_${b.visibility}`)}
                    </span>
                    <button
                      onClick={() => handleDeleteCloud(b.id)}
                      className="text-forge-muted hover:text-red-400 transition-colors text-xs flex-shrink-0"
                      aria-label={t('delete_build', { name: b.name })}
                    >🗑</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
