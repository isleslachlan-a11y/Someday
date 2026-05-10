'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Bookmark, BookmarkCheck, Heart, MapPin } from 'lucide-react'
import { logEvent } from '@/lib/events'
import type { Place } from '@/lib/types'

interface Props {
  place: Place
  isAdded: boolean
  onAdd: () => void
  onRemove: () => void
  userId: string
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

export default function HomeHeroCard({ place, isAdded, onAdd, onRemove, userId }: Props) {
  useEffect(() => {
    logEvent(userId, 'destination_viewed', { place_id: place.id, source: 'home_hero' })
  }, [place.id, userId])

  const location = [place.region, place.country].filter(Boolean).join(', ')

  return (
    <div
      className="relative rounded-[20px] overflow-hidden w-full"
      style={{
        height: 220,
        background: 'linear-gradient(135deg, #f08c21 0%, #f5b05a 50%, #fcd99a 100%)',
      }}
    >
      {/* Full-card navigation — sits beneath interactive elements */}
      <Link
        href={`/experience/${place.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View ${place.name}`}
      />

      {/* All content — pointer-events-none so the Link above handles body taps */}
      <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <span className="px-3 py-1 rounded-full bg-white text-[#f08c21] text-[11px] font-nunito font-semibold leading-none flex items-center">
            ✦ Trending this week
          </span>

          {/* Bookmark toggle — re-enable pointer events */}
          <button
            onClick={isAdded ? onRemove : onAdd}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center pointer-events-auto shrink-0"
            aria-label={isAdded ? 'Remove from list' : 'Save to list'}
          >
            {isAdded ? (
              <BookmarkCheck size={18} className="text-[#f08c21]" fill="#f08c21" />
            ) : (
              <Bookmark size={18} className="text-[#131936]" />
            )}
          </button>
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-syne font-bold text-white leading-tight truncate" style={{ fontSize: 24 }}>
              {place.name}
            </h2>
            {location && (
              <p className="flex items-center gap-1 text-[#fcd99a] font-nunito mt-0.5" style={{ fontSize: 13 }}>
                <MapPin size={12} className="shrink-0" />
                <span className="truncate">{location}</span>
              </p>
            )}

            {/* CTA button */}
            <button
              onClick={isAdded ? onRemove : onAdd}
              className="pointer-events-auto mt-2 px-4 py-1.5 rounded-full bg-white text-[#131936] font-nunito font-semibold"
              style={{ fontSize: 13, minHeight: 36 }}
            >
              {isAdded ? '✓ Saved to Someday' : '+ Add to Someday'}
            </button>
          </div>

          {/* Saves count */}
          <div className="flex items-center gap-1 text-white font-nunito shrink-0" style={{ fontSize: 12 }}>
            <Heart size={12} />
            <span>{formatCount(place.popularity)} saves</span>
          </div>
        </div>
      </div>
    </div>
  )
}
