import { useState, useCallback } from 'react'
import { Check, ImageDown, Link2, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { langPathRootSegment } from '@/i18n/langPath.ts'
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
    const langPath = langPathRootSegment(lang)
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
    <>
      <button type="button" className="workshop-action" onClick={handleExport} disabled={!hasClass || !stats || exporting}
        title={t('export_btn_title')} aria-label={exporting ? t('exporting') : t('export_btn')}>
        {exporting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ImageDown size={16} aria-hidden="true" />}
        <span>{exporting ? t('exporting') : t('export_btn')}</span>
      </button>
      <button type="button" className="workshop-action" onClick={handleCopy} disabled={!hasClass}
        title={t('copy_url_title')} aria-label={copied ? t('copied') : t('share')}>
        {copied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
        <span>{copied ? t('copied') : t('share')}</span>
      </button>
    </>
  )
}
