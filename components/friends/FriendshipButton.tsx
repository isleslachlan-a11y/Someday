'use client'

/**
 * FriendshipButton — renders the appropriate CTA based on the current
 * friendship status between the viewer and another user.
 *
 * Used in:
 *   - FriendsSheet (Discover tab + search results)
 *   - Public profile header (app/(app)/profile/[username]/page.tsx)
 *
 * Optimistic: updates its own state immediately on click, then confirms
 * or reverts on server error.
 */

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import {
  sendFriendRequestAction,
  acceptFriendRequestAction,
  declineFriendRequestAction,
} from '@/app/actions/friends'
import type { FriendshipStatus } from '@/lib/friends'

interface Props {
  initialStatus: FriendshipStatus
  initialFriendshipId: string | null
  /** The user being acted upon (the addressee when sending a request). */
  addresseeId: string
  /** Called after a successful status change so parent can sync its state. */
  onStatusChange?: (newStatus: FriendshipStatus, newFriendshipId: string | null) => void
  /** Render a smaller pill variant (default: full button). */
  compact?: boolean
}

export default function FriendshipButton({
  initialStatus,
  initialFriendshipId,
  addresseeId,
  onStatusChange,
  compact = false,
}: Props) {
  const [status, setStatus]           = useState<FriendshipStatus>(initialStatus)
  const [friendshipId, setFriendshipId] = useState<string | null>(initialFriendshipId)
  const [isPending, startTransition]  = useTransition()

  function update(newStatus: FriendshipStatus, newId: string | null = null) {
    setStatus(newStatus)
    setFriendshipId(newId)
    onStatusChange?.(newStatus, newId)
  }

  function handleSend() {
    update('pending_sent')
    startTransition(async () => {
      const result = await sendFriendRequestAction(addresseeId)
      if (result.error) {
        update(initialStatus, initialFriendshipId)
        toast.error(result.error)
      }
    })
  }

  function handleAccept() {
    if (!friendshipId) return
    update('accepted')
    startTransition(async () => {
      const result = await acceptFriendRequestAction(friendshipId)
      if (result.error) {
        update('pending_received', friendshipId)
        toast.error(result.error)
      }
    })
  }

  function handleDecline() {
    if (!friendshipId) return
    update('none')
    startTransition(async () => {
      const result = await declineFriendRequestAction(friendshipId)
      if (result.error) {
        update('pending_received', friendshipId)
        toast.error(result.error)
      }
    })
  }

  const base = compact
    ? 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors min-h-[32px]'
    : 'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors min-h-[44px]'

  if (status === 'accepted') {
    return (
      <span className={`${base} border border-white/15 text-white-soft/60`}>
        Friends ✦
      </span>
    )
  }

  if (status === 'pending_sent') {
    return (
      <span className={`${base} border border-white/10 text-muted`}>
        Request sent
      </span>
    )
  }

  if (status === 'pending_received') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleAccept}
          disabled={isPending}
          className={`${base} bg-pink-accent/90 hover:bg-pink-accent text-white disabled:opacity-60`}
        >
          Accept
        </button>
        <button
          onClick={handleDecline}
          disabled={isPending}
          className={`${base} border border-white/15 text-white-soft/60 hover:text-white-soft disabled:opacity-60`}
        >
          Decline
        </button>
      </div>
    )
  }

  if (status === 'blocked') {
    return null
  }

  // 'none' — show Add Friend
  return (
    <button
      onClick={handleSend}
      disabled={isPending}
      className={`${base} bg-violet-accent hover:bg-violet-accent/85 text-white disabled:opacity-60`}
    >
      Add friend
    </button>
  )
}
