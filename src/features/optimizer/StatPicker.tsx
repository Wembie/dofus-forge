import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { OPTIMIZER_STATS } from './statList.ts'
import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import type { OptimizerStatKey } from './types.ts'

type Props = {
  label:     string
  excluded?: Set<OptimizerStatKey>
  onSelect:  (key: OptimizerStatKey) => void
}

export function StatPicker({ label, excluded, onSelect }: Props) {
  const { t }     = useTranslation()
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) { setSearch(''); return }
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const available = OPTIMIZER_STATS.filter(s => {
    if (excluded?.has(s.key)) return false
    if (search) return t(s.tKey).toLowerCase().includes(search.toLowerCase())
    return true
  })

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors"
        style={{
          color:       'var(--ink-muted)',
          background:  'var(--surface-void)',
          borderColor: 'var(--metal-edge)',
        }}
      >
        <span>+</span>
        <span>{label}</span>
        <span style={{ color: 'var(--ink-faint)', fontSize: '8px' }}>▾</span>
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 left-0 z-50 rounded-lg"
          style={{
            width:        220,
            background:   'var(--surface-stone)',
            border:       '1px solid var(--metal-edge-strong)',
            boxShadow:    'var(--shadow-frame)',
            maxHeight:    260,
            display:      'flex',
            flexDirection:'column',
          }}
        >
          <div className="p-1.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--metal-edge)' }}>
            <input
              autoFocus
              placeholder={t('search_stat')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-[11px] rounded px-2 py-1 outline-none"
              style={{
                background: 'var(--surface-void)',
                border:     '1px solid var(--metal-edge)',
                color:      'var(--ink)',
              }}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {available.map(s => (
              <button
                key={s.key}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-left transition-colors"
                style={{ color: 'var(--ink-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-raised)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => { onSelect(s.key); setOpen(false) }}
              >
                <img src={statIconUrl(s.icon)} alt="" width={14} height={14} className="object-contain flex-shrink-0" />
                <span className="text-[11px] truncate" style={{ color: s.color }}>{t(s.tKey)}</span>
              </button>
            ))}
            {available.length === 0 && (
              <p className="text-center py-3 text-[10px]" style={{ color: 'var(--ink-faint)' }}>—</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
