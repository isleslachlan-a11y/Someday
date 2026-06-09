'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
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
  const location = place.state_province ? `${place.state_province}, ${place.country}` : place.country
  const longPressRef = useRef<NodeJS.Timeout | null>(null)

  function handleTouchStart() {
    longPressRef.current = setTimeout(async () => {
      const url = `${window.location.origin}/places/${place.id}`
      await navigator.clipboard.writeText(url).catch(() => {})
      toast.success('Link copied ✦', {
        style: { background: '#131936', color: '#fff9f0', fontFamily: 'Nunito, sans-serif' },
      })
    }, 600)
  }

  function handleTouchEnd() {
    if (longPressRef.current) clearTimeout(longPressRef.current)
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ height: 260, background: dark ? '#131936' : '#fcd99a' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Unsplash photo */}
      {place.image_url && (
        <Image
          src={place.image_url}
          alt={place.name}
          fill
          sizes="(max-width: 480px) 50vw, 240px"
          className="object-cover"
        />
      )}

      {/* Gradient overlay so bottom text stays readable */}
      {place.image_url && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      )}

      {/* Card body navigation */}
      <Link
        href={`/places/${place.id}`}
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
            className={isAdded ? 'text-[#f89a14]' : 'text-[#131936]'}
            fill={isAdded ? '#f89a14' : 'transparent'}
          />
        </button>
      </div>

      {/* Bottom text content — pointer-events-none so Link handles taps */}
      <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
        <h3
          className={`font-heading font-bold leading-tight line-clamp-2 ${place.image_url || dark ? 'text-white' : 'text-[#131936]'}`}
          style={{ fontSize: 13, lineHeight: 1.3 }}
        >
          {place.name}
        </h3>
        {location && (
          <p
            className={`flex items-center gap-0.5 font-nunito mt-1 truncate ${place.image_url || dark ? 'text-white/70' : 'text-[#131936]/60'}`}
            style={{ fontSize: 10 }}
          >
            <MapPin size={9} className="shrink-0" />
            <span className="truncate">{location}</span>
          </p>
        )}
        <p
          className={`flex items-center gap-0.5 font-nunito mt-0.5 ${place.image_url || dark ? 'text-white/55' : 'text-[#131936]/45'}`}
          style={{ fontSize: 10 }}
        >
          <Heart size={8} fill="currentColor" />
          {formatCount(place.popularity)} saves
        </p>
      </div>
    </div>
  )
}
