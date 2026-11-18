import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Check, Download, Link2, Loader2 } from 'lucide-react'
import { langPathRootSegment } from '@/i18n/langPath.ts'
import { useBuildStore } from '@/store/buildStore.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { encodeBuild } from './codec.ts'
import { ExportCard, downloadSheet, exportFileName } from './ExportCard.tsx'
import './share.css'

/** The build link in the page's language (English has no prefix). */
function shareUrl(lang: string) {
  const store = useBuildStore.getState()
  if (!store.selectedClass) return ''
  return `${location.origin}${import.meta.env.BASE_URL}${langPathRootSegment(lang.slice(0, 2))}?b=${encodeBuild(store)}`
}

/** Share and export: the build's link to copy, and the build as an image,
 * with a preview of that image. */
export function SharePanel() {
  const { t, i18n } = useTranslation()
  const b = useBuildStore()
  const classLabel = useClassName(b.selectedClass)
  const sheet = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  // The store changes with every edit; the link follows it.
  const url = useMemo(() => shareUrl(i18n.language), [i18n.language, b])
  const equipped = useMemo(() => {
    const byId = new Map(b._equipment.map(it => [it.ankama_id, it]))
    return Object.fromEntries(Object.entries(b.equipped).map(([slot, id]) => [slot, byId.get(id as number)]))
  }, [b._equipment, b.equipped])

  if (!b.selectedClass || !b.stats) return <p className="share-panel-empty">{t('share_no_class')}</p>

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setMessage({ ok: true, text: t('copied') })
    } catch {
      setMessage({ ok: false, text: t('share_copy_error') })
    }
  }

  async function download() {
    if (busy || !sheet.current) return
    setBusy(true)
    setMessage(null)
    try {
      await downloadSheet(sheet.current, exportFileName(classLabel || b.selectedClass!, b.level))
      setMessage({ ok: true, text: t('share_downloaded') })
    } catch {
      setMessage({ ok: false, text: t('share_download_error') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="share-panel">
      <p>{t('share_intro')}</p>
      <label>
        {t('share_link_label')}
        <input readOnly value={url} onFocus={e => e.currentTarget.select()} />
      </label>
      <div className="share-actions">
        <button type="button" className="site-primary" onClick={copy} title={t('copy_url_title')}>
          <Link2 size={16} aria-hidden="true" />{t('share_copy')}
        </button>
        <button type="button" onClick={download} disabled={busy} title={t('export_btn_title')}>
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
          {busy ? t('exporting') : t('share_download')}
        </button>
        <button type="button" onClick={() => setPreview(p => !p)} aria-expanded={preview}>
          {t(preview ? 'share_preview_hide' : 'share_preview_show')}
        </button>
      </div>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'share-message' : 'share-message is-error'}>
          {message.ok ? <Check size={14} aria-hidden="true" /> : <AlertCircle size={14} aria-hidden="true" />}
          {message.text}
        </p>
      )}
      {/* Always rendered, so the image can be made with the preview closed. */}
      <div className={preview ? 'share-preview' : 'share-offscreen'} aria-hidden={!preview} inert={!preview}
        role={preview ? 'region' : undefined} aria-label={preview ? t('share_preview_label') : undefined} tabIndex={preview ? 0 : -1}>
        <ExportCard ref={sheet} name={b.buildName} classLabel={classLabel || b.selectedClass} classSlug={b.selectedClass}
          level={b.level} gender={b.gender} equipped={equipped} stats={b.stats} />
      </div>
    </div>
  )
}
