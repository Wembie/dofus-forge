import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Flame, Scale, Gauge, Pin, Lock, Sparkles, Anvil, Trophy, HelpCircle, BookOpen, ChevronDown, type LucideIcon } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { ForgeScene } from '@/features/optimizer/ForgeParts.tsx'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'

type Layout = 'steps' | 'grid' | 'heat' | 'faq'
type Section = { id: string; icon: LucideIcon; points: number; layout: Layout; example?: boolean }

// Each section's text lives in forgeguide_<id>_title / _intro / _<n>_title /
// _<n>_body (and _example) in every locale.
const SECTIONS: Section[] = [
  { id: 'start',      icon: Flame,      points: 5, layout: 'steps' },
  { id: 'order',      icon: Scale,      points: 4, layout: 'grid', example: true },
  { id: 'intensity',  icon: Gauge,      points: 4, layout: 'heat' },
  { id: 'items',      icon: Pin,        points: 5, layout: 'grid', example: true },
  { id: 'slots',      icon: Lock,       points: 2, layout: 'grid' },
  { id: 'forgemagic', icon: Sparkles,   points: 4, layout: 'grid' },
  { id: 'forging',    icon: Anvil,      points: 4, layout: 'grid' },
  { id: 'results',    icon: Trophy,     points: 5, layout: 'grid' },
  { id: 'faq',        icon: HelpCircle, points: 5, layout: 'faq' },
]

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

// Quick → eternal: how hot each forge burns.
const HEAT = [0.35, 0.6, 0.85, 1]

function Card({ children, accent = 'var(--metal-edge)' }: { children: ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl p-3.5 h-full" style={{ background: 'var(--surface-void)', border: `1px solid ${accent}` }}>
      {children}
    </div>
  )
}

