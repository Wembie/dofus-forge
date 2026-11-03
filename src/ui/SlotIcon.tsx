import { statIconUrl } from '@/features/equipment/statDisplay.ts'
import { SLOT_ICON_SHAPES, slotIconKey } from './slotIcons.ts'

export type SlotIconProps = {
  slot:       string
  className?: string
}

export function SlotIcon({ slot, className = 'w-6 h-6' }: SlotIconProps) {
  const key = slotIconKey(slot)
  if (key === 'dofus') return <img src={statIconUrl('dofus')} alt="" className={`${className} object-contain`} draggable={false} />
  const s = SLOT_ICON_SHAPES[key]
  if (!s) return null
  const rule = s.evenodd ? 'evenodd' : undefined
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <g transform={s.rotate ? `rotate(${s.rotate} 12 12)` : undefined}>
        {s.stroke && <path d={s.stroke} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" opacity={0.55} />}
        <path d={s.base} opacity={0.55} fillRule={rule} />
        <path d={s.lit} fillRule={rule} />
      </g>
    </svg>
  )
}
