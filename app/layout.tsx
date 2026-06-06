import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Semi_Condensed, Barlow_Condensed, Nunito } from 'next/font/google'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

// Brice stand-in: Barlow family (swap for self-hosted Brice files when available)
const brice = Barlow({
  variable: '--font-brice',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  style: ['normal', 'italic'],
})

const briceCondensed = Barlow_Semi_Condensed({
  variable: '--font-brice-condensed',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
})

const briceTight = Barlow_Condensed({
  variable: '--font-brice-tight',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal'],
})

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    template: 'Someday | %s',
    default: 'Someday — Your Travel Bucket List',
  },
  description: 'Save the experiences you want to have, share them with friends, and make them happen.',
  openGraph: {
    title: 'Someday — Your Travel Bucket List',
    description: 'Save the experiences you want to have, share them with friends, and make them happen.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${brice.variable} ${briceCondensed.variable} ${briceTight.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-indigo-deep text-white-soft font-nunito">
        {children}
      </body>
    </html>
  )
}
