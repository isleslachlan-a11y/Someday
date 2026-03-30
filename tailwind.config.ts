import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
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
        syne: ['var(--font-syne)', 'sans-serif'],
        nunito: ['var(--font-nunito)', 'sans-serif'],
      },
    },
  },
}

export default config
