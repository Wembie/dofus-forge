import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings2 } from 'lucide-react'
import type { AppItem } from '@/data/loaders.ts'
import type { PassiveState } from '@/engine/passives.ts'
import { bonusParts } from '@/features/passives/passiveLabels.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { ItemIcon } from './ForgeItemsPanel.tsx'
import {
  PASSIVE_MODES, PASSIVE_SECTIONS, forgePassiveState, orderPassiveBonus, orderPassiveItems, passiveSection,
  type ForgePassiveMode, type PassiveSection,
} from './forgePassives.ts'

type Props = {
  mode:       ForgePassiveMode
  excluded:   number[]
  itemsById:  ReadonlyMap<number, AppItem>
  planner:    PassiveState
  onMode:     (mode: ForgePassiveMode) => void
  onExcluded: (ids: number[]) => void
}

/** The order's combat passives: whether they count, how, and which items (by section). */
export function ForgePassivesBlock({ mode, excluded, itemsById, planner, onMode, onExcluded }: Props) {
  const { t } = useTranslation()
  const on = mode !== 'off'

  const sections = useMemo(() => {
    const out = new Map<PassiveSection, AppItem[]>(PASSIVE_SECTIONS.map(s => [s, []]))
    for (const id of orderPassiveItems()) {
      const item = itemsById.get(id)
      if (item) out.get(passiveSection(item))!.push(item)
    }
    for (const list of out.values()) list.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
    return out
  }, [itemsById])
  const state = useMemo(() => forgePassiveState(on ? mode : 'max', planner), [on, mode, planner])
  const excludedSet = useMemo(() => new Set(excluded), [excluded])

  function setIncluded(ids: number[], include: boolean) {
    const next = new Set(excludedSet)
    for (const id of ids) {
      if (include) next.delete(id)
      else next.add(id)
    }
    onExcluded([...next])
  }

  return (
    <div className="rounded-lg p-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5" style={{ background: 'var(--surface-void)', border: `1px solid ${on ? 'color-mix(in srgb, var(--wisdom) 45%, var(--metal-edge))' : 'var(--metal-edge)'}` }}>
      <span className="text-[10px] font-bold tracking-widest uppercase flex-shrink-0" style={{ color: 'var(--gold)' }}>⚔ {t('optimizer_passives')}</span>
      <label className="flex items-center gap-1 cursor-pointer select-none">
        <input type="checkbox" checked={on} onChange={e => onMode(e.target.checked ? 'max' : 'off')} />
        <span className="font-semibold text-[10px]" style={{ color: 'var(--ink-muted)' }}>{t('optimizer_passives_count')}</span>
      </label>
      {on && (
        <div className="flex rounded-lg overflow-hidden forge-log-in" style={{ border: '1px solid var(--metal-edge)' }} role="radiogroup" aria-label={t('optimizer_passives')}>
          {PASSIVE_MODES.filter((m): m is Exclude<ForgePassiveMode, 'off'> => m !== 'off').map(m => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => onMode(m)}
              className="px-2.5 py-1 text-[10px] font-semibold transition-colors"
              style={{
                color:      mode === m ? 'var(--surface-void)' : 'var(--ink-muted)',
                background: mode === m ? 'var(--wisdom)' : 'var(--surface-stone)',
              }}
            >
              {t(`optimizer_passives_${m}`)}
            </button>
          ))}
        </div>
      )}
      <span key={mode} className="text-[9px] italic w-full forge-log-in" style={{ color: 'var(--ink-faint)' }}>{t(`optimizer_passives_${mode}_hint`)}</span>
      {on && (
        <div className="w-full flex flex-col gap-1 forge-log-in" data-testid="passive-sections">
          {PASSIVE_SECTIONS.map(section => {
            const items = sections.get(section)!
            return items.length > 0 && (
              <SectionRow
                key={section}
                section={section}
                items={items}
                state={state}
                excluded={excludedSet}
                onToggle={setIncluded}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

type SectionProps = {
  section:  PassiveSection
  items:    AppItem[]
  state:    PassiveState
  excluded: ReadonlySet<number>
  onToggle: (ids: number[], include: boolean) => void
}

function SectionRow({ section, items, state, excluded, onToggle }: SectionProps) {
  const { t } = useTranslation()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const ids = items.map(it => it.ankama_id)
  const included = ids.filter(id => !excluded.has(id)).length
  const all = included === ids.length
  const label = t(`optimizer_passive_section_${section}`)

  return (
    <div className="rounded-md" style={{ background: 'var(--surface-stone)', border: '1px solid var(--metal-edge)' }}>
      <div className="flex items-center gap-2 px-2 py-1">
        <label className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={included > 0}
            ref={el => { if (el) el.indeterminate = included > 0 && !all }}
            onChange={() => onToggle(ids, !all)}
          />
          <span className="text-[10px] font-semibold truncate" style={{ color: included > 0 ? 'var(--ink)' : 'var(--ink-faint)' }}>{label}</span>
        </label>
        <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--ink-faint)' }}>{included}/{ids.length}</span>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls={listId}
          aria-label={t('optimizer_passive_section_configure', { section: label })}
          title={t('optimizer_passive_section_configure', { section: label })}
          className="p-0.5 rounded transition-colors"
          style={{ color: open ? 'var(--wisdom)' : 'var(--ink-muted)' }}
        >
          <Settings2 size={13} />
        </button>
      </div>
      {open && (
        <ul id={listId} className="px-2 pb-1.5 flex flex-col gap-0.5 forge-log-in">
          {items.map(item => {
            const counted = !excluded.has(item.ankama_id)
            const parts = bonusParts(orderPassiveBonus(item.ankama_id, state))
            return (
              <li key={item.ankama_id}>
                <label className="flex items-center gap-2 py-0.5 cursor-pointer select-none" style={{ opacity: counted ? 1 : 0.5 }}>
                  <input type="checkbox" checked={counted} onChange={() => onToggle([item.ankama_id], !counted)} />
                  <ItemIcon item={item} size={22} />
                  <span className="text-[10px] font-semibold min-w-0 truncate" style={{ color: 'var(--ink)' }}>{item.name}</span>
                  <span className="ml-auto inline-flex flex-wrap justify-end gap-1">
                    {parts.length === 0
                      ? <span className="text-[9px] italic" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_passive_not_set')}</span>
                      : parts.map(p => (
                        <span key={p.key} className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold tabular-nums" style={{ color: p.negative ? 'var(--negative)' : p.color }} title={t(p.tKey)}>
                          <img src={statIconUrl(p.icon)} alt="" width={10} height={10} className="object-contain" />
                          {p.value}
                          <span className="sr-only">{t(p.tKey)}</span>
                        </span>
                      ))}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
