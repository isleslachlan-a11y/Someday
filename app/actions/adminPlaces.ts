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
  tags: string[]
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

  const { data, error } = await admin
    .from('places')
    .insert({
      name:                 input.name,
      country:              input.country,
      region:               input.region,
      type:                 input.type,
      description:          input.description,
      tags:                 input.tags,
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
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/home')
  revalidatePath('/discover')
  return { success: true, placeId: data.id }
}
