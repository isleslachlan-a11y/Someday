/**
 * Someday design system tokens — single source of truth for design decisions.
 *
 * Before hardcoding any colour, spacing, or font value in a component,
 * check here first. Reference these in component comments where relevant.
 */
export const TOKENS = {
  colors: {
    bgPrimary:     '#0d0b1a',
    bgSecondary:   '#130f2a',
    bgCard:        'rgba(255,255,255,0.03)',
    borderSubtle:  'rgba(255,255,255,0.07)',
    borderAccent:  'rgba(123,79,232,0.25)',
    accentViolet:  '#7B4FE8',
    accentPink:    '#FF8FAB',
    textPrimary:   '#ffffff',
    textSecondary: '#e8e0ff',
    textMuted:     '#9b8fc4',
    textFaint:     '#5a4f7a',
  },

  fontFamily: {
    display: 'Brice, serif',
    heading: 'var(--font-dm-sans), sans-serif',
    body:    'var(--font-nunito), sans-serif',
    mono:    'var(--font-dm-mono), monospace',
  },

  spacing: {
    pagePadding:        '16px',  // mobile page horizontal padding
    pagePaddingDesktop: '32px',  // desktop page horizontal padding
    cardRadius:         '14px',
    cardPadding:        '16px',
    navHeight:          '64px',  // mobile bottom nav height
    sidebarWidth:       '240px', // desktop sidebar width
  },

  /** Minimum height/width for all interactive elements (WCAG 2.5.5 / iOS HIG). */
  touchTarget: '44px',
} as const
