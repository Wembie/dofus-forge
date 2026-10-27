import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { STAT_META, statIconUrl } from '@/features/equipment/statDisplay.ts'
import { normalizeSearch } from './normalize'
import { layoutStats } from './statFilterLayout.ts'

export type StatFilterProps = {
  stats:    string[]
  selected: string[]
  onSelect: (s: string[]) => void
}

export function StatFilter({ stats, selected, onSelect }: StatFilterProps) {
  const { t }           = useTranslation()
  const [open, setOpen] = useState(false)
  const [q, setQ]       = useState('')
  const containerRef    = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLInputElement>(null)

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

  const selectedSet = useMemo(() => new Set(selected), [selected])

  // Same groups and order as La Forjadora's order form.
  const laidOut = useMemo(() => {
    const label = (stat: string) => (STAT_META[stat] ? t(STAT_META[stat].tKey) : stat)
    return layoutStats(stats, stat => STAT_META[stat]?.tKey, label)
  }, [stats, t])

  const filtered = useMemo(() => {
    if (!q.trim()) return null
    const lq = normalizeSearch(q)
    return stats.filter(s => {
      const label = STAT_META[s] ? t(STAT_META[s].tKey) : s
      return normalizeSearch(label).includes(lq) || normalizeSearch(s).includes(lq)
    })
  }, [stats, q, t])

  function toggle(stat: string) {
    if (selectedSet.has(stat)) {
      onSelect(selected.filter(s => s !== stat))
    } else {
      onSelect([...selected, stat])
    }
  }

  function clearAll() {
    onSelect([])
    setOpen(false)
    setQ('')
  }

  function StatRow({ stat }: { stat: string }) {
    const meta     = STAT_META[stat]
    const clr      = meta?.color ?? 'var(--ink-muted)'
    const label    = meta ? t(meta.tKey) : stat
    const isActive = selectedSet.has(stat)
    return (
      <button
        className="w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 transition-colors hover:bg-white/5"
        style={{
          color:      clr,
          background: isActive ? `color-mix(in srgb, ${clr} 10%, transparent)` : undefined,
          fontWeight: isActive ? 600 : 400,
        }}
        onMouseDown={() => toggle(stat)}
      >
        {meta?.icon
          ? <img src={statIconUrl(meta.icon)} alt="" width={13} height={13} className="object-contain flex-shrink-0" />
          : <span style={{ width: 13, flexShrink: 0 }} />
        }
        <span className="truncate flex-1">{label}</span>
        {isActive && (
          <span
            className="flex-shrink-0 text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center"
            style={{ background: `color-mix(in srgb, ${clr} 20%, transparent)`, color: clr }}
          >✓</span>
        )}
      </button>
    )
  }

  function GroupTitle({ children }: { children: string }) {
    return (
      <p className="px-3 pt-2.5 pb-0.5 text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--gold)' }}>
        {children}
      </p>
    )
  }

  function SectionTitle({ children }: { children: string }) {
    return (
      <p className="px-3 pt-1.5 pb-0.5 text-[8px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--ink-faint)' }}>
        {children}
      </p>
    )
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Selected chips + trigger row */}
      <div className="flex items-center flex-wrap gap-1">
        {/* Active chips */}
        {selected.map(stat => {
          const meta = STAT_META[stat]
          const clr  = meta?.color ?? 'var(--ink-muted)'
          const lbl  = meta ? t(meta.tKey) : stat
          return (
            <button
              type="button"
              key={stat}
              aria-label={t('a11y_remove_filter', { name: lbl })}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer"
              style={{
                border:     `1px solid color-mix(in srgb, ${clr} 31%, transparent)`,
                background: `color-mix(in srgb, ${clr} 8%, transparent)`,
                color: clr,
              }}
              onClick={() => toggle(stat)}
            >
              {meta?.icon && (
                <img src={statIconUrl(meta.icon)} alt="" width={10} height={10} className="object-contain flex-shrink-0" />
              )}
              <span className="max-w-[90px] truncate">{lbl}</span>
              <span className="opacity-60 hover:opacity-100 flex-shrink-0" aria-hidden="true">✕</span>
            </button>
          )
        })}

        {/* Trigger button */}
        <button
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border transition-colors flex-shrink-0"
          style={{
            background:  open ? 'var(--surface-panel)' : 'var(--surface-void)',
            borderColor: open ? 'color-mix(in srgb, var(--gold) 30%, transparent)' : 'var(--metal-edge)',
            color:       open ? 'var(--ink-muted)' : 'var(--ink-faint)',
          }}
          onClick={() => { setOpen(o => !o); if (open) setQ('') }}
          aria-expanded={open}
        >
          <span>⊙</span>
          <span>{selected.length > 0 ? `+${t('filter_by_stat', 'efecto')}` : t('filter_by_stat', 'Filtrar efecto')}</span>
          <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 2 }}>{open ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-lg overflow-hidden shadow-2xl"
          style={{
            background:  'var(--surface-void)',
            border:      '1px solid var(--metal-edge)',
            width:       230,
            maxHeight:   360,
            overflowY:   'auto',
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
              aria-label={t('search_stat', 'Buscar stat…')}
              onChange={e => setQ(e.target.value)}
              className="w-full rounded px-2 py-1 text-[11px] focus:outline-none"
              style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge)', color: 'var(--ink)' }}
            />
          </div>

          {/* Clear all */}
          {selected.length > 0 && (
            <button
              className="w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 transition-colors hover:bg-white/5"
              style={{ color: 'var(--negative)', borderBottom: '1px solid var(--metal-edge)' }}
              onMouseDown={clearAll}
            >
              <span style={{ width: 13, flexShrink: 0, textAlign: 'center' }}>✕</span>
              <span>{t('clear_filter', 'Quite los filtros')}</span>
            </button>
          )}

          {/* Stat list */}
          {filtered
            ? filtered.length > 0
              ? filtered.map(s => <StatRow key={s} stat={s} />)
              : <p className="px-3 py-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>—</p>
            : (
              <>
                {laidOut.groups.map(g => (
                  <div key={g.key}>
                    <GroupTitle>{t(g.titleKey)}</GroupTitle>
                    {g.sections.map((sec, i) => (
                      <div key={sec.titleKey ?? i}>
                        {sec.titleKey && g.sections.length > 1 && <SectionTitle>{t(sec.titleKey)}</SectionTitle>}
                        {sec.stats.map(st => <StatRow key={st} stat={st} />)}
                      </div>
                    ))}
                  </div>
                ))}
                {laidOut.other.length > 0 && (
                  <div>
                    <GroupTitle>{t('stat_group_other')}</GroupTitle>
                    {laidOut.other.map(st => <StatRow key={st} stat={st} />)}
                  </div>
                )}
              </>
            )
          }
        </div>
      )}
    </div>
  )
}
