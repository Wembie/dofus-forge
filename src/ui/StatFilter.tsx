import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { STAT_META, statIconUrl } from '@/features/equipment/statDisplay.ts'

const PRIMARY_ORDER = ['AP', 'MP', 'Vitality', 'Wisdom', 'Strength', 'Intelligence', 'Chance', 'Agility']
const PRIMARY_SET   = new Set(PRIMARY_ORDER)

const RESISTANCE_SET = new Set([
  'Earth Resistance', 'Fire Resistance', 'Water Resistance', 'Air Resistance', 'Neutral Resistance',
  '% Earth Resistance', '% Fire Resistance', '% Water Resistance', '% Air Resistance', '% Neutral Resistance',
  'Critical Resistance',
])

const PCT_SET = new Set([
  '% Melee Damage', '% Ranged Damage', '% Spell Damage', '% Weapon Damage',
  '% Melee Resistance', '% Ranged Resistance', '% Spell Resistance', '% Weapon Resistance',
])

type Cat = 'primary' | 'secondary' | 'resistance' | 'pct' | 'other'

function categorize(stat: string): Cat {
  if (PRIMARY_SET.has(stat))    return 'primary'
  if (RESISTANCE_SET.has(stat)) return 'resistance'
  if (PCT_SET.has(stat))        return 'pct'
  if (STAT_META[stat])          return 'secondary'
  return 'other'
}

type Props = {
  stats:    string[]
  selected: string | null
  onSelect: (s: string | null) => void
}

