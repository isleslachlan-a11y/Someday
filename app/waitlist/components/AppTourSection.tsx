'use client'

import { useInView } from './useInView'

interface Tile {
  label: string
  heading: string
  body: string
  gradient: string
  lightText?: boolean
}

const TILES: Tile[] = [
  {
    label:   'DISCOVER',
    heading: 'Find places worth saving.',
    body:    'Explore a hand-curated feed of destinations and experiences, ranked by what\'s trending and what matches your travel style.',
    gradient: 'from-[#fcd99a] to-[#f9c46a]',
    // TODO: replace placeholder gradient with Discover screen screenshot
  },
  {
    label:   'SAVE',
    heading: 'Build your Someday list.',
    body:    'Add anything to your personal travel list in one tap. Cities, restaurants, hikes, hidden bars — if it\'s worth doing someday, it belongs here.',
    gradient: 'from-[#f89a14] to-[#e07010]',
    // TODO: replace placeholder gradient with List screen screenshot
  },
  {
    label:     'PLAN',
    heading:   'Turn a list into a trip.',
    body:      'Pick a date, invite who you\'re going with, and let Someday help you figure out the rest. No spreadsheet required.',
    gradient:  'from-[#131936] to-[#1e2a4a]',
    lightText: true,
    // TODO: replace placeholder gradient with Plan screen screenshot
  },
  {
    label:   'SHARE',
    heading: 'See where your friends want to go.',
    body:    'Discover the overlap between your list and your friends\'. The best trips start with a shared bucket list.',
    gradient: 'from-[#fcd99a] to-[#f89a14]',
    // TODO: replace placeholder gradient with Friends/overlap screen screenshot
  },
]

export function AppTourSection() {
  const { ref, isVisible } = useInView()

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 motion-safe:translate-y-4'}`}
    >
      <section id="tour" className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto">

          <p className="font-nunito uppercase tracking-widest text-xs text-[rgba(19,25,54,0.4)] mb-4">
            Features
          </p>
          {/* TODO: refine heading copy */}
          <h2 className="font-brice font-syne font-bold text-[#131936] text-3xl md:text-5xl max-w-2xl leading-tight">
            Everything a trip needs, before it starts.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            {TILES.map((tile) => (
              <div
                key={tile.label}
                className="rounded-2xl overflow-hidden border border-[rgba(252,217,154,0.5)]"
              >
                {/* Image placeholder */}
                <div className={`aspect-[4/3] bg-gradient-to-br ${tile.gradient} flex items-center justify-center`}>
                  <span className={`font-syne text-xs ${tile.lightText ? 'text-white/30' : 'text-[#131936]/30'}`}>
                    [ Screenshot coming soon ]
                  </span>
                </div>

                {/* Content */}
                <div className="bg-white p-6">
                  <p className="font-nunito uppercase tracking-widest text-xs text-[#f89a14] mb-2">
                    {tile.label}
                  </p>
                  <h3 className="font-syne font-semibold text-[#131936] text-xl mb-2">
                    {tile.heading}
                  </h3>
                  <p className="font-nunito text-sm text-[rgba(19,25,54,0.5)] leading-relaxed">
                    {tile.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </div>
  )
}
