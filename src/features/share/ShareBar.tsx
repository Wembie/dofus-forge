import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { encodeBuild, decodeBuild } from './codec.ts'
import { saveBuild, listBuilds, deleteBuild, type SavedBuild } from './savedBuilds.ts'
import { triggerExport, type ExportData } from './ExportCard.tsx'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'

export function ShareBar() {
  const { t }       = useTranslation()
  const store       = useBuildStore()
  const stats       = useBuildStore(s => s.stats)
  const equipment   = useBuildStore(s => s._equipment)
  const [copied,    setCopied]    = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saveName,  setSaveName]  = useState('')
  const [builds,    setBuilds]    = useState<SavedBuild[]>(listBuilds)
  const [showPanel, setShowPanel] = useState(false)

  const hasClass = Boolean(store.selectedClass)

  const shareUrl = useCallback(() => {
    if (!hasClass) return ''
    const encoded = encodeBuild(store)
    const url     = `${location.origin}${location.pathname}#/?b=${encoded}`
    return url
  }, [store, hasClass])

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
      const clsInfo  = CLASS_DATA.find(c => c.id === store.selectedClass)
      const equipMap = new Map(equipment.map(it => [it.ankama_id, it.name]))
      const equippedNames = Object.fromEntries(
        Object.entries(store.equipped).map(([slot, id]) => [slot, equipMap.get(id as number) ?? ''])
      ) as ExportData['equipped']
      await triggerExport({
        classLabel: clsInfo?.name ?? store.selectedClass,
        classSlug:  store.selectedClass,
        level:      store.level,
        gender:     store.gender,
        equipped:   equippedNames,
        stats,
      })
    } finally {
      setExporting(false)
    }
  }, [store, stats, equipment])

  return (
    <div className="flex items-center gap-2">
      {/* Export as image */}
      <button
        onClick={handleExport}
        disabled={!hasClass || !stats || exporting}
        title={t('export_btn_title')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-metal-edge bg-surface-stone text-ink-muted hover:text-ink hover:border-gold-deep disabled:opacity-30 text-xs transition-colors"
      >
        {exporting ? `⏳ ${t('exporting')}` : `🖼 ${t('export_btn')}`}
      </button>

      {/* Copy URL */}
      <button
        onClick={handleCopy}
        disabled={!hasClass}
        title={t('copy_url_title')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-metal-edge bg-surface-stone text-ink-muted hover:text-ink hover:border-gold-deep disabled:opacity-30 text-xs transition-colors"
      >
        {copied ? `✓ ${t('copied')}` : `🔗 ${t('share')}`}
      </button>

      {/* My Builds */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-metal-edge bg-surface-stone text-ink-muted hover:text-ink hover:border-gold-deep text-xs transition-colors"
      >
        📋 {t('my_builds')} {builds.length > 0 && <span className="text-forge-gold">({builds.length})</span>}
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
        </div>
      )}
    </div>
  )
}
