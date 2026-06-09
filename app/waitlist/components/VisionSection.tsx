'use client'

import { useInView } from './useInView'

const POINTS = [
  {
    number:  '01',
    heading: 'The list in your head isn\'t a plan.',
    body:    'Everyone has places they want to go. Most of them stay as vague intentions. Someday gives them a real home — searchable, shareable, and ready when you are.',
    // TODO: refine with Sophia
  },
  {
    number:  '02',
    heading: 'The best trips are planned with other people.',
    body:    'See where your friends\' lists overlap with yours. The conversation that starts with \'we should go there sometime\' finally goes somewhere.',
    // TODO: refine with Sophia
  },
  {
    number:  '03',
    heading: 'Discovery should feel like possibility, not a chore.',
    body:    'A hand-curated feed of the world\'s best destinations and experiences — filtered by vibe, not algorithm spam.',
    // TODO: refine with Sophia
  },
]

export function VisionSection() {
  const { ref, isVisible } = useInView()

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 motion-safe:translate-y-4'}`}
    >
      <section id="about" className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto">

          <p className="font-nunito uppercase tracking-widest text-xs text-[rgba(19,25,54,0.4)] mb-4">
            Why Someday
          </p>
          {/* TODO: refine heading with Sophia */}
          <h2 className="font-brice font-syne font-bold text-[#131936] text-3xl md:text-5xl max-w-2xl leading-tight">
            The trips you keep putting off deserve a better home.
          </h2>

          {/* Vision points */}
          <div className="max-w-2xl mt-12 space-y-10">
            {POINTS.map((point) => (
              <div key={point.number} className="flex gap-6">
                <span className="font-syne font-bold text-4xl text-[#f89a14]/40 shrink-0 leading-none pt-1">
                  {point.number}
                </span>
                <div>
                  <h3 className="font-syne font-semibold text-[#131936] text-xl mb-2">
                    {point.heading}
                  </h3>
                  <p className="font-nunito text-base text-[rgba(19,25,54,0.5)] leading-relaxed">
                    {point.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Founders block */}
          <div className="mt-16 pt-10 border-t border-[rgba(252,217,154,0.5)]">
            <p className="font-nunito uppercase tracking-widest text-xs text-[rgba(19,25,54,0.4)] mb-8">
              The team
            </p>
            <div className="flex flex-col sm:flex-row gap-8">

              {/* TODO: fill in surnames and optional one-liners */}
              {[
                { initials: 'L', name: 'Lachlan', role: 'Engineering & Product' },
                { initials: 'S', name: 'Sophia',  role: 'Marketing & Business' },
              ].map((founder) => (
                <div key={founder.initials} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#fcd99a] flex items-center justify-center shrink-0">
                    <span className="font-syne font-bold text-lg text-[#131936]">
                      {founder.initials}
                    </span>
                  </div>
                  <div>
                    <p className="font-syne font-semibold text-[#131936]">{founder.name}</p>
                    <p className="font-nunito text-sm text-[rgba(19,25,54,0.5)]">{founder.role}</p>
                  </div>
                </div>
              ))}

            </div>
          </div>

        </div>
      </section>
    </div>
  )
}
