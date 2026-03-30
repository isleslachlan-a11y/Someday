'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
