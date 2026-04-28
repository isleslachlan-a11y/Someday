'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFriends } from '@/lib/friends'
import { getOverlaps } from '@/lib/overlaps'
import type { Place, FeedItem, FriendActivity, PromoPost, StoryUser } from '@/lib/types'

const PAGE_SIZE = 10

function getDayOfYear(date: Date): number {
  const yearStart = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - yearStart.getTime()) / 86_400_000)
}

export interface FeedPage {
  items: FeedItem[]
  storiesUsers: StoryUser[]
  friendIds: string[]
}

/**
 * Assembles the home feed for page N.
 *
 * Page 0: daily_highlight + all content streams merged via pattern
 *   [place, friend_activity, overlap, place, promotional, ...]
 * Page 1+: places only (offset past the first 20 used on page 0)
 */
export async function assembleFeed(page: number = 0): Promise<FeedPage> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { items: [], storiesUsers: [], friendIds: [] }

  const admin = createAdminClient()

  // ── Pages 1+: places only ─────────────────────────────────────────────────
  if (page > 0) {
    const offset = 20 + (page - 1) * PAGE_SIZE
    const { data } = await admin
      .from('places')
      .select('*')
      .order('popularity', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    return {
      items: (data ?? []).map(p => ({ type: 'place' as const, data: p as unknown as Place })),
      storiesUsers: [],
      friendIds: [],
    }
  }

  // ── Page 0: all streams ───────────────────────────────────────────────────
  const friends = await getFriends(user.id)
  const friendIds = friends.map(f => f.id)

  // Parallel: places, overlaps, promos
  const [placesResult, overlapsData, promosResult] = await Promise.all([
    admin.from('places').select('*').order('popularity', { ascending: false }).limit(30),
    getOverlaps(user.id),
    supabase.from('promotional_posts').select('*').limit(5),
  ])

  const places = (placesResult.data ?? []) as Place[]
  const promos = (promosResult.data ?? []) as PromoPost[]

  // Daily pick — deterministic by calendar day, using id-sorted order
  const sortedById = [...places].sort((a, b) => a.id.localeCompare(b.id))
  const dailyPick =
    sortedById.length > 0 ? sortedById[getDayOfYear(new Date()) % sortedById.length] : null

  // ── Friend activity stream ────────────────────────────────────────────────
  let friendActivities: FriendActivity[] = []
  let storiesUsers: StoryUser[] = []

  if (friendIds.length > 0) {
    const { data: completions } = await admin
      .from('bucket_list_items')
      .select('id, user_id, place_id, completed_at, completion_note')
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .in('user_id', friendIds)
      .order('completed_at', { ascending: false })
      .limit(10)

    if (completions && completions.length > 0) {
      const placeIds = [...new Set(completions.map(c => c.place_id as string))]
      const userIds = [...new Set(completions.map(c => c.user_id as string))]

      const [placeRows, profileRows] = await Promise.all([
        admin.from('places').select('*').in('id', placeIds),
        admin.from('profiles').select('id, username, avatar_url').in('id', userIds),
      ])

      const placeMap = new Map(
        (placeRows.data ?? []).map(p => [p.id as string, p as unknown as Place])
      )
      const profileMap = new Map(
        (profileRows.data ?? []).map(p => [p.id as string, p as Record<string, unknown>])
      )

      for (const c of completions) {
        const place = placeMap.get(c.place_id as string)
        const profile = profileMap.get(c.user_id as string)
        if (!place || !profile) continue
        friendActivities.push({
          id: c.id as string,
          user_id: c.user_id as string,
          place_id: c.place_id as string,
          completed_at: c.completed_at as string,
          completion_note: (c.completion_note as string | null) ?? null,
          profile: {
            id: profile.id as string,
            username: (profile.username as string | null) ?? 'user',
            avatar_url: (profile.avatar_url as string | null) ?? null,
          },
          place,
        })
      }

      // Stories: friends active in the last 48 hours
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      const recentIds = new Set(
        completions
          .filter(c => (c.completed_at as string) > cutoff)
          .map(c => c.user_id as string)
      )
      storiesUsers = [...profileMap.entries()]
        .filter(([id]) => recentIds.has(id))
        .map(([id, p]) => ({
          id,
          username: (p.username as string | null) ?? 'user',
          avatar_url: (p.avatar_url as string | null) ?? null,
          hasUnread: true,
        }))
    }
  }

  // ── Overlap stream ────────────────────────────────────────────────────────
  const overlapItems = Object.values(overlapsData.byPlace)

  // ── Assemble feed ─────────────────────────────────────────────────────────
  const nonHighlightPlaces = places.filter(p => p.id !== dailyPick?.id)
  const items: FeedItem[] = []

  // Position 0: daily highlight
  if (dailyPick) items.push({ type: 'daily_highlight', data: dailyPick })

  // Remaining positions via repeating pattern
  const pattern = ['place', 'friend', 'overlap', 'place', 'promo'] as const
  let pIdx = 0, fIdx = 0, oIdx = 0, promoIdx = 0, patternI = 0

  while (items.length < PAGE_SIZE) {
    const slot = pattern[patternI % pattern.length]
    patternI++

    let pushed = false

    if (slot === 'friend' && fIdx < friendActivities.length) {
      items.push({ type: 'friend_activity', data: friendActivities[fIdx++] })
      pushed = true
    } else if (slot === 'overlap' && oIdx < overlapItems.length) {
      items.push({ type: 'overlap', data: overlapItems[oIdx++] })
      pushed = true
    } else if (slot === 'promo' && promoIdx < promos.length) {
      items.push({ type: 'promotional', data: promos[promoIdx++] })
      pushed = true
    }

    if (!pushed) {
      if (pIdx < nonHighlightPlaces.length) {
        items.push({ type: 'place', data: nonHighlightPlaces[pIdx++] })
      } else {
        break
      }
    }
  }

  return { items, storiesUsers, friendIds }
}
