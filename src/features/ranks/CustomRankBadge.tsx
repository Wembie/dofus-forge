import { RANK_ICONS, type PublicCustomRank } from './catalog.tsx'

export function CustomRankBadge({ rank }: { rank: PublicCustomRank }) {
  const Icon = RANK_ICONS[rank.icon]
  const founder = rank.badgeStyle === 'founder'
  const creator = rank.badgeStyle === 'creator'

  return (
    <span
      title={rank.description || rank.name}
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
      style={{
        color: rank.color,
        background: founder
          ? `linear-gradient(115deg, color-mix(in srgb, var(--gold) 18%, var(--surface-panel)), color-mix(in srgb, ${rank.color} 14%, var(--surface-panel)))`
          : creator
            ? `color-mix(in srgb, ${rank.color} 11%, var(--surface-void))`
            : `color-mix(in srgb, ${rank.color} 13%, var(--surface-panel))`,
        border: `1px ${creator ? 'dashed' : 'solid'} color-mix(in srgb, ${founder ? 'var(--gold)' : rank.color} 54%, transparent)`,
        boxShadow: founder ? `0 0 12px color-mix(in srgb, ${rank.color} 13%, transparent)` : undefined,
      }}
    >
      <Icon size={11} strokeWidth={2.2} aria-hidden="true" />
      {rank.name}
    </span>
  )
}
