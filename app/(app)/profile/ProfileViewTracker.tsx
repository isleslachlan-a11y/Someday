'use client'

import { useEffect } from 'react'
import { logEvent } from '@/lib/events'

interface Props {
  userId: string
  viewedUserId: string
  isOwnProfile: boolean
}

export default function ProfileViewTracker({ userId, viewedUserId, isOwnProfile }: Props) {
  useEffect(() => {
    logEvent(userId, 'profile_viewed', { viewed_user_id: viewedUserId, is_own_profile: isOwnProfile })
  }, [userId, viewedUserId, isOwnProfile])

  return null
}
