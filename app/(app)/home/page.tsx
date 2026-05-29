import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomeContent from './HomeContent'
import type { Place, RecommendedPlace } from '@/lib/types'

type SB = Awaited<ReturnType<typeof createClient>>

async function enrichPlacesWithTaxonomy<T extends Place>(supabase: SB, places: T[]): Promise<T[]> {
  if (places.length === 0) return places
  const ids = places.map(p => p.id)

  const [categoriesResult, tagsResult, labelsResult] = await Promise.all([
    supabase
      .from('experiences_categories')
      .select('experience_id, is_primary, categories(slug, name, icon)')
      .in('experience_id', ids)
      .eq('is_primary', true),
    supabase
      .from('experiences_tags')
      .select('experience_id, tags(name)')
      .in('experience_id', ids),
    supabase
      .from('experiences_labels')
      .select('experience_id, place_labels(name)')
      .in('experience_id', ids),
  ])

  return places.map(place => {
    const primaryCat = (categoriesResult.data ?? [])
      .find(r => (r as { experience_id: string }).experience_id === place.id)
    const catData = primaryCat
      ? (primaryCat as unknown as { categories: { slug: string; name: string; icon: string } | null }).categories
      : null

    const placeTags = (tagsResult.data ?? [])
      .filter(r => (r as { experience_id: string }).experience_id === place.id)
      .map(r => ((r as unknown as { tags: { name: string } | null }).tags)?.name)
      .filter((n): n is string => !!n)

    const placeLabels = (labelsResult.data ?? [])
      .filter(r => (r as { experience_id: string }).experience_id === place.id)
      .map(r => ((r as unknown as { place_labels: { name: string } | null }).place_labels)?.name)
      .filter((n): n is string => !!n)

    return {
      ...place,
      primary_category: catData ?? null,
      top_tags: placeTags.slice(0, 3),
      display_labels: placeLabels.slice(0, 2),
    }
  })
}

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

  // Fetch profile, bucket, hero, personalised recs, and user context in parallel
  const [profileResult, bucketResult, heroResult, rpcResult, contextResult] = await Promise.all([
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
    supabase
      .from('user_context')
      .select('completed_onboarding, onboarding_completed_at, travel_style')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const profile = {
    username: profileResult.data?.username ?? user.email?.split('@')[0] ?? 'traveller',
    avatar_url: (profileResult.data as { avatar_url?: string | null } | null)?.avatar_url ?? null,
  }

  const initialBucketPlaceIds = (bucketResult.data ?? [])
    .map(row => row.place_id)
    .filter((id): id is string => !!id)

  const context = contextResult.data as {
    completed_onboarding: boolean
    onboarding_completed_at: string | null
    travel_style: string[] | null
  } | null

  const isFirstSession = (() => {
    if (!context?.onboarding_completed_at) return false
    const completedAt = new Date(context.onboarding_completed_at)
    return (Date.now() - completedAt.getTime()) < 10 * 60 * 1000
  })()

  const isNewUser = initialBucketPlaceIds.length < 5
  const travelStyle = context?.travel_style ?? null

  let heroPlace = heroResult.data as Place | null

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

  // Enrich with taxonomy data — best-effort, never throws
  try {
    const [enrichedGrid, enrichedHero] = await Promise.all([
      enrichPlacesWithTaxonomy(supabase, gridPlaces),
      heroPlace ? enrichPlacesWithTaxonomy(supabase, [heroPlace]) : Promise.resolve([] as Place[]),
    ])
    gridPlaces = enrichedGrid as RecommendedPlace[]
    if (enrichedHero.length > 0) heroPlace = enrichedHero[0]
  } catch { /* use unenriched places */ }

  // Fetch "start-here" collection for new users
  let startHerePlaces: Place[] = []
  if (isNewUser) {
    const { data: startHereData } = await supabase
      .from('collections')
      .select(`
        id, name, slug,
        collections_places(
          sort_order,
          places(id, name, country, type, image_url, image_thumb_url, popularity, region)
        )
      `)
      .eq('slug', 'start-here')
      .eq('is_active', true)
      .maybeSingle()

    if (startHereData) {
      startHerePlaces = ((startHereData.collections_places ?? []) as Array<{
        sort_order: number
        places: unknown
      }>)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(cp => cp.places as Place)
        .filter(Boolean)
        .slice(0, 8)
    }
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
      isFirstSession={isFirstSession}
      isNewUser={isNewUser}
      travelStyle={travelStyle}
      startHerePlaces={startHerePlaces}
    />
  )
}
