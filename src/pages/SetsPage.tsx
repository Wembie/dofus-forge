import { useDeferredValue, useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { useLoaderData, useSearchParams, type LoaderFunctionArgs } from 'react-router'
import { Layers, Search, X } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { langFromPath, langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { Breadcrumbs } from '@/seo/JsonLd.tsx'
import { normalizeSearch } from '@/ui'
import { GUIDE_ELEMENTS, LEVEL_BRACKETS, type GuideElement } from '@/data/setGuide.ts'
import { ElementChips, SetCard } from '@/features/set-guide/SetGuideUI.tsx'
import { ELEMENT_ICON } from '@/features/set-guide/setGuideLinks.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { loadSetsIndex } from '@/data/setPages.server.ts'

// Runs at build time; client navigations read the .data file.
export async function loader({ request }: LoaderFunctionArgs) {
  return loadSetsIndex(langFromPath(new URL(request.url).pathname))
}

const bracketKey = ([min, max]: readonly [number, number]) => `${min}-${max}`
const noSubscription = () => () => {}

/**
 * Every set with a page, grouped by level bracket. The full list is in the
 * prerendered HTML (it is how crawlers reach each set page); the filters
 * only narrow it in the browser, and live in the URL (q, element, level).
 */
export function SetsPage() {
  const { sets } = useLoaderData<typeof loader>()
  const { t, i18n } = useTranslation()
  const id = useId()
  const prefix = langPathPrefix(i18n.language)
  const homePath = `/${langPathRootSegment(i18n.language)}`

  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'sets', {
    title:       t('sets_seo_title'),
    description: t('sets_seo_description', { count: sets.length }),
  })

  // The prerendered HTML has no query string: filters from the URL apply after hydration.
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false)
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  useEffect(() => { if (hydrated) setQuery(params.get('q') ?? '') }, [hydrated]) // eslint-disable-line react-hooks/exhaustive-deps
  const elementParam = hydrated ? params.get('element') : null
  const element = GUIDE_ELEMENTS.includes(elementParam as GuideElement) ? (elementParam as GuideElement) : null
  const bracketParam = hydrated ? params.get('level') ?? '' : ''
  const bracket = LEVEL_BRACKETS.some(b => bracketKey(b) === bracketParam) ? bracketParam : ''
  const deferredQuery = useDeferredValue(query)

  function patch(next: { q?: string; element?: string; level?: string }) {
    setParams(prev => {
      const out = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(next)) {
        if (value) out.set(key, value)
        else out.delete(key)
      }
      return out
    }, { replace: true })
  }
  useEffect(() => {
    if (!hydrated || query === (params.get('q') ?? '')) return
    const timer = setTimeout(() => patch({ q: query.trim() }), 300)
    return () => clearTimeout(timer)
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const active = !!(query || element || bracket)
  const bracketLabel = (min: number, max: number) => (min === max ? t('sets_bracket_single', { level: min }) : t('sets_bracket_range', { min, max }))
  function clear() {
    setQuery('')
    patch({ q: '', element: '', level: '' })
  }

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />

      <main id="main-content" className="sp-page-wrap flex-1">
        <div className="sp-study">
          <div className="sp-crumbs-wrap">
            <Breadcrumbs crumbs={[
              { label: t('app_title'), to: homePath },
              { label: t('sets_page_title'), to: `/${prefix}sets` },
            ]} />
          </div>
          <div className="sp-heading">
            <p className="account-eyebrow">{t('sets_eyebrow')}</p>
            <h1>{t('sets_page_title')}</h1>
            <p>{t('sets_page_intro', { count: sets.length })}</p>
          </div>

          <section className="sp-toolbar" aria-label={t('sets_controls')}>
            <label className="sp-search" htmlFor={`${id}-q`}>
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">{t('sets_search_placeholder')}</span>
              <input id={`${id}-q`} type="search" value={query} placeholder={t('sets_search_placeholder')} onChange={e => setQuery(e.target.value)} />
            </label>
            <div className="sp-element-filter" role="group" aria-label={t('sets_filter_element')}>
              {GUIDE_ELEMENTS.map(el => (
                <button key={el} type="button" data-element={el} aria-pressed={element === el} onClick={() => patch({ element: element === el ? '' : el })}>
                  <img src={statIconUrl(ELEMENT_ICON[el])} alt="" />
                  {t(`elem_${el}`)}
                </button>
              ))}
            </div>
            <select aria-label={t('sets_filter_level')} value={bracket} onChange={e => patch({ level: e.target.value })}>
              <option value="">{t('sets_filter_all_levels')}</option>
              {LEVEL_BRACKETS.map(b => <option key={bracketKey(b)} value={bracketKey(b)}>{bracketLabel(b[0], b[1])}</option>)}
            </select>
            <span className="sp-count" aria-live="polite">{t('sets_shown', { count: shown })}</span>
            {active && (
              <button type="button" className="sp-clear" onClick={clear}>
                <X size={15} aria-hidden="true" />
                {t('lib_reset')}
              </button>
            )}
          </section>
          {element && <p className="sp-note"><ElementChips elements={[element]} /> {t('sets_element_note')}</p>}

          {!groups.length ? (
            <div className="sp-empty">
              <Layers size={28} aria-hidden="true" />
              <p>{t('sets_empty')}</p>
              <button type="button" onClick={clear}>{t('lib_reset')}</button>
            </div>
          ) : (
            groups.map(g => (
              // content-visibility skips layout and paint of the brackets below the fold.
              <section key={g.min} className="sp-bracket" aria-labelledby={`${id}-b${g.min}`}
                style={{ contentVisibility: 'auto', containIntrinsicSize: `auto ${Math.ceil(g.sets.length / 3) * 190}px` }}>
                <div className="sp-bracket-head">
                  <h2 id={`${id}-b${g.min}`}>{bracketLabel(g.min, g.max)}</h2>
                  <span>{t('sets_shown', { count: g.sets.length })}</span>
                </div>
                <div className="sp-grid">
                  {g.sets.map(s => <SetCard key={s.id} set={s} />)}
                </div>
              </section>
            ))
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

export default SetsPage
