/**
 * Font configuration — edit this file to change fonts across the whole app.
 * layout.tsx imports named exports from here; nothing else needs to change.
 *
 * To activate local font files:
 *   1. Drop .woff2 or .otf files into /public/fonts/
 *   2. Add  import localFont from 'next/font/local'  to the imports below
 *   3. For each font: comment out the [Google] export, uncomment the [Local] block
 *   4. Replace every FILENAME placeholder with the actual file name
 *   5. Save — the dev server reloads automatically
 *
 * File paths in [Local] blocks are relative to this file (lib/fonts.ts), so
 * ../public/fonts/  resolves to the project root's public/fonts/ directory.
 */

import { Barlow, Barlow_Semi_Condensed, Barlow_Condensed, Nunito } from 'next/font/google'
// import localFont from 'next/font/local'   ← uncomment when switching to local files


// ─── font-brice — hero headings + page titles ─────────────────────────────────

// [Google] Barlow as stand-in (active):
export const brice = Barlow({
  variable: '--font-brice',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  style: ['normal', 'italic'],
})

// [Local] Brice Semi Expanded — comment out [Google] above, then uncomment:
// export const brice = localFont({
//   variable: '--font-brice',
//   display: 'swap',
//   src: [
//     { path: '../public/fonts/FILENAME-SemiBold.woff2',        weight: '600', style: 'normal' },
//     { path: '../public/fonts/FILENAME-Bold.woff2',            weight: '700', style: 'normal' },
//     { path: '../public/fonts/FILENAME-Black.woff2',           weight: '800', style: 'normal' },
//     { path: '../public/fonts/FILENAME-SemiBold-Italic.woff2', weight: '600', style: 'italic' },
//   ],
// })


// ─── font-brice-condensed — card headings ─────────────────────────────────────

// [Google] Barlow Semi Condensed as stand-in (active):
export const briceCondensed = Barlow_Semi_Condensed({
  variable: '--font-brice-condensed',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
})

// [Local] Brice Regular Semi Condensed — comment out [Google] above, then uncomment:
// export const briceCondensed = localFont({
//   variable: '--font-brice-condensed',
//   display: 'swap',
//   src: [
//     { path: '../public/fonts/FILENAME-Regular.woff2',  weight: '400', style: 'normal' },
//     { path: '../public/fonts/FILENAME-SemiBold.woff2', weight: '600', style: 'normal' },
//     { path: '../public/fonts/FILENAME-Bold.woff2',     weight: '700', style: 'normal' },
//   ],
// })


// ─── font-brice-tight — condensed labels ──────────────────────────────────────

// [Google] Barlow Condensed as stand-in (active):
export const briceTight = Barlow_Condensed({
  variable: '--font-brice-tight',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal'],
})

// [Local] Brice Condensed — comment out [Google] above, then uncomment:
// export const briceTight = localFont({
//   variable: '--font-brice-tight',
//   display: 'swap',
//   src: [
//     { path: '../public/fonts/FILENAME-Regular.woff2', weight: '400', style: 'normal' },
//     { path: '../public/fonts/FILENAME-Bold.woff2',    weight: '700', style: 'normal' },
//   ],
// })


// ─── Nunito — body font ───────────────────────────────────────────────────────
// To swap body font: replace Nunito with any Google Font, or follow the
// [Local] pattern above.

export const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})
