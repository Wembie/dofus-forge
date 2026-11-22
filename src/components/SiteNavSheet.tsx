import type { ElementType } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { BookOpen, ChevronRight, Compass, FolderOpen, Hammer, Info, Keyboard, Library, Settings, ShieldCheck, Wand2, Zap } from 'lucide-react'
import { Modal } from '@/ui'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'

type Item = { to: string; label: string; Icon: ElementType; current: boolean }

/** Every destination of the site, grouped; the header's menu on narrow screens. */
export function SiteNavSheet({ open, onClose, isAdmin, onSettings }: {
  open: boolean
  onClose: () => void
  isAdmin: boolean
  onSettings: () => void
}) {
  const { t, i18n } = useTranslation()
  const { pathname } = useLocation()
  const prefix = langPathPrefix(i18n.language)
  const home = `/${langPathRootSegment(i18n.language)}`
  const at = (segment: string) => new RegExp(`(?:^|/)${segment}(?:/|$)`).test(pathname)
  const item = (segment: string, label: string, Icon: ElementType): Item =>
    ({ to: `/${prefix}${segment}`, label: t(label), Icon, current: at(segment) })

  const groups: [string, Item[]][] = [
    ['nav_group_build', [
      { to: home, label: t('nav_workshop'), Icon: Hammer, current: pathname.replace(/\/+$/, '') === home.replace(/\/+$/, '') },
      item('explore', 'explore_open', Compass),
      item('my-builds', 'my_builds', FolderOpen),
      item('sets', 'nav_sets', Library),
    ]],
    ['nav_group_learn', [
      item('how-to-use', 'nav_how_to_use', BookOpen),
      item('forge-guide', 'nav_forge_guide', Wand2),
      item('damage-guide', 'nav_damage_guide', Zap),
      item('shortcuts', 'nav_shortcuts', Keyboard),
      item('about', 'nav_about', Info),
    ]],
    ...(isAdmin ? [['nav_group_admin', [item('admin', 'admin_nav', ShieldCheck)]] as [string, Item[]]] : []),
  ]

  return (
    <Modal open={open} onClose={onClose} title={t('nav_sheet_title')} size="sm">
      <nav className="site-sheet" aria-label={t('a11y_main_nav')}>
        {groups.map(([title, items]) => (
          <section key={title}>
            <h3>{t(title)}</h3>
            <ul>
              {items.map(({ to, label, Icon, current }) => (
                <li key={to}>
                  <Link to={to} onClick={onClose} aria-current={current ? 'page' : undefined}>
                    <Icon size={18} aria-hidden="true" />
                    {label}
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <button type="button" className="site-sheet-settings" onClick={() => { onClose(); onSettings() }}>
          <Settings size={18} aria-hidden="true" />
          {t('settings_title')}
        </button>
      </nav>
    </Modal>
  )
}
