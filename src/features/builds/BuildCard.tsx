import { lazy, Suspense, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ArrowUpRight, Award, FolderPlus } from 'lucide-react'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { isSafeImageUrl, useAuthStore } from '@/store/authStore.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { useDataStore } from '@/store/dataStore.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { BuildEquipmentPreview } from './BuildEquipmentPreview.tsx'
import { BuildActivity } from './BuildActivity.tsx'
import { snapshotStats } from './snapshotStats.ts'
import { buildTags, type BuildRow } from './api.ts'
import './buildCard.css'

const CollectionPicker = lazy(() => import('@/features/collections/Collections.tsx').then(m => ({ default: m.CollectionPicker })))

// The workshop's main stats, with production's names and icons.
const VITALS = [
  ['maxHp', 'badge_hp', 'vitality'], ['ap', 'badge_ap', 'ap'], ['mp', 'badge_mp', 'mp'],
  ['range', 'badge_range', 'range'], ['critChance', 'stat_crit_chance', 'crit'], ['summons', 'stat_summons', 'summons'],
] as const

/** A published build: who made it, the workshop in miniature, its tags, AP/MP/range,
 * a way to keep it in a collection and its activity. `onTag` makes the tags filters. */
export function BuildCard({ build, onTag, activeTag }: { build: BuildRow; onTag?: (name: string) => void; activeTag?: string | null }) {
  const { t, i18n } = useTranslation()
  const equipment  = useDataStore(s => s.equipment)
  const sets       = useDataStore(s => s.sets)
  const session    = useAuthStore(s => s.session)
  const classLabel = useClassName(build.class_slug)
  const prefix     = langPathPrefix(i18n.language)
  const [collect, setCollect] = useState(false)
  const stats = useMemo(() => snapshotStats(build.snapshot, equipment, sets), [build.snapshot, equipment, sets])
  // Always the username, never display_name: attribution is the nickname people know.
  const owner = build.profiles?.username ?? ''
  const avatar = build.profiles?.avatar_url
  const tags = buildTags(build).slice(0, 3)

  return (
    <article className="product-build explore-card" aria-label={build.name}>
      <div className="explore-card-author">
        {owner ? (
          <Link to={`/${prefix}u/${owner}`} aria-label={t('lib_open_author', { name: owner })}>
            {isSafeImageUrl(avatar)
              ? <img src={avatar} alt="" width={20} height={20} loading="lazy" decoding="async" />
              : <span aria-hidden="true">{owner.slice(0, 1).toUpperCase()}</span>}
            {owner}
            <ArrowUpRight size={12} aria-hidden="true" />
          </Link>
        ) : <span />}
        {build.is_featured && (
          <span className="explore-featured"><Award size={14} aria-hidden="true" />{t('build_featured')}</span>
        )}
      </div>
      <Link id={`card-${build.id}`} className="build-card-open explore-card-open" to={`/${prefix}build/${build.id}`}>
        <span className="build-card-head">
          <span>{classLabel}</span>
          <span className="build-level">{t('level_short', { level: build.level })}</span>
        </span>
        <BuildEquipmentPreview snapshot={build.snapshot} equipment={equipment} classSlug={build.class_slug} gender={build.gender} />
        <h2>{build.name}</h2>
      </Link>
      {tags.length > 0 && (
        <div className="explore-card-tags" role="group" aria-label={t('publish_tags_label')}>
          {tags.map(tag => onTag
            ? <button key={tag.id} type="button" onClick={() => onTag(tag.name)} aria-pressed={activeTag === tag.name}>{t(`tag_${tag.name}`)}</button>
            : <span key={tag.id}>{t(`tag_${tag.name}`)}</span>)}
        </div>
      )}
      <div className="build-card-bottom">
        {stats && (
          <ul className="build-vitals" aria-label={t('lib_vitals')}>
            {VITALS.map(([key, label, icon]) => (
              <li key={key}>
                <img src={statIconUrl(icon)} alt="" />
                <strong>{new Intl.NumberFormat(i18n.language === 'es' ? 'es-CO' : i18n.language).format(stats[key])}</strong>
                <span>{t(label)}</span>
              </li>
            ))}
          </ul>
        )}
        {session && (
          <button type="button" className="explore-save" onClick={() => setCollect(true)} aria-label={t('lib_save_named', { name: build.name })}>
            <FolderPlus size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <BuildActivity activity={build} />
      {session && collect && (
        <Suspense fallback={null}>
          <CollectionPicker open onClose={() => setCollect(false)} userId={session.user.id} buildId={build.id} />
        </Suspense>
      )}
    </article>
  )
}
