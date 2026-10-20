import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchTags, MAX_BUILD_TAGS, type Tag, type TagCategory } from './api.ts'

const CATEGORIES: TagCategory[] = ['playstyle', 'element', 'general']

const ELEMENT_COLOR: Record<string, string> = {
  air: 'var(--air)', fire: 'var(--fire)', earth: 'var(--earth)', water: 'var(--water)', neutral: 'var(--neutral)', omni: 'var(--gold)',
}

function tagColor(tag: Tag): string {
  if (tag.category === 'element') return ELEMENT_COLOR[tag.name] ?? 'var(--ink-muted)'
  return tag.category === 'playstyle' ? 'var(--gold)' : 'var(--ink-muted)'
}

/** The tag catalog; null while it loads ([] if it failed or is empty). */
export function useTags(): Tag[] | null {
  const [tags, setTags] = useState<Tag[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchTags().then(list => { if (!cancelled) setTags(list) })
    return () => { cancelled = true }
  }, [])
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

/** Tag selector for publishing, grouped by category, capped at MAX_BUILD_TAGS. */
export function TagPicker({ selected, onChange }: { selected: number[]; onChange: (ids: number[]) => void }) {
  const { t } = useTranslation()
  const tags  = useTags() ?? []
  const full  = selected.length >= MAX_BUILD_TAGS
  if (tags.length === 0) return null

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  return (
    <div className="space-y-1.5">
      {CATEGORIES.map(cat => {
        const inCat = tags.filter(tag => tag.category === cat)
        if (inCat.length === 0) return null
        return (
          <div key={cat} className="flex flex-wrap items-center gap-1">
            <span className="text-[9px] uppercase tracking-wider w-full" style={{ color: 'var(--ink-faint)' }}>{t(`tag_category_${cat}`)}</span>
            {inCat.map(tag => {
              const active = selected.includes(tag.id)
              return <TagChip key={tag.id} tag={tag} active={active} disabled={!active && full} onClick={() => toggle(tag.id)} />
            })}
          </div>
        )
      })}
    </div>
  )
}
