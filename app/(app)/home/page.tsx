import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomeContent from './HomeContent'
import type { Place } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Discover your next someday.',
}

const VIBE_ROWS = ['Adventure', 'Culture', 'Foodie', 'Epic', 'Romantic'] as const

/** Stable day-of-year index for deterministic daily pick. */
function getDayOfYear(date: Date): number {
  const yearStart = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - yearStart.getTime()) / 86_400_000)
}

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Three parallel queries — profile, full places catalogue, user's saved place ids
  const [profileResult, placesResult, bucketResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single(),
    supabase
      .from('places')
      .select('*')
      .order('id'), // stable order needed for deterministic daily pick
    supabase
      .from('bucket_list_items')
      .select('place_id')
      .eq('user_id', user.id),
  ])

  const profile = {
    username: profileResult.data?.username ?? user.email?.split('@')[0] ?? 'traveller',
    avatar_url: profileResult.data?.avatar_url ?? null,
  }

  const allPlaces = (placesResult.data ?? []) as Place[]

  const bucketPlaceIds = (bucketResult.data ?? [])
    .map(row => row.place_id)
    .filter((id): id is string => !!id)

  // ── Derive sections from the single places fetch ──────────────────────────

  // Daily pick — same place for every user on the same calendar day
  const dailyPick =
    allPlaces.length > 0
      ? allPlaces[getDayOfYear(new Date()) % allPlaces.length]
      : null

  // Trending row
  const trending = allPlaces
    .filter(p => p.trending)
    .sort((a, b) => b.popularity - a.popularity)

  // Vibe rows — up to 6 places each, sorted by popularity
  const vibeRows = VIBE_ROWS.map(vibe => ({
    vibe,
    places: allPlaces
      .filter(p => Array.isArray(p.vibes) && p.vibes.includes(vibe))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 6),
  }))

  return (
    <HomeContent
      userId={user.id}
      profile={profile}
      dailyPick={dailyPick}
      trending={trending}
      vibeRows={vibeRows}
      initialBucketPlaceIds={bucketPlaceIds}
    />
  )
}
