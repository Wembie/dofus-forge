import { useEffect, useRef, useState, type ElementType } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { IconButton } from '@/ui'

export type HeaderMenuItem = {
  key:       string
  label:     string
  Icon:      ElementType
  onClick:   () => void
  disabled?: boolean
  active?:   boolean
}

/** Mobile/tablet fallback for header actions hidden by `hidden sm:flex` /
 * `hidden lg:flex` breakpoints — without this those actions (Explore, My
 * Builds, Publish, etc.) are completely unreachable below that breakpoint. */
export function HeaderMenuButton({ items, className }: { items: HeaderMenuItem[]; className?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={className} style={{ position: 'relative' }}>
      <IconButton label={t('open_menu')} variant="subtle" size="md" onClick={() => setOpen(o => !o)}>
        <Menu size={15} />
      </IconButton>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 flex flex-col gap-0.5 p-1.5 rounded-lg min-w-[190px]"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--metal-edge-strong)', boxShadow: 'var(--shadow-frame)' }}
        >
          {items.map(item => (
            <button
              key={item.key}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => { item.onClick(); setOpen(false) }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] font-semibold text-left transition-colors disabled:opacity-30"
              style={item.active
                ? { color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 12%, transparent)' }
                : { color: 'var(--ink-faint)', background: 'transparent' }}
              onMouseEnter={e => { if (!item.active) e.currentTarget.style.background = 'var(--surface-panel)' }}
              onMouseLeave={e => { if (!item.active) e.currentTarget.style.background = 'transparent' }}
            >
              <item.Icon size={14} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
