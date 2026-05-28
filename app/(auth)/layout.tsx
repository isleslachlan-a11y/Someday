import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Someday',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fff9f0] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* Radial warm glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 55% at 50% -5%, #fcd99a 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">

        {/* Brand header */}
        <div className="mb-8 text-center select-none">
          <div className="flex justify-center mb-3">
            <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
              <path
                d="M24 6L28.1 18.3L41.1 18.4L30.7 26.2L34.6 38.6L24 31L13.4 38.6L17.3 26.2L6.9 18.4L19.9 18.3Z"
                fill="#f08c21"
              />
              <circle cx="24" cy="24" r="5" fill="#fcd99a" />
            </svg>
          </div>
          <h1 className="font-syne text-3xl font-bold tracking-tight text-[#131936]">
            Someday
          </h1>
          <p className="font-nunito text-sm text-[#131936]/50 mt-1">Your travel bucket list</p>
        </div>

        {/* Form card */}
        <div className="w-full rounded-2xl bg-white border border-[#fcd99a] p-8 shadow-sm">
          {children}
        </div>

      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#131936',
            color: '#fff9f0',
            border: '1px solid #f08c21',
            fontFamily: 'var(--font-nunito)',
          },
        }}
      />
    </div>
  )
}
