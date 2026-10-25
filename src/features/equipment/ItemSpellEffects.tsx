import { useTranslation } from 'react-i18next'
import type { AppEffect } from '@/data/loaders.ts'
import { SPELL_ITEM_EFFECT_IDS } from '@/data/effectIds.ts'

export function ItemSpellEffects({ effects, compact = false }: { effects: AppEffect[]; compact?: boolean }) {
  const { t } = useTranslation()
  const spellEffects = effects.filter(effect =>
    effect.formatted && SPELL_ITEM_EFFECT_IDS.has(effect.effect_id ?? -1)
  )
  if (spellEffects.length === 0) return null

  return (
    <div
      className={compact ? 'px-3 pt-1.5 pb-2' : 'px-3 pt-2 pb-2'}
      style={{ borderTop: '1px solid var(--metal-edge)' }}
    >
      <p className="text-[9px] tracking-[0.18em] uppercase font-semibold mb-1.5" style={{ color: 'var(--ink-faint)' }}>
        {t('item_spell_effects')}
      </p>
      <div className="space-y-0.5">
        {spellEffects.map((effect, i) => (
          <p key={`${effect.effect_id}-${effect.min}-${i}`} className="text-[11px] leading-snug" style={{ color: 'var(--gold)' }}>
            {effect.formatted}
          </p>
        ))}
      </div>
    </div>
  )
}
