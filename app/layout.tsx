import type { Metadata, Viewport } from 'next'
import { syne, dmSans, nunito, dmMono } from '@/lib/fonts'
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
    <html lang="en" className="h-full antialiased">
      <body className={`${syne.variable} ${dmSans.variable} ${nunito.variable} ${dmMono.variable} min-h-full flex flex-col bg-indigo-deep text-white-soft font-body`}>
        {children}
      </body>
    </html>
  )
}
