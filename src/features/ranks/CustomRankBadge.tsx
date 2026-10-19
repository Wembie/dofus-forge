import { RANK_ICONS, type PublicCustomRank } from './catalog.tsx'
import type { CSSProperties } from 'react'

export function CustomRankBadge({ rank }: { rank: PublicCustomRank }) {
  const Icon = RANK_ICONS[rank.icon]
  const color = rank.color
  const finish: Record<PublicCustomRank['badgeStyle'], CSSProperties> = {
    standard: {
      color,
      background: `color-mix(in srgb, ${color} 13%, var(--surface-panel))`,
      border: `1px solid color-mix(in srgb, ${color} 54%, transparent)`,
    },
    founder: {
      color,
      background: `linear-gradient(115deg, color-mix(in srgb, var(--gold) 18%, var(--surface-panel)), color-mix(in srgb, ${color} 14%, var(--surface-panel)))`,
      border: `1px solid color-mix(in srgb, var(--gold) 70%, transparent)`,
      boxShadow: `0 0 12px color-mix(in srgb, ${color} 18%, transparent), inset 0 1px 0 rgba(255,255,255,.16)`,
    },
    creator: {
      color,
      background: `color-mix(in srgb, ${color} 11%, var(--surface-void))`,
      border: `1px dashed color-mix(in srgb, ${color} 72%, transparent)`,
    },
    royal: {
      color,
      background: `linear-gradient(135deg, color-mix(in srgb, ${color} 22%, #171321), color-mix(in srgb, ${color} 8%, #080910))`,
      border: `3px double color-mix(in srgb, ${color} 82%, white)`,
      boxShadow: `0 2px 10px color-mix(in srgb, ${color} 18%, transparent)`,
    },
    neon: {
      color,
      background: '#101018',
      border: `1px solid ${color}`,
      boxShadow: `0 0 5px ${color}, 0 0 13px color-mix(in srgb, ${color} 55%, transparent), inset 0 0 8px color-mix(in srgb, ${color} 14%, transparent)`,
      textShadow: `0 0 8px color-mix(in srgb, ${color} 62%, transparent)`,
    },
    crystal: {
      color,
      background: `linear-gradient(145deg, rgba(255,255,255,.16), color-mix(in srgb, ${color} 20%, var(--surface-panel)) 48%, color-mix(in srgb, ${color} 8%, var(--surface-void)))`,
      border: `1px solid color-mix(in srgb, ${color} 62%, white)`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.28), 0 2px 8px rgba(0,0,0,.2)',
    },
    holographic: {
      color: '#fff',
      background: 'linear-gradient(110deg, #f72585, #9b5de5 30%, #3a86ff 56%, #00c9a7 78%, #f9c74f)',
      border: '1px solid rgba(255,255,255,.72)',
      boxShadow: '0 0 12px rgba(120,100,255,.35), inset 0 1px 0 rgba(255,255,255,.4)',
      textShadow: '0 1px 3px rgba(0,0,0,.45)',
    },
    obsidian: {
      color,
      background: 'linear-gradient(135deg, #242631, #090a0e 70%)',
      border: `1px solid color-mix(in srgb, ${color} 68%, #8a8d9b)`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,.12), 0 3px 8px rgba(0,0,0,.36)`,
    },
    minimal: {
      color,
      background: 'transparent',
      border: `1.5px solid ${color}`,
      borderRadius: 7,
      letterSpacing: '.08em',
    },
    arcane: {
      color,
      background: `linear-gradient(125deg, color-mix(in srgb, ${color} 20%, #27123d), color-mix(in srgb, ${color} 8%, #11101a))`,
      border: `1px solid color-mix(in srgb, ${color} 65%, #a855f7)`,
      boxShadow: `0 0 14px color-mix(in srgb, ${color} 22%, transparent)`,
    },
    vintage: {
      color,
      background: `linear-gradient(180deg, color-mix(in srgb, ${color} 18%, #46331f), color-mix(in srgb, ${color} 8%, #211b16))`,
      border: `2px ridge color-mix(in srgb, ${color} 64%, #d6bd8b)`,
      borderRadius: 6,
      letterSpacing: '.055em',
    },
    champion: {
      color,
      background: `linear-gradient(180deg, color-mix(in srgb, ${color} 21%, var(--surface-raised)), color-mix(in srgb, ${color} 9%, var(--surface-void)))`,
      border: `2px solid color-mix(in srgb, ${color} 74%, white)`,
      borderRadius: 8,
      boxShadow: `0 2px 0 color-mix(in srgb, ${color} 32%, transparent), inset 0 1px 0 rgba(255,255,255,.12)`,
    },
    celestial: {
      color: '#F1E9FF',
      background: `linear-gradient(115deg, color-mix(in srgb, ${color} 28%, #27204b), #101426 68%, #30234f)`,
      border: `1px solid color-mix(in srgb, ${color} 56%, #d9caff)`,
      boxShadow: `0 0 12px color-mix(in srgb, ${color} 24%, #8c72ff), inset 0 1px 0 rgba(255,255,255,.22)`,
      textShadow: '0 0 7px rgba(218,203,255,.5)',
    },
    infernal: {
      color: '#FFE4D2',
      background: `linear-gradient(110deg, color-mix(in srgb, ${color} 44%, #6d1717), #210d12 72%, #4c160f)`,
      border: `1px solid color-mix(in srgb, ${color} 56%, #ff7043)`,
      boxShadow: `0 0 10px color-mix(in srgb, ${color} 28%, #ff3d00), inset 0 -2px 5px rgba(255,70,20,.18)`,
    },
    emerald: {
      color: '#D9FFE9',
      background: `linear-gradient(145deg, color-mix(in srgb, ${color} 26%, #14533e), #09251f 68%, #174b39)`,
      border: `1px solid color-mix(in srgb, ${color} 58%, #7fffc0)`,
      boxShadow: 'inset 0 1px 0 rgba(221,255,238,.24), 0 2px 9px rgba(0,0,0,.25)',
    },
    sapphire: {
      color: '#E0F2FF',
      background: `linear-gradient(125deg, color-mix(in srgb, ${color} 32%, #164c86), #0b1931 72%, #193963)`,
      border: `1px solid color-mix(in srgb, ${color} 60%, #8bd4ff)`,
      boxShadow: `inset 0 1px 0 rgba(226,245,255,.2), 0 0 9px color-mix(in srgb, ${color} 22%, transparent)`,
    },
    ruby: {
      color: '#FFE5EA',
      background: `linear-gradient(150deg, color-mix(in srgb, ${color} 38%, #81243b), #2a101b 70%, #551729)`,
      border: `2px solid color-mix(in srgb, ${color} 62%, #ff9aaf)`,
      boxShadow: 'inset 0 1px 0 rgba(255,235,240,.2), 0 2px 8px rgba(40,0,12,.36)',
    },
    bronze: {
      color: '#FFE4BD',
      background: 'linear-gradient(180deg, #77502f 0%, #35251c 28%, #9b6838 52%, #322319 100%)',
      border: `2px ridge color-mix(in srgb, ${color} 64%, #e8b879)`,
      boxShadow: 'inset 0 1px 0 rgba(255,229,190,.24), 0 2px 6px rgba(0,0,0,.24)',
    },
    silver: {
      color: '#F3F6FF',
      background: 'linear-gradient(180deg, #697483, #242a34 34%, #8b95a2 56%, #252a33)',
      border: `1px solid color-mix(in srgb, ${color} 58%, #e5eaf2)`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.34), 0 2px 7px rgba(0,0,0,.26)',
      textShadow: '0 1px 2px rgba(0,0,0,.55)',
    },
    platinum: {
      color: '#F8F5FF',
      background: 'linear-gradient(115deg, #77768b, #292a38 30%, #aaa5c3 54%, #343141 78%, #77768b)',
      border: '1px solid rgba(234,228,255,.78)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.46), 0 0 9px rgba(193,182,255,.2)',
      textShadow: '0 1px 2px rgba(0,0,0,.58)',
    },
    carbon: {
      color,
      background: `repeating-linear-gradient(135deg, color-mix(in srgb, ${color} 12%, #25272d) 0 3px, #111318 3px 6px)`,
      border: `1px solid color-mix(in srgb, ${color} 66%, #676b75)`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.1), 0 2px 6px rgba(0,0,0,.3)',
    },
    aurora: {
      color: '#F4FFF9',
      background: 'linear-gradient(105deg, #10565b, #355d87 24%, #674b82 48%, #347464 72%, #8a773e)',
      border: '1px solid rgba(208,255,238,.7)',
      boxShadow: '0 0 12px rgba(75,218,182,.22), inset 0 1px 0 rgba(255,255,255,.3)',
      textShadow: '0 1px 3px rgba(0,0,0,.5)',
    },
    cosmic: {
      color: '#EEE9FF',
      background: 'radial-gradient(ellipse at 20% 15%, #573c7c 0%, transparent 46%), radial-gradient(ellipse at 82% 95%, #174d67 0%, transparent 50%), #10111e',
      border: `1px solid color-mix(in srgb, ${color} 64%, #9d87df)`,
      boxShadow: '0 0 12px rgba(103,79,181,.24), inset 0 1px 0 rgba(255,255,255,.15)',
    },
    toxic: {
      color: '#E8FFC2',
      background: `linear-gradient(110deg, color-mix(in srgb, ${color} 28%, #27330c), #11160b 65%, #303d0e)`,
      border: '1px solid #a5e635',
      boxShadow: '0 0 9px rgba(163,230,53,.3), inset 0 0 7px rgba(163,230,53,.12)',
      textShadow: '0 0 6px rgba(163,230,53,.42)',
    },
  }

  return (
    <span
      title={rank.description || rank.name}
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
      style={finish[rank.badgeStyle]}
    >
      <Icon size={11} strokeWidth={2.2} aria-hidden="true" />
      {rank.name}
    </span>
  )
}
