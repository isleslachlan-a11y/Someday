'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { logEvent } from '@/lib/events'
import { addPlaceToList, removePlaceByPlaceId } from '@/app/actions/bucketList'
import DiscoverPlaceCard from '@/components/DiscoverPlaceCard'
import type { Place } from '@/lib/types'

interface Collection {
  id: string
  slug: string
  name: string
  type: string
  description: string | null
}

interface Props {
  collection: Collection
  places: Place[]
  userId: string
  initialSavedIds: Set<string>
}

const TYPE_BADGE: Record<string, string> = {
  region:    'bg-[#131936]/10 text-[#131936]',
  theme:     'bg-[#7B4FE8]/15 text-[#7B4FE8]',
  editorial: 'bg-[#f08c21]/15 text-[#f08c21]',
  country:   'bg-[#16a34a]/15 text-[#16a34a]',
}

export default function CollectionDetail({ collection, places, userId, initialSavedIds }: Props) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSavedIds))

  async function handleSave(placeId: string) {
    const isNowSaved = !savedIds.has(placeId)
    setSavedIds(prev => {
      const next = new Set(prev)
      isNowSaved ? next.add(placeId) : next.delete(placeId)
      return next
    })
    void logEvent(userId, isNowSaved ? 'place_saved' : 'item_removed', {
      place_id: placeId,
      source: `collection_${collection.slug}`,
    })
    const result = isNowSaved
      ? await addPlaceToList(placeId)
      : await removePlaceByPlaceId(placeId)
    if (result.error) {
      setSavedIds(prev => {
        const next = new Set(prev)
        isNowSaved ? next.delete(placeId) : next.add(placeId)
        return next
      })
      toast.error('Something went wrong.')
    }
  }

  return (
    <div className="min-h-screen bg-[#fff9f0]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/discover"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#fcd99a]/30 transition-colors text-[#131936]/60 font-nunito text-[18px]"
            aria-label="Back to Discover"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-brice font-bold text-[#131936] text-[16px] truncate">
              {collection.name}
            </p>
          </div>
          <span className="font-nunito text-[#131936]/40 text-[12px] shrink-0">
            {places.length} place{places.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <div className="max-w-[480px] mx-auto px-4 pt-4 pb-24">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2.5 py-1 rounded-full font-nunito text-[11px] font-semibold capitalize ${TYPE_BADGE[collection.type] ?? TYPE_BADGE.editorial}`}>
            {collection.type}
          </span>
        </div>

        {/* Description */}
        {collection.description && (
          <p className="font-nunito text-[#131936]/60 text-[14px] leading-relaxed mb-5">
            {collection.description}
          </p>
        )}

        {/* Place grid */}
        {places.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="font-brice font-bold text-[#131936] text-[16px]">Nothing here yet</p>
            <p className="font-nunito text-[#131936]/40 text-[13px] mt-1">
              This collection is being curated.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {places.map((place, index) => (
              <DiscoverPlaceCard
                key={place.id}
                place={place}
                isSaved={savedIds.has(place.id)}
                onSave={() => void handleSave(place.id)}
                index={index}
                gridMode
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
