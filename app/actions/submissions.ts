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

export interface SubmitPlaceData {
  name: string
  type: string
  submission_kind?: 'destination' | 'experience'
  country: string
  region: string
  state_province?: string | null
  description: string
  tags: string[]
  image_url: string | null
  must_do: string | null
  hidden_gem: string | null
  not_for_you: string | null
  best_time: string | null
  vibe_tags: string[]
  photo_url: string | null
  lat: number | null
  lng: number | null
  categoryId?: string | null
  tagIds?: string[]
  parent_place_id?: string | null
  extra_metadata?: Record<string, unknown>
}

export async function submitPlace(data: SubmitPlaceData): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const kind = data.submission_kind ?? 'destination'

  const { data: inserted, error } = await supabase.from('submissions').insert({
    user_id:         user.id,
    name:            data.name.trim(),
    type:            kind,
    submission_kind: kind,
    country:         data.country.trim() || null,
    region:          data.region || null,
    state_province:  data.state_province ?? null,
    description:     data.description.trim() || null,
    tags:            (data.tagIds && data.tagIds.length > 0) ? data.tagIds : (data.tags.length > 0 ? data.tags : null),
    image_url:       data.image_url,
    must_do:         data.must_do || null,
    hidden_gem:      data.hidden_gem || null,
    not_for_you:     data.not_for_you || null,
    best_time:       data.best_time || null,
    vibe_tags:       data.vibe_tags.length > 0 ? data.vibe_tags : null,
    photo_url:       data.photo_url,
    lat:             data.lat ?? null,
    lng:             data.lng ?? null,
    parent_place_id: data.parent_place_id ?? null,
    extra_metadata:  data.extra_metadata ?? {},
    status:          'pending',
  }).select('id').single()

  if (error) return { error: error.message }

  await supabase.from('events').insert({
    user_id:     user.id,
    event_type:  'submission_created',
    metadata: {
      submission_id:   inserted.id,
      submission_kind: kind,
      country:         data.country,
      category_id:     data.categoryId ?? null,
    },
    platform:    'web',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
    country_code: null,
  })

  revalidatePath('/submit')
  return {}
}

export async function submitExperience(data: SubmitPlaceData): Promise<{ error?: string }> {
  return submitPlace({ ...data, submission_kind: 'experience' })
}
