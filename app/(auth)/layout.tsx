import type { Metadata } from 'next'
import Image from 'next/image'
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
            <Image
              src="/images/logo-gradient.png"
              alt="Someday"
              width={56}
              height={56}
              priority
            />
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
            border: '1px solid #f89a14',
            fontFamily: 'var(--font-nunito)',
          },
        }}
      />
    </div>
  )
}
