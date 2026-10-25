import { useTranslation } from 'react-i18next'
import { Crosshair, EyeOff, Repeat2, Sparkles, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AppEffect } from '@/data/loaders.ts'
import { SPELL_ITEM_EFFECT_IDS } from '@/data/effectIds.ts'
import { STAT_META, statIconUrl } from './statDisplay.ts'

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

export function ItemSpellEffects({ effects, compact = false }: { effects: AppEffect[]; compact?: boolean }) {
  const { t } = useTranslation()
  const spellEffects = effects.filter(effect =>
    effect.formatted && SPELL_ITEM_EFFECT_IDS.has(effect.effect_id ?? -1)
  )
  if (spellEffects.length === 0) return null

  return (
    <div
      className={compact ? 'px-3 pt-1.5 pb-2' : 'px-3 pt-2.5 pb-2.5'}
      style={{ borderTop: '1px solid var(--metal-edge)' }}
    >
      <p className="text-[9px] tracking-[0.16em] uppercase font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--ink-faint)' }}>
        <Sparkles size={11} style={{ color: 'var(--gold)' }} />
        {t('item_spell_effects')}
      </p>
      <div className="space-y-1">
        {spellEffects.map((effect, i) => {
          const separator = effect.formatted!.indexOf(':')
          const spellName = separator >= 0 ? effect.formatted!.slice(0, separator).trim() : effect.formatted!
          const description = separator >= 0 ? effect.formatted!.slice(separator + 1).trim() : ''
          const meta = STAT_META[EFFECT_STAT_ICONS[effect.effect_id ?? -1] ?? 'Damage']
          const SpecialIcon = EFFECT_SPECIAL_ICONS[effect.effect_id ?? -1]
          const iconSize = compact ? 14 : 16
          const tileSize = compact ? 24 : 28

          return (
            <div
              key={`${effect.effect_id}-${effect.min}-${i}`}
              className="flex items-center gap-2 rounded-md px-2 py-1"
              style={{
                background: 'color-mix(in srgb, var(--gold) 4%, var(--surface-panel))',
                border: '1px solid color-mix(in srgb, var(--gold) 12%, var(--metal-edge))',
              }}
            >
              <span
                className="flex flex-shrink-0 items-center justify-center rounded"
                style={{
                  width: tileSize,
                  height: tileSize,
                  background: 'color-mix(in srgb, var(--gold) 9%, var(--surface-void))',
                  border: '1px solid color-mix(in srgb, var(--gold) 18%, var(--metal-edge))',
                }}
              >
                {SpecialIcon
                  ? <SpecialIcon size={iconSize} strokeWidth={1.8} style={{ color: 'var(--gold)' }} />
                  : <img
                      src={statIconUrl(meta.icon)}
                      alt=""
                      width={iconSize}
                      height={iconSize}
                      className="object-contain"
                    />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold leading-tight" style={{ color: 'var(--ink)' }}>
                  {spellName}
                </span>
                {description && (
                  <span className="block truncate text-[10px] leading-tight mt-0.5" style={{ color: meta.color }}>
                    {description}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
