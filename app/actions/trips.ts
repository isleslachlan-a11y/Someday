'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

// ─── Create a trip ────────────────────────────────────────────────────────────

export interface CreateTripData {
  title: string
  destination: string
  icon: string
  description?: string
  start_date?: string | null
  end_date?: string | null
}

export async function createTrip(data: CreateTripData): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      title: data.title.trim(),
      destination: data.destination.trim() || null,
      icon: data.icon || '✈️',
      description: data.description?.trim() || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      created_by: user.id,
      members: [user.id],
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await supabase.from('events').insert({
    user_id: user.id,
    event_type: 'trip_created',
    metadata: { trip_id: trip.id, destination: data.destination, member_count: 1 },
    platform: 'web',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
    country_code: null,
  })

  revalidatePath('/plan')
  return { id: trip.id as string }
}

// ─── Add an item to a trip ───────────────────────────────────────────────────

export async function addTripItem(
  tripId: string,
  placeId: string,
  proposedDate?: string | null
): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const { data: item, error } = await supabase
    .from('trip_items')
    .insert({
      trip_id: tripId,
      place_id: placeId,
      proposed_date: proposedDate || null,
      added_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/plan/${tripId}`)
  return { id: item.id as string }
}

// ─── Remove an item from a trip ──────────────────────────────────────────────

export async function removeTripItem(
  tripItemId: string,
  tripId: string
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const { error } = await supabase
    .from('trip_items')
    .delete()
    .eq('id', tripItemId)
    .eq('added_by', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/plan/${tripId}`)
  return {}
}

// ─── Vote on a trip item (upsert) ────────────────────────────────────────────

export async function voteOnTripItem(
  tripItemId: string,
  tripId: string,
  vote: boolean
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const { error } = await supabase
    .from('trip_item_votes')
    .upsert(
      { trip_item_id: tripItemId, user_id: user.id, vote },
      { onConflict: 'trip_item_id,user_id' }
    )

  if (error) return { error: error.message }

  revalidatePath(`/plan/${tripId}`)
  return {}
}

// ─── Remove a vote ───────────────────────────────────────────────────────────

export async function removeVote(
  tripItemId: string,
  tripId: string
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const { error } = await supabase
    .from('trip_item_votes')
    .delete()
    .eq('trip_item_id', tripItemId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/plan/${tripId}`)
  return {}
}

// ─── Search places (for Add Experience) ─────────────────────────────────────

export async function searchPlaces(
  query: string
): Promise<{ data: { id: string; name: string; country: string; type: string }[]; error?: string }> {
  const { supabase } = await getAuthenticatedUser()

  if (!query.trim()) return { data: [] }

  const { data, error } = await supabase
    .from('places')
    .select('id, name, country, type')
    .or(`name.ilike.%${query.trim()}%,country.ilike.%${query.trim()}%`)
    .order('popularity', { ascending: false })
    .limit(12)

  if (error) return { data: [], error: error.message }

  return {
    data: (data ?? []).map(p => ({
      id: p.id as string,
      name: p.name as string,
      country: p.country as string,
      type: p.type as string,
    })),
  }
}
