'use server'

/**
 * Server Actions for the friends/social system.
 * Thin wrappers around lib/friends.ts utility functions, adding
 * revalidation and data-fetching context where needed.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  searchUsers,
  getFriends,
  getPendingRequests,
} from '@/lib/friends'
import { getOverlaps } from '@/lib/overlaps'
import type { UserProfile } from '@/lib/types'
import type { PendingRequest, UserSearchResult } from '@/lib/friends'

// ─── Write actions ────────────────────────────────────────────────────────────

export async function sendFriendRequestAction(
  addresseeId: string,
): Promise<{ error?: string }> {
  const result = await sendFriendRequest(addresseeId)
  if (!result.error) revalidatePath('/profile', 'layout')
  return result
}

export async function acceptFriendRequestAction(
  friendshipId: string,
): Promise<{ error?: string }> {
  const result = await acceptFriendRequest(friendshipId)
  if (!result.error) revalidatePath('/profile', 'layout')
  return result
}

export async function declineFriendRequestAction(
  friendshipId: string,
): Promise<{ error?: string }> {
  return declineFriendRequest(friendshipId)
}

// ─── Read actions ─────────────────────────────────────────────────────────────

export async function getFriendsAction(): Promise<UserProfile[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  return getFriends(user.id)
}

export async function getPendingRequestsAction(): Promise<PendingRequest[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  return getPendingRequests(user.id)
}

/**
 * Returns a map of friendId → number of overlapping places.
 * Used by FriendsSheet to show "X places in common" per friend row.
 */
export async function getFriendOverlapsAction(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}
  try {
    const overlaps = await getOverlaps(user.id)
    const result: Record<string, number> = {}
    for (const [friendId, data] of Object.entries(overlaps.byFriend)) {
      result[friendId] = data.matchingPlaces.length
    }
    return result
  } catch {
    return {}
  }
}

export async function searchUsersAction(query: string): Promise<UserSearchResult[]> {
  return searchUsers(query)
}

/**
 * "People you may know" — users who share bucket list places with the
 * current user but are not yet friends (any status).
 * Sorted by overlap count descending, capped at 10.
 */
export async function getSuggestedUsersAction(): Promise<UserSearchResult[]> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // Current user's active place IDs
  const { data: myItems } = await supabase
    .from('bucket_list_items')
    .select('place_id')
    .eq('user_id', user.id)
    .in('status', ['wishlist', 'planning'])

  if (!myItems || myItems.length === 0) return []

  const myPlaceIds = myItems.map(i => i.place_id as string)

  // Other users who have those places
  const { data: overlappingItems } = await admin
    .from('bucket_list_items')
    .select('user_id')
    .in('place_id', myPlaceIds)
    .in('status', ['wishlist', 'planning'])
    .neq('user_id', user.id)

  if (!overlappingItems || overlappingItems.length === 0) return []

  const overlapCounts = new Map<string, number>()
  for (const item of overlappingItems) {
    const uid = item.user_id as string
    overlapCounts.set(uid, (overlapCounts.get(uid) ?? 0) + 1)
  }

  // Exclude users we already have a non-declined friendship with
  const { data: myFriendships } = await admin
    .from('friendships')
    .select('requester_id, addressee_id, status')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

  const excludedIds = new Set<string>()
  for (const f of myFriendships ?? []) {
    if ((f.status as string) !== 'declined') {
      const otherId =
        (f.requester_id as string) === user.id
          ? (f.addressee_id as string)
          : (f.requester_id as string)
      excludedIds.add(otherId)
    }
  }

  const suggestedIds = [...overlapCounts.entries()]
    .filter(([id]) => !excludedIds.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id)

  if (suggestedIds.length === 0) return []

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, bio, avatar_url, created_at')
    .in('id', suggestedIds)

  return (profiles ?? []).map(p => ({
    profile: {
      id: p.id as string,
      username: (p.username as string | null) ?? null,
      bio: (p.bio as string | null) ?? null,
      avatar_url: (p.avatar_url as string | null) ?? null,
      created_at: p.created_at as string,
    },
    friendshipStatus: 'none' as const,
    friendshipId: null,
  }))
}
