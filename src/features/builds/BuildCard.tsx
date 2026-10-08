import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Star, Heart, Eye, User, MessageSquare } from 'lucide-react'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { isSafeImageUrl } from '@/store/authStore.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { BuildEquipmentPreview } from './BuildEquipmentPreview.tsx'
import type { BuildRow } from './api.ts'

export function BuildCard({ build }: { build: BuildRow }) {
  const { t, i18n } = useTranslation()
  const equipment    = useDataStore(s => s.equipment)
  const classLabel  = useClassName(build.class_slug)
  const classInfo   = CLASS_DATA.find(c => c.id === build.class_slug)
  const portrait    = classInfo ? (build.gender === 'female' ? classInfo.imageFUrl : classInfo.imageUrl) : undefined
  const owner       = build.profiles
  // Always the username, never display_name — display_name is an optional
  // name shown only on the owner's own profile, attribution elsewhere must
  // always be the nickname people actually know them by on the site.
  const ownerLabel  = owner?.username || ''
  const prefix      = langPathPrefix(i18n.language)
  const [buildHover, setBuildHover] = useState(false)

  const createdLabel = new Date(build.created_at).toLocaleDateString(i18n.language, {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-xl transition-shadow"
      style={{
        background:   'var(--surface-panel)',
        borderTop:    `1px solid ${buildHover ? 'var(--gold)' : 'var(--gold-deep)'}`,
        borderRight:  '1px solid var(--metal-edge)',
        borderBottom: '1px solid var(--metal-edge)',
        borderLeft:   '1px solid var(--metal-edge)',
        boxShadow:    buildHover ? 'var(--inset-bevel), var(--glow-gold)' : 'var(--inset-bevel)',
      }}
    >
      {/* Owner row is its own link to /u/:username, visually a small
          "chip" (background pill + underline on hover) deliberately
          different from the card's gold border glow below — two distinct
          hover languages so it reads as a separate destination, not part
          of the same click target as the build. Pulled out of the
          build-detail Link below since nesting an <a> inside an <a> is
          invalid HTML and unreliable to click. */}
      {owner?.username ? (
        <Link
          to={`/${prefix}u/${owner.username}`}
          className="flex items-center gap-1.5 text-[11px] self-start px-1.5 py-0.5 -m-1.5 rounded-md hover:underline transition-colors"
          style={{ color: 'var(--ink-faint)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.background = 'var(--surface-stone)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-faint)'; e.currentTarget.style.background = 'transparent' }}
        >
          {isSafeImageUrl(owner.avatar_url)
            ? <img src={owner.avatar_url} alt="" width={14} height={14} className="rounded-full object-cover" />
            : <User size={12} />
          }
          <span className="truncate">{ownerLabel}</span>
        </Link>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
          <User size={12} />
          <span className="truncate">{ownerLabel}</span>
        </div>
      )}

      <Link
        to={`/${prefix}build/${build.id}`}
        className="flex flex-col gap-2 flex-1"
        onMouseEnter={() => setBuildHover(true)}
        onMouseLeave={() => setBuildHover(false)}
      >
        <div className="flex items-center gap-2.5">
          {portrait && (
            <img src={portrait} alt="" width={40} height={40} className="rounded-lg object-cover flex-shrink-0" style={{ background: 'var(--surface-void)' }} />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--gold)' }}>{build.name}</p>
            <p className="text-[11px] truncate" style={{ color: 'var(--ink-faint)' }}>{classLabel} · {t('level_short', { level: build.level })}</p>
          </div>
        </div>

        <BuildEquipmentPreview snapshot={build.snapshot} equipment={equipment} size={34} hideEmpty />

        <div className="flex items-center gap-3 text-[11px] mt-auto pt-1" style={{ color: 'var(--ink-faint)', borderTop: '1px solid var(--metal-edge)' }}>
          <span className="flex items-center gap-1"><Star size={11} style={{ color: 'var(--gold)' }} />{build.avg_rating.toFixed(1)}</span>
          <span className="flex items-center gap-1"><Heart size={11} />{build.like_count}</span>
          <span className="flex items-center gap-1"><Eye size={11} />{build.view_count}</span>
          <span className="flex items-center gap-1"><MessageSquare size={11} />{build.comment_count}</span>
          <span className="ml-auto flex-shrink-0">{createdLabel}</span>
        </div>
      </Link>
    </div>
  )
}
