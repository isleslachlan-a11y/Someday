/**
 * Google Font configuration — edit this file to change web fonts app-wide.
 * All three variables are applied to <body> in app/layout.tsx.
 *
 * Brice (display font) is self-hosted via @font-face in app/globals.css.
 * No next/font entry is needed for it.
 */

import { DM_Sans, Nunito, DM_Mono } from 'next/font/google'

// UI headings, card headings, screen titles (font-heading)
export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

// Body copy, labels, inputs (font-body)
export const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
})

// Numbers, distances, stats (font-mono)
export const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dm-mono',
  display: 'swap',
})
