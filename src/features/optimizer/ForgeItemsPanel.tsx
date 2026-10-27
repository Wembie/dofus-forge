import { useMemo, useState, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Pin, Ban, Search, X, AlertTriangle } from 'lucide-react'
import { ALL_SLOTS, type SlotId } from '@/store/buildStore.ts'
import type { AppItem, AppSet } from '@/data/loaders.ts'
import { useForgePicks, slotsFor, slotNameKey, searchItems, type RequiredPlacement } from './forgePicks.ts'

function ItemIcon({ item, size = 28 }: { item?: AppItem; size?: number }) {
  return (
    <span
      className="rounded-md flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)' }}
    >
      {item?.image_url
        ? <img src={item.image_url} alt="" width={size - 4} height={size - 4} className="object-contain" loading="lazy" />
        : <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>?</span>}
    </span>
  )
}

type Props = {
  items:      AppItem[]
  sets:       AppSet[]
  equipped:   Partial<Record<SlotId, number>>
  placements: RequiredPlacement[]
}

export function ForgeItemsPanel({ items, sets, equipped, placements }: Props) {
  const { t } = useTranslation()
  const listId = useId()
  const required = useForgePicks(s => s.required)
  const banned   = useForgePicks(s => s.banned)
  const { require, ban, release, toggleRequired, clearRequired, clearBanned } = useForgePicks.getState()
  const [query, setQuery]   = useState('')
  const [active, setActive] = useState(0)

  const itemsById = useMemo(() => new Map(items.map(it => [it.ankama_id, it])), [items])
  const setNames  = useMemo(() => new Map(sets.map(s => [s.ankama_id, s.name])), [sets])
  const results   = useMemo(() => searchItems(items, setNames, query), [items, setNames, query])
  const worn = ALL_SLOTS.map(slot => itemsById.get(equipped[slot] ?? -1)).filter((it, i, all): it is AppItem => it != null && all.indexOf(it) === i)

  function pin(item: AppItem) {
    require(item.ankama_id)
    setQuery('')
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); pin(results[active]) }
    else if (e.key === 'Escape' && query) { e.stopPropagation(); setQuery('') }
  }

  const issue = (p: RequiredPlacement): string | null =>
    p.status === 'no_slot' ? t('optimizer_items_no_slot')
    : p.status === 'prysmaradite' ? t('optimizer_items_prysmaradite')
    : p.status === 'unknown' ? t('optimizer_items_unknown')
    : null

  return (
    <section
      className="rounded-lg p-2.5 space-y-2"
      style={{ background: 'var(--surface-void)', border: `1px solid ${required.length ? 'color-mix(in srgb, var(--gold) 40%, var(--metal-edge))' : 'var(--metal-edge)'}` }}
      aria-label={t('optimizer_items_title')}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1" style={{ color: 'var(--gold)' }}>
          <Pin size={11} /> {t('optimizer_items_title')}
        </span>
        <span className="text-[9px] italic flex-1 min-w-[12rem]" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_items_hint')}</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-faint)' }} />
        <input
          type="search"
          value={query}
          onChange={e => { setQuery(e.target.value); setActive(0) }}
          onKeyDown={onKey}
          placeholder={t('optimizer_items_search')}
          aria-label={t('optimizer_items_search')}
          aria-controls={query.trim().length >= 2 ? listId : undefined}
          aria-autocomplete="list"
          className="w-full rounded-md pl-7 pr-2 py-1.5 text-[11px] outline-none transition-colors focus:border-[var(--gold)]"
          style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
        />
      </div>

      {query.trim().length >= 2 && (
        <ul id={listId} className="rounded-md overflow-hidden forge-log-in" style={{ border: '1px solid var(--metal-edge)' }}>
          {results.length === 0 && (
            <li className="px-2.5 py-2 text-[10px] italic" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_items_no_match')}</li>
          )}
          {results.map((item, i) => {
            const isPinned = required.includes(item.ankama_id)
            const isBanned = banned.includes(item.ankama_id)
            const setName = item.set_id != null ? setNames.get(item.set_id) : undefined
            return (
              <li
                key={item.ankama_id}
                className="flex items-center gap-2 px-2 py-1.5"
                style={{ background: i === active ? 'var(--surface-stone)' : 'transparent', borderTop: i ? '1px solid var(--metal-edge)' : 'none' }}
                onMouseEnter={() => setActive(i)}
              >
                <ItemIcon item={item} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold truncate" style={{ color: isPinned ? 'var(--gold)' : 'var(--ink)' }}>{item.name}</p>
                  <p className="text-[9px] truncate" style={{ color: 'var(--ink-faint)' }}>
                    {t('level')} {item.level} · {t(slotNameKey(slotsFor(item)[0]))}
                    {setName && <span style={{ color: 'var(--water)' }}> · {setName}</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => (isPinned ? release(item.ankama_id) : pin(item))}
                  aria-pressed={isPinned}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors flex-shrink-0"
                  style={{
                    color:      isPinned ? 'var(--surface-void)' : 'var(--gold)',
                    background: isPinned ? 'var(--gold)' : 'color-mix(in srgb, var(--gold) 10%, transparent)',
                    border:     '1px solid color-mix(in srgb, var(--gold) 45%, transparent)',
                  }}
                  title={isPinned ? t('optimizer_items_unpin') : t('optimizer_items_pin_hint', { name: item.name })}
                  aria-label={isPinned ? t('optimizer_items_unpin') : t('optimizer_items_pin_hint', { name: item.name })}
                >
                  <Pin size={10} /> <span className="hidden sm:inline">{t('optimizer_items_pin')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => (isBanned ? release(item.ankama_id) : ban(item.ankama_id))}
                  aria-pressed={isBanned}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors flex-shrink-0"
                  style={{
                    color:      isBanned ? 'var(--surface-void)' : 'var(--negative)',
                    background: isBanned ? 'var(--negative)' : 'color-mix(in srgb, var(--negative) 8%, transparent)',
                    border:     '1px solid color-mix(in srgb, var(--negative) 40%, transparent)',
                  }}
                  title={isBanned ? t('optimizer_unban') : t('optimizer_ban_item')}
                  aria-label={isBanned ? t('optimizer_unban') : t('optimizer_ban_item')}
                >
                  <Ban size={10} /> <span className="hidden sm:inline">{t('optimizer_items_ban')}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* The planner's own gear, one tap to pin */}
      {worn.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-wide mr-0.5" style={{ color: 'var(--ink-faint)' }} title={t('optimizer_items_from_planner_hint')}>
            {t('optimizer_items_from_planner')}
          </span>
          {worn.map(item => {
            const on = required.includes(item.ankama_id)
            return (
              <button
                key={item.ankama_id}
                type="button"
                onClick={() => toggleRequired(item.ankama_id)}
                aria-pressed={on}
                aria-label={on ? `${t('optimizer_items_unpin')}: ${item.name}` : t('optimizer_items_pin_hint', { name: item.name })}
                title={on ? `${t('optimizer_items_unpin')}: ${item.name}` : t('optimizer_items_pin_hint', { name: item.name })}
                className="relative rounded-md transition-all hover:scale-110"
                style={{ outline: on ? '1.5px solid var(--gold)' : undefined, outlineOffset: on ? 1 : undefined, boxShadow: on ? '0 0 8px -2px var(--gold)' : undefined, opacity: on ? 1 : 0.75 }}
              >
                <ItemIcon item={item} size={26} />
                {on && (
                  <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: 'var(--gold)' }}>
                    <Pin size={8} style={{ color: 'var(--surface-void)' }} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Required */}
      {placements.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--gold)' }}>📌 {t('optimizer_items_required')} · {placements.length}</span>
            <span className="flex-1 h-px" style={{ background: 'var(--metal-edge)' }} />
            <button type="button" onClick={clearRequired} className="text-[9px] opacity-60 hover:opacity-100" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_items_clear')}</button>
          </div>
          <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2">
            {placements.map(p => {
              const problem = issue(p)
              const name = p.item?.name ?? `#${p.id}`
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 forge-log-in"
                  style={{
                    background: problem ? 'color-mix(in srgb, var(--negative) 8%, var(--surface-stone))' : 'color-mix(in srgb, var(--gold) 7%, var(--surface-stone))',
                    border:     `1px solid ${problem ? 'color-mix(in srgb, var(--negative) 45%, transparent)' : 'color-mix(in srgb, var(--gold) 35%, transparent)'}`,
                  }}
                >
                  <ItemIcon item={p.item} size={26} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate" style={{ color: problem ? 'var(--negative)' : 'var(--gold)' }}>{name}</p>
                    <p className="text-[9px] truncate flex items-center gap-1" style={{ color: problem ? 'var(--negative)' : 'var(--ink-faint)' }}>
                      {problem
                        ? <><AlertTriangle size={9} className="flex-shrink-0" /> {problem}</>
                        : p.status === 'kept'
                        ? t('optimizer_items_kept')
                        : p.slot && t('optimizer_items_goes_to', { slot: t(slotNameKey(p.slot)) })}
                      {!problem && p.overLevel && p.item && (
                        <span className="flex items-center gap-0.5" style={{ color: 'var(--gold)' }} title={t('optimizer_items_over_level', { level: p.item.level })}>
                          · <AlertTriangle size={9} /> {t('optimizer_items_over_level', { level: p.item.level })}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => release(p.id)}
                    className="opacity-50 hover:opacity-100 flex-shrink-0"
                    title={t('optimizer_items_unpin')}
                    aria-label={`${t('optimizer_items_unpin')}: ${name}`}
                  >
                    <X size={12} style={{ color: 'var(--ink-faint)' }} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Banned */}
      {banned.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--negative)' }}>⛔ {t('optimizer_items_banned')} · {banned.length}</span>
            <span className="flex-1 h-px" style={{ background: 'var(--metal-edge)' }} />
            <button type="button" onClick={clearBanned} className="text-[9px] opacity-60 hover:opacity-100" style={{ color: 'var(--ink-faint)' }}>{t('optimizer_items_clear')}</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {banned.map(id => {
              const item = itemsById.get(id)
              const name = item?.name ?? `#${id}`
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => release(id)}
                  className="flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-md text-[10px] transition-colors hover:border-[var(--negative)]"
                  style={{ background: 'var(--surface-stone)', border: '1px solid var(--metal-edge)', color: 'var(--ink-muted)' }}
                  title={t('optimizer_unban')}
                  aria-label={`${t('optimizer_unban')}: ${name}`}
                >
                  <span className="opacity-60 grayscale"><ItemIcon item={item} size={20} /></span>
                  <span className="line-through decoration-[var(--negative)]">{name}</span>
                  <X size={9} />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
