'use client'

import Link from 'next/link'
import { Heart, MapPin } from 'lucide-react'
import type { Place } from '@/lib/types'

interface Props {
  place: Place
  isAdded: boolean
  onAdd: () => void
  onRemove: () => void
  index: number
}

// Index 0 and 3 → dark navy card. Index 1 and 2 → mango tint card.
function isDark(index: number) {
  return index === 0 || index === 3
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

export default function HomePlaceCard({ place, isAdded, onAdd, onRemove, index }: Props) {
  const dark = isDark(index)
  const location = [place.region, place.country].filter(Boolean).join(', ')

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ height: 260, background: dark ? '#131936' : '#fcd99a' }}
    >
      {/* Card body navigation */}
      <Link
        href={`/experience/${place.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View ${place.name}`}
      />

      {/* Save button — 44px touch target wraps a smaller visible circle */}
      <div className="absolute top-2 right-2 z-10 w-11 h-11 flex items-center justify-center">
        <button
          onClick={isAdded ? onRemove : onAdd}
          className="w-7 h-7 rounded-full bg-white flex items-center justify-center"
          aria-label={isAdded ? 'Remove from list' : 'Save to list'}
        >
          <Heart
            size={14}
            className={isAdded ? 'text-[#f08c21]' : 'text-[#131936]'}
            fill={isAdded ? '#f08c21' : 'transparent'}
          />
        </button>
      </div>

      {/* Bottom text content — pointer-events-none so Link handles taps */}
      <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
        <h3
          className={`font-syne font-bold leading-tight truncate ${dark ? 'text-white' : 'text-[#131936]'}`}
          style={{ fontSize: 14 }}
        >
          {place.name}
        </h3>
        {location && (
          <p
            className={`flex items-center gap-0.5 font-nunito mt-0.5 truncate ${dark ? 'text-[#fcd99a]' : 'text-[#131936]/70'}`}
            style={{ fontSize: 11 }}
          >
            <MapPin size={10} className="shrink-0" />
            <span className="truncate">{location}</span>
          </p>
        )}
        <p
          className={`flex items-center gap-0.5 font-nunito mt-1 ${dark ? 'text-white/60' : 'text-[#131936]/50'}`}
          style={{ fontSize: 10 }}
        >
          <Heart size={9} fill="currentColor" />
          {formatCount(place.popularity)} saves
        </p>
      </div>
    </div>
  )
}
