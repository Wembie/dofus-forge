import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppItem } from '@/data/loaders.ts'
import type { StatBlock } from '@/engine/types.ts'
import { ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import { statIconUrl, STAT_FIELDS, STAT_SHEET_GROUPS, type SheetKey } from '@/features/equipment/statDisplay.ts'
import { BRAND } from '@/data/brand.ts'

const BASE = import.meta.env.BASE_URL

/** The sheet keeps its own dark palette in both themes: it is an image, not the page. */
const C = { bg: '#111615', text: '#e9e8df', muted: '#a1aaa0', line: '#343c35', soft: '#272e29', accent: '#e4b28b', negative: '#e79a92' } as const

const HEADLINE = ['maxHp', 'ap', 'mp', 'range', 'critChance', 'power'] as const
const HEADLINE_SET = new Set<string>(HEADLINE)
/** Bookkeeping fields of the sheet; they say nothing to whoever reads the image. */
const LEFT_OUT = new Set<string>(['pointsBudget', 'pointsSpent', 'apRaw', 'mpRaw', 'rangeRaw'])

export type ExportData = {
  name:       string
  classLabel: string
  classSlug:  string
  level:      number
  gender:     'male' | 'female'
  equipped:   Partial<Record<SlotId, AppItem | undefined>>
  stats:      StatBlock
}

function Icon({ name, size }: { name: string; size: number }) {
  return <img src={statIconUrl(name)} width={size} height={size} alt="" style={{ objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }} />
}

/** The build as one image: gear per slot on the left, the headline stats and
 * every other non-zero field of the sheet on the right. Vitality is left out:
 * its effect is already the HP. */
export const ExportCard = forwardRef<HTMLDivElement, ExportData>(function ExportCard({ name, classLabel, classSlug, level, gender, equipped, stats }, ref) {
  const { t } = useTranslation()
  const label = (key: SheetKey) => (STAT_FIELDS[key] ? t(STAT_FIELDS[key].tKey) : t(`sheet_stat_${key}`))
  const slots = ALL_SLOTS.filter(slot => slot !== 'sidekick' || equipped[slot])
  const rows = STAT_SHEET_GROUPS.flatMap(([, keys]) => keys).filter(key =>
    key === 'unknownStats' ? Object.keys(stats.unknownStats).length > 0 : !HEADLINE_SET.has(key) && !LEFT_OUT.has(key) && stats[key] !== 0)

  return (
    <div ref={ref} className="export-sheet" style={{ background: C.bg, color: C.text, width: 1200, padding: 44, fontFamily: "'Source Sans 3', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 28, borderBottom: `1px solid ${C.line}` }}>
        <div>
          <p style={{ font: "12px 'IBM Plex Mono', monospace", color: C.accent, letterSpacing: 2, margin: '0 0 12px' }}>{t('share_sheet_kicker')}</p>
          <p style={{ font: '600 44px Alegreya, Georgia, serif', margin: 0, lineHeight: 1.1 }}>{name || classLabel}</p>
          <p style={{ fontSize: 16, color: C.muted, margin: '12px 0 0' }}>
            {t('export_level')} {level} · {classLabel} · {t(gender === 'male' ? 'gender_male' : 'gender_female')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {/* PNG, not the SVG mark: html-to-image rasterizes it reliably */}
          <img src={BRAND.mark256} width={56} height={56} alt="" style={{ display: 'block' }} />
          <b style={{ font: "600 28px 'Barlow Condensed', sans-serif", letterSpacing: 1 }}>DOFUS FORGE</b>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 36, paddingTop: 28 }}>
        <div>
          <img src={`${BASE}data/classes/${classSlug}${gender === 'female' ? '-f' : ''}.webp`} width={144} height={160} alt=""
            style={{ objectFit: 'contain', display: 'block', margin: '0 auto 24px' }} />
          {slots.map(slot => {
            const item = equipped[slot]
            return (
              <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.line}`, minHeight: 49 }}>
                {item?.image_url
                  ? <img src={item.image_url} width={30} height={34} alt="" style={{ objectFit: 'contain', flexShrink: 0 }} />
                  : <span style={{ width: 30, flexShrink: 0 }} />}
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ font: "10px 'IBM Plex Mono', monospace", color: C.muted, letterSpacing: 0.5 }}>{t(`slot_${slot}`)}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.35, color: item ? C.text : C.muted }}>{item?.name || t('share_empty_slot')}</span>
                </span>
              </div>
            )
          })}
        </div>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, paddingBottom: 26, borderBottom: `1px solid ${C.line}` }}>
            {HEADLINE.map(key => (
              <div key={key}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.muted }}>
                  <Icon name={STAT_FIELDS[key]?.icon ?? key} size={16} />{label(key)}
                </span>
                {/* A penalty that pushes AP, MP or range below zero shows in red. */}
                <strong style={{ display: 'block', font: "400 32px 'IBM Plex Mono', monospace", marginTop: 6, color: stats[key] < 0 ? C.negative : undefined }}>
                  {stats[key]}
                </strong>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px', paddingTop: 20 }}>
            {rows.map(key => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.soft}`, fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted }}>
                  {STAT_FIELDS[key] && <Icon name={STAT_FIELDS[key].icon} size={14} />}{label(key)}
                </span>
                <b style={{ font: "400 12px 'IBM Plex Mono', monospace", textAlign: 'right' }}>
                  {key === 'unknownStats'
                    ? Object.entries(stats.unknownStats).map(([k, v]) => `${k}: ${v}`).join(', ')
                    : stats[key]}
                </b>
              </div>
            ))}
            {rows.length === 0 && <p style={{ color: C.muted, fontSize: 12, margin: '8px 0' }}>{t('share_none')}</p>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, paddingTop: 24, marginTop: 28, borderTop: `1px solid ${C.line}` }}>
        <span>{t('share_sheet_footer')}</span>
        <span>dofusforge.com</span>
      </div>
    </div>
  )
})

/** Production's file name: dofus-<class>-lv<level>.png */
export function exportFileName(classLabel: string, level: number) {
  return `dofus-${classLabel.toLowerCase().replace(/\s+/g, '-')}-lv${level}.png`
}

export async function downloadSheet(node: HTMLElement, fileName: string): Promise<void> {
  const { toPng } = await import('html-to-image')
  await document.fonts.ready
  await Promise.all([...node.querySelectorAll('img')].map(img => img.decode().catch(() => {})))
  const png = await toPng(node, { pixelRatio: 2, backgroundColor: C.bg })
  const link = document.createElement('a')
  link.download = fileName
  link.href = png
  link.click()
}
