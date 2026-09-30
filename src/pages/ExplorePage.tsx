import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft, Star, Heart, Clock, Eye } from 'lucide-react'
import { Tabs, Button, type TabItem } from '@/ui'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { BuildCard } from '@/features/builds/BuildCard.tsx'
import { fetchPublicBuilds, type BuildRow, type ExploreSort } from '@/features/builds/api.ts'
import { langPathPrefix } from '@/i18n/langPath.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'

const SORT_ITEMS: TabItem[] = [
  { id: 'rating', label: 'sort_rating', Icon: Star },
  { id: 'likes',  label: 'sort_likes',  Icon: Heart },
  { id: 'recent', label: 'sort_recent', Icon: Clock },
  { id: 'views',  label: 'sort_views',  Icon: Eye },
]

function ClassLabel({ id }: { id: string | null }) {
  const { t } = useTranslation()
  const classLabel = useClassName(id)
  return <>{id ? classLabel : t('explore_all_classes')}</>
}

export function ExplorePage() {
  const { t, i18n } = useTranslation()
  useLoadGameData()
  const [sort, setSort]           = useState<ExploreSort>('rating')
  const [classSlug, setClassSlug] = useState<string | null>(null)
  const [builds, setBuilds]       = useState<BuildRow[]>([])
  const [page, setPage]           = useState(0)
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)

  const load = useCallback(async (nextPage: number, reset: boolean) => {
    setLoading(true)
    setError(false)
    const { data, error: err, count } = await fetchPublicBuilds({ classSlug, sort, page: nextPage })
    setLoading(false)
    if (err) { setError(true); return }
    setTotal(count)
    setBuilds(prev => reset ? data : [...prev, ...data])
  }, [classSlug, sort])

  useEffect(() => {
    setPage(0)
    load(0, true)
  }, [load])

  const sortLabels = SORT_ITEMS.map(item => ({ ...item, label: t(item.label) }))

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <header
        className="sticky top-0 z-40 px-4 sm:px-6 h-[52px] flex items-center gap-3"
        style={{
          background:   'linear-gradient(to bottom, var(--surface-stone), var(--surface-void))',
          borderBottom: '1px solid var(--metal-edge)',
        }}
      >
        <Link to={`/${langPathPrefix(i18n.language)}`} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--ink-faint)' }}>
          <ArrowLeft size={14} />
          {t('back_to_builder')}
        </Link>
        <h1 className="font-display font-bold tracking-[0.15em] uppercase text-xs ml-2" style={{ color: 'var(--gold)' }}>
          {t('explore_title')}
        </h1>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <Tabs items={sortLabels} active={sort} onChange={id => setSort(id as ExploreSort)} variant="segment" />

          <select
            value={classSlug ?? ''}
            onChange={e => setClassSlug(e.target.value || null)}
            className="text-xs rounded-md px-2.5 py-1.5"
            style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
          >
            <option value=""><ClassLabel id={null} /></option>
            {CLASS_DATA.map(c => (
              <option key={c.id} value={c.id}><ClassLabel id={c.id} /></option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-center py-10" style={{ color: 'var(--negative)' }}>{t('explore_error')}</p>
        )}

        {!error && !loading && builds.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: 'var(--ink-faint)' }}>{t('explore_empty')}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {builds.map(b => <BuildCard key={b.id} build={b} />)}
        </div>

        {loading && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--ink-faint)' }}>{t('auth_loading')}</p>
        )}

        {!loading && builds.length < total && (
          <div className="flex justify-center pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => { const next = page + 1; setPage(next); load(next, false) }}
            >
              {t('explore_load_more')}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
