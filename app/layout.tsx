import type { Metadata } from 'next'
import { Syne, Nunito } from 'next/font/google'
import './globals.css'

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
})

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Someday — Your Travel Bucket List',
  description: 'Save the experiences you want to have, share them with friends, and make them happen.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-indigo-deep text-white-soft font-nunito">
        {children}
      </body>
    </html>
  )
}
