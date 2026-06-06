import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDestination, type Place } from '@/lib/types'
import PlaceViewTracker from './PlaceViewTracker'
import PlaceDetailContent, { type FriendVisitor, type Activity } from './PlaceDetailContent'
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

  const { data: profileData } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  const isAdmin = !!(profileData as { is_admin?: boolean } | null)?.is_admin

  const { data: placeRaw } = await supabase
    .from('places')
    .select('*')
    .eq('id', id)
    .single()

  if (!placeRaw) redirect('/home')

  const place = placeRaw as unknown as Place

  // Phase 1: taxonomy lookups to power smarter similar sections
  const [primaryCatResult, labelResult] = await Promise.all([
    admin
      .from('experiences_categories')
      .select('category_id')
      .eq('experience_id', id)
      .eq('is_primary', true)
      .maybeSingle(),
    admin
      .from('experiences_labels')
      .select('label_id, place_labels(id, name)')
      .eq('experience_id', id)
      .limit(1)
      .maybeSingle(),
  ])

  const primaryCategoryId =
    (primaryCatResult.data as { category_id: string } | null)?.category_id ?? null
  const labelRow = labelResult.data as {
    label_id: string
    place_labels: { id: string; name: string } | null
  } | null
  const collectionLabel = labelRow?.place_labels ?? null

  // Phase 2: all independent data queries in parallel
  const [
    bucketResult, countryPlacesResult, friendshipsResult, activitiesResult,
    catExpIdsResult, colExpIdsResult,
    collectionsResult, placeCollectionsResult,
    parentPlaceResult, childExperiencesResult,
  ] = await Promise.all([
    supabase
      .from('bucket_list_items')
      .select('place_id')
      .eq('user_id', user.id),
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
    supabase
      .from('activities')
      .select('*')
      .eq('place_id', id)
      .order('rating', { ascending: false }),
    primaryCategoryId
      ? admin
          .from('experiences_categories')
          .select('experience_id')
          .eq('category_id', primaryCategoryId)
          .neq('experience_id', id)
          .limit(8)
      : Promise.resolve({ data: null as null }),
    collectionLabel
      ? admin
          .from('experiences_labels')
          .select('experience_id')
          .eq('label_id', collectionLabel.id)
          .neq('experience_id', id)
          .limit(8)
      : Promise.resolve({ data: null as null }),
    isAdmin
      ? admin.from('collections').select('id, name, slug').eq('is_active', true).order('sort_order')
      : Promise.resolve({ data: null as null }),
    isAdmin
      ? admin.from('collections_places').select('collection_id').eq('place_id', id)
      : Promise.resolve({ data: null as null }),
    // Parent destination for experience pages
    place.parent_place_id
      ? admin.from('places').select('id, name, type, image_thumb_url, country').eq('id', place.parent_place_id).maybeSingle()
      : Promise.resolve({ data: null as null }),
    // Child experiences for destination pages
    place.type === 'destination'
      ? admin.from('places').select('*').eq('parent_place_id', id).order('popularity', { ascending: false }).limit(12)
      : Promise.resolve({ data: null as null }),
  ])

  const allCollections = isAdmin
    ? ((collectionsResult.data ?? []) as { id: string; name: string; slug: string }[])
    : []
  const placeCollectionIds = isAdmin
    ? new Set(((placeCollectionsResult.data ?? []) as { collection_id: string }[]).map(r => r.collection_id))
    : new Set<string>()

  const savedPlaceIds = (bucketResult.data ?? []).map(r => r.place_id as string)
  const initialIsSaved = savedPlaceIds.includes(id)
  const activities = (activitiesResult.data ?? []) as Activity[]
  const parentPlace = parentPlaceResult.data as { id: string; name: string; type: string; image_thumb_url: string | null; country: string } | null
  const childExperiences = (childExperiencesResult.data ?? []) as unknown as Place[]

  const catIds = ((catExpIdsResult.data ?? []) as { experience_id: string }[]).map(
    r => r.experience_id,
  )
  const colIds = ((colExpIdsResult.data ?? []) as { experience_id: string }[]).map(
    r => r.experience_id,
  )

  const friendIds = (friendshipsResult.data ?? []).map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id,
  )
  const countryPlaceIds = (countryPlacesResult.data ?? []).map(p => p.id)

  // Phase 3: place lookups + friend visitor check in parallel
  const [
    statePlacesResult, categoryPlacesResult, collectionPlacesResult, visitedItemsResult,
  ] = await Promise.all([
    place.state_province
      ? admin
          .from('places')
          .select('*')
          .eq('state_province', place.state_province)
          .neq('id', id)
          .order('popularity', { ascending: false })
          .limit(8)
      : Promise.resolve({ data: null as null }),
    catIds.length > 0
      ? admin
          .from('places')
          .select('*')
          .in('id', catIds)
          .order('popularity', { ascending: false })
      : Promise.resolve({ data: null as null }),
    colIds.length > 0
      ? admin
          .from('places')
          .select('*')
          .in('id', colIds)
          .order('popularity', { ascending: false })
      : Promise.resolve({ data: null as null }),
    friendIds.length > 0 && countryPlaceIds.length > 0
      ? admin
          .from('bucket_list_items')
          .select('user_id')
          .in('user_id', friendIds)
          .in('place_id', countryPlaceIds)
      : Promise.resolve({ data: null as null }),
  ])

  const statePlaces = (statePlacesResult.data ?? []) as unknown as Place[]
  const categoryPlaces = (categoryPlacesResult.data ?? []) as unknown as Place[]
  const collectionPlacesArr = (collectionPlacesResult.data ?? []) as unknown as Place[]
  const collectionContext =
    collectionLabel && collectionPlacesArr.length > 0
      ? { name: collectionLabel.name, places: collectionPlacesArr }
      : null

  let friendVisitors: FriendVisitor[] = []
  const visitedUserIds = [
    ...new Set(
      ((visitedItemsResult.data ?? []) as { user_id: string }[]).map(i => i.user_id),
    ),
  ]
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

  return (
    <>
      <PlaceViewTracker userId={user.id} placeId={id} />
      {isDestination(place) ? (
        <PlaceDetailContent
          place={place}
          userId={user.id}
          initialIsSaved={initialIsSaved}
          initialSavedIds={savedPlaceIds}
          similarPlaces={categoryPlaces}
          statePlaces={statePlaces}
          collectionContext={collectionContext}
          friendVisitors={friendVisitors}
          activities={activities}
          isAdmin={isAdmin}
          adminCollections={allCollections}
          initialPlaceCollectionIds={[...placeCollectionIds]}
          childExperiencePlaces={childExperiences}
        />
      ) : (
        <ExperienceDetailContent
          place={place}
          userId={user.id}
          initialIsSaved={initialIsSaved}
          initialSavedIds={savedPlaceIds}
          similarPlaces={categoryPlaces}
          statePlaces={statePlaces}
          collectionContext={collectionContext}
          friendVisitors={friendVisitors}
          activities={activities}
          isAdmin={isAdmin}
          adminCollections={allCollections}
          initialPlaceCollectionIds={[...placeCollectionIds]}
          parentPlace={parentPlace}
        />
      )}
    </>
  )
}
