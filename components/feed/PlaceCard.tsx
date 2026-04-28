'use client'

/**
 * PlaceCard — standard place discovery card in the feed.
 * Full-width, full-bleed image area (gradient placeholder).
 * TODO: Replace gradient with real CDN image via next/image once image_url is populated.
 */

import Link from 'next/link'
import type { Place } from '@/lib/types'

const TYPE_GRADIENT: Record<string, string> = {
  city:       'from-violet-accent/25 via-violet-accent/8 to-transparent',
  nature:     'from-emerald-500/20 via-emerald-500/5 to-transparent',
  experience: 'from-pink-accent/20 via-pink-accent/5 to-transparent',
  food:       'from-amber-500/20 via-amber-500/5 to-transparent',
}
const FALLBACK = 'from-violet-accent/20 via-violet-accent/5 to-transparent'

// Colours for type badges — matches map pin colour system
const TYPE_COLOR: Record<string, string> = {
  city:       'bg-violet-accent/20 text-violet-accent border-violet-accent/30',
  nature:     'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  experience: 'bg-pink-accent/20 text-pink-accent border-pink-accent/30',
  food:       'bg-amber-500/20 text-amber-400 border-amber-500/30',
}
const FALLBACK_COLOR = 'bg-white/10 text-[#9b8fc4] border-white/15'

const INTENSITY_DOT: Record<string, string> = {
  low:    'bg-emerald-400',
  medium: 'bg-amber-400',
  high:   'bg-pink-accent',
}

interface Props {
  place: Place
  isAdded: boolean
  onAdd: (id: string) => void
  index?: number
}

export default function PlaceCard({ place, isAdded, onAdd, index = 0 }: Props) {
  const gradient = TYPE_GRADIENT[place.type] ?? FALLBACK
  const typeColor = TYPE_COLOR[place.type] ?? FALLBACK_COLOR
  const dotColor = INTENSITY_DOT[place.intensity ?? ''] ?? 'bg-[#5a4f7a]'

  return (
    <article
      className="w-full border-b border-[rgba(255,255,255,0.07)]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <Link href={`/places/${place.id}`} className="block">
        {/* Image area */}
        <div
          className={`relative h-[200px] bg-gradient-to-br ${gradient} bg-[#0d0b1a] overflow-hidden flex items-center justify-center`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          {place.image_keyword && (
            <span
              className="absolute font-syne font-black text-white select-none pointer-events-none whitespace-nowrap"
              style={{ fontSize: '100px', opacity: 0.04 }}
              aria-hidden
            >
              {place.image_keyword}
            </span>
          )}

          {/* Type badge */}
          <span
            className={`absolute top-3 left-4 rounded-full border px-2.5 py-0.5 text-[11px] font-nunito font-semibold capitalize ${typeColor}`}
          >
            {place.type}
          </span>

          {/* Trending badge */}
          {place.trending && (
            <span className="absolute top-3 right-4 rounded-full bg-black/50 backdrop-blur-sm border border-white/15 px-2.5 py-0.5 text-[11px] font-nunito text-white/90">
              📈 Trending
            </span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="px-4 py-4">
        <h3 className="font-syne text-[18px] font-bold text-[#F0EEFF] leading-tight mb-0.5">
          {place.name}
        </h3>
        <p className="text-[12px] font-nunito text-[#9b8fc4] mb-2">
          {place.country}
          {place.region ? ` · ${place.region}` : ''}
        </p>

        {place.description && (
          <p className="text-[13px] font-nunito text-[#e8e0ff]/65 leading-relaxed line-clamp-2 mb-3">
            {place.description}
          </p>
        )}

        {/* Vibe chips */}
        {place.vibes && place.vibes.length > 0 && (
          <div className="flex gap-1.5 mb-3">
            {place.vibes.slice(0, 3).map(vibe => (
              <span
                key={vibe}
                className="rounded-full bg-violet-accent/10 border border-violet-accent/20 px-2.5 py-0.5 text-[11px] font-nunito text-violet-accent"
              >
                {vibe}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Intensity */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
            <span className="text-[11px] font-nunito text-[#9b8fc4] capitalize">
              {place.intensity ?? 'moderate'} intensity
            </span>
          </div>

          {/* Add button */}
          <button
            onClick={() => !isAdded && onAdd(place.id)}
            disabled={isAdded}
            className={`min-h-[44px] px-4 rounded-xl text-[13px] font-nunito font-semibold transition-all active:scale-[0.97] ${
              isAdded
                ? 'text-violet-accent cursor-default'
                : 'text-[#9b8fc4] hover:text-violet-accent'
            }`}
          >
            {isAdded ? 'On your list ✦' : '+ Add to List'}
          </button>
        </div>
      </div>
    </article>
  )
}
