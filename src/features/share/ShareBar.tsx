import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useBuildStore } from '@/store/buildStore.ts'
import { encodeBuild } from './codec.ts'
import type { ExportData } from './ExportCard.tsx'
import { useClassName } from '@/features/class-picker/useClassName.ts'

export function ShareBar() {
  const { t, i18n } = useTranslation()
  // Only subscribe to the two fields this component actually needs to
  // re-render for (hasClass/classLabel + enabling the export button).
  // Everything else (equipped, level, gender, snapshot…) is only read
  // inside click handlers via useBuildStore.getState() below, so editing
  // the build elsewhere doesn't re-render this toolbar on every change.
  const selectedClass = useBuildStore(s => s.selectedClass)
  const stats          = useBuildStore(s => s.stats)
  const classLabel     = useClassName(selectedClass)
  const [copied,    setCopied]    = useState(false)
  const [exporting, setExporting] = useState(false)

  const hasClass = Boolean(selectedClass)

  const shareUrl = useCallback(() => {
    const store = useBuildStore.getState()
    if (!store.selectedClass) return ''
    const encoded  = encodeBuild(store)
    const lang     = i18n.language.slice(0, 2)
    const langPath = lang === 'en' ? '' : `${lang}/`
    return `${location.origin}${import.meta.env.BASE_URL}${langPath}?b=${encoded}`
  }, [i18n.language])

  const handleCopy = useCallback(async () => {
    const url = shareUrl()
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareUrl])

  const handleExport = useCallback(async () => {
    const store = useBuildStore.getState()
    if (!store.selectedClass || !stats) return
    setExporting(true)
    try {
      // Dynamic import: ExportCard + html-to-image (~20 KB) are only
      // needed when the user actually clicks export, not on every load.
      const { triggerExport } = await import('./ExportCard.tsx')
      const equipMap = new Map(store._equipment.map(it => [it.ankama_id, it.name]))
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
  }, [stats, classLabel])

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
    </div>
  )
}
