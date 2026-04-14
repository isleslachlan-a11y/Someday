import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TripDetail from './TripDetail'
import type { Trip, TripItem, PlaceSnap } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Trip',
}

interface Props {
  params: Promise<{ tripId: string }>
}

export default async function TripDetailPage({ params }: Props) {
  const { tripId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Fetch trip ─────────────────────────────────────────────────────────────
  const { data: tripData, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single()

  if (tripError || !tripData) notFound()

  const trip: Trip = {
    id: tripData.id as string,
    title: tripData.title as string,
    description: (tripData.description as string | null) ?? null,
    destination: (tripData.destination as string | null) ?? null,
    start_date: (tripData.start_date as string | null) ?? null,
    end_date: (tripData.end_date as string | null) ?? null,
    created_by: tripData.created_by as string,
    members: (tripData.members as string[]) ?? [],
    icon: (tripData.icon as string) ?? '✈️',
    created_at: tripData.created_at as string,
  }

  // Verify membership (RLS already handles this, but redirect cleanly)
  const isMember =
    trip.created_by === user.id || trip.members.includes(user.id)
  if (!isMember) notFound()

  // ── Fetch trip items with places and votes ─────────────────────────────────
  const { data: itemsData } = await supabase
    .from('trip_items')
    .select(`
      id, trip_id, place_id, proposed_date, added_by, created_at,
      places ( id, name, country, type, description, tags, vibes, intensity, image_keyword ),
      trip_item_votes ( id, trip_item_id, user_id, vote, created_at )
    `)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })

  const tripItems: TripItem[] = []
  for (const row of itemsData ?? []) {
    const place = row.places as unknown as Record<string, unknown> | null
    if (!place) continue

    const placeSnap: PlaceSnap = {
      id: place.id as string,
      name: place.name as string,
      country: place.country as string,
      type: place.type as string,
      description: (place.description as string | null) ?? null,
      tags: (place.tags as string[] | null) ?? null,
      vibes: (place.vibes as string[] | null) ?? null,
      intensity: (place.intensity as string | null) ?? null,
      image_keyword: (place.image_keyword as string | null) ?? null,
    }

    const votes = ((row.trip_item_votes as unknown as Record<string, unknown>[] | null) ?? []).map(
      v => ({
        id: v.id as string,
        trip_item_id: v.trip_item_id as string,
        user_id: v.user_id as string,
        vote: v.vote as boolean,
        created_at: v.created_at as string,
      })
    )

    tripItems.push({
      id: row.id as string,
      trip_id: row.trip_id as string,
      place_id: row.place_id as string,
      proposed_date: (row.proposed_date as string | null) ?? null,
      added_by: row.added_by as string,
      created_at: row.created_at as string,
      place: placeSnap,
      votes,
    })
  }

  // ── Member profiles ────────────────────────────────────────────────────────
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', trip.members.length > 0 ? trip.members : [user.id])

  const memberProfiles: Record<string, { username: string; avatar_url: string | null }> = {}
  for (const p of profilesData ?? []) {
    memberProfiles[p.id as string] = {
      username: (p.username as string | null) ?? 'user',
      avatar_url: (p.avatar_url as string | null) ?? null,
    }
  }

  // ── User's own bucket list (for "Add from your list") ─────────────────────
  const { data: myListData } = await supabase
    .from('bucket_list_items')
    .select('place_id, status, places ( id, name, country, type )')
    .eq('user_id', user.id)
    .in('status', ['wishlist', 'planning'])
    .order('added_at', { ascending: false })

  const alreadyInTrip = new Set(tripItems.map(i => i.place_id))

  const myListPlaces: { id: string; name: string; country: string; type: string }[] = []
  for (const row of myListData ?? []) {
    const place = row.places as unknown as Record<string, unknown> | null
    if (!place) continue
    const placeId = place.id as string
    if (alreadyInTrip.has(placeId)) continue
    myListPlaces.push({
      id: placeId,
      name: place.name as string,
      country: place.country as string,
      type: place.type as string,
    })
  }

  return (
    <main className="min-h-screen bg-indigo-deep px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <TripDetail
          trip={trip}
          tripItems={tripItems}
          memberProfiles={memberProfiles}
          myListPlaces={myListPlaces}
          userId={user.id}
        />
      </div>
    </main>
  )
}
