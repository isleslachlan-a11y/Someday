import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Place, RecommendedPlace } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)
  const sessionId = searchParams.get('sessionId') ?? null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch 24 recommendations and slice the requested page
  const { data: rpcData } = await supabase.rpc('get_recommendations_for_user', {
    p_user_id: user.id,
    p_limit: 24,
  })

  const allRows = (rpcData ?? []) as Array<{
    experience_id: string
    score: number
    recommendation_source: string
  }>
  const slice = allRows.slice(offset, offset + 12)

  if (slice.length > 0) {
    const ids = slice.map(r => r.experience_id)
    const { data: placesData } = await supabase.from('places').select('*').in('id', ids)

    if (placesData && placesData.length > 0) {
      const placeMap = new Map(placesData.map(p => [p.id, p as Place]))
      const places: RecommendedPlace[] = slice
        .map(r => {
          const place = placeMap.get(r.experience_id)
          if (!place) return null
          return {
            ...place,
            recommendation_source: r.recommendation_source,
            recommendation_score: r.score,
          } as RecommendedPlace
        })
        .filter((p): p is RecommendedPlace => p !== null)

      // Fire-and-forget impression logging via service role
      const admin = createAdminClient()
      void Promise.all(
        places.map((place, index) =>
          admin.rpc('log_recommendation_event', {
            p_user_id: user.id,
            p_experience_id: place.id,
            p_event_type: 'shown',
            p_recommendation_source: place.recommendation_source,
            p_session_id: sessionId,
            p_metadata: { score: place.recommendation_score, position: offset + index },
          })
        )
      )

      return NextResponse.json({ places })
    }
  }

  // Fallback: popularity sort
  const { data: fallbackData, error } = await supabase
    .from('places')
    .select('*')
    .order('popularity', { ascending: false })
    .range(offset, offset + 11)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const places: RecommendedPlace[] = (fallbackData ?? []).map(p => ({
    ...(p as Place),
    recommendation_source: 'editorial',
    recommendation_score: 0,
  }))

  return NextResponse.json({ places })
}