function SectionBody({ s }: { s: Section }) {
  const { t } = useTranslation()
  const key = (n: number, part: 'title' | 'body') => `forgeguide_${s.id}_${n}_${part}`

  if (s.layout === 'steps') {
    return (
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {range(s.points).map(n => (
          <li key={n} className="relative">
            <Card>
              <span
                className="flex items-center justify-center rounded-full font-display text-xs font-bold mb-2"
                style={{ width: 26, height: 26, background: 'color-mix(in srgb, var(--fire) 14%, var(--surface-stone))', border: '1px solid var(--fire)', color: 'var(--fire)' }}
              >
                {n}
              </span>
              <h3 className="font-display text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{t(key(n, 'title'))}</h3>
              <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--ink-muted)' }}>{t(key(n, 'body'))}</p>
            </Card>
          </li>
        ))}
      </ol>
    )
  }

  if (s.layout === 'heat') {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {range(s.points).map(n => {
          const heat = HEAT[n - 1]
          const color = n === s.points ? 'var(--fire)' : 'var(--gold)'
          return (
            <Card key={n} accent={`color-mix(in srgb, ${color} ${Math.round(heat * 45)}%, var(--metal-edge))`}>
              <h3 className="font-display text-[13px] font-bold" style={{ color }}>{t(key(n, 'title'))}</h3>
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--surface-stone)' }} aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${heat * 100}%`, background: `linear-gradient(90deg, var(--gold), ${n === s.points ? 'var(--fire)' : 'color-mix(in srgb, var(--fire) 60%, var(--gold))'})` }} />
              </div>
              <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--ink-muted)' }}>{t(key(n, 'body'))}</p>
            </Card>
          )
        })}
      </div>
    )
  }

  if (s.layout === 'faq') {
    return (
      <div className="space-y-2">
        {range(s.points).map(n => (
          <details key={n} className="group rounded-xl" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
            <summary className="flex items-center gap-2 cursor-pointer list-none px-3.5 py-2.5 text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
              <span className="flex-1">{t(key(n, 'title'))}</span>
              <ChevronDown size={14} className="flex-shrink-0 transition-transform group-open:rotate-180" style={{ color: 'var(--gold)' }} />
            </summary>
            <p className="px-3.5 pb-3 text-xs leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{t(key(n, 'body'))}</p>
          </details>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {range(s.points).map(n => (
        <div key={n} className={n === s.points && n % 2 === 1 ? 'sm:col-span-2' : undefined}>
          <Card>
            <h3 className="font-display text-[13px] font-bold" style={{ color: 'var(--gold)' }}>{t(key(n, 'title'))}</h3>
            <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--ink-muted)' }}>{t(key(n, 'body'))}</p>
          </Card>
        </div>
      ))}
    </div>
  )
}

export function ForgeGuidePage() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const homePath = `/${langPathRootSegment(i18n.language)}`
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'forge-guide', {
    title: t('forgeguide_seo_title'),
    description: t('forgeguide_seo_description'),
  })

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <header
          className="relative overflow-hidden rounded-2xl px-5 py-6 sm:px-8 sm:py-8 grid gap-6 md:grid-cols-[1fr_auto] items-center"
          style={{
            background: 'radial-gradient(ellipse at 85% 90%, color-mix(in srgb, var(--fire) 16%, var(--surface-void)) 0%, var(--surface-void) 65%)',
            border:     '1px solid color-mix(in srgb, var(--gold) 35%, var(--metal-edge))',
            animation:  'col-rise 520ms var(--ease-out) both',
          }}
        >
          <div>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--surface-void)', background: 'var(--gold)' }}
            >
              <Sparkles size={10} /> {t('forgeguide_kicker')}
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mt-3" style={{ color: 'var(--gold)' }}>
              {t('forgeguide_title')}
            </h1>
            <p className="text-sm leading-relaxed mt-3 max-w-2xl" style={{ color: 'var(--ink-muted)' }}>
              {t('forgeguide_intro')}
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              <Link
                to={`${homePath}?forge=1`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:brightness-125"
                style={{ background: 'color-mix(in srgb, var(--gold) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 55%, transparent)', color: 'var(--gold)', boxShadow: '0 0 18px -8px var(--fire)' }}
              >
                <Flame size={13} /> {t('forgeguide_cta_open')}
              </Link>
              <Link
                to={`/${prefix}how-to-use`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors hover:text-[var(--gold)]"
                style={{ borderColor: 'var(--metal-edge)', color: 'var(--ink-muted)' }}
              >
                <BookOpen size={13} /> {t('forgeguide_cta_howto')}
              </Link>
            </div>
          </div>
          <div className="hidden sm:flex justify-center" aria-hidden="true">
            <ForgeScene heat={0.85} burst={0} tempering={false} />
          </div>
        </header>

        {/* Contents */}
        <nav aria-label={t('forgeguide_toc')} style={{ animation: 'col-rise 420ms var(--ease-out) 80ms both' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--ink-faint)' }}>{t('forgeguide_toc')}</p>
          <ul className="flex flex-wrap gap-1.5">
            {SECTIONS.map(s => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors hover:text-[var(--gold)] hover:border-[var(--gold)]"
                  style={{ borderColor: 'var(--metal-edge)', color: 'var(--ink-muted)', background: 'var(--surface-void)' }}
                >
                  <s.icon size={11} /> {t(`forgeguide_${s.id}_title`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {SECTIONS.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            className="scroll-mt-20 space-y-3"
            style={{ animation: `col-rise 420ms var(--ease-out) ${120 + Math.min(i, 4) * 60}ms both` }}
          >
            <div className="flex items-start gap-3">
              <span
                className="flex items-center justify-center rounded-xl flex-shrink-0"
                style={{ width: 34, height: 34, background: 'color-mix(in srgb, var(--gold) 12%, var(--surface-stone))', border: '1px solid color-mix(in srgb, var(--gold) 45%, transparent)', color: 'var(--gold)' }}
              >
                <s.icon size={16} />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold" style={{ color: 'var(--ink)' }}>{t(`forgeguide_${s.id}_title`)}</h2>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--ink-muted)' }}>{t(`forgeguide_${s.id}_intro`)}</p>
              </div>
            </div>
            <SectionBody s={s} />
            {s.example && (
              <p
                className="rounded-xl px-3.5 py-2.5 text-xs leading-relaxed"
                style={{ background: 'color-mix(in srgb, var(--gold) 7%, transparent)', border: '1px dashed color-mix(in srgb, var(--gold) 45%, transparent)', color: 'var(--ink-muted)' }}
              >
                <strong className="font-display" style={{ color: 'var(--gold)' }}>✦ {t('forgeguide_example')}: </strong>
                {t(`forgeguide_${s.id}_example`)}
              </p>
            )}
          </section>
        ))}

        <div className="flex justify-center pt-2">
          <Link
            to={`${homePath}?forge=1`}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:brightness-125"
            style={{ background: 'color-mix(in srgb, var(--gold) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 55%, transparent)', color: 'var(--gold)', boxShadow: '0 0 22px -8px var(--fire)' }}
          >
            <Flame size={15} /> {t('forgeguide_cta_open')}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
