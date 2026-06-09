'use client'

import { useInView } from './useInView'
import { WaitlistForm } from './WaitlistForm'

export function WaitlistFormSection() {
  const { ref, isVisible } = useInView()

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 motion-safe:translate-y-4'}`}
    >
      <section id="waitlist-form" className="bg-[#fff9f0] py-24 px-6">
        <div className="max-w-5xl mx-auto">

          <p className="font-nunito uppercase tracking-widest text-xs text-[rgba(19,25,54,0.4)] mb-4 text-center">
            Early access
          </p>
          {/* TODO: refine heading copy */}
          <h2 className="font-brice font-display font-bold text-[#131936] text-3xl md:text-5xl leading-tight text-center">
            Be first to explore Someday.
          </h2>
          <p className="font-nunito text-base text-[rgba(19,25,54,0.5)] max-w-md mx-auto mt-4 text-center leading-relaxed">
            Join the waitlist and get early access when we launch. No spam — just your spot in line.
          </p>

          <div className="max-w-lg mx-auto mt-10">
            <WaitlistForm />
          </div>

        </div>
      </section>
    </div>
  )
}
