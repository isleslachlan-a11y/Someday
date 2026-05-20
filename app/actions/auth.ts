'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

/**
 * Called immediately after auth.signUp() succeeds.
 * Uses the admin client so it works regardless of email-confirmation state
 * (when confirmation is required, data.session is null and auth.uid() is null,
 * so browser-client inserts would be blocked by RLS).
 */
export async function initUserAccount(
  userId: string,
  username: string
): Promise<{ error?: string }> {
  const admin = createAdminClient()

  // Insert profile row (ignore if already exists — e.g. trigger already created it)
  const { error: profileError } = await admin.from('profiles').upsert(
    { id: userId, username },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  if (profileError) return { error: profileError.message }

  // Log signup event
  await admin.from('events').insert({
    user_id: userId,
    event_type: 'user_signed_up',
    metadata: { username },
    platform: 'web',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
    country_code: null,
  })

  return {}
}

export async function signOut() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Fire-and-forget — don't block sign-out on event insert
    await supabase.from('events').insert({
      user_id: user.id,
      event_type: 'user_signed_out',
      metadata: {},
    })
  }

  await supabase.auth.signOut()
  redirect('/login')
}
