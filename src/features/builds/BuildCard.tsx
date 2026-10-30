import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Star, Heart, Eye, User, MessageSquare, Award } from 'lucide-react'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { isSafeImageUrl } from '@/store/authStore.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { BuildEquipmentPreview } from './BuildEquipmentPreview.tsx'
import { buildTags, type BuildRow } from './api.ts'
import { TagChip } from './TagChips.tsx'
import { useDateFormatter } from '@/ui/useDateFormatter.ts'

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

  const formatDate   = useDateFormatter()
  const createdLabel = formatDate(build.created_at, { year: 'numeric', month: 'short', day: 'numeric' })

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
            ? <img src={owner.avatar_url} alt="" width={14} height={14} loading="lazy" decoding="async" className="rounded-full object-cover" />
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
            <img src={portrait} alt="" width={40} height={40} loading="lazy" decoding="async" className="rounded-lg object-cover flex-shrink-0" style={{ background: 'var(--surface-void)' }} />
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-sm font-bold min-w-0" style={{ color: 'var(--gold)' }}>
              {build.is_featured && <Award size={13} className="flex-shrink-0" aria-label={t('build_featured')}><title>{t('build_featured')}</title></Award>}
              <span className="truncate">{build.name}</span>
            </p>
            <p className="text-[11px] truncate" style={{ color: 'var(--ink-faint)' }}>{classLabel} · {t('level_short', { level: build.level })}</p>
          </div>
        </div>

        {buildTags(build).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {buildTags(build).slice(0, 3).map(tag => <TagChip key={tag.id} tag={tag} small />)}
          </div>
        )}

        <BuildEquipmentPreview snapshot={build.snapshot} equipment={equipment} size={34} hideEmpty />

        {/* flex-wrap, not a forced single line: a long localized date (e.g.
            Spanish "30 sept 2026" is wider than "3 oct 2026" since month
            abbreviations vary in length) combined with wide stat counts could
            push the date past the card's edge with nothing to clip or wrap
            it, silently cutting off the year instead of just moving to its
            own line. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] mt-auto pt-1" style={{ color: 'var(--ink-faint)', borderTop: '1px solid var(--metal-edge)' }}>
          <span className="flex items-center gap-1 flex-shrink-0"><Star size={11} style={{ color: 'var(--gold)' }} />{build.avg_rating.toFixed(1)}</span>
          <span className="flex items-center gap-1 flex-shrink-0"><Heart size={11} />{build.like_count}</span>
          <span className="flex items-center gap-1 flex-shrink-0"><Eye size={11} />{build.view_count}</span>
          <span className="flex items-center gap-1 flex-shrink-0"><MessageSquare size={11} />{build.comment_count}</span>
          <span className="ml-auto flex-shrink-0">{createdLabel}</span>
        </div>
      </Link>
    </div>
  )
}
