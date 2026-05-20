'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface CompleteOnboardingInput {
  travelStyle: string[]
  groupPreference: string
  budgetRange: string
  comfortZone: string
  travelFrequency: string
  pastTripName?: string
  pastTripYear?: number
  selectedPlaceIds: string[]
}

export async function completeOnboarding(
  input: CompleteOnboardingInput
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // 0. Ensure profiles row exists (user_context has FK dependency on profiles)
  await supabase.from('profiles').upsert(
    { id: user.id },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // 1. Upsert user_context (conflict on user_id — unique column)
  const { error: contextError } = await supabase.from('user_context').upsert(
    {
      user_id: user.id,
      travel_style: input.travelStyle,
      group_preference: input.groupPreference,
      budget_range: input.budgetRange,
      comfort_zone: input.comfortZone,
      travel_frequency: input.travelFrequency,
      completed_onboarding: true,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (contextError) return { error: contextError.message }

  // 2–4. Non-fatal writes — run in parallel
  await Promise.all([
    input.pastTripName
      ? supabase.from('past_trips').insert({
          user_id: user.id,
          place_name: input.pastTripName,
          year: input.pastTripYear ?? null,
        })
      : Promise.resolve(),

    input.selectedPlaceIds.length > 0
      ? supabase.from('bucket_list_items').insert(
          input.selectedPlaceIds.map(placeId => ({
            user_id: user.id,
            place_id: placeId,
            status: 'wishlist',
          }))
        )
      : Promise.resolve(),

    supabase.from('events').insert({
      user_id: user.id,
      event_type: 'onboarding_completed',
      metadata: {
        travel_style_count: input.travelStyle.length,
        places_seeded: input.selectedPlaceIds.length,
        has_past_trip: !!input.pastTripName,
      },
      platform: 'web',
      app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
    }),
  ])

  revalidatePath('/home')
  return {}
}

// ─── Update travel profile (post-onboarding partial edit) ────────────────────

export interface UpdateTravelProfileData {
  travel_style?: string[]
  comfort_zone?: string | null
  budget_range?: string | null
  travel_frequency?: string | null
  group_preference?: string | null
}

export async function updateTravelProfile(
  data: UpdateTravelProfileData
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_context')
    .upsert(
      { user_id: user.id, ...data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return {}
}

// ─── Past trips ───────────────────────────────────────────────────────────────

export async function addPastTrip(data: {
  place_name: string
  country?: string
  year?: number | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('past_trips').insert({
    user_id: user.id,
    place_name: data.place_name.trim(),
    country: data.country?.trim() || null,
    year: data.year ?? null,
  })

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return {}
}

export async function deletePastTrip(tripId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('past_trips')
    .delete()
    .eq('id', tripId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return {}
}
