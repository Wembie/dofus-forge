import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Star, Heart, Eye, User } from 'lucide-react'
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
  const ownerLabel  = owner?.display_name || owner?.username || ''

  return (
    <Link
      to={`/${langPathPrefix(i18n.language)}build/${build.id}`}
      className="flex flex-col gap-2 p-3 rounded-xl transition-colors hover:border-gold-deep"
      style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)' }}
    >
      <div className="flex items-center gap-2.5">
        {portrait && (
          <img src={portrait} alt="" width={40} height={40} className="rounded-lg object-cover flex-shrink-0" style={{ background: 'var(--surface-void)' }} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{build.name}</p>
          <p className="text-[11px] truncate" style={{ color: 'var(--ink-faint)' }}>{classLabel} · {t('level_short', { level: build.level })}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
        {isSafeImageUrl(owner?.avatar_url)
          ? <img src={owner.avatar_url} alt="" width={14} height={14} className="rounded-full object-cover" />
          : <User size={12} />
        }
        <span className="truncate">{ownerLabel}</span>
      </div>

      <BuildEquipmentPreview snapshot={build.snapshot} equipment={equipment} size={26} hideEmpty />

      <div className="flex items-center gap-3 text-[11px] mt-auto pt-1" style={{ color: 'var(--ink-faint)', borderTop: '1px solid var(--metal-edge)' }}>
        <span className="flex items-center gap-1"><Star size={11} style={{ color: 'var(--gold)' }} />{build.avg_rating.toFixed(1)}</span>
        <span className="flex items-center gap-1"><Heart size={11} />{build.like_count}</span>
        <span className="flex items-center gap-1"><Eye size={11} />{build.view_count}</span>
      </div>
    </Link>
  )
}
