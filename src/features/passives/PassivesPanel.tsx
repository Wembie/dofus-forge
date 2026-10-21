import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Minus, Plus, Sparkles, RotateCcw } from 'lucide-react'
import { Frame } from '@/ui'
import type { AppItem } from '@/data/loaders.ts'
import {
  ITEM_PASSIVES, TEXT_ONLY_PASSIVES, passiveBonus,
  type PassiveBonus, type PassiveControl, type PassiveState,
} from '@/engine/passives.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { bonusParts } from './passiveLabels.ts'

type Props = {
  /** Equipped items, in slot order; only those with a passive are shown. */
  items:     AppItem[]
  state:     PassiveState
  /** Omitted on read-only views (a published build). */
  onChange?: (id: string, value: number) => void
  onReset?:  () => void
}

/** Combat passives of the equipped Dofus, Prysmaradites and legendaries, with their combined bonus. */
export function PassivesPanel({ items, state, onChange, onReset }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const withPassive = items.filter(it => ITEM_PASSIVES.has(it.ankama_id) || TEXT_ONLY_PASSIVES.has(it.ankama_id))
  const total = passiveBonus(withPassive.map(it => it.ankama_id), state)
  if (withPassive.length === 0) return null

  const activeCount = withPassive.filter(it => (ITEM_PASSIVES.get(it.ankama_id) ?? []).some(c => (state[c.id] ?? 0) > 0)).length
  const readOnly = !onChange

  return (
    <section aria-labelledby={titleId} data-testid="passives-panel">
      <div className="flex items-center gap-2 pt-3 mb-2" style={{ borderTop: '1px solid var(--metal-edge)' }}>
        <h2 id={titleId} className="flex items-center gap-1.5 font-display text-forge-gold text-sm uppercase tracking-widest flex-1">
          <Sparkles size={13} /> {t('passives_title')}
        </h2>
        <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>
          {t('passives_active_count', { count: activeCount, total: withPassive.length })}
        </span>
        {onReset && activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded transition-colors hover:text-gold"
            style={{ color: 'var(--ink-faint)' }}
          >
            <RotateCcw size={11} /> {t('passives_reset')}
          </button>
        )}
      </div>

      <TotalStrip bonus={total} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {withPassive.map(item => (
          <PassiveCard key={item.ankama_id} item={item} state={state} onChange={onChange} />
        ))}
      </div>

      {!readOnly && (
        <p className="mt-2 text-[10px] leading-snug" style={{ color: 'var(--ink-faint)' }}>{t('passives_note')}</p>
      )}
    </section>
  )
}

function BonusChips({ bonus, size = 'md' }: { bonus: PassiveBonus; size?: 'sm' | 'md' }) {
  const { t } = useTranslation()
  const parts = bonusParts(bonus)
  const small = size === 'sm'
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {parts.map(p => (
        <span
          key={p.key}
          className={`inline-flex items-center gap-1 rounded-md ${small ? 'px-1 py-px text-[10px]' : 'px-1.5 py-0.5 text-[11px]'}`}
          style={{
            color:      p.negative ? 'var(--negative)' : p.color,
            background: `color-mix(in srgb, ${p.negative ? 'var(--negative)' : p.color} 10%, transparent)`,
            border:     `1px solid color-mix(in srgb, ${p.negative ? 'var(--negative)' : p.color} 22%, transparent)`,
          }}
        >
          <img src={statIconUrl(p.icon)} alt="" width={small ? 10 : 12} height={small ? 10 : 12} className="object-contain" />
          <span className="font-mono font-bold tabular-nums">{p.value}</span>
          <span>{t(p.tKey)}</span>
        </span>
      ))}
    </span>
  )
}

function TotalStrip({ bonus }: { bonus: PassiveBonus }) {
  const { t } = useTranslation()
  const empty = Object.keys(bonus).length === 0
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-2 mb-2.5"
      style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}
      aria-live="polite"
    >
      <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--gold-deep)' }}>{t('passives_total')}</span>
      {empty
        ? <span className="text-[11px] italic" style={{ color: 'var(--ink-faint)' }}>{t('passives_none_active')}</span>
        : <BonusChips bonus={bonus} />}
    </div>
  )
}

