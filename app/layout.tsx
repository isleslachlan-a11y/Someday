import type { Metadata, Viewport } from 'next'
import { brice, briceCondensed, briceTight, nunito } from '@/lib/fonts'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

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
