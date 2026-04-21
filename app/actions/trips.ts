'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTripChat, addMemberToTripChat } from '@/lib/messaging'

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

  const tripId = trip.id as string

  // Auto-create a trip conversation
  const { conversationId } = await createTripChat(tripId, data.title.trim(), user.id, [user.id])

  if (conversationId) {
    await supabase
      .from('trips')
      .update({ conversation_id: conversationId })
      .eq('id', tripId)
  }

  await supabase.from('events').insert({
    user_id: user.id,
    event_type: 'trip_created',
    metadata: { trip_id: tripId, destination: data.destination, member_count: 1 },
    platform: 'web',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
    country_code: null,
  })

  revalidatePath('/plan')
  return { id: tripId }
}

// ─── Create trip chat for existing trips ────────────────────────────────────

export async function createTripChatAction(
  tripId: string,
): Promise<{ conversationId?: string; error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const { data: tripData, error: tripError } = await supabase
    .from('trips')
    .select('title, members, created_by, conversation_id')
    .eq('id', tripId)
    .single()

  if (tripError || !tripData) return { error: 'Trip not found' }

  // Already has a conversation
  if (tripData.conversation_id) {
    return { conversationId: tripData.conversation_id as string }
  }

  const members = (tripData.members as string[]) ?? []

  const { conversationId, error } = await createTripChat(
    tripId,
    tripData.title as string,
    user.id,
    members,
  )

  if (error || !conversationId) return { error: error ?? 'Failed to create chat' }

  await supabase
    .from('trips')
    .update({ conversation_id: conversationId })
    .eq('id', tripId)

  revalidatePath(`/plan/${tripId}`)
  return { conversationId }
}

// ─── Add a member to a trip ──────────────────────────────────────────────────

export async function addMemberToTripAction(
  tripId: string,
  friendId: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  // RLS on trips (select) ensures the caller is already a member
  const { data: tripData, error: tripError } = await supabase
    .from('trips')
    .select('members, conversation_id')
    .eq('id', tripId)
    .single()

  if (tripError || !tripData) return { error: 'Trip not found' }

  const members = (tripData.members as string[]) ?? []
  if (members.includes(friendId)) return {}

  const admin = createAdminClient()

  // Update members array via admin (trips_owner_update only allows the creator)
  const { error: updateError } = await admin
    .from('trips')
    .update({ members: [...members, friendId] })
    .eq('id', tripId)

  if (updateError) return { error: updateError.message }

  // Get friend's display name for the system message
  const { data: friendProfile } = await admin
    .from('profiles')
    .select('username')
    .eq('id', friendId)
    .single()

  const displayName = (friendProfile?.username as string | null) ?? 'Someone'

  // Wire into the trip conversation if it exists
  const conversationId = tripData.conversation_id as string | null
  if (conversationId) {
    await addMemberToTripChat(conversationId, friendId)

    // Send a trip_invite system message as the inviting user
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: `${displayName} was added to the trip ✦`,
      message_type: 'trip_invite',
      metadata: { invited_user_id: friendId, invited_display_name: displayName },
    })
  }

  revalidatePath(`/plan/${tripId}`)
  return {}
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
