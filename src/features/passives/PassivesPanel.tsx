import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Minus, Plus, RotateCcw, Sparkles } from 'lucide-react'
import type { AppItem } from '@/data/loaders.ts'
import {
  ITEM_PASSIVES, TEXT_ONLY_PASSIVES, passiveBonus, controlRoom, controlMax,
  type PassiveBonus, type PassiveControl, type PassiveState,
} from '@/engine/passives.ts'
import { legendaryBonusOf, legendaryStatBonus } from '@/engine/petLegendary.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { bonusParts } from './passiveLabels.ts'
import './passives.css'

/**
 * Item text can carry game markup such as <sprite name="eau">. React renders
 * it as text (never HTML); this only tidies it. A single pass over the
 * characters drops everything between angle brackets — nested or broken
 * markup included — and the brackets themselves, so none can remain.
 */
export function plainText(s: string): string {
  let out = ''
  let depth = 0
  for (const ch of s) {
    if (ch === '<') depth++
    else if (ch === '>') depth = Math.max(0, depth - 1)
    else if (depth === 0) out += ch
  }
  return out
}

type Props = {
  /** Equipped items, in slot order; only those with a passive are shown. */
  items:     AppItem[]
  state:     PassiveState
  /** Omitted on read-only views (a published build). */
  onChange?: (id: string, value: number) => void
  onReset?:  () => void
  /** The companion's rolled legendary bonus, when one is equipped and set. */
  legendary?: { id: string; value: number } | null
  onLegendaryChange?: (id: string, value: number) => void
}

/** Combat passives of the equipped Dofus, Prysmaradites, legendaries and the
 * companion's legendary bonus: one row per source, set to the state you want
 * to read, with their combined bonus. */
export function PassivesPanel({ items, state, onChange, onReset, legendary, onLegendaryChange }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const withPassive = items.filter(it => ITEM_PASSIVES.has(it.ankama_id) || TEXT_ONLY_PASSIVES.has(it.ankama_id))
  const legendaryBonus = legendary ? legendaryBonusOf(legendary.id) : undefined
  const total = passiveBonus(withPassive.map(it => it.ankama_id), state)
  if (legendaryBonus) for (const [k, v] of Object.entries(legendaryStatBonus(legendary!)) as [keyof PassiveBonus, number][]) total[k] = (total[k] ?? 0) + v
  if (withPassive.length === 0 && !legendaryBonus) return null

  const activeCount = withPassive.filter(it => (ITEM_PASSIVES.get(it.ankama_id) ?? []).some(c => (state[c.id] ?? 0) > 0)).length
    + (legendaryBonus && (!legendaryBonus.control || (legendary!.value > 0)) ? 1 : 0)
  const sourceCount = withPassive.length + (legendaryBonus ? 1 : 0)
  const readOnly = !onChange
  const empty = Object.keys(total).length === 0

  return (
    <section className="passives" aria-labelledby={titleId} data-testid="passives-panel">
      <header className="passives-head">
        <h2 id={titleId}><Sparkles size={15} aria-hidden="true" /> {t('passives_title')}</h2>
        <span>{t('passives_active_count', { count: activeCount, total: sourceCount })}</span>
      </header>
      <div className="passive-total" aria-live="polite">
        <span>{t('passives_total')}</span>
        {empty ? <em>{t('passives_none_active')}</em> : <Bonus bonus={total} />}
        {onReset && activeCount > 0 && (
          // One store update, so turning everything off is a single undo step.
          <button type="button" onClick={onReset}>
            <RotateCcw size={14} aria-hidden="true" /> {t('passives_reset')}
          </button>
        )}
      </div>
      <ul className="passive-list">
        {withPassive.map(item => <PassiveRow key={item.ankama_id} item={item} state={state} onChange={onChange} />)}
        {legendaryBonus && (
          <LegendaryPassiveRow bonus={legendaryBonus} value={legendary!.value} onChange={onLegendaryChange} />
        )}
      </ul>
      {!readOnly && <p className="passive-plain">{t('passives_note')}</p>}
    </section>
  )
}

function LegendaryPassiveRow({ bonus, value, onChange }: { bonus: ReturnType<typeof legendaryBonusOf>; value: number; onChange?: (id: string, value: number) => void }) {
  const { t } = useTranslation()
  if (!bonus) return null
  const active = bonus.control ? value > 0 : true
  return (
    <li className={'passive' + (active ? ' is-active' : '')}>
      <div className="passive-source">
        <span>
          <b>{t(bonus.nameKey)}</b>
          <small>{t('passives_legendary_source')}</small>
        </span>
        <i className="passive-dot" role="img" aria-label={active ? t('passives_on') : t('passives_off_state')} title={active ? t('passives_on') : t('passives_off_state')} />
      </div>
      <div className="passive-controls">
        {bonus.control && <ControlRow control={bonus.control} value={value} room={controlMax(bonus.control)} onChange={onChange} />}
        <p className="passive-plain">{t(bonus.textKey)}</p>
      </div>
    </li>
  )
}

function Bonus({ bonus }: { bonus: PassiveBonus }) {
  const { t } = useTranslation()
  return (
    <span className="passive-bonus">
      {bonusParts(bonus).map(p => (
        <span key={p.key} className={p.negative ? 'negative' : ''}>
          <img src={statIconUrl(p.icon)} alt="" />
          <b>{p.value}</b>{t(p.tKey)}
        </span>
      ))}
    </span>
  )
}

