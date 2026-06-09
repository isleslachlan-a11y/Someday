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
        // App palette (unchanged)
        'indigo-deep':   '#0D0B1E',
        'lavender':      '#C8B8FF',
        'violet-accent': '#7B4FE8',
        'pink-accent':   '#FF8FAB',
        'white-soft':    '#F0EEFF',
        'muted':         '#7A7A9A',

        // Brand palette v2
        amber:           '#f89a14',   // primary CTA, active states
        navy:            '#131936',   // text anchor, dark surfaces
        mango:           '#fcd99a',   // secondary accent
        'warm-white':    '#fff9f0',   // page background

        // Gradient endpoints — logo use only, never in UI components
        'gradient-start': '#f89a14',
        'gradient-end':   '#f24023',

        // Semantic aliases
        primary:         '#f89a14',
        surface:         '#131936',
        background:      '#fff9f0',
      },
      fontFamily: {
        syne:    ['var(--font-syne)', 'sans-serif'],          // all UI text that was previously syne
        nunito:  ['var(--font-nunito)', 'sans-serif'],        // body copy — also used directly in waitlist
        display: ['Brice', 'serif'],                          // Brice via CSS var — kept for reference
        brice:   ['Brice', 'serif'],                          // 5 app page titles only
        heading: ['var(--font-dm-sans)', 'sans-serif'],       // DM Sans — kept for reference
        body:    ['var(--font-nunito)', 'sans-serif'],        // body copy
        mono:    ['var(--font-dm-mono)', 'monospace'],        // numbers, distances, stats
      },
      fontSize: {
        'display-lg':  ['3rem',     { lineHeight: '1.05', letterSpacing: '-0.01em', fontWeight: '800' }],
        'display-sm':  ['2rem',     { lineHeight: '1.1',  letterSpacing: '-0.01em', fontWeight: '800' }],
        'screen':      ['1.375rem', { lineHeight: '1.2',  letterSpacing: '0em',     fontWeight: '700' }],
        'card-title':  ['1.0625rem',{ lineHeight: '1.3',  letterSpacing: '0em',     fontWeight: '600' }],
        'body-lg':     ['0.9375rem',{ lineHeight: '1.65', letterSpacing: '0em',     fontWeight: '400' }],
        'body-sm':     ['0.8125rem',{ lineHeight: '1.6',  letterSpacing: '0em',     fontWeight: '400' }],
        'label':       ['0.75rem',  { lineHeight: '1.4',  letterSpacing: '0.04em',  fontWeight: '600' }],
        'caption':     ['0.6875rem',{ lineHeight: '1.4',  letterSpacing: '0em',     fontWeight: '400' }],
        'mono-sm':     ['0.8125rem',{ lineHeight: '1.5',  letterSpacing: '0.02em',  fontWeight: '400' }],
      },
    },
  },
}

export default config
