'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface AdminPlaceInput {
  name: string
  country: string
  region: 'Asia' | 'Europe' | 'Americas' | 'Africa' | 'Oceania' | 'Global'
  type: 'city' | 'nature' | 'experience' | 'food'
  description: string
  tags?: string[]
  tag_ids?: string[]
  vibes: string[]
  intensity: 'low' | 'medium' | 'high'
  popularity: number
  lat: number | null
  lng: number | null
  image_url: string | null
  image_thumb_url: string | null
  unsplash_photo_id: string | null
  unsplash_attribution: {
    photographer_name: string
    photographer_url: string
    photo_url: string
  } | null
  must_do?: string | null
  hidden_gem?: string | null
  not_for_you?: string | null
  best_time?: string | null
  vibe_tags?: string[]
  submitted_photo_url?: string | null
}

export async function adminCreatePlace(input: AdminPlaceInput): Promise<{ error?: string; success?: boolean; placeId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const profile = profileData as { is_admin?: boolean } | null
  if (!profile?.is_admin) return { error: 'Not authorised' }

  const admin = createAdminClient()

  // Look up tag names from IDs for backwards-compat tags column
  let tagNames: string[] = input.tags ?? []
  if (input.tag_ids && input.tag_ids.length > 0) {
    const { data: tagRows } = await admin
      .from('tags')
      .select('name')
      .in('id', input.tag_ids)
    tagNames = ((tagRows ?? []) as { name: string }[]).map(t => t.name)
  }

  const { data, error } = await admin
    .from('places')
    .insert({
      name:                 input.name,
      country:              input.country,
      region:               input.region,
      type:                 input.type,
      description:          input.description,
      tags:                 tagNames,
      vibes:                input.vibes,
      intensity:            input.intensity,
      popularity:           input.popularity,
      trending:             false,
      lat:                  input.lat,
      lng:                  input.lng,
      image_url:            input.image_url,
      image_thumb_url:      input.image_thumb_url,
      unsplash_photo_id:    input.unsplash_photo_id,
      unsplash_attribution: input.unsplash_attribution,
      image_keyword:        input.name,
      must_do:              input.must_do ?? null,
      hidden_gem:           input.hidden_gem ?? null,
      not_for_you:          input.not_for_you ?? null,
      best_time:            input.best_time ?? null,
      vibe_tags:            input.vibe_tags ?? [],
      submitted_photo_url:  input.submitted_photo_url ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Insert place_tags join rows
  const newPlaceId = (data as { id: string }).id
  if (input.tag_ids && input.tag_ids.length > 0 && newPlaceId) {
    await admin.from('place_tags').insert(
      input.tag_ids.map(tag_id => ({ place_id: newPlaceId, tag_id }))
    )
  }

  revalidatePath('/home')
  revalidatePath('/discover')
  return { success: true, placeId: newPlaceId }
}

export async function adminDeletePlace(
  placeId: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  const profile = profileData as { is_admin?: boolean } | null
  if (!profile?.is_admin) return { error: 'Not authorised' }

  const admin = createAdminClient()

  // Deleting a place cascades to:
  //   bucket_list_items (ON DELETE CASCADE)
  //   activities        (ON DELETE CASCADE)
  const { error } = await admin
    .from('places')
    .delete()
    .eq('id', placeId)

  if (error) return { error: error.message }

  revalidatePath('/home')
  revalidatePath('/discover')
  revalidatePath('/list')
  return { success: true }
}
