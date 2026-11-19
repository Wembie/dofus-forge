import { useTranslation } from 'react-i18next'
import { Crosshair, EyeOff, Repeat2, Sparkles, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AppEffect } from '@/data/loaders.ts'
import { SPELL_ITEM_EFFECT_IDS } from '@/data/effectIds.ts'
import { STAT_META, statIconUrl } from './statDisplay.ts'
import './item-card.css'

const EFFECT_STAT_ICONS: Record<number, string> = {
  204: 'Range',
  207: 'AP',
  208: 'Range',
  226: '% Critical',
  243: 'Damage',
  245: 'Damage',
  274: 'Range',
}

const EFFECT_SPECIAL_ICONS: Record<number, LucideIcon> = {
  205: EyeOff,
  209: EyeOff,
  227: Timer,
  240: Crosshair,
  276: Repeat2,
  279: Repeat2,
}

/** An item's effects on class spells ("Flecha Perseguidora: -1 PA"), one per line. */
export function ItemSpellEffects({ effects }: { effects: AppEffect[]; compact?: boolean }) {
  const { t } = useTranslation()
  const spellEffects = effects.filter(effect =>
    effect.formatted && SPELL_ITEM_EFFECT_IDS.has(effect.effect_id ?? -1)
  )
  if (spellEffects.length === 0) return null

  return (
    <section className="item-spell-effects">
      <h4><Sparkles size={11} aria-hidden="true" />{t('item_spell_effects')}</h4>
      <ul>
        {spellEffects.map((effect, i) => {
          const separator = effect.formatted!.indexOf(':')
          const spellName = separator >= 0 ? effect.formatted!.slice(0, separator).trim() : effect.formatted!
          const description = separator >= 0 ? effect.formatted!.slice(separator + 1).trim() : ''
          const meta = STAT_META[EFFECT_STAT_ICONS[effect.effect_id ?? -1] ?? 'Damage']
          const SpecialIcon = EFFECT_SPECIAL_ICONS[effect.effect_id ?? -1]
          return (
            <li key={`${effect.effect_id}-${effect.min}-${i}`}>
              {SpecialIcon
                ? <SpecialIcon size={15} strokeWidth={1.8} aria-hidden="true" />
                : <img src={statIconUrl(meta.icon)} alt="" width={15} height={15} />}
              <span>
                <b>{spellName}</b>
                {description && <small style={{ color: meta.color }}>{description}</small>}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
