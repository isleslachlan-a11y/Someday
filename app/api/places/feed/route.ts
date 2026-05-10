import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)
  const excludeHeroId = searchParams.get('excludeHeroId')

  const supabase = await createClient()

  let query = supabase
    .from('places')
    .select('*')
    .order('popularity', { ascending: false })
    .range(offset, offset + 11)

  if (excludeHeroId) {
    query = query.neq('id', excludeHeroId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ places: data ?? [] })
}
