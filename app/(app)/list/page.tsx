import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ListFilters from './ListFilters'
import type { BucketListStatus, ListEntry, FriendBucketItem } from '@/lib/types'

export const metadata: Metadata = {
  title: 'My List',
  description: 'Every place you want to visit someday.',
}

export default async function ListPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Primary queries (parallel) ───────────────────────────────────────────

  const [profileResult, itemsResult, followsResult] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user.id).single(),

    // bucket_list_items joined with places
    supabase
      .from('bucket_list_items')
      .select(`
        id,
        user_id,
        place_id,
        added_at,
        target_date,
        notes,
        status,
        places (
          id,
          name,
          country,
          type,
          description,
          tags,
          vibes,
          intensity,
          image_keyword
        )
      `)
      .eq('user_id', user.id)
      .order('added_at', { ascending: false }),

    // Who the current user follows (may not exist pre-migration — handled below)
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
  ])

  // ── Transform items ──────────────────────────────────────────────────────

  const entries: ListEntry[] = []

  if (!itemsResult.error && itemsResult.data) {
    for (const row of itemsResult.data) {
      // places is returned as an object (FK join); skip rows where the join failed
      const place = row.places as unknown as Record<string, unknown> | null
      if (!place) continue

      entries.push({
        id: row.id as string,
        user_id: row.user_id as string,
        place_id: row.place_id as string,
        added_at: row.added_at as string,
        target_date: (row.target_date as string | null) ?? null,
        notes: (row.notes as string | null) ?? null,
        status: (row.status as BucketListStatus) ?? 'wishlist',
        place: {
          id: place.id as string,
          name: place.name as string,
          country: place.country as string,
          type: place.type as string,
          description: (place.description as string | null) ?? null,
          tags: (place.tags as string[] | null) ?? null,
          vibes: (place.vibes as string[] | null) ?? null,
          intensity: (place.intensity as string | null) ?? null,
          image_keyword: (place.image_keyword as string | null) ?? null,
        },
      })
    }
  }

  // ── Social proof: followed users' bucket items ───────────────────────────

  let friendItems: FriendBucketItem[] = []

  if (!followsResult.error && followsResult.data && followsResult.data.length > 0) {
    const followingIds = followsResult.data.map(f => f.following_id as string)

    const { data: friendData } = await supabase
      .from('bucket_list_items')
      .select('place_id, user_id, profiles(username, avatar_url)')
      .in('user_id', followingIds)

    if (friendData) {
      for (const row of friendData) {
        if (!row.place_id) continue
        const profile = row.profiles as unknown as { username: string; avatar_url: string | null } | null
        if (!profile?.username) continue
        friendItems.push({
          place_id: row.place_id as string,
          user_id: row.user_id as string,
          username: profile.username,
          avatar_url: profile.avatar_url ?? null,
        })
      }
    }
  }

  const username = profileResult.data?.username ?? 'traveller'

  return (
    <main className="min-h-screen bg-indigo-deep px-4 py-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-syne text-3xl font-bold text-white-soft">My List</h1>
            <p className="text-muted text-sm mt-1">
              {entries.length} place{entries.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <Link
            href="/list/new"
            className="rounded-xl bg-violet-accent hover:bg-violet-accent/90 px-4 py-2.5 font-syne font-semibold text-white-soft text-sm transition-colors"
          >
            + Add
          </Link>
        </div>

        {/* Filters, list, and bottom sheet — all client-side */}
        <Suspense fallback={<FiltersPlaceholder />}>
          <ListFilters
            entries={entries}
            userId={user.id}
            friendItems={friendItems}
          />
        </Suspense>

      </div>
    </main>
  )
}

function FiltersPlaceholder() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2 pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-white/5 border border-white/10" />
        ))}
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-20 shrink-0 rounded-full bg-white/5 border border-white/10" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-44 rounded-2xl bg-white/5 border border-white/10" />
        ))}
      </div>
    </div>
  )
}
