import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-indigo-deep flex flex-col items-center justify-center px-4">
      {/* Brand header */}
      <div className="mb-8 text-center select-none">
        <div className="text-5xl text-violet-accent mb-3">✦</div>
        <h1 className="font-syne text-3xl font-bold text-white-soft tracking-tight">
          Someday
        </h1>
        <p className="text-lavender text-sm mt-1">Your travel bucket list</p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
        {children}
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--color-indigo-deep)',
            color: 'var(--color-white-soft)',
            border: '1px solid var(--color-violet-accent)',
            fontFamily: 'var(--font-nunito)',
          },
        }}
      />
    </div>
  )
}
