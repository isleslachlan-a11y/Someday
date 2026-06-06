import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ListFilters from './ListFilters'
import type { BucketListStatus, ListEntry, FriendBucketItem, Place } from '@/lib/types'

export const metadata: Metadata = {
  title: "My Someday's",
  description: 'Every place you want to visit someday.',
}

export default async function ListPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Primary queries (parallel) ───────────────────────────────────────────

  const [itemsResult, followsResult] = await Promise.all([
    // bucket_list_items joined with places — includes image + location fields for card display
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
        completed_at,
        completion_note,
        places (
          id,
          name,
          country,
          type,
          description,
          tags,
          vibes,
          intensity,
          image_keyword,
          image_url,
          image_thumb_url,
          popularity,
          lat,
          lng
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
        completed_at: (row.completed_at as string | null) ?? null,
        completion_note: (row.completion_note as string | null) ?? null,
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
          // Extra fields for HomePlaceCard — not on PlaceSnap type but safe to carry
          ...(place.image_url !== undefined && { image_url: (place.image_url as string | null) ?? null }),
          ...(place.image_thumb_url !== undefined && { image_thumb_url: (place.image_thumb_url as string | null) ?? null }),
          ...(place.popularity !== undefined && { popularity: (place.popularity as number) ?? 0 }),
          ...(place.lat !== undefined && { lat: (place.lat as number | null) ?? null }),
          ...(place.lng !== undefined && { lng: (place.lng as number | null) ?? null }),
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

  // ── Suggested places for empty list ────────────────────────────────────────

  let suggestedPlaces: Place[] = []

  if (entries.length === 0) {
    const { data: ctx } = await supabase
      .from('user_context')
      .select('travel_style')
      .eq('user_id', user.id)
      .maybeSingle()

    const travelStyle = (ctx as { travel_style?: string[] } | null)?.travel_style ?? []

    const categoryMap: Record<string, string> = {
      'Adventure Seeker':    'adventure-sport',
      'Culture Lover':       'culture-history',
      'Food Obsessed':       'food-drink',
      'Beach Bum':           'nature-wilderness',
      'City Explorer':       'city-escapes',
      'Off the Beaten Track':'hidden-gems',
      'Wellness Focused':    'wellness-retreat',
      'Party Starter':       'events-festivals',
    }
    const preferredCategory = travelStyle.length > 0 ? categoryMap[travelStyle[0]] ?? null : null

    if (preferredCategory) {
      const { data: catRow } = await supabase
        .from('categories').select('id').eq('slug', preferredCategory).maybeSingle()
      if (catRow) {
        const { data: catPlacesData } = await supabase
          .from('experiences_categories')
          .select('experience_id')
          .eq('category_id', (catRow as { id: string }).id)
          .limit(8)
        const ids = (catPlacesData ?? []).map((r: { experience_id: string }) => r.experience_id)
        if (ids.length > 0) {
          const { data: placesData } = await supabase
            .from('places').select('*').in('id', ids)
            .order('popularity', { ascending: false }).limit(4)
          suggestedPlaces = (placesData ?? []) as Place[]
        }
      }
    }

    if (suggestedPlaces.length < 4) {
      const { data: fallback } = await supabase
        .from('places').select('*').order('popularity', { ascending: false }).limit(4)
      suggestedPlaces = (fallback ?? []) as Place[]
    }
  }

  return (
    <main className="min-h-screen bg-[#fff9f0]">

      {/* Sticky top bar */}
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 grid grid-cols-3 items-center">
          <div />
          <div className="flex justify-center">
            <h1 className="font-brice font-bold text-[#131936] text-[20px] tracking-widest uppercase whitespace-nowrap">
              MY SOMEDAY&apos;S
            </h1>
          </div>
          <div />
        </div>
      </header>

      <div className="max-w-[480px] mx-auto px-4 pt-4 pb-24">
        <Suspense fallback={<FiltersPlaceholder />}>
          <ListFilters
            entries={entries}
            userId={user.id}
            friendItems={friendItems}
            suggestedPlaces={suggestedPlaces}
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
          <div key={i} className="h-9 w-24 rounded-full bg-[#fcd99a]/20 border border-[#fcd99a]/30" />
        ))}
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-20 shrink-0 rounded-full bg-[#fcd99a]/20 border border-[#fcd99a]/30" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[260px] rounded-2xl bg-[#fcd99a]/20 border border-[#fcd99a]/30" />
        ))}
      </div>
    </div>
  )
}