export function StatFilter({ stats, selected, onSelect }: Props) {
  const { t }                   = useTranslation()
  const [open, setOpen]         = useState(false)
  const [q, setQ]               = useState('')
  const containerRef            = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQ('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  const grouped = useMemo(() => {
    const cats: Record<Cat, string[]> = { primary: [], secondary: [], resistance: [], pct: [], other: [] }
    for (const s of stats) cats[categorize(s)].push(s)
    const alphaSort = (a: string, b: string) => {
      const la = STAT_META[a] ? t(STAT_META[a].tKey) : a
      const lb = STAT_META[b] ? t(STAT_META[b].tKey) : b
      return la.localeCompare(lb)
    }
    cats.primary   = PRIMARY_ORDER.filter(s => cats.primary.includes(s))
    cats.secondary.sort(alphaSort)
    cats.resistance.sort(alphaSort)
    cats.pct.sort(alphaSort)
    cats.other.sort(alphaSort)
    return cats
  }, [stats, t])

  const filtered = useMemo(() => {
    if (!q.trim()) return null
    const lq = q.toLowerCase()
    return stats.filter(s => {
      const label = STAT_META[s] ? t(STAT_META[s].tKey) : s
      return label.toLowerCase().includes(lq) || s.toLowerCase().includes(lq)
    })
  }, [stats, q, t])

  function pick(s: string | null) {
    onSelect(s)
    setOpen(false)
    setQ('')
  }

  function toggle() {
    setOpen(o => !o)
    if (!open) setQ('')
  }

  const selMeta  = selected ? STAT_META[selected] : null
  const selColor = selMeta?.color ?? 'var(--ink-muted)'
  const selLabel = selMeta ? t(selMeta.tKey) : (selected ?? '')

  function StatRow({ stat }: { stat: string }) {
    const meta      = STAT_META[stat]
    const clr       = meta?.color ?? 'var(--ink-muted)'
    const label     = meta ? t(meta.tKey) : stat
    const isActive  = stat === selected
    return (
      <button
        className="w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 transition-colors hover:bg-white/5"
        style={{ color: clr, background: isActive ? `color-mix(in srgb, ${clr} 10%, transparent)` : undefined, fontWeight: isActive ? 600 : 400 }}
        onMouseDown={() => pick(stat)}
      >
        {meta?.icon
          ? <img src={statIconUrl(meta.icon)} alt="" width={13} height={13} className="object-contain flex-shrink-0" />
          : <span style={{ width: 13, flexShrink: 0 }} />
        }
        <span className="truncate">{label}</span>
        {isActive && <span className="ml-auto text-[10px] opacity-50">✓</span>}
      </button>
    )
  }

  function Group({ cat, titleKey, fallback }: { cat: Cat; titleKey: string; fallback: string }) {
    const list = grouped[cat]
    if (!list.length) return null
    return (
      <div>
        <p className="px-3 pt-2 pb-0.5 text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-faint)' }}>
          {t(titleKey, fallback)}
        </p>
        {list.map(s => <StatRow key={s} stat={s} />)}
      </div>
    )
  }

  return (
    <div className="relative flex-shrink-0" ref={containerRef}>
      {/* Trigger */}
      {selected ? (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border font-medium cursor-pointer"
          style={{
            borderColor: `color-mix(in srgb, ${selColor} 31%, transparent)`,
            background:  `color-mix(in srgb, ${selColor} 8%, transparent)`,
            color: selColor,
          }}
          onClick={() => pick(null)}
        >
          {selMeta?.icon && (
            <img src={statIconUrl(selMeta.icon)} alt="" width={12} height={12} className="object-contain flex-shrink-0" />
          )}
          <span className="truncate max-w-[120px]">{selLabel}</span>
          <span className="flex-shrink-0 opacity-60 hover:opacity-100">✕</span>
        </div>
      ) : (
        <button
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border transition-colors"
          style={{
            background: open ? 'var(--surface-panel)' : 'var(--surface-void)',
            borderColor: open ? 'color-mix(in srgb, var(--gold) 30%, transparent)' : 'var(--metal-edge)',
            color: open ? 'var(--ink-muted)' : 'var(--ink-faint)',
          }}
          onClick={toggle}
        >
          <span>⊙</span>
          <span>{t('filter_by_stat', 'Filtrar efecto')}</span>
          <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 2 }}>{open ? '▲' : '▼'}</span>
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-lg overflow-hidden shadow-2xl"
          style={{
            background: 'var(--surface-void)',
            border: '1px solid var(--metal-edge)',
            width: 220,
            maxHeight: 340,
            overflowY: 'auto',
          }}
        >
          {/* Search header */}
          <div
            className="px-2.5 py-2 sticky top-0"
            style={{ background: 'var(--surface-stone)', borderBottom: '1px solid var(--metal-edge)', zIndex: 1 }}
          >
            <input
              ref={inputRef}
              type="text"
              value={q}
              placeholder={t('search_stat', 'Buscar stat…')}
              onChange={e => setQ(e.target.value)}
              className="w-full rounded px-2 py-1 text-[11px] focus:outline-none"
              style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
            />
          </div>

          {/* Clear filter */}
          {selected && (
            <button
              className="w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 transition-colors hover:bg-white/5"
              style={{ color: 'var(--negative)', borderBottom: '1px solid var(--metal-edge)' }}
              onMouseDown={() => pick(null)}
            >
              <span style={{ width: 13, flexShrink: 0, textAlign: 'center' }}>✕</span>
              <span>{t('clear_filter', 'Quite los filtros')}</span>
            </button>
          )}

          {/* Stat list */}
          {filtered
            ? filtered.length > 0
              ? filtered.map(s => <StatRow key={s} stat={s} />)
              : <p className="px-3 py-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>{t('no_results', '—')}</p>
            : (
              <>
                <Group cat="primary"    titleKey="stat_group_primary"    fallback="Efectos principales" />
                <Group cat="secondary"  titleKey="stat_group_secondary"  fallback="Efectos secundarios" />
                <Group cat="resistance" titleKey="stat_group_resistance" fallback="Resistencias"        />
                <Group cat="pct"        titleKey="stat_group_pctmod"     fallback="Modificadores %"     />
                <Group cat="other"      titleKey="stat_group_other"      fallback="Otros"               />
              </>
            )
          }
        </div>
      )}
    </div>
  )
}
