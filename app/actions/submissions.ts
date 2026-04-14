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
  country: string
  region: string
  description: string
  tags: string[]
  image_url: string | null
}

export async function submitPlace(data: SubmitPlaceData): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const { data: inserted, error } = await supabase.from('submissions').insert({
    user_id: user.id,
    name: data.name.trim(),
    type: data.type || null,
    country: data.country.trim() || null,
    region: data.region || null,
    description: data.description.trim() || null,
    tags: data.tags.length > 0 ? data.tags : null,
    image_url: data.image_url,
    status: 'pending',
  }).select('id').single()

  if (error) return { error: error.message }

  await supabase.from('events').insert({
    user_id: user.id,
    event_type: 'submission_created',
    metadata: {
      submission_id: inserted.id,
      type: data.type,
      country: data.country,
    },
    platform: 'web',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
    country_code: null,
  })

  revalidatePath('/submit')
  return {}
}