function PassiveCard({ item, state, onChange }: { item: AppItem; state: PassiveState; onChange?: Props['onChange'] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const controls = ITEM_PASSIVES.get(item.ankama_id) ?? []
  const active = controls.some(c => (state[c.id] ?? 0) > 0)
  // "Name: • effect • effect" → name + bullet lines.
  const [, ...bullets] = (item.ability ?? '').split('•').map(s => s.trim())
  const abilityName = (item.ability ?? '').split(':')[0]?.trim()

  return (
    <Frame material="panel" padding="none" className="rounded-xl min-w-0">
      <div
        className="flex items-center gap-2 px-2.5 py-2"
        style={{ background: 'var(--surface-void)', borderBottom: '1px solid var(--metal-edge)' }}
      >
        {item.image_url && <img src={item.image_url} alt="" width={28} height={28} loading="lazy" className="object-contain flex-shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold truncate" style={{ color: 'var(--gold)' }} title={item.name}>{item.name}</p>
          {abilityName && abilityName !== item.name && <p className="text-[10px] truncate" style={{ color: 'var(--ink-faint)' }}>{abilityName}</p>}
        </div>
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: active ? 'var(--gold)' : 'var(--metal-edge)', boxShadow: active ? 'var(--glow-gold)' : undefined }}
          aria-label={active ? t('passives_on') : t('passives_off_state')}
          title={active ? t('passives_on') : t('passives_off_state')}
        />
      </div>

      <div className="px-2.5 py-2 space-y-2">
        {controls.length === 0 ? (
          <p className="text-[11px] italic" style={{ color: 'var(--ink-faint)' }}>{t('passives_text_only')}</p>
        ) : controls.map(control => (
          <ControlRow key={control.id} control={control} value={state[control.id] ?? 0} onChange={onChange} />
        ))}

        {bullets.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              className="flex items-center gap-1 text-[10px] transition-colors hover:text-gold"
              style={{ color: 'var(--ink-faint)' }}
            >
              <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }} />
              {t(open ? 'passives_hide_text' : 'passives_show_text')}
            </button>
            {open && (
              <ul className="mt-1 space-y-0.5 text-[10px] leading-snug list-disc pl-4" style={{ color: 'var(--ink-muted)' }}>
                {bullets.filter(Boolean).map((b, i) => <li key={i}>{b.replace(/<[^>]+>/g, '')}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </Frame>
  )
}

function ControlRow({ control, value, onChange }: { control: PassiveControl; value: number; onChange?: Props['onChange'] }) {
  const { t } = useTranslation()
  const readOnly = !onChange
  const set = (v: number) => onChange?.(control.id, v)

  if (control.kind === 'stacks') {
    const pips = control.max <= 12
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <BonusChips bonus={control.perStack} size="sm" />
          <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{t('passives_per_stack')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!readOnly && (
            <StepButton label={t('passives_less')} disabled={value <= 0} onClick={() => set(value - 1)}><Minus size={11} /></StepButton>
          )}
          {pips ? (
            <div className="flex flex-1 gap-0.5" role="group" aria-label={t('passives_stacks')}>
              {Array.from({ length: control.max }, (_, i) => {
                const on = i < value
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={readOnly}
                    onClick={() => set(value === i + 1 ? i : i + 1)}
                    aria-label={t('passives_set_stacks', { n: i + 1 })}
                    aria-pressed={on}
                    className="flex-1 h-2.5 rounded-sm transition-colors disabled:cursor-default"
                    style={{
                      background: on ? 'var(--gold)' : 'var(--surface-stone)',
                      border:     `1px solid ${on ? 'var(--gold-deep)' : 'var(--metal-edge)'}`,
                    }}
                  />
                )
              })}
            </div>
          ) : <div className="flex-1" />}
          {!readOnly && (
            <StepButton label={t('passives_more')} disabled={value >= control.max} onClick={() => set(value + 1)}><Plus size={11} /></StepButton>
          )}
          <span className="font-mono text-[11px] tabular-nums w-10 text-right" style={{ color: value > 0 ? 'var(--gold)' : 'var(--ink-faint)' }}>
            {value}/{control.max}
          </span>
        </div>
      </div>
    )
  }

  // A single option is a plain on/off switch.
  if (control.options.length === 1) {
    const option = control.options[0]
    const on = value === 1
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={readOnly}
        onClick={() => set(on ? 0 : 1)}
        className="w-full flex items-center gap-2 text-left disabled:cursor-default"
      >
        <span
          className="relative w-7 h-4 rounded-full flex-shrink-0 transition-colors"
          style={{ background: on ? 'var(--gold)' : 'var(--surface-stone)', border: '1px solid var(--metal-edge)' }}
        >
          <span
            className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-transform"
            style={{ left: 2, background: on ? 'var(--surface-void)' : 'var(--ink-faint)', transform: on ? 'translateX(12px)' : undefined }}
          />
        </span>
        {option.turn != null && <span className="text-[10px] font-semibold" style={{ color: 'var(--ink-muted)' }}>{t('passives_turn', { n: option.turn })}</span>}
        <BonusChips bonus={option.bonus} size="sm" />
      </button>
    )
  }

  // Mutually exclusive cases (or Prysmaradite turns): Off + one button each.
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup">
      <SegButton on={value === 0} disabled={readOnly} onClick={() => set(0)}>
        <span className="text-[10px]">{t('passives_off')}</span>
      </SegButton>
      {control.options.map((option, i) => (
        <SegButton key={i} on={value === i + 1} disabled={readOnly} onClick={() => set(i + 1)}>
          {option.turn != null && <span className="text-[10px] font-semibold mr-1">{t('passives_turn', { n: option.turn })}</span>}
          <BonusChips bonus={option.bonus} size="sm" />
        </SegButton>
      ))}
    </div>
  )
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:text-gold disabled:opacity-30 disabled:hover:text-inherit"
      style={{ color: 'var(--ink-muted)', border: '1px solid var(--metal-edge)', background: 'var(--surface-stone)' }}
    >
      {children}
    </button>
  )
}

function SegButton({ on, disabled, onClick, children }: { on: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center rounded-md px-1.5 py-1 transition-colors disabled:cursor-default"
      style={{
        background: on ? 'color-mix(in srgb, var(--gold) 14%, var(--surface-void))' : 'var(--surface-stone)',
        border:     `1px solid ${on ? 'var(--gold)' : 'var(--metal-edge)'}`,
        color:      on ? 'var(--gold)' : 'var(--ink-muted)',
        opacity:    disabled && !on ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  )
}
