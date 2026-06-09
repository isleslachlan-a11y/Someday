const DESTINATIONS = [
  'Kyoto', 'Patagonia', 'Santorini', 'Marrakech', 'Lisbon',
  'The Amalfi Coast', 'Queenstown', 'Bali', 'Banff', 'Cape Town',
  'Dubrovnik', 'Chiang Mai', 'The Faroe Islands', 'Cartagena', 'Positano',
]

const track = DESTINATIONS.join(' · ') + ' · '

export function DestinationsMarquee() {
  return (
    <div className="bg-[#fff9f0] py-6 border-y border-[rgba(252,217,154,0.5)] overflow-hidden">
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .wl-marquee {
          animation: marquee 40s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .wl-marquee { animation-play-state: paused; }
        }
      `}</style>
      <div className="flex whitespace-nowrap">
        <div className="wl-marquee flex shrink-0">
          <span className="font-display italic text-sm text-[#131936]/60 pr-0">{track}</span>
          <span className="font-display italic text-sm text-[#131936]/60">{track}</span>
        </div>
      </div>
    </div>
  )
}
