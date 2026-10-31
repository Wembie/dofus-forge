import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { MousePointerClick, Keyboard, Smartphone, type LucideIcon } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader.tsx'
import { SiteFooter } from '@/components/SiteFooter.tsx'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'

type Group = { id: string; icon: LucideIcon; items: string[] }

// Each item's text lives in shortcuts_<item>_title / _body in every locale.
const GROUPS: Group[] = [
  { id: 'mouse',    icon: MousePointerClick, items: ['drag_ring', 'drag_dofus', 'rightclick'] },
  { id: 'keyboard', icon: Keyboard,          items: ['undo', 'redo', 'palette', 'palette_nav'] },
  { id: 'mobile',   icon: Smartphone,        items: ['mobile_tap', 'mobile_nodrag', 'mobile_pin'] },
]

// Key combos are the same label everywhere regardless of language — only the
// surrounding copy (what the shortcut does) needs translating.
const KEYS: Record<string, string[]> = {
  undo:        ['Ctrl', 'Z'],
  redo:        ['Ctrl', 'Shift', 'Z'],
  palette:     ['Ctrl', 'K'],
  palette_nav: ['↑', '↓', '↵', 'Esc'],
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
      style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)', color: 'var(--ink-faint)' }}
    >
      {children}
    </kbd>
  )
}

function ShortcutCard({ id }: { id: string }) {
  const { t } = useTranslation()
  const keys = KEYS[id]
  return (
    <div className="rounded-xl p-3.5 h-full" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-[13px] font-bold" style={{ color: 'var(--gold)' }}>{t(`shortcuts_${id}_title`)}</h3>
        {keys && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {keys.map((k, i) => (
              <span key={i} className="flex items-center gap-1">
                <Kbd>{k}</Kbd>
                {i < keys.length - 1 && <span style={{ color: 'var(--ink-faint)' }}>+</span>}
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--ink-muted)' }}>{t(`shortcuts_${id}_body`)}</p>
    </div>
  )
}

export function ShortcutsPage() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const homePath = `/${langPathRootSegment(i18n.language)}`
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'shortcuts', {
    title: t('shortcuts_seo_title'),
    description: t('shortcuts_seo_description'),
  })

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text flex flex-col">
      <SiteHeader />

      <main id="main-content" className="flex-1 max-w-3xl w-full mx-auto px-4 py-10 space-y-8">
        <div style={{ animation: 'page-rise 520ms var(--ease-out) 0ms both' }}>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--gold)' }}>
            {t('shortcuts_title')}
          </h1>
          <p className="text-sm leading-relaxed mt-3 max-w-2xl" style={{ color: 'var(--ink-muted)' }}>
            {t('shortcuts_intro')}
          </p>
        </div>

        {GROUPS.map((g, gi) => (
          <section key={g.id} className="space-y-3" style={{ animation: `page-rise 420ms var(--ease-out) ${80 + gi * 60}ms both` }}>
            <div className="flex items-center gap-2">
              <span
                className="flex items-center justify-center rounded-xl flex-shrink-0"
                style={{ width: 30, height: 30, background: 'color-mix(in srgb, var(--gold) 12%, var(--surface-stone))', border: '1px solid color-mix(in srgb, var(--gold) 45%, transparent)', color: 'var(--gold)' }}
              >
                <g.icon size={14} />
              </span>
              <h2 className="font-display text-base font-bold" style={{ color: 'var(--ink)' }}>
                {t(`shortcuts_group_${g.id}_title`)}
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.items.map(id => <ShortcutCard key={id} id={id} />)}
            </div>
          </section>
        ))}

        <div className="flex flex-wrap gap-3">
          <Link
            to={homePath}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            style={{ borderColor: 'var(--metal-edge)', color: 'var(--gold)' }}
          >
            {t('shortcuts_cta_start')}
          </Link>
          <Link
            to={`/${prefix}how-to-use`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            style={{ borderColor: 'var(--metal-edge)', color: 'var(--ink-muted)' }}
          >
            {t('shortcuts_cta_howto')}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

export default ShortcutsPage
