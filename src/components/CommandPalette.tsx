import { useEffect, useRef, useState, type ElementType } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Search, CornerDownLeft } from 'lucide-react'
import { normalizeSearch } from '@/ui/normalize.ts'

export type Command = {
  key:       string
  label:     string
  Icon:      ElementType
  onRun:     () => void
  disabled?: boolean
}

/** Ctrl/Cmd+K power-user shortcut — a flat list of the same actions already
 * reachable through the header/menu buttons, just faster to reach without
 * hunting through toolbars. Each page passes its own relevant command set;
 * this component owns nothing except the open/search/keyboard-nav state. */
export function CommandPalette({ commands }: { commands: Command[] }) {
  const { t } = useTranslation()
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim() === ''
    ? commands
    : commands.filter(c => normalizeSearch(c.label).includes(normalizeSearch(query.trim())))

  useEffect(() => {
    function onGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onGlobalKey)
    return () => window.removeEventListener('keydown', onGlobalKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => { setActive(0) }, [query])

  if (!open) return null

  function run(cmd: Command) {
    if (cmd.disabled) return
    setOpen(false)
    cmd.onRun()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, filtered.length - 1)); return }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); run(filtered[active]) }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: 'rgba(10,13,19,.75)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('command_palette_title')}
        className="w-full max-w-lg rounded-frame overflow-hidden flex flex-col"
        style={{ background: 'var(--surface-panel)', border: '1px solid var(--metal-edge-strong)', boxShadow: 'var(--shadow-frame), var(--inset-bevel)' }}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--metal-edge)' }}>
          <Search size={15} style={{ color: 'var(--ink-faint)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('command_palette_placeholder')}
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--ink)' }}
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)', color: 'var(--ink-faint)' }}>Esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-1.5">
          {filtered.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: 'var(--ink-faint)' }}>{t('command_palette_empty')}</p>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.key}
              disabled={cmd.disabled}
              onClick={() => run(cmd)}
              onMouseEnter={() => setActive(i)}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-[13px] font-medium transition-colors disabled:opacity-30"
              style={i === active
                ? { background: 'color-mix(in srgb, var(--gold) 12%, transparent)', color: 'var(--gold)' }
                : { color: 'var(--ink-muted)' }}
            >
              <cmd.Icon size={14} />
              <span className="flex-1">{cmd.label}</span>
              {i === active && <CornerDownLeft size={12} style={{ color: 'var(--gold)' }} />}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
