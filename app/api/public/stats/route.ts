import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()
  const { count } = await admin
    .from('places')
    .select('*', { count: 'exact', head: true })
  return NextResponse.json({ place_count: count ?? 0 })
}
