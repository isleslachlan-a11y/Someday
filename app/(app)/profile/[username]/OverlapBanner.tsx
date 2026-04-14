'use client'

import { useState } from 'react'
import { logEvent } from '@/lib/events'
import type { PlaceSnap } from '@/lib/types'

const TYPE_ICON: Record<string, string> = {
  city:       '🏙',
  nature:     '🌿',
  experience: '✨',
  food:       '🍜',
}

interface Props {
  places: PlaceSnap[]
  username: string
  viewerUserId: string
}

export default function OverlapBanner({ places, username, viewerUserId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const count = places.length

  return (
    <div className="rounded-2xl border border-violet-accent/25 bg-violet-accent/5 p-4 mb-6">
      {/* Header row */}
      <button
        onClick={() => {
          const next = !expanded
          setExpanded(next)
          if (next) {
            logEvent(viewerUserId, 'overlap_viewed', {
              place_ids: places.map(p => p.id),
              friend_count: 1,
              place_count: count,
            })
          }
        }}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="text-xs text-lavender font-semibold uppercase tracking-wider mb-0.5">
            ✦ Overlap
          </p>
          <p className="font-syne font-bold text-white-soft">
            {count} place{count !== 1 ? 's' : ''} you both want to visit
          </p>
          <p className="text-xs text-muted mt-0.5">
            You and @{username} share {count === 1 ? 'a destination' : 'destinations'}
          </p>
        </div>
        <span className="shrink-0 text-muted text-lg transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ›
        </span>
      </button>

      {/* Expanded place list */}
      {expanded && (
        <div className="mt-4 space-y-2">
          {places.map(place => (
            <div
              key={place.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
            >
              <span className="text-base select-none" aria-hidden>
                {TYPE_ICON[place.type] ?? '✦'}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white-soft truncate">{place.name}</p>
                <p className="text-xs text-muted">{place.country}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