function PassiveRow({ item, state, onChange }: { item: AppItem; state: PassiveState; onChange?: Props['onChange'] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const controls = ITEM_PASSIVES.get(item.ankama_id) ?? []
  const active = controls.some(c => (state[c.id] ?? 0) > 0)
  const sharedControls = controls.filter(c => c.kind === 'stacks' && c.shared)
  const sharedCap  = sharedControls.length > 1 && sharedControls[0].kind === 'stacks' ? sharedControls[0].shared! : null
  const sharedUsed = sharedControls.reduce((sum, c) => sum + (state[c.id] ?? 0), 0)
  // "Name: • effect • effect" → name + bullet lines.
  const [, ...bullets] = (item.ability ?? '').split('•').map(s => s.trim())
  const abilityName = (item.ability ?? '').split(':')[0]?.trim()

  return (
    <li className={'passive' + (active ? ' is-active' : '')}>
      <div className="passive-source">
        {item.image_url && <img src={item.image_url} alt="" loading="lazy" />}
        <span>
          <b title={item.name}>{item.name}</b>
          {abilityName && abilityName !== item.name && <small>{abilityName}</small>}
        </span>
        <i className="passive-dot" role="img" aria-label={active ? t('passives_on') : t('passives_off_state')} title={active ? t('passives_on') : t('passives_off_state')} />
      </div>
      <div className="passive-controls">
        {controls.length === 0
          ? <p className="passive-plain">{t('passives_text_only')}</p>
          : controls.map(control => (
            <ControlRow key={control.id} control={control} value={state[control.id] ?? 0} room={controlRoom(control, state)} onChange={onChange} />
          ))}
        {sharedCap != null && <p className="passive-plain">{t('passives_shared', { used: sharedUsed, max: sharedCap })}</p>}
        {bullets.length > 0 && (
          <>
            <button type="button" className="passive-text" aria-expanded={open} onClick={() => setOpen(o => !o)}>
              <ChevronDown size={14} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }} />
              {t(open ? 'passives_hide_text' : 'passives_show_text')}
            </button>
            {open && <ul className="passive-lore">{bullets.filter(Boolean).map((b, i) => <li key={i}>{plainText(b)}</li>)}</ul>}
          </>
        )}
      </div>
    </li>
  )
}

export function ControlRow({ control, value, room, onChange }: { control: PassiveControl; value: number; room: number; onChange?: Props['onChange'] }) {
  const { t } = useTranslation()
  const readOnly = !onChange
  const set = (v: number) => onChange?.(control.id, v)

  if (control.kind === 'stacks') {
    const pips = control.max <= 12
    return (
      <div className="passive-stacks">
        <p><Bonus bonus={control.perStack} /><span>{t('passives_per_stack')}</span></p>
        <div>
          {!readOnly && <StepButton label={t('passives_less')} disabled={value <= 0} onClick={() => set(value - 1)}><Minus size={14} /></StepButton>}
          {pips ? (
            <div className="passive-pips" role="group" aria-label={t('passives_stacks')}>
              {Array.from({ length: control.max }, (_, i) => {
                const on = i < value
                return (
                  <button
                    key={i}
                    type="button"
                    // Past the room left by shared stacks, a pip can't be turned on.
                    disabled={readOnly || i + 1 > room}
                    onClick={() => set(value === i + 1 ? i : i + 1)}
                    aria-label={t('passives_set_stacks', { n: i + 1 })}
                    aria-pressed={on}
                    className={on ? 'is-on' : !readOnly && i + 1 > room ? 'is-out' : undefined}
                  />
                )
              })}
            </div>
          ) : <div className="passive-pips" />}
          {!readOnly && <StepButton label={t('passives_more')} disabled={value >= room} onClick={() => set(value + 1)}><Plus size={14} /></StepButton>}
          <output className={value > 0 ? 'is-on' : undefined}>{value}/{control.max}</output>
        </div>
      </div>
    )
  }

  // A single option is a plain on/off switch.
  if (control.options.length === 1) {
    const option = control.options[0]
    const on = value === 1
    return (
      <button type="button" className="passive-toggle" role="switch" aria-checked={on} disabled={readOnly} onClick={() => set(on ? 0 : 1)}>
        <i />
        <span>
          {option.turn != null && <em>{t('passives_turn', { n: option.turn })}</em>}
          <Bonus bonus={option.bonus} />
        </span>
      </button>
    )
  }

  // Mutually exclusive cases (or Prysmaradite turns): Off + one button each.
  return (
    <div className="passive-options" role="radiogroup">
      <button type="button" role="radio" aria-checked={value === 0} disabled={readOnly} onClick={() => set(0)}>{t('passives_off')}</button>
      {control.options.map((option, i) => (
        <button type="button" key={i} role="radio" aria-checked={value === i + 1} disabled={readOnly} onClick={() => set(i + 1)}>
          {option.turn != null && <em>{t('passives_turn', { n: option.turn })}</em>}
          <Bonus bonus={option.bonus} />
        </button>
      ))}
    </div>
  )
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="passive-step" onClick={onClick} disabled={disabled} aria-label={label}>
      {children}
    </button>
  )
}
