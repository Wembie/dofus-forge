import { useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { Search } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { langFromPath, langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { Breadcrumbs } from '@/seo/JsonLd.tsx'
import { normalizeSearch } from '@/ui'
import { GUIDE_ELEMENTS, LEVEL_BRACKETS, type GuideElement } from '@/data/setGuide.ts'
import { ElementChips, SetCard } from '@/features/set-guide/SetGuideUI.tsx'
import { ELEMENT_VAR, ELEMENT_ICON } from '@/features/set-guide/setGuideLinks.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { loadSetsIndex } from '@/data/setPages.server.ts'

// Runs at build time; client navigations read the .data file.
export async function loader({ request }: LoaderFunctionArgs) {
  return loadSetsIndex(langFromPath(new URL(request.url).pathname))
}

const bracketKey = ([min, max]: readonly [number, number]) => `${min}-${max}`

/**
 * Every set with a page, grouped by level bracket. The full list is in the
 * prerendered HTML (it is how crawlers reach each set page); the filters
 * only narrow it in the browser.
 */
export function SetsPage() {
  const { sets } = useLoaderData<typeof loader>()
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const homePath = `/${langPathRootSegment(i18n.language)}`

  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'sets', {
    title:       t('sets_seo_title'),
    description: t('sets_seo_description', { count: sets.length }),
  })

  const [query, setQuery] = useState('')
  const [element, setElement] = useState<GuideElement | null>(null)
  const [bracket, setBracket] = useState('')
  const deferredQuery = useDeferredValue(query)

  const groups = useMemo(() => {
    const q = normalizeSearch(deferredQuery.trim())
    const visible = sets.filter(s =>
      (!q || normalizeSearch(s.name).includes(q)) &&
      (!element || s.elements.includes(element)))
    return LEVEL_BRACKETS
      .filter(b => !bracket || bracketKey(b) === bracket)
      .map(([min, max]) => ({ min, max, sets: visible.filter(s => s.level >= min && s.level <= max) }))
      .filter(g => g.sets.length > 0)
  }, [sets, deferredQuery, element, bracket])

  const shown = groups.reduce((n, g) => n + g.sets.length, 0)
  const bracketLabel = (min: number, max: number) => (min === max ? t('sets_bracket_single', { level: min }) : t('sets_bracket_range', { min, max }))
  const fieldStyle = { background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />

      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        <Breadcrumbs crumbs={[
          { label: t('app_title'), to: homePath },
          { label: t('sets_page_title'), to: `/${prefix}sets` },
        ]} />

        <header className="space-y-2" style={{ animation: 'page-rise 520ms var(--ease-out) 0ms both' }}>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-wide" style={{ color: 'var(--gold)' }}>{t('sets_page_title')}</h1>
          <p className="text-sm leading-relaxed max-w-3xl" style={{ color: 'var(--ink-muted)' }}>{t('sets_page_intro', { count: sets.length })}</p>
        </header>

        <div
          className="sticky top-[52px] z-30 -mx-4 px-4 py-3 flex flex-wrap items-center gap-2.5"
          style={{ background: 'color-mix(in srgb, var(--surface-void) 88%, transparent)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--metal-edge)' }}
        >
          <label className="relative">
            <span className="sr-only">{t('sets_search_placeholder')}</span>
            <Search size={13} aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('sets_search_placeholder')}
              className="text-xs rounded-md pl-7 pr-2.5 py-1.5 w-44 sm:w-64"
              style={fieldStyle}
            />
          </label>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('sets_filter_element')}>
            {GUIDE_ELEMENTS.map(el => {
              const active = element === el
              return (
                <button
                  key={el}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setElement(active ? null : el)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors"
                  style={active
                    ? { color: ELEMENT_VAR[el], borderColor: ELEMENT_VAR[el], background: `color-mix(in srgb, ${ELEMENT_VAR[el]} 14%, transparent)` }
                    : { color: 'var(--ink-faint)', borderColor: 'var(--metal-edge)', background: 'transparent' }}
                >
                  <img src={statIconUrl(ELEMENT_ICON[el])} alt="" width={12} height={12} className="object-contain" />
                  {t(`elem_${el}`)}
                </button>
              )
            })}
          </div>

          <select value={bracket} onChange={e => setBracket(e.target.value)} aria-label={t('sets_filter_level')} className="text-xs rounded-md px-2.5 py-1.5" style={fieldStyle}>
            <option value="">{t('sets_filter_all_levels')}</option>
            {LEVEL_BRACKETS.map(b => <option key={bracketKey(b)} value={bracketKey(b)}>{bracketLabel(b[0], b[1])}</option>)}
          </select>

          <span className="ml-auto text-[11px] tabular-nums" style={{ color: 'var(--ink-faint)' }} aria-live="polite">
            {t('sets_shown', { count: shown })}
          </span>
        </div>

        {groups.length === 0 && (
          <p className="text-sm py-10 text-center" style={{ color: 'var(--ink-faint)' }}>{t('sets_empty')}</p>
        )}

        {groups.map(g => (
          // content-visibility skips layout and paint of the brackets below the fold.
          <section key={g.min} className="space-y-3" style={{ contentVisibility: 'auto', containIntrinsicSize: `auto ${Math.ceil(g.sets.length / 3) * 72}px` }}>
            <h2 className="font-display text-lg font-bold flex items-baseline gap-2" style={{ color: 'var(--gold)' }}>
              {bracketLabel(g.min, g.max)}
              <span className="text-xs font-sans font-normal" style={{ color: 'var(--ink-faint)' }}>{t('sets_shown', { count: g.sets.length })}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {g.sets.map((s, i) => <SetCard key={s.id} set={s} index={i} />)}
            </div>
          </section>
        ))}

        {element && (
          <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--ink-faint)' }}>
            <ElementChips elements={[element]} /> {t('sets_element_note')}
          </p>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}

export default SetsPage
