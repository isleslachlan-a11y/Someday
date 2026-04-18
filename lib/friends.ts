/**
 * lib/friends.ts — server-only friendship utility functions.
 *
 * These functions are imported and called from Server Actions in app/actions/.
 * Never import in Client Components.
 *
 * Read functions  → admin client (bypasses RLS; safe because userId is
 *                   always a known, authenticated user ID passed from
 *                   a Server Component or Action).
 * Write functions → server client (RLS enforces that requester = auth.uid()).
 *
 * Design notes:
 *   - unique(requester_id, addressee_id) means A→B ≠ B→A.
 *     All bidirectional queries must check both orderings.
 *   - 'declined' rows are treated as 'none' in status returns so
 *     either party can re-initiate after a decline.
 *   - Rows are never deleted; use status = 'blocked' to prevent
 *     future requests from the same pair.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserProfile } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FriendshipStatus =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'accepted'
  | 'blocked'

export interface PendingRequest {
  friendshipId: string
  requesterId: string
  createdAt: string
  profile: UserProfile
}

export interface UserSearchResult {
  profile: UserProfile
  friendshipStatus: FriendshipStatus
  /** null when friendshipStatus === 'none' */
  friendshipId: string | null
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Cast a raw Supabase profile row to UserProfile. */
function toProfile(p: Record<string, unknown>): UserProfile {
  return {
    id:         p.id as string,
    username:   (p.username as string | null)   ?? null,
    bio:        (p.bio     as string | null)    ?? null,
    avatar_url: (p.avatar_url as string | null) ?? null,
    created_at: p.created_at as string,
  }
}

// ─── Write functions ──────────────────────────────────────────────────────────

/**
 * Send a friend request from the currently authenticated user to addresseeId.
 * Logs a friend_request_sent event on success.
 */
export async function sendFriendRequest(
  addresseeId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user)                    return { error: 'Not authenticated' }
  if (user.id === addresseeId)  return { error: 'Cannot send a friend request to yourself' }

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: addresseeId })

  if (error) {
    // 23505 = unique_violation: request already exists in this direction
    if (error.code === '23505') return { error: 'Friend request already sent' }
    return { error: error.message }
  }

  // Event logging — never throws, never blocks the caller
  try {
    await supabase.from('events').insert({
      user_id:      user.id,
      event_type:   'friend_request_sent',
      metadata:     { addressee_id: addresseeId },
      platform:     'web',
      app_version:  process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
      country_code: null,
    })
  } catch { /* event logging must never crash the caller */ }

  return {}
}

/**
 * Accept an incoming friend request.
 * Only the addressee can accept; the RLS policy and .eq('addressee_id') guard
 * both enforce this.
 * Logs a friend_request_accepted event on success.
 */
export async function acceptFriendRequest(
  friendshipId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .eq('addressee_id', user.id)   // addressee only
    .eq('status', 'pending')       // only pending → accepted
    .select('requester_id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Request not found or already actioned' }
  }

  try {
    await supabase.from('events').insert({
      user_id:      user.id,
      event_type:   'friend_request_accepted',
      metadata:     { requester_id: data.requester_id },
      platform:     'web',
      app_version:  process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
      country_code: null,
    })
  } catch { /* event logging must never crash the caller */ }

  return {}
}

/**
 * Decline an incoming friend request.
 * The row is kept with status = 'declined' (not deleted).
 * getFriendshipStatus() maps 'declined' back to 'none' so either party
 * can re-initiate.
 */
export async function declineFriendRequest(
  friendshipId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('friendships')
    .update({ status: 'declined' })
    .eq('id', friendshipId)
    .eq('addressee_id', user.id)  // addressee only
    .eq('status', 'pending')

  if (error) return { error: error.message }
  return {}
}

// ─── Read functions ───────────────────────────────────────────────────────────

/**
 * Return the UserProfile of every accepted friend of userId.
 * Used by getOverlaps() and anywhere the social graph is needed.
 *
 * Uses the admin client — caller must ensure userId is a validated,
 * authenticated user ID.
 */
export async function getFriends(userId: string): Promise<UserProfile[]> {
  const admin = createAdminClient()

  // Friendships are directional in storage (requester→addressee) but
  // conceptually symmetric once accepted — check both sides.
  const { data: rows } = await admin
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

  if (!rows || rows.length === 0) return []

  const friendIds = rows.map(r =>
    (r.requester_id as string) === userId
      ? (r.addressee_id as string)
      : (r.requester_id as string),
  )

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, bio, avatar_url, created_at')
    .in('id', friendIds)

  return (profiles ?? []).map(p => toProfile(p as Record<string, unknown>))
}

