'use client'

/**
 * DailyHighlightCard — full-width hero, always first in the feed.
 * Uses gradient + watermark text as image placeholder.
 * TODO: Replace gradient with real CDN image via next/image once image_url is populated.
 */

import Link from 'next/link'
import type { Place } from '@/lib/types'

const TYPE_GRADIENT: Record<string, string> = {
  city:       'from-violet-accent/30 via-violet-accent/10 to-transparent',
  nature:     'from-emerald-500/25 via-emerald-500/8 to-transparent',
  experience: 'from-pink-accent/25 via-pink-accent/8 to-transparent',
  food:       'from-amber-500/25 via-amber-500/8 to-transparent',
}
const FALLBACK = 'from-violet-accent/25 via-violet-accent/8 to-transparent'

interface Props {
  place: Place
  isAdded: boolean
  onAdd: (id: string) => void
  index?: number
}

export default function DailyHighlightCard({ place, isAdded, onAdd, index = 0 }: Props) {
  const gradient = TYPE_GRADIENT[place.type] ?? FALLBACK

  return (
    <article
      className="w-full border-b border-[rgba(255,255,255,0.07)]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <Link href={`/places/${place.id}`} className="block">
        {/* Hero image area */}
        <div
          className={`relative h-[260px] bg-gradient-to-br ${gradient} bg-[#0d0b1a] overflow-hidden flex items-center justify-center`}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

          {/* Watermark */}
          {place.image_keyword && (
            <span
              className="absolute font-syne font-black text-white select-none pointer-events-none whitespace-nowrap"
              style={{ fontSize: '120px', opacity: 0.04 }}
              aria-hidden
            >
              {place.image_keyword}
            </span>
          )}

          {/* Today's Pick badge */}
          <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-[#FF8FAB] px-3 py-1">
            <span className="text-[11px] font-nunito font-bold text-white leading-none">
              Today&apos;s Pick
            </span>
          </div>

          {/* Place name over image */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <h2 className="font-syne text-2xl font-bold text-white leading-tight">
              {place.name}
            </h2>
            <p className="text-[13px] font-nunito text-[#9b8fc4] mt-0.5">
              {place.country}
              {place.region ? ` · ${place.region}` : ''}
            </p>
          </div>
        </div>
      </Link>

      {/* Content below image */}
      <div className="px-4 py-4">
        {place.description && (
          <p className="text-[14px] font-nunito text-[#e8e0ff]/70 leading-relaxed line-clamp-2 mb-3">
            {place.description}
          </p>
        )}

        {/* Tag chips */}
        {place.tags && place.tags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none mb-4 -mx-4 px-4">
            {place.tags.slice(0, 5).map(tag => (
              <span
                key={tag}
                className="shrink-0 rounded-full bg-white/[0.06] border border-white/10 px-3 py-0.5 text-[11px] font-nunito text-lavender"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => !isAdded && onAdd(place.id)}
            disabled={isAdded}
            className={`h-9 rounded-xl px-5 text-sm font-nunito font-semibold transition-all active:scale-[0.97] ${
              isAdded
                ? 'bg-violet-accent/15 text-violet-accent border border-violet-accent/25 cursor-default'
                : 'bg-violet-accent text-white hover:bg-violet-accent/90'
            }`}
          >
            {isAdded ? '✦ On your list' : 'Add to List'}
          </button>

          {/* Bookmark icon */}
          <button
            onClick={() => !isAdded && onAdd(place.id)}
            disabled={isAdded}
            aria-label={isAdded ? 'Saved' : 'Save to list'}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 text-[#9b8fc4] hover:border-violet-accent/50 hover:text-violet-accent transition-colors"
          >
            <span className="text-base leading-none">{isAdded ? '✦' : '◇'}</span>
          </button>
        </div>
      </div>
    </article>
  )
}
