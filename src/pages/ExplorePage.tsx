import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Star, Heart, Clock, Eye, Search } from 'lucide-react'
import { Tabs, Button, type TabItem } from '@/ui'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { BuildCard } from '@/features/builds/BuildCard.tsx'
import { fetchPublicBuilds, type BuildRow, type ExploreSort } from '@/features/builds/api.ts'
import { useLoadGameData } from '@/data/useLoadGameData.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'

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
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'explore', {
    title: t('explore_seo_title'),
    description: t('explore_seo_description'),
  })
  const [sort, setSort]           = useState<ExploreSort>('rating')
  const [classSlug, setClassSlug] = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [builds, setBuilds]       = useState<BuildRow[]>([])
  const [page, setPage]           = useState(0)
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)

  // Debounced so typing doesn't fire a network request (and a full-text
  // query against builds) on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(id)
  }, [search])

  const load = useCallback(async (nextPage: number, reset: boolean) => {
    setLoading(true)
    setError(false)
    const { data, error: err, count } = await fetchPublicBuilds({ classSlug, sort, search: debouncedSearch, page: nextPage })
    setLoading(false)
    if (err) { setError(true); return }
    setTotal(count)
    setBuilds(prev => reset ? data : [...prev, ...data])
  }, [classSlug, sort, debouncedSearch])

  useEffect(() => {
    setPage(0)
    load(0, true)
  }, [load])

  const sortLabels = SORT_ITEMS.map(item => ({ ...item, label: t(item.label) }))

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      <SiteHeader />

      <main className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-4">
        <h1 className="font-display font-bold tracking-[0.15em] uppercase text-xs" style={{ color: 'var(--gold)' }}>
          {t('explore_title')}
        </h1>
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <Tabs items={sortLabels} active={sort} onChange={id => setSort(id as ExploreSort)} variant="segment" />

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('explore_search_placeholder')}
              className="text-xs rounded-md pl-7 pr-2.5 py-1.5 w-40 sm:w-56"
              style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
            />
          </div>

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

      <SiteFooter />
    </div>
  )
}
