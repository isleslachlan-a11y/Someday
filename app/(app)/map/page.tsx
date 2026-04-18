import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Place } from '@/lib/types'
import MapLoader from './MapLoader'

export const metadata: Metadata = {
  title: 'Explore · Someday',
  description: 'Explore destinations on the map.',
}

export default async function MapPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [placesResult, bucketResult, profileResult] = await Promise.all([
    supabase.from('places').select('*').order('popularity', { ascending: false }),
    supabase.from('bucket_list_items').select('place_id').eq('user_id', user.id),
    supabase.from('profiles').select('map_city_preference').eq('id', user.id).single(),
  ])

  const places = (placesResult.data ?? []) as Place[]
  const bucketPlaceIds = (bucketResult.data ?? [])
    .map(r => r.place_id as string)
    .filter(Boolean)
  const savedCityPreference =
    (profileResult.data as { map_city_preference?: string | null } | null)
      ?.map_city_preference ?? null

  return (
    <MapLoader
      places={places}
      initialBucketPlaceIds={bucketPlaceIds}
      savedCityPreference={savedCityPreference}
    />
  )
}
