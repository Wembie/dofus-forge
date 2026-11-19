import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchTags, type Tag } from './api.ts'

const ELEMENT_COLOR: Record<string, string> = {
  air: 'var(--air)', fire: 'var(--fire)', earth: 'var(--earth)', water: 'var(--water)', neutral: 'var(--neutral)', omni: 'var(--gold)',
}

function tagColor(tag: Tag): string {
  if (tag.category === 'element') return ELEMENT_COLOR[tag.name] ?? 'var(--ink-muted)'
  return tag.category === 'playstyle' ? 'var(--gold)' : 'var(--ink-muted)'
}

/** The tag catalog; null while it loads ([] if it failed or is empty). `initial` is a prerendered copy, refreshed on mount. */
export function useTags(initial: Tag[] | null = null): Tag[] | null {
  const [tags, setTags] = useState<Tag[] | null>(initial)
  useEffect(() => {
    let cancelled = false
    // A failed fetch resolves to []: keep the prerendered copy then.
    fetchTags().then(list => { if (!cancelled && (list.length > 0 || !initial)) setTags(list) })
    return () => { cancelled = true }
  }, [initial])
  return tags
}

export function TagChip({ tag, active, disabled, onClick, small }: {
  tag:       Tag
  active?:   boolean
  disabled?: boolean
  onClick?:  () => void
  small?:    boolean
}) {
  const { t } = useTranslation()
  const color = tagColor(tag)
  const style = {
    color:      active || !onClick ? color : 'var(--ink-faint)',
    background: active ? `color-mix(in srgb, ${color} 16%, transparent)` : `color-mix(in srgb, ${color} 6%, transparent)`,
    border:     `1px solid color-mix(in srgb, ${color} ${active ? 60 : 25}%, transparent)`,
  }
  const className = `inline-flex items-center rounded-full font-semibold whitespace-nowrap transition-colors ${small ? 'text-[9px] px-1.5 py-px' : 'text-[11px] px-2 py-0.5'}`
  const label = t(`tag_${tag.name}`)
  if (!onClick) return <span className={className} style={style}>{label}</span>
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} className={`${className} disabled:opacity-35 disabled:cursor-not-allowed`} style={style}>
      {label}
    </button>
  )
}
