import { cn } from './cn'
import { StatValue } from './StatValue'

type StatRowProps = {
  iconUrl:    string    // pre-computed via statIconUrl(meta.icon)
  label:      string
  value:      number
  color?:     string    // CSS var from STAT_META.color
  signed?:    boolean
  className?: string
}

export function StatRow({ iconUrl, label, value, color, signed, className }: StatRowProps) {
  return (
    <div className={cn('flex items-center gap-1.5 min-w-0', className)}>
      <img
        src={iconUrl}
        alt=""
        width={12}
        height={12}
        className="flex-shrink-0 object-contain"
      />
      <span
        className="flex-1 text-[11px] truncate"
        style={{ color: color ?? 'var(--ink-muted)' }}
      >
        {label}
      </span>
      <StatValue value={value} signed={signed} />
    </div>
  )
}
