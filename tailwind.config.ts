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
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        forge: {
          bg:      '#0d0f14',
          surface: '#161b26',
          card:    '#1c2333',
          border:  '#2a3347',
          gold:    '#c9a84c',
          'gold-light': '#e8c87a',
          text:    '#e8eaf0',
          muted:   '#7a8499',
          // element colors
          earth:   '#b8860b',
          fire:    '#dc4e22',
          water:   '#2a8fd4',
          air:     '#6ab04c',
          neutral: '#9b9b9b',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
