import { useTranslation } from 'react-i18next'
import { Link, useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { Hammer, Layers, Sparkles, Users } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { langFromPath, langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { usePageSeo, pageOgImage, SITE, type SeoLang } from '@/seo/useSeoMeta.ts'
import { DOFUS_GAME_VERSION } from '@/data/gameVersion.ts'
import { Breadcrumbs, JsonLd } from '@/seo/JsonLd.tsx'
import { STAT_META, isIgnored } from '@/features/equipment/statDisplay.ts'
import { ItemFactsList, ItemPeek } from '@/features/equipment/ItemFacts.tsx'
import type { AppItem } from '@/data/loaders.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { ElementChips, GuideBuildCard, SetCard, StatLine } from '@/features/set-guide/SetGuideUI.tsx'
import { loadSetPage, type SetPageData } from '@/data/setPages.server.ts'

// Runs at build time for every set page; client navigations read the .data file.
export async function loader({ params, request }: LoaderFunctionArgs) {
  return loadSetPage(langFromPath(new URL(request.url).pathname), params.slug ?? '')
}

export function SetPage() {
  const data = useLoaderData<typeof loader>()
  const { t, i18n } = useTranslation()
  const lang = i18n.language.slice(0, 2) as SeoLang
  const prefix = langPathPrefix(i18n.language)
  const homePath = `/${langPathRootSegment(i18n.language)}`

  const summary = data
    ? data.totals.slice(0, 4).map(s => `${s.value > 0 ? '+' : ''}${s.value} ${STAT_META[s.stat] ? t(STAT_META[s.stat].tKey) : s.stat}`).join(', ')
    : ''
  usePageSeo(lang, `sets/${data?.set.slug ?? ''}`, {
    title:       data ? t('set_page_seo_title', { name: data.set.name, level: data.set.level }) : undefined,
    description: data ? t('set_page_seo_description', { name: data.set.name, level: data.set.level, count: data.set.pieces, bonus: summary }) : undefined,
    noindex:     !data,
    image:       data ? pageOgImage(lang, 'set', data.set.slug, DOFUS_GAME_VERSION) : undefined,
  })

  if (!data) {
    return (
      <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center gap-3 text-sm" style={{ color: 'var(--ink-faint)' }}>
        <p>{t('set_page_not_found')}</p>
        <Link to={`/${prefix}sets`} className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>{t('sets_page_title')}</Link>
      </div>
    )
  }

  return <SetPageBody data={data} prefix={prefix} homePath={homePath} summary={summary} />
}

function SetPageBody({ data, prefix, homePath, summary }: { data: SetPageData; prefix: string; homePath: string; summary: string }) {
  const { t } = useTranslation()
  const { set, items, tiers, totals, related, builds } = data
  const element = set.elements.length === 1 ? set.elements[0] : undefined
  const classInfo = CLASS_DATA.find(c => c.id === set.classId)
  const className = useClassName(set.classId)
  const maxTier = tiers.at(-1)?.pieces ?? 0
  const setUrl = `${SITE}/${prefix}sets/${set.slug}`
  const pieces = items as unknown as AppItem[]

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: set.name,
        url: setUrl,
        numberOfItems: items.length,
        itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name })),
      }} />

      <main id="main-content" className="sp-page-wrap flex-1">
        <div className="sp-study sp-page" data-element={element}>
          <div className="sp-crumbs-wrap">
            <Breadcrumbs crumbs={[
              { label: t('app_title'), to: homePath },
              { label: t('sets_page_title'), to: `/${prefix}sets` },
              { label: set.name, to: `/${prefix}sets/${set.slug}` },
            ]} />
          </div>

          <div className="sp-hero">
            <ul className="sp-hero-pieces" aria-label={t('set_page_items_title', { count: items.length })}>
              {pieces.map(it => (
                <li key={it.ankama_id}>
                  <ItemPeek item={it}>
                    <span className="sp-tile" tabIndex={0}>
                      {it.image_url ? <img src={it.image_url} alt={it.name} decoding="async" /> : <span className="sr-only">{it.name}</span>}
                    </span>
                  </ItemPeek>
                </li>
              ))}
            </ul>
            <h1>{set.name}</h1>
            <p className="sp-hero-meta">
              <span className="sp-chip is-level">{t('sets_card_level', { level: set.level })}</span>
              <span className="sp-chip">{t('sets_card_pieces', { count: set.pieces })}</span>
              <ElementChips elements={set.elements} />
              {classInfo && (
                <Link className="sp-chip is-class" to={`/${prefix}classes/${classInfo.id}`}>
                  <Sparkles size={13} aria-hidden="true" />
                  {t('set_page_class_set', { class: className })}
                </Link>
              )}
            </p>
            <p className="sp-hero-intro">{t('set_page_intro', { name: set.name, level: set.level, count: set.pieces, tiers: maxTier, bonus: summary })}</p>
            <div className="sp-hero-actions">
              <Link className="site-primary" to={`${homePath}?set=${set.id}`}>
                <Hammer size={17} aria-hidden="true" />
                {t('set_page_cta_try')}
              </Link>
              <Link className="sp-button" to={`/${prefix}sets`}>
                <Layers size={17} aria-hidden="true" />
                {t('set_page_cta_all')}
              </Link>
            </div>
          </div>

          <div className="sp-body">
            <div className="sp-column">
              <section aria-labelledby="sp-totals">
                <div className="sp-section-head">
                  <h2 id="sp-totals">{t('set_page_totals_title')}</h2>
                  <p>{t('set_page_totals_note', { count: set.pieces })}</p>
                </div>
                <div className="sp-totals">
                  {totals.map(s => <StatLine key={s.stat} stat={s.stat} min={s.value} />)}
                </div>
              </section>
              <section aria-labelledby="sp-tiers">
                <div className="sp-section-head">
                  <h2 id="sp-tiers">{t('set_page_tiers_title')}</h2>
                  <p>{t('set_page_tiers_note')}</p>
                </div>
                <ol className="sp-tiers">
                  {tiers.map(tier => (
                    <li key={tier.pieces} className={tier.pieces === maxTier ? 'is-full' : ''}>
                      <h3>
                        {t('build_tier', { count: tier.pieces })}
                        {tier.pieces === maxTier && <em>{t('set_page_full_bonus')}</em>}
                      </h3>
                      <div>
                        {tier.effects.filter(e => !isIgnored(e.stat)).map((e, i) => <StatLine key={i} stat={e.stat} min={e.min} max={e.max} />)}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
            <section aria-labelledby="sp-items" className="sp-items">
              <div className="sp-section-head">
                <h2 id="sp-items">{t('set_page_items_title', { count: items.length })}</h2>
              </div>
              {pieces.map(it => (
                <article key={it.ankama_id} className="sp-item">
                  <div className="sp-item-head">
                    <span className="sp-tile">{it.image_url && <img src={it.image_url} alt="" loading="lazy" decoding="async" />}</span>
                    <span>
                      <h3>{it.name}</h3>
                      <small>{t(`item_type_${it.type}`, { defaultValue: it.type })} · {t('sets_card_level', { level: it.level })}</small>
                    </span>
                  </div>
                  <div className="sp-item-facts"><ItemFactsList item={it} lore={false} /></div>
                  {it.conditions && it.conditions.length > 0 && (
                    <p className="sp-conditions">
                      <b>{t('conditions')}</b>
                      {it.conditions.map(c => `${STAT_META[c.stat] ? t(STAT_META[c.stat].tKey) : c.stat} ${c.operator} ${c.value}`).join(' · ')}
                    </p>
                  )}
                  {it.description && (
                    <details className="sp-lore">
                      <summary>{t('sets_description')}</summary>
                      <p>{it.description}</p>
                    </details>
                  )}
                </article>
              ))}
            </section>
          </div>

          <section aria-labelledby="sp-builds" className="sp-builds">
            <div className="sp-section-head">
              <h2 id="sp-builds">{t('set_page_builds_title')}</h2>
              {builds.length > 0 && <p>{t('set_page_builds_note', { name: set.name })}</p>}
            </div>
            {builds.length > 0 ? (
              <ul>{builds.map(b => <GuideBuildCard key={b.id} build={b} />)}</ul>
            ) : (
              <div className="sp-builds-empty">
                <Users size={18} aria-hidden="true" />
                <p>{t('set_page_builds_empty', { name: set.name })}</p>
                <Link to={`${homePath}?set=${set.id}`}>{t('set_page_cta_try')}</Link>
              </div>
            )}
          </section>

          {related.length > 0 && (
            <section aria-labelledby="sp-related" className="sp-related">
              <div className="sp-section-head">
                <h2 id="sp-related">{t('set_page_related_title')}</h2>
                <p>{t('set_page_related_note')}</p>
              </div>
              <div className="sp-grid">
                {related.map(r => <SetCard key={r.id} set={r} />)}
              </div>
            </section>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

export default SetPage
