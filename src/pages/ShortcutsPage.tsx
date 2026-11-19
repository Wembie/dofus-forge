import { useTranslation } from 'react-i18next'
import { Hammer, Keyboard, MousePointerClick, Smartphone, type LucideIcon } from 'lucide-react'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { Actions, GoLink, Reading, SectionHead } from '@/features/reading/Reading.tsx'

const GROUPS: { id: string; Icon: LucideIcon; items: [string, string[]?][] }[] = [
  { id: 'mouse', Icon: MousePointerClick, items: [['drag_ring'], ['drag_dofus'], ['rightclick'], ['slot_click'], ['slot_dblclick']] },
  { id: 'workshop', Icon: Keyboard, items: [['open_forge', ['F']], ['open_spells', ['H']], ['open_pvp', ['S']], ['open_dofus', ['1–6']], ['catalog_search', ['/']]] },
  { id: 'slot', Icon: Keyboard, items: [['slot_change', ['C']], ['slot_runes', ['R']], ['slot_pin', ['P']], ['slot_remove', ['Supr']]] },
  { id: 'keyboard', Icon: Keyboard, items: [['undo', ['Ctrl', 'Z']], ['redo', ['Ctrl', 'Shift', 'Z']], ['palette', ['Ctrl', 'K']], ['palette_nav', ['↑', '↓', '↵', 'Esc']]] },
  { id: 'mobile', Icon: Smartphone, items: [['mobile_tap'], ['mobile_nodrag'], ['mobile_pin']] },
]

export function ShortcutsPage() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const homePath = `/${langPathRootSegment(i18n.language)}`
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'shortcuts', {
    title: t('shortcuts_seo_title'),
    description: t('shortcuts_seo_description'),
  })

  return (
    <Reading
      kicker={t('reading_kicker_guide')}
      title={t('shortcuts_title')}
      intro={<p>{t('shortcuts_intro')}</p>}
      toc={GROUPS.map(g => ({ id: `group-${g.id}`, label: t(`shortcuts_group_${g.id}_title`), Icon: g.Icon }))}
    >
      {GROUPS.map(g => (
        <section key={g.id} id={`group-${g.id}`} className="rd-section">
          <SectionHead Icon={g.Icon}>{t(`shortcuts_group_${g.id}_title`)}</SectionHead>
          <dl className="rd-keys">
            {g.items.map(([key, combo]) => (
              <div key={key}>
                <dt>
                  {combo && (
                    <span className="rd-combo">
                      {combo.map((k, i) => (
                        <span key={k}>
                          {i > 0 && combo.length < 4 && <i aria-hidden="true">+</i>}
                          <kbd>{k}</kbd>
                        </span>
                      ))}
                    </span>
                  )}
                  {t(`shortcuts_${key}_title`)}
                </dt>
                <dd>{t(`shortcuts_${key}_body`)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <Actions>
        <GoLink to={homePath} primary><Hammer size={17} aria-hidden="true" />{t('shortcuts_cta_start')}</GoLink>
        <GoLink to={`/${prefix}how-to-use`}>{t('shortcuts_cta_howto')}</GoLink>
      </Actions>
    </Reading>
  )
}

export default ShortcutsPage
