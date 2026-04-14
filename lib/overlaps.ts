/**
 * Overlap utility — finds bucket list matches between the current user
 * and the people they follow.
 *
 * Server-only: uses the admin client to read other users' private
 * bucket_list_items (which are RLS-protected).
 *
 * Wrapped with React `cache()` so multiple Server Components that call
 * getOverlaps(userId) in the same render tree only hit the database once.
 *
 * Cache is invalidated automatically on the next request. For instant
 * invalidation after a bucket list mutation, call revalidatePath('/plan')
 * in the relevant Server Action (already done in addPlaceToList /
 * removeFromList in bucketList.ts).
 */

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Place, OverlapResult, OverlapProfile, PlaceOverlap, FriendOverlap } from '@/lib/types'

export const getOverlaps = cache(async (userId: string): Promise<OverlapResult> => {
  const empty: OverlapResult = { byPlace: {}, byFriend: {} }

  const supabase = await createClient()
  const admin = createAdminClient()

  // ── 1. Current user's active place_ids ─────────────────────────────────────
  const { data: myItems } = await supabase
    .from('bucket_list_items')
    .select('place_id')
    .eq('user_id', userId)
    .in('status', ['wishlist', 'planning'])

  if (!myItems || myItems.length === 0) return empty

  const myPlaceIds = new Set(myItems.map(i => i.place_id as string))

  // ── 2. People the current user follows ─────────────────────────────────────
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  if (!follows || follows.length === 0) return empty

  const followingIds = follows.map(f => f.following_id as string)

  // ── 3. Followed users' active bucket items (admin bypasses RLS) ────────────
  const { data: friendItems } = await admin
    .from('bucket_list_items')
    .select('user_id, place_id')
    .in('user_id', followingIds)
    .in('status', ['wishlist', 'planning'])

  if (!friendItems || friendItems.length === 0) return empty

  // ── 4. Keep only items that overlap with the current user's list ───────────
  const overlappingItems = friendItems.filter(i => myPlaceIds.has(i.place_id as string))
  if (overlappingItems.length === 0) return empty

  const overlappingPlaceIds = [...new Set(overlappingItems.map(i => i.place_id as string))]
  const overlappingFriendIds = [...new Set(overlappingItems.map(i => i.user_id as string))]

  // ── 5. Batch-fetch place details and friend profiles ───────────────────────
  const [placesResult, profilesResult] = await Promise.all([
    admin.from('places').select('*').in('id', overlappingPlaceIds),
    admin.from('profiles').select('id, username, avatar_url').in('id', overlappingFriendIds),
  ])

  const placeMap = new Map<string, Place>(
    (placesResult.data ?? []).map(p => [p.id as string, p as unknown as Place])
  )
  const profileMap = new Map<string, OverlapProfile>(
    (profilesResult.data ?? []).map(p => [
      p.id as string,
      {
        id: p.id as string,
        username: (p.username as string | null) ?? 'unknown',
        avatar_url: (p.avatar_url as string | null) ?? null,
      },
    ])
  )

  // ── 6. Build byPlace and byFriend structures ───────────────────────────────
  const byPlace: Record<string, PlaceOverlap> = {}
  const byFriend: Record<string, FriendOverlap> = {}

  for (const item of overlappingItems) {
    const placeId = item.place_id as string
    const friendId = item.user_id as string

    const place = placeMap.get(placeId)
    const friend = profileMap.get(friendId)
    if (!place || !friend) continue

    // byPlace
    if (!byPlace[placeId]) {
      byPlace[placeId] = { place, matchingFriends: [] }
    }
    if (!byPlace[placeId].matchingFriends.some(f => f.id === friendId)) {
      byPlace[placeId].matchingFriends.push(friend)
    }

    // byFriend
    if (!byFriend[friendId]) {
      byFriend[friendId] = { friend, matchingPlaces: [] }
    }
    if (!byFriend[friendId].matchingPlaces.some(p => p.id === placeId)) {
      byFriend[friendId].matchingPlaces.push(place)
    }
  }

  return { byPlace, byFriend }
})
