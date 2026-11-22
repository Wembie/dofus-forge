import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart2, ChevronDown, Flame, HelpCircle, Percent, Shield, Sword, Target, Zap, type LucideIcon } from 'lucide-react'
import { langPathPrefix, langPathRootSegment } from '@/i18n/langPath.ts'
import { usePageSeo, type SeoLang } from '@/seo/useSeoMeta.ts'
import { Actions, GoLink, Reading, SectionHead } from '@/features/reading/Reading.tsx'

type Section = { id: string; Icon: LucideIcon; count: number; layout: 'steps' | 'grid' | 'faq' | 'chart'; example?: boolean }

const SECTIONS: Section[] = [
  { id: 'order',      Icon: Flame,      count: 5, layout: 'steps' },
  { id: 'mastery',    Icon: Sword,      count: 3, layout: 'grid', example: true },
  { id: 'percent',    Icon: Percent,    count: 4, layout: 'grid', example: true },
  { id: 'critical',   Icon: Zap,        count: 2, layout: 'grid' },
  { id: 'resistance', Icon: Shield,     count: 3, layout: 'grid', example: true },
  { id: 'push',       Icon: Target,     count: 2, layout: 'grid' },
  { id: 'example',    Icon: BarChart2,  count: 0, layout: 'chart' },
  { id: 'faq',        Icon: HelpCircle, count: 4, layout: 'faq' },
]

/** A stacked fraction (numerator, rule, denominator), like a textbook equation. */
function Frac({ num, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <span className="rd-frac">
      <span className="rd-frac-num">{num}</span>
      <span className="rd-frac-den">{den}</span>
    </span>
  )
}

/** A floor bracket drawn with CSS (border notches, stretched to its content's
 * height via flex), not the ⌊ ⌋ glyph: some monospace stacks render that
 * glyph as a blank box or a plain pipe, and it can't stretch around a Frac. */
function Floor({ children }: { children: ReactNode }) {
  return (
    <span className="rd-floor">
      <i className="rd-floor-l" aria-hidden="true" />
      {children}
      <i className="rd-floor-r" aria-hidden="true" />
    </span>
  )
}

/** One line of the equation: label, "=", then the math, vertically centered
 * and free to wrap onto a new line as whole chunks on narrow screens. */
function Eq({ children }: { children: ReactNode }) {
  return <div className="rd-eq">{children}</div>
}

/** A flat, single-color bar: no gradients, no glow, just a labelled value next to its share of `max`. */
function Bars({ rows }: { rows: { label: string; value: number; max: number; variant?: 'final' | 'resist' }[] }) {
  return (
    <ol className="rd-bars">
      {rows.map((r, i) => (
        <li key={i} className={r.variant === 'final' ? 'is-final' : r.variant === 'resist' ? 'is-resist' : ''}>
          <span>{r.label}</span>
          <em><i style={{ width: `${Math.max(2, Math.min(100, (r.value / r.max) * 100))}%` }} /></em>
          <b>{r.value}</b>
        </li>
      ))}
    </ol>
  )
}

// Worked example, computed exactly as src/features/spells/spellDamage.ts's
// damageBreakdown does (floor(base × (100+characteristic+power)/100) + fixed,
// then × every % multiplier at once, one floor at the end). Kept as plain
// constants here rather than importing the engine, so the guide never needs
// a mock StatBlock. The arithmetic is still the real formula, not invented.
const EX = {
  base: 100, characteristic: 300, power: 50, fixed: 50, rangePct: 10, kindPct: 15,
  resistFixed: 50, resistPercent: 20, critFlat: 80,
}
function damageExample(critFlat = 0) {
  const scaled = Math.floor(EX.base * (100 + EX.characteristic + EX.power) / 100)
  const beforePct = scaled + EX.fixed + critFlat
  const total = Math.floor(beforePct * (100 + EX.rangePct) * (100 + EX.kindPct) / 10000)
  const afterFixed = Math.max(0, total - EX.resistFixed)
  const final = Math.floor(afterFixed * (100 - EX.resistPercent) / 100)
  return { scaled, beforePct, total, final }
}

