'use client'

import { useEffect } from 'react'
import { logEvent } from '@/lib/events'

export default function PlaceViewTracker({
  userId,
  placeId,
}: {
  userId: string
  placeId: string
}) {
  useEffect(() => {
    logEvent(userId, 'destination_viewed', { place_id: placeId, source: 'detail_page' })
  }, [userId, placeId])

  return null
}
