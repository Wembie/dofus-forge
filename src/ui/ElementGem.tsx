type ElementKey = 'earth' | 'fire' | 'water' | 'air' | 'neutral' | 'vitality'

const GEM_VAR: Record<string, string> = {
  earth:    'var(--earth)',
  fire:     'var(--fire)',
  water:    'var(--water)',
  air:      'var(--air)',
  neutral:  'var(--neutral)',
  vitality: 'var(--vitality)',
}

type Props = {
  element:    ElementKey
  intensity?: number  // 0..1
  size?:      number  // px
}

export function ElementGem({ element, intensity = 0.25, size = 10 }: Props) {
  const clr = GEM_VAR[element] ?? 'var(--neutral)'
  const gp  = Math.round(Math.max(8, intensity * 55))

  return (
    <div
      aria-hidden
      style={{
        width:        size,
        height:       size,
        borderRadius: '50%',
        flexShrink:   0,
        background:   `radial-gradient(circle at 35% 35%, color-mix(in srgb, ${clr} 70%, white), ${clr})`,
        boxShadow:    `0 0 ${Math.round(size * 1.6)}px ${Math.round(size * 0.6)}px color-mix(in srgb, ${clr} ${gp}%, transparent), inset 0 1px 2px rgba(255,255,255,0.2)`,
        opacity:      0.2 + intensity * 0.8,
        transition:   'opacity 300ms ease, box-shadow 300ms ease',
      }}
    />
  )
}
