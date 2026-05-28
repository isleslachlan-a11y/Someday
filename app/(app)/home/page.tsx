import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomeContent from './HomeContent'
import type { Place, RecommendedPlace } from '@/lib/types'

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

  // Fetch profile, bucket, hero, and personalised recommendations in parallel
  const [profileResult, bucketResult, heroResult, rpcResult] = await Promise.all([
    supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single(),
    supabase.from('bucket_list_items').select('place_id').eq('user_id', user.id),
    supabase
      .from('places')
      .select('*')
      .eq('trending', true)
      .order('popularity', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc('get_recommendations_for_user', { p_user_id: user.id, p_limit: 12 }),
  ])

  const profile = {
    username: profileResult.data?.username ?? user.email?.split('@')[0] ?? 'traveller',
    avatar_url: (profileResult.data as { avatar_url?: string | null } | null)?.avatar_url ?? null,
  }

  const initialBucketPlaceIds = (bucketResult.data ?? [])
    .map(row => row.place_id)
    .filter((id): id is string => !!id)

  const heroPlace = heroResult.data as Place | null

  // Build personalised grid from RPC results
  let gridPlaces: RecommendedPlace[] = []
  let isPersonalised = false

  const rpcRows = (rpcResult.data ?? []) as Array<{
    experience_id: string
    score: number
    recommendation_source: string
  }>

  if (rpcRows.length > 0) {
    const ids = rpcRows.map(r => r.experience_id)
    const { data: placesData } = await supabase.from('places').select('*').in('id', ids)
    if (placesData && placesData.length > 0) {
      const placeMap = new Map(placesData.map(p => [p.id, p as Place]))
      const merged = rpcRows
        .map(r => {
          const place = placeMap.get(r.experience_id)
          if (!place) return null
          return {
            ...place,
            recommendation_source: r.recommendation_source,
            recommendation_score: r.score,
          } as RecommendedPlace
        })
        .filter((p): p is RecommendedPlace => p !== null)
      if (merged.length > 0) {
        gridPlaces = merged
        isPersonalised = true
      }
    }
  }

  // Cold-start fallback — popularity sort
  if (!isPersonalised) {
    const heroId = heroPlace?.id
    const { data: gridData } = heroId
      ? await supabase
          .from('places')
          .select('*')
          .neq('id', heroId)
          .order('popularity', { ascending: false })
          .limit(12)
      : await supabase
          .from('places')
          .select('*')
          .order('popularity', { ascending: false })
          .limit(12)
    gridPlaces = (gridData ?? []).map(p => ({
      ...(p as Place),
      recommendation_source: 'editorial',
      recommendation_score: 0,
    }))
  }

  const sessionId = crypto.randomUUID()

  return (
    <HomeContent
      userId={user.id}
      profile={profile}
      heroPlace={heroPlace}
      gridPlaces={gridPlaces}
      initialBucketPlaceIds={initialBucketPlaceIds}
      isPersonalised={isPersonalised}
      sessionId={sessionId}
    />
  )
}
