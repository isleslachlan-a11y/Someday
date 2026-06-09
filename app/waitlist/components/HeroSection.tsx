'use client'

import { useInView } from './useInView'

interface Props {
  count: number
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export function HeroSection({ count }: Props) {
  const { ref, isVisible } = useInView()

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 motion-safe:translate-y-4'}`}
    >
      <section className="bg-[#fff9f0] min-h-[80vh] flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-3xl w-full mx-auto text-center">

          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-1.5 border border-[#f89a14]/40 rounded-full px-4 py-1.5 mb-8">
            <span className="text-[#f89a14] text-xs">✦</span>
            <span className="font-nunito text-xs text-[rgba(19,25,54,0.6)] tracking-wide">
              Now accepting early access
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-extrabold text-[#131936] text-5xl md:text-7xl leading-[1.05] tracking-tight">
            Your list of<br />someday trips.
          </h1>

          {/* Subheadline — TODO: refine with Sophia */}
          <p className="font-nunito text-lg md:text-xl text-[rgba(19,25,54,0.5)] max-w-xl mx-auto mt-4 leading-relaxed">
            Discover places worth saving. Build a list with people you travel with.
            Make the trips you keep putting off finally happen.
          </p>

          {/* CTA row */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={() => scrollTo('waitlist-form')}
              className="bg-[#f89a14] text-white font-nunito font-semibold rounded-full px-7 py-3 hover:bg-[#e07010] transition-colors"
            >
              Join the waitlist
            </button>
            <button
              type="button"
              onClick={() => scrollTo('tour')}
              className="bg-white text-[#131936] border border-[#131936]/20 font-nunito font-semibold rounded-full px-7 py-3 hover:border-[#131936]/40 transition-colors"
            >
              See how it works
            </button>
          </div>

          {/* Social proof — renders nothing if count is 0 */}
          {count > 0 && (
            <p className="font-nunito text-sm text-[rgba(19,25,54,0.5)] mt-5">
              {count.toLocaleString()} people already on the list.
            </p>
          )}

          {/* Hero visual — placeholder */}
          <div className="max-w-5xl mx-auto mt-16 rounded-2xl overflow-hidden aspect-video">
            {/* TODO: replace with app screenshot or Lottie animation */}
            <div className="w-full h-full bg-gradient-to-br from-[#fcd99a] to-[#f89a14] flex items-center justify-center min-h-[200px]">
              <span className="font-display text-sm text-[#131936]/40">
                [ App screenshots coming soon ]
              </span>
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}
