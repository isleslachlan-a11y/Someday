import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomeContent from './HomeContent'
import type { Place } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Discover your next someday.',
}

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch profile and saved place IDs in parallel
  const [profileResult, bucketResult] = await Promise.all([
    supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single(),
    supabase.from('bucket_list_items').select('place_id').eq('user_id', user.id),
  ])

  const profile = {
    username: profileResult.data?.username ?? user.email?.split('@')[0] ?? 'traveller',
    avatar_url: (profileResult.data as { avatar_url?: string | null } | null)?.avatar_url ?? null,
  }

  const initialBucketPlaceIds = (bucketResult.data ?? [])
    .map(row => row.place_id)
    .filter((id): id is string => !!id)

  // Hero: highest-popularity trending place
  const { data: heroData } = await supabase
    .from('places')
    .select('*')
    .eq('trending', true)
    .order('popularity', { ascending: false })
    .limit(1)
    .maybeSingle()

  const heroPlace = heroData as Place | null

  // Grid: top places by popularity, only excluding the hero to avoid duplication
  const excludeIds = heroPlace ? [heroPlace.id] : []

  const { data: gridData } =
    excludeIds.length > 0
      ? await supabase
          .from('places')
          .select('*')
          .not('id', 'in', `(${excludeIds.join(',')})`)
          .order('popularity', { ascending: false })
          .limit(4)
      : await supabase
          .from('places')
          .select('*')
          .order('popularity', { ascending: false })
          .limit(4)

  const gridPlaces = (gridData ?? []) as Place[]

  return (
    <HomeContent
      userId={user.id}
      profile={profile}
      heroPlace={heroPlace}
      gridPlaces={gridPlaces}
      initialBucketPlaceIds={initialBucketPlaceIds}
    />
  )
}
