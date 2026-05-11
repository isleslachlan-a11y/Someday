import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDestination, type Place } from '@/lib/types'
import PlaceViewTracker from './PlaceViewTracker'
import PlaceDetailContent, { type FriendVisitor } from './PlaceDetailContent'
import ExperienceDetailContent from './ExperienceDetailContent'

export const metadata: Metadata = {
  title: 'Place',
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: placeRaw } = await supabase
    .from('places')
    .select('*')
    .eq('id', id)
    .single()

  if (!placeRaw) redirect('/home')

  const place = placeRaw as unknown as Place

  // Run independent queries in parallel
  const [bucketResult, similarResult, countryPlacesResult, friendshipsResult] =
    await Promise.all([
      supabase
        .from('bucket_list_items')
        .select('place_id')
        .eq('user_id', user.id)
        .eq('place_id', id)
        .maybeSingle(),
      supabase
        .from('places')
        .select('*')
        .eq('country', place.country)
        .neq('id', id)
        .order('popularity', { ascending: false })
        .limit(8),
      supabase
        .from('places')
        .select('id')
        .eq('country', place.country)
        .limit(100),
      admin
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted'),
    ])

  const initialIsSaved = !!bucketResult.data
  const similarPlaces = (similarResult.data ?? []) as unknown as Place[]

  // Resolve friend IDs from symmetric friendship rows
  const friendIds = (friendshipsResult.data ?? []).map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )

  let friendVisitors: FriendVisitor[] = []

  if (friendIds.length > 0 && (countryPlacesResult.data ?? []).length > 0) {
    const countryPlaceIds = countryPlacesResult.data!.map(p => p.id)

    const { data: visitedItems } = await admin
      .from('bucket_list_items')
      .select('user_id')
      .in('user_id', friendIds)
      .in('place_id', countryPlaceIds)

    const visitedUserIds = [...new Set((visitedItems ?? []).map(i => i.user_id))]

    if (visitedUserIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', visitedUserIds)
        .limit(5)

      friendVisitors = (profiles ?? []).map(p => ({
        id: p.id,
        username: (p.username as string | null) ?? 'user',
        avatar_url: p.avatar_url as string | null,
      }))
    }
  }

  return (
    <>
      <PlaceViewTracker userId={user.id} placeId={id} />
      {isDestination(place) ? (
        <PlaceDetailContent
          place={place}
          userId={user.id}
          initialIsSaved={initialIsSaved}
          similarPlaces={similarPlaces}
          friendVisitors={friendVisitors}
        />
      ) : (
        <ExperienceDetailContent
          place={place}
          userId={user.id}
          initialIsSaved={initialIsSaved}
          similarPlaces={similarPlaces}
          friendVisitors={friendVisitors}
        />
      )}
    </>
  )
}
