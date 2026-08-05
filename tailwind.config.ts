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
        forge: {
          bg:      'var(--forge-bg)',
          surface: 'var(--forge-surface)',
          card:    'var(--forge-card)',
          border:  'var(--forge-border)',
          gold:    'var(--forge-gold)',
          'gold-light': 'var(--forge-gold-l)',
          text:    'var(--forge-text)',
          muted:   'var(--forge-muted)',
          earth:   'var(--forge-earth)',
          fire:    'var(--forge-fire)',
          water:   'var(--forge-water)',
          air:     'var(--forge-air)',
          neutral: 'var(--forge-neutral)',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
