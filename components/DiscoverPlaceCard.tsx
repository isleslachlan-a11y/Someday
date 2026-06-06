'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, MapPin } from 'lucide-react'
import type { Place } from '@/lib/types'

interface Props {
  place: Place
  isSaved: boolean
  onSave: () => void
  index: number
  gridMode?: boolean
  onClick?: () => void
  onDismiss?: () => void
}

export default function DiscoverPlaceCard({
  place,
  isSaved,
  onSave,
  index,
  gridMode = false,
  onClick,
}: Props) {
  const dark = index % 4 === 0 || index % 4 === 3

  return (
    <div
      className={`relative rounded-2xl overflow-hidden ${gridMode ? 'w-full' : 'shrink-0'}`}
      style={{
        height: 210,
        ...(gridMode ? {} : { width: 130 }),
        background: dark ? '#131936' : '#fcd99a',
      }}
    >
      {place.image_url && (
        <Image
          src={place.image_url}
          alt={place.name}
          fill
          sizes={gridMode ? '(max-width: 480px) 50vw, 200px' : '130px'}
          className="object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <Link
        href={`/places/${place.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View ${place.name}`}
        onClick={onClick}
      />

      {/* Heart button — 44px touch target */}
      <div className="absolute top-2 right-2 z-10 w-11 h-11 flex items-center justify-center">
        <button
          onClick={e => { e.preventDefault(); onSave() }}
          className="w-7 h-7 rounded-full bg-white flex items-center justify-center"
          aria-label={isSaved ? 'Remove from list' : 'Save to list'}
        >
          <Heart
            size={14}
            className={isSaved ? 'text-[#f08c21]' : 'text-[#131936]'}
            fill={isSaved ? '#f08c21' : 'transparent'}
          />
        </button>
      </div>

      {/* Bottom text */}
      <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
        <p className="font-brice-condensed font-bold text-white text-[13px] leading-tight line-clamp-2">
          {place.name}
        </p>
        <p className="font-nunito text-white/70 text-[10px] mt-1 flex items-center gap-0.5 truncate">
          <MapPin size={9} className="shrink-0" />
          <span className="truncate">{place.state_province ? `${place.state_province}, ${place.country}` : place.country}</span>
        </p>
        <p className="font-nunito text-white/55 text-[10px] mt-0.5 flex items-center gap-0.5">
          <Heart size={8} fill="currentColor" />
          {place.popularity >= 1000
            ? (place.popularity / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
            : String(place.popularity)} saves
        </p>
      </div>
    </div>
  )
}
