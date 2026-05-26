import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    place_id: string
    name: string
    duration?: string | null
    category?: string | null
    rating?: number | null
  }
  const { place_id, name, duration, category, rating } = body

  if (!place_id || !name) {
    return NextResponse.json({ error: 'place_id and name required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('activities').insert({
    place_id, name, duration, category,
    rating: rating ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