/**
 * Return all pending friend requests addressed to userId,
 * with the requester's profile included.
 */
export async function getPendingRequests(userId: string): Promise<PendingRequest[]> {
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('friendships')
    .select('id, requester_id, created_at')
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (!rows || rows.length === 0) return []

  const requesterIds = rows.map(r => r.requester_id as string)

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, bio, avatar_url, created_at')
    .in('id', requesterIds)

  const profileMap = new Map(
    (profiles ?? []).map(p => [p.id as string, toProfile(p as Record<string, unknown>)]),
  )

  return rows
    .filter(r => profileMap.has(r.requester_id as string))
    .map(r => ({
      friendshipId: r.id         as string,
      requesterId:  r.requester_id as string,
      createdAt:    r.created_at  as string,
      profile:      profileMap.get(r.requester_id as string)!,
    }))
}

/**
 * Return the friendship status between two users from userId's perspective.
 *
 * 'none'             — no relationship (or a declined request, which can be retried)
 * 'pending_sent'     — userId sent a request, not yet actioned
 * 'pending_received' — otherUserId sent a request, userId has not yet responded
 * 'accepted'         — friends
 * 'blocked'          — either party has blocked the other
 */
export async function getFriendshipStatus(
  userId: string,
  otherUserId: string,
): Promise<FriendshipStatus> {
  const admin = createAdminClient()

  // Two possible rows: userId→otherUserId or otherUserId→userId
  const { data: rows } = await admin
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherUserId}),` +
      `and(requester_id.eq.${otherUserId},addressee_id.eq.${userId})`,
    )

  if (!rows || rows.length === 0) return 'none'

  // If multiple rows exist (shouldn't happen given the unique constraint on the
  // A→B direction, but B→A could exist separately), prefer the most significant status.
  for (const row of rows) {
    const status = row.status as string
    if (status === 'blocked')  return 'blocked'
    if (status === 'accepted') return 'accepted'
    if (status === 'pending') {
      return (row.requester_id as string) === userId
        ? 'pending_sent'
        : 'pending_received'
    }
    // 'declined' → fall through to 'none'
  }

  return 'none'
}

/**
 * Search users by username (case-insensitive partial match).
 * Excludes the current user.
 * Returns each profile alongside the caller's friendship status with them.
 *
 * Requires auth context — reads auth.uid() from the server client.
 * Min query length: 2 characters to avoid table-scans.
 */
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  // Escape SQL LIKE wildcards so the user's literal text is matched
  const pattern = `%${trimmed.replace(/[%_]/g, c => `\\${c}`)}%`

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, bio, avatar_url, created_at')
    .ilike('username', pattern)
    .neq('id', user.id)
    .limit(20)

  if (!profiles || profiles.length === 0) return []

  // Fetch all friendships where the current user is involved — filter client-side.
  // Total friendships per user is small; this avoids complex PostgREST OR syntax.
  const { data: allMyFriendships } = await admin
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

  const profileIds = new Set(profiles.map(p => p.id as string))

  // Build a map of otherUserId → most recent relevant friendship row
  const friendshipMap = new Map<
    string,
    { id: string; status: string; requester_id: string }
  >()

  for (const f of allMyFriendships ?? []) {
    const otherId =
      (f.requester_id as string) === user.id
        ? (f.addressee_id as string)
        : (f.requester_id as string)

    if (!profileIds.has(otherId)) continue

    // Prefer more significant statuses (blocked > accepted > pending)
    const existing = friendshipMap.get(otherId)
    const order = { blocked: 3, accepted: 2, pending: 1, declined: 0 }
    const currentScore = order[(f.status as keyof typeof order)] ?? 0
    const existingScore = existing ? (order[(existing.status as keyof typeof order)] ?? 0) : -1

    if (currentScore > existingScore) {
      friendshipMap.set(otherId, {
        id:           f.id as string,
        status:       f.status as string,
        requester_id: f.requester_id as string,
      })
    }
  }

  return profiles.map(p => {
    const pid = p.id as string
    const f   = friendshipMap.get(pid)

    let friendshipStatus: FriendshipStatus = 'none'
    let friendshipId: string | null        = null

    if (f) {
      friendshipId = f.id
      if (f.status === 'accepted')  friendshipStatus = 'accepted'
      else if (f.status === 'blocked')  friendshipStatus = 'blocked'
      else if (f.status === 'pending') {
        friendshipStatus = f.requester_id === user.id ? 'pending_sent' : 'pending_received'
      }
      // 'declined' → 'none', friendshipId stays for potential UI reference
    }

    return {
      profile: toProfile(p as Record<string, unknown>),
      friendshipStatus,
      friendshipId,
    }
  })
}
