'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface UpdateProfileData {
  username: string
  bio: string
  avatar_url?: string
}

export async function updateProfile(
  data: UpdateProfileData
): Promise<{ error?: string; changedFields?: string[] }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const username = data.username.trim().toLowerCase()
  const bio = data.bio.trim()

  if (!username) return { error: 'Username is required' }
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: 'Username must be 3–20 characters: letters, numbers, underscores only' }
  }

  // Check username uniqueness (excluding self)
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .maybeSingle()

  if (existing) return { error: 'Username is already taken' }

  // Fetch current values to compute diff
  const { data: current } = await supabase
    .from('profiles')
    .select('username, bio, avatar_url')
    .eq('id', user.id)
    .single()

  const changedFields: string[] = []
  if (current?.username !== username) changedFields.push('username')
  if ((current?.bio ?? '') !== bio) changedFields.push('bio')
  if (data.avatar_url && current?.avatar_url !== data.avatar_url) changedFields.push('avatar_url')

  const updates: Record<string, string> = { username, bio }
  if (data.avatar_url) updates.avatar_url = data.avatar_url

  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)

  if (error) return { error: error.message }

  // Log event using server client directly (lib/events.ts uses browser client)
  await supabase.from('events').insert({
    user_id: user.id,
    event_type: 'profile_edited',
    metadata: { fields_changed: changedFields },
  })

  revalidatePath('/profile')
  revalidatePath(`/profile/${username}`)

  return { changedFields }
}
