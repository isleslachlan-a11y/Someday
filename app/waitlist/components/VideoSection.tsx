'use client'

import { useInView } from './useInView'

export function VideoSection() {
  const { ref, isVisible } = useInView()

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 motion-safe:translate-y-4'}`}
    >
      <section className="bg-[#fff9f0] py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">

          <p className="font-nunito uppercase tracking-widest text-xs text-[rgba(19,25,54,0.4)] mb-4">
            See it in action
          </p>
          {/* TODO: refine heading copy */}
          <h2 className="font-syne font-bold text-[#131936] text-3xl md:text-5xl leading-tight">
            A 60-second look at Someday.
          </h2>

          {/* Video placeholder */}
          <div className="max-w-4xl mx-auto mt-12 rounded-2xl overflow-hidden aspect-video">
            {/*
              TODO: replace with <video src="..." /> or YouTube embed
              Suggested:
              <video
                src={process.env.NEXT_PUBLIC_DEMO_VIDEO_URL}
                controls
                poster="..."
                className="w-full h-full object-cover"
              />
            */}
            <div className="w-full h-full bg-gradient-to-br from-[#131936] to-[#1e2a4a] flex flex-col items-center justify-center gap-3 min-h-[220px]">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="white"
                  className="translate-x-0.5"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
              <span className="font-nunito text-sm text-white/60">Demo video coming soon</span>
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}
