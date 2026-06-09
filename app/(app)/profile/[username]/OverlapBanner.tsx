'use client'

import { useState } from 'react'
import { logEvent } from '@/lib/events'
import type { PlaceSnap } from '@/lib/types'

const TYPE_ICON: Record<string, string> = {
  destination: '🗺',
  experience:  '✨',
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
    <div className="rounded-2xl border border-[#f89a14]/25 bg-[#f89a14]/5 p-4 mb-6">
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
          <p className="text-xs text-[#f89a14] font-semibold uppercase tracking-wider mb-0.5">
            ✦ Overlap
          </p>
          <p className="font-display font-bold text-[#131936]">
            {count} place{count !== 1 ? 's' : ''} you both want to visit
          </p>
          <p className="text-xs text-[#131936]/50 mt-0.5">
            You and @{username} share {count === 1 ? 'a destination' : 'destinations'}
          </p>
        </div>
        <span className="shrink-0 text-[#131936]/50 text-lg transition-transform duration-200"
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
              className="flex items-center gap-3 rounded-xl border border-[#fcd99a]/40 bg-white px-3 py-2.5"
            >
              <span className="text-base select-none" aria-hidden>
                {TYPE_ICON[place.type] ?? '✦'}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#131936] truncate">{place.name}</p>
                <p className="text-xs text-[#131936]/50">{place.country}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
