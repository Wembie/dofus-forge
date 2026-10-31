import { useTranslation } from 'react-i18next'
import { Link, useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { Hammer, Layers, Sparkles, Users } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { langFromPath, langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { usePageSeo, SITE, type SeoLang } from '@/seo/useSeoMeta.ts'
import { Breadcrumbs, JsonLd } from '@/seo/JsonLd.tsx'
import { STAT_META, isIgnored } from '@/features/equipment/statDisplay.ts'
import { ItemSpellEffects } from '@/features/equipment/ItemSpellEffects.tsx'
import { SPELL_ITEM_EFFECT_IDS } from '@/data/effectIds.ts'
import { CLASS_DATA } from '@/features/class-picker/classData.ts'
import { useClassName } from '@/features/class-picker/useClassName.ts'
import { ElementChips, GuideBuildCard, GuideHeading, SetCard, StatLine } from '@/features/set-guide/SetGuideUI.tsx'
import { ELEMENT_VAR } from '@/features/set-guide/setGuideLinks.ts'
import { loadSetPage, type SetPageData } from '@/data/setPages.server.ts'

// Runs at build time for every set page; client navigations read the .data file.
export async function loader({ params, request }: LoaderFunctionArgs) {
  return loadSetPage(langFromPath(new URL(request.url).pathname), params.slug ?? '')
}

const panelStyle = {
  background: 'var(--surface-stone)',
  border:     '1px solid var(--metal-edge)',
  boxShadow:  'var(--inset-bevel)',
} as const

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
  const accent = set.elements.length === 1 ? ELEMENT_VAR[set.elements[0]] : 'var(--gold)'
  const classInfo = CLASS_DATA.find(c => c.id === set.classId)
  const className = useClassName(set.classId)
  const maxTier = tiers.at(-1)?.pieces ?? 0
  const setUrl = `${SITE}/${prefix}sets/${set.slug}`

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

      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        <Breadcrumbs crumbs={[
          { label: t('app_title'), to: homePath },
          { label: t('sets_page_title'), to: `/${prefix}sets` },
          { label: set.name, to: `/${prefix}sets/${set.slug}` },
        ]} />

        {/* Hero — the set's gear laid out like an inventory row */}
        <section
          className="relative overflow-hidden rounded-xl p-5 space-y-4"
          style={{
            animation:   'page-rise 520ms var(--ease-out) 0ms both',
            background:  `linear-gradient(135deg, color-mix(in srgb, ${accent} 14%, var(--surface-panel)), var(--surface-void))`,
            borderTop:   `2px solid color-mix(in srgb, ${accent} 55%, transparent)`,
            borderRight: '1px solid var(--metal-edge)',
            borderBottom:'1px solid var(--metal-edge)',
            borderLeft:  '1px solid var(--metal-edge)',
            boxShadow:   `0 0 28px color-mix(in srgb, ${accent} 12%, transparent), var(--inset-bevel)`,
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 15% 0%, color-mix(in srgb, ${accent} 12%, transparent) 0%, transparent 60%)` }} />
          <div className="relative flex flex-wrap gap-2">
            {items.map(it => (
              <span key={it.ankama_id} className="rounded-lg flex items-center justify-center" style={{ width: 56, height: 56, background: 'var(--surface-void)', border: `1px solid color-mix(in srgb, ${accent} 30%, var(--metal-edge))` }}>
                {it.image_url && <img src={it.image_url} alt="" width={50} height={50} decoding="async" className="object-contain" />}
              </span>
            ))}
          </div>
          <div className="relative space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-wide" style={{ color: accent }}>{set.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-mono font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 40%, transparent)', background: 'color-mix(in srgb, var(--gold) 8%, transparent)' }}>
                {t('sets_card_level', { level: set.level })}
              </span>
              <span className="px-2 py-0.5 rounded-full" style={{ color: 'var(--ink-muted)', border: '1px solid var(--metal-edge)' }}>{t('sets_card_pieces', { count: set.pieces })}</span>
              <ElementChips elements={set.elements} size="md" />
              {classInfo && (
                <Link to={`/${prefix}classes/${classInfo.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold hover:underline" style={{ color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 40%, transparent)' }}>
                  <Sparkles size={11} aria-hidden="true" />{t('set_page_class_set', { class: className })}
                </Link>
              )}
            </div>
            <p className="text-sm leading-relaxed max-w-3xl" style={{ color: 'var(--ink-muted)' }}>
              {t('set_page_intro', { name: set.name, level: set.level, count: set.pieces, tiers: maxTier, bonus: summary })}
            </p>
          </div>
          <div className="relative flex flex-wrap gap-2">
            <Link
              to={`${homePath}?set=${set.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ color: 'var(--surface-void)', background: 'linear-gradient(180deg, var(--gold-bright), var(--gold))', boxShadow: 'var(--glow-gold)' }}
            >
              <Hammer size={15} aria-hidden="true" />{t('set_page_cta_try')}
            </Link>
            <Link
              to={`/${prefix}sets`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:text-gold"
              style={{ borderColor: 'var(--metal-edge)', color: 'var(--ink-muted)' }}
            >
              <Layers size={15} aria-hidden="true" />{t('set_page_cta_all')}
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 items-start">
          <div className="space-y-6">
            <section className="space-y-3">
              <GuideHeading title={t('set_page_totals_title')} note={t('set_page_totals_note', { count: set.pieces })} />
              <div className="rounded-xl p-4 grid grid-cols-2 gap-x-4 gap-y-1.5" style={{ ...panelStyle, borderTop: `2px solid color-mix(in srgb, ${accent} 50%, transparent)` }}>
                {totals.map(s => <StatLine key={s.stat} stat={s.stat} min={s.value} />)}
              </div>
            </section>

            <section className="space-y-3">
              <GuideHeading title={t('set_page_tiers_title')} note={t('set_page_tiers_note')} />
              <div className="space-y-2">
                {tiers.map(tier => (
                  <div key={tier.pieces} className="rounded-lg overflow-hidden" style={panelStyle}>
                    <h3 className="px-3 py-1.5 font-mono text-[11px] font-bold" style={{ color: tier.pieces === maxTier ? 'var(--gold)' : 'var(--ink-muted)', borderBottom: '1px solid var(--metal-edge)', background: 'var(--surface-void)' }}>
                      {t('set_tier', { n: tier.pieces })}{tier.pieces === maxTier && ` · ${t('set_page_full_bonus')}`}
                    </h3>
                    <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1">
                      {tier.effects.map((e, i) => <StatLine key={i} stat={e.stat} min={e.min} max={e.max} />)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="space-y-3">
            <GuideHeading title={t('set_page_items_title', { count: items.length })} />
            <div className="space-y-2.5">
              {items.map((it, i) => {
                const stats = it.effects.filter(e => !isIgnored(e.stat) && !SPELL_ITEM_EFFECT_IDS.has(e.effect_id ?? -1))
                return (
                  <article key={it.ankama_id} className="rounded-xl overflow-hidden" style={{ ...panelStyle, animation: `page-rise 420ms var(--ease-out) ${Math.min(i * 40, 320)}ms both` }}>
                    <div className="flex gap-3 p-3">
                      <span className="flex-shrink-0 rounded-lg flex items-center justify-center" style={{ width: 56, height: 56, background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
                        {it.image_url && <img src={it.image_url} alt={it.name} width={50} height={50} loading="lazy" decoding="async" className="object-contain" />}
                      </span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div>
                          <h3 className="text-sm font-semibold leading-tight" style={{ color: 'var(--ink)' }}>{it.name}</h3>
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                            {t(`item_type_${it.type}`, { defaultValue: it.type })} · <span className="font-mono">{t('sets_card_level', { level: it.level })}</span>
                          </p>
                        </div>
                        {stats.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                            {stats.map((e, j) => <StatLine key={j} stat={e.stat} min={e.min} max={e.max} />)}
                          </div>
                        )}
                        {it.conditions && it.conditions.length > 0 && (
                          <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                            <span className="uppercase tracking-[0.14em] text-[9px] font-semibold mr-1.5">{t('conditions')}</span>
                            {it.conditions.map(c => `${STAT_META[c.stat] ? t(STAT_META[c.stat].tKey) : c.stat} ${c.operator} ${c.value}`).join(' · ')}
                          </p>
                        )}
                        {it.description && <p className="text-[11px] italic leading-snug" style={{ color: 'var(--ink-faint)' }}>{it.description}</p>}
                      </div>
                    </div>
                    <ItemSpellEffects effects={it.effects} compact />
                  </article>
                )
              })}
            </div>
          </section>
        </div>

        <section className="space-y-3">
          <GuideHeading title={t('set_page_builds_title')} note={builds.length > 0 ? t('set_page_builds_note', { name: set.name }) : undefined} />
          {builds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {builds.map(b => <GuideBuildCard key={b.id} build={b} />)}
            </div>
          ) : (
            <div className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3" style={panelStyle}>
              <p className="text-xs flex items-center gap-2" style={{ color: 'var(--ink-faint)' }}>
                <Users size={14} aria-hidden="true" style={{ color: 'var(--gold)' }} />{t('set_page_builds_empty', { name: set.name })}
              </p>
              <Link to={`${homePath}?set=${set.id}`} className="text-xs font-semibold hover:underline" style={{ color: 'var(--gold)' }}>{t('set_page_cta_try')}</Link>
            </div>
          )}
        </section>

        {related.length > 0 && (
          <section className="space-y-3">
            <GuideHeading title={t('set_page_related_title')} note={t('set_page_related_note')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {related.map((r, i) => <SetCard key={r.id} set={r} index={i} />)}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}

export default SetPage