export function DamageGuidePage() {
  const { t, i18n } = useTranslation()
  const prefix = langPathPrefix(i18n.language)
  const homePath = `/${langPathRootSegment(i18n.language)}`
  usePageSeo(i18n.language.slice(0, 2) as SeoLang, 'damage-guide', {
    title: t('dmgguide_seo_title'),
    description: t('dmgguide_seo_description'),
  })

  const hit = damageExample(0)
  const crit = damageExample(EX.critFlat)
  const masteryBase100 = Math.floor(100 * (100 + 0 + 50) / 100)
  const masteryBase100b = Math.floor(100 * (100 + 10 + 50) / 100)
  const masteryBase50 = Math.floor(50 * (100 + 0 + 50) / 100)
  const masteryBase50b = Math.floor(50 * (100 + 10 + 50) / 100)

  return (
    <Reading
      className="rd-forge"
      kicker={t('forgeguide_kicker')}
      title={t('dmgguide_title')}
      intro={
        <>
          <p>{t('dmgguide_intro')}</p>
          <Actions>
            <GoLink to={`${homePath}`} primary><Sword size={17} aria-hidden="true" />{t('dmgguide_cta_open')}</GoLink>
            <GoLink to={`/${prefix}forge-guide`}><Flame size={17} aria-hidden="true" />{t('dmgguide_cta_forge')}</GoLink>
          </Actions>
        </>
      }
      tocLabel={t('forgeguide_toc')}
      toc={SECTIONS.map(s => ({ id: s.id, label: t(`dmgguide_${s.id}_title`), Icon: s.Icon }))}
    >
      {SECTIONS.map(s => {
        const items = Array.from({ length: s.count }, (_, i) => i + 1)
        return (
          <section key={s.id} id={s.id} className="rd-section">
            <SectionHead Icon={s.Icon}>{t(`dmgguide_${s.id}_title`)}</SectionHead>
            <p className="rd-lead">{t(`dmgguide_${s.id}_intro`)}</p>
            {s.id === 'order' && (
              <div className="rd-formula">
                <p className="rd-example"><b>{t('dmgguide_formula_title')}</b></p>
                <Eq>
                  <b>{t('dmgguide_t_pct_group')}</b> = (100+{t('dmgguide_t_pct_range')}) × (100+{t('dmgguide_t_pct_kind')}) × (100+{t('dmgguide_t_pct_final')}) × (100+{t('dmgguide_t_pct_vuln')})
                </Eq>
                <Eq>
                  <b>{t('dmgguide_t_scaled')}</b> = <Floor><Frac num={<>{t('dmgguide_t_roll')} × (100 + {t('dmgguide_t_char')} + {t('stat_power')})</>} den="100" /></Floor>
                </Eq>
                <Eq>
                  <b>{t('dmgguide_t_before_pct')}</b> = {t('dmgguide_t_scaled')} + {t('dmgguide_t_flat')}
                </Eq>
                <Eq>
                  <b>{t('dmgguide_t_raw')}</b> = <Floor><Frac num={<>{t('dmgguide_t_before_pct')} × {t('dmgguide_t_pct_group')}</>} den={<>100<sup>4</sup></>} /></Floor>
                </Eq>
                <Eq>
                  <b>{t('dmgguide_t_final')}</b> = max(0, <Floor><Frac num={<>({t('dmgguide_t_raw')} − {t('dmgguide_t_resist_flat')}) × (100 − {t('dmgguide_t_pct_resist')})</>} den="100" /></Floor>)
                </Eq>
                <p className="rd-formula-note">{t('dmgguide_formula_note')}</p>
              </div>
            )}
            {s.layout === 'faq' ? (
              <div className="rd-faq">
                {items.map(n => (
                  <details key={n}>
                    <summary>
                      {t(`dmgguide_faq_${n}_title`)}
                      <ChevronDown size={16} aria-hidden="true" />
                    </summary>
                    <p>{t(`dmgguide_faq_${n}_body`)}</p>
                  </details>
                ))}
              </div>
            ) : s.layout === 'chart' ? (
              <>
                <p className="rd-example"><b>{t('forgeguide_example')}</b>{t('dmgguide_example_scenario')}</p>
                <Bars rows={[
                  { label: t('dmgguide_example_step_scaled'), value: hit.scaled, max: hit.total },
                  { label: t('dmgguide_example_step_before'), value: hit.beforePct, max: hit.total },
                  { label: t('dmgguide_example_step_total'), value: hit.total, max: hit.total },
                  { label: t('dmgguide_example_step_resisted'), value: hit.final, max: hit.total, variant: 'final' },
                ]} />
                <p className="rd-example">
                  <b>{t('dmgguide_example_crit_label')}</b>
                  {t('dmgguide_example_crit_body', { normal: hit.final, crit: crit.final })}
                </p>
              </>
            ) : (
              <ol className={`rd-cards is-${s.layout}`}>
                {items.map(n => (
                  <li key={n}>
                    {s.layout === 'steps' && <span className="rd-card-n">{n}</span>}
                    <h3>{t(`dmgguide_${s.id}_${n}_title`)}</h3>
                    <p>{t(`dmgguide_${s.id}_${n}_body`)}</p>
                  </li>
                ))}
              </ol>
            )}
            {s.id === 'mastery' && (
              <Bars rows={[
                { label: t('dmgguide_mastery_bar_100_0'), value: masteryBase100, max: masteryBase100b },
                { label: t('dmgguide_mastery_bar_100_10'), value: masteryBase100b, max: masteryBase100b },
                { label: t('dmgguide_mastery_bar_50_0'), value: masteryBase50, max: masteryBase100b },
                { label: t('dmgguide_mastery_bar_50_10'), value: masteryBase50b, max: masteryBase100b },
              ]} />
            )}
            {s.example && s.id !== 'example' && (
              <p className="rd-example">
                <b>{t('forgeguide_example')}</b>
                {t(`dmgguide_${s.id}_example`)}
              </p>
            )}
          </section>
        )
      })}
      <Actions>
        <GoLink to={`${homePath}`} primary><Sword size={17} aria-hidden="true" />{t('dmgguide_cta_open')}</GoLink>
      </Actions>
    </Reading>
  )
}

export default DamageGuidePage
