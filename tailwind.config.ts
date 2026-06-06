import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    screens: {
      'sm':  '390px',
      'md':  '768px',
      'lg':  '1024px',
      'xl':  '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        'indigo-deep': '#0D0B1E',
        'lavender': '#C8B8FF',
        'violet-accent': '#7B4FE8',
        'pink-accent': '#FF8FAB',
        'white-soft': '#F0EEFF',
        'muted': '#7A7A9A',
      },
      fontFamily: {
        brice:            ['var(--font-brice)',            'sans-serif'],
        'brice-condensed': ['var(--font-brice-condensed)', 'sans-serif'],
        'brice-tight':    ['var(--font-brice-tight)',      'sans-serif'],
        nunito:           ['var(--font-nunito)',           'sans-serif'],
      },
    },
  },
}

export default config
