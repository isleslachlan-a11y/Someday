'use client'

import { useEffect } from 'react'
import { logEvent } from '@/lib/events'

export default function HomeViewTracker({ userId }: { userId: string }) {
  useEffect(() => {
    logEvent(userId, 'home_viewed', {})
  }, [userId])

  return null
}
