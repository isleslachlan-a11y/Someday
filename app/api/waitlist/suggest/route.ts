import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    placeId?: string
    placeName?: string
    email?: string
    name?: string
    submissionType?: 'destination' | 'experience'
    mustDo?: string
  }
  const { placeId, placeName, email, name, submissionType, mustDo } = body

  const admin = createAdminClient()

  if (email) {
    await admin
      .from('waitlist_emails')
      .upsert(
        { email, ...(name ? { name } : {}) },
        { onConflict: 'email', ignoreDuplicates: false }
      )
  }

  if (placeId || placeName) {
    await admin.from('waitlist_suggestions').insert({
      email:           email ?? null,
      place_id:        placeId ?? null,
      place_name:      placeName ?? null,
      submission_type: submissionType ?? null,
      must_do:         mustDo ?? null,
    })
  }

  return NextResponse.json({ success: true })
}
