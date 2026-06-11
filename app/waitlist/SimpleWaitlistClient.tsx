'use client'

import { WaitlistForm } from './components/WaitlistForm'
import { SocialRow }    from './components/SocialRow'

export function SimpleWaitlistClient({ count }: { count: number }) {
  return (
    <div className="min-h-screen bg-[#fff9f0] text-[#131936] flex flex-col items-center px-6">

      {/* TOP: Wordmark */}
      <div className="w-full max-w-lg pt-8 text-center">
        <span className="font-syne font-bold text-lg text-[#131936]">Someday</span>
      </div>

      {/* MIDDLE: Hero — takes remaining space, vertically centred */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg relative">

        {/* Ambient glow behind headline */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none z-0"
          style={{
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(240,140,33,0.06) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        <div className="relative z-10 w-full">

          {/* Eyebrow pill */}
          <div className="flex justify-center mb-6">
            <span className="border border-[rgba(240,140,33,0.4)] text-[#f08c21] rounded-full px-4 py-1 text-xs font-syne tracking-wide">
              ✦&nbsp; Now accepting early access
            </span>
          </div>

          {/* Hero headline */}
          <h1 className="font-syne font-extrabold text-center mt-8">
            <span className="block text-[#131936] text-4xl md:text-6xl">Stop saying</span>
            <span
              className="inline-block text-[#f08c21] text-5xl md:text-7xl italic"
              style={{ filter: 'drop-shadow(0 2px 24px rgba(240,140,33,0.25))' }}
            >
              Someday.
            </span>
            <span className="block text-[#131936] text-4xl md:text-6xl">Start doing it.</span>
          </h1>

          {/* Subheadline */}
          <p className="font-nunito text-base md:text-lg text-[rgba(19,25,54,0.55)] text-center max-w-sm mx-auto mt-5 leading-relaxed">
            The group chat isn&apos;t a plan. Someday is.<br />
            Join the waitlist and be first when we launch.
          </p>

          {/* Waitlist form */}
          <div className="mt-10 max-w-sm mx-auto w-full">
            <WaitlistForm />
          </div>

          {/* Social proof */}
          {count > 0 && (
            <p className="mt-6 text-center font-nunito text-sm text-[rgba(19,25,54,0.55)]">
              {count.toLocaleString()} people already on the list.
            </p>
          )}

        </div>
      </div>

      {/* BOTTOM: Social links + footer tagline */}
      <div className="w-full max-w-lg text-center pb-10 mt-auto">
        <p className="font-nunito text-xs text-[rgba(19,25,54,0.55)] tracking-wide uppercase mb-3">
          Follow along
        </p>
        <SocialRow />
        <p className="font-syne text-xs italic text-[rgba(19,25,54,0.4)] mt-4">
          Stop saying Someday. Start doing it.
        </p>
      </div>

    </div>
  )
}
