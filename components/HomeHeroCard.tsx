'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MapPin } from 'lucide-react'
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

  const location = place.state_province ? `${place.state_province}, ${place.country}` : place.country

  return (
    <div
      className="relative rounded-[20px] overflow-hidden w-full"
      style={{
        height: 220,
        background: 'linear-gradient(135deg, #f89a14 0%, #f5b05a 50%, #fcd99a 100%)',
      }}
    >
      {/* Unsplash photo */}
      {place.image_url && (
        <Image
          src={place.image_url}
          alt={place.name}
          fill
          sizes="(max-width: 480px) 100vw, 480px"
          className="object-cover"
          priority
        />
      )}

      {/* Gradient overlay for text legibility */}
      {place.image_url && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
      )}

      {/* Full-card navigation — sits beneath interactive elements */}
      <Link
        href={`/places/${place.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View ${place.name}`}
      />

      {/* Heart button — absolutely positioned, above the Link */}
      <div className="absolute top-2 right-2 z-10 w-11 h-11 flex items-center justify-center pointer-events-auto">
        <button
          onClick={isAdded ? onRemove : onAdd}
          className="w-7 h-7 rounded-full bg-white flex items-center justify-center"
          aria-label={isAdded ? 'Remove from list' : 'Save to list'}
        >
          <Heart
            size={14}
            className={isAdded ? 'text-[#f89a14]' : 'text-[#131936]'}
            fill={isAdded ? '#f89a14' : 'transparent'}
          />
        </button>
      </div>

      {/* All content — pointer-events-none so the Link above handles body taps */}
      <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
        {/* Top row */}
        <div className="flex items-start flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full bg-white text-[#f89a14] text-[11px] font-nunito font-semibold leading-none flex items-center">
            ✦ Trending this week
          </span>
          {place.primary_category && (
            <span className="px-2.5 py-1 rounded-full bg-black/20 text-white text-[11px] font-nunito font-medium leading-none flex items-center">
              {place.primary_category.icon} {place.primary_category.name}
            </span>
          )}
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-white leading-tight line-clamp-2" style={{ fontSize: 24 }}>
              {place.name}
            </h2>
            {location && (
              <p className="flex items-center gap-1 text-white/80 font-nunito mt-0.5" style={{ fontSize: 13 }}>
                <MapPin size={12} className="shrink-0" />
                <span className="truncate">{location}</span>
              </p>
            )}
          </div>

          {/* Saves count */}
          <div className="flex items-center gap-1 text-white/80 font-nunito shrink-0" style={{ fontSize: 12 }}>
            <Heart size={12} />
            <span>{formatCount(place.popularity)} saves</span>
          </div>
        </div>
      </div>
    </div>
  )
}
