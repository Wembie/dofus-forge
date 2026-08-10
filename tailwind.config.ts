import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body:    ['Inter', 'sans-serif'],
      },
      colors: {
        /* ── Legacy forge-* — kept for Phase 2 component migration ── */
        forge: {
          bg:          'var(--forge-bg)',
          surface:     'var(--forge-surface)',
          card:        'var(--forge-card)',
          border:      'var(--forge-border)',
          gold:        'var(--gold)',
          'gold-light': 'var(--gold-bright)',
          text:        'var(--ink)',
          muted:       'var(--ink-muted)',
          earth:       'var(--earth)',
          fire:        'var(--fire)',
          water:       'var(--water)',
          air:         'var(--air)',
          neutral:     'var(--neutral)',
        },
        /* ── New semantic tokens ── */
        surface: {
          void:      'var(--surface-void)',
          stone:     'var(--surface-stone)',
          panel:     'var(--surface-panel)',
          parchment: 'var(--surface-parchment)',
          raised:    'var(--surface-raised)',
        },
        metal: {
          edge:   'var(--metal-edge)',
          strong: 'var(--metal-edge-strong)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          muted:   'var(--ink-muted)',
          faint:   'var(--ink-faint)',
          invert:  'var(--ink-invert)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          bright:  'var(--gold-bright)',
          deep:    'var(--gold-deep)',
        },
        elem: {
          earth:   'var(--earth)',
          fire:    'var(--fire)',
          water:   'var(--water)',
          air:     'var(--air)',
          neutral: 'var(--neutral)',
        },
        stat: {
          vitality: 'var(--vitality)',
          wisdom:   'var(--wisdom)',
          ap:       'var(--ap)',
          mp:       'var(--mp)',
          crit:     'var(--crit)',
        },
        ok:   'var(--positive)',
        warn: 'var(--warning)',
        bad:  'var(--negative)',
      },
      boxShadow: {
        frame: 'var(--shadow-frame)',
        well:  'var(--well-inset)',
        gold:  'var(--glow-gold)',
      },
      borderRadius: {
        xs:    '3px',
        sm:    '5px',
        md:    '8px',
        lg:    '12px',
        frame: '10px',
      },
      transitionDuration: {
        fast:      'var(--dur-fast)',
        base:      'var(--dur-base)',
        slow:      'var(--dur-slow)',
        cinematic: 'var(--dur-cinematic)',
      },
      transitionTimingFunction: {
        'out':   'var(--ease-out)',
        'inout': 'var(--ease-inout)',
        'forge': 'var(--ease-forge)',
      },
    },
  },
  plugins: [],
} satisfies Config
