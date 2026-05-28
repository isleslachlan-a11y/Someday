import { createClient } from '@/lib/supabase/client'
import type { RecommendedPlace } from './types'

export async function logRecommendationEvent(payload: {
  userId: string
  experienceId: string
  eventType: 'shown' | 'saved' | 'dismissed' | 'shared' | 'clicked'
  recommendationSource: string
  sessionId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.rpc('log_recommendation_event', {
      p_user_id: payload.userId,
      p_experience_id: payload.experienceId,
      p_event_type: payload.eventType,
      p_recommendation_source: payload.recommendationSource,
      p_session_id: payload.sessionId ?? null,
      p_metadata: payload.metadata ?? null,
    })
  } catch (err) {
    console.error('[recommendations] logRecommendationEvent error:', err)
  }
}

export async function logImpressions(
  userId: string,
  places: RecommendedPlace[],
  sessionId?: string
): Promise<void> {
  try {
    await Promise.all(
      places.map((place, index) =>
        logRecommendationEvent({
          userId,
          experienceId: place.id,
          eventType: 'shown',
          recommendationSource: place.recommendation_source,
          sessionId,
          metadata: { score: place.recommendation_score, position: index },
        })
      )
    )
  } catch (err) {
    console.error('[recommendations] logImpressions error:', err)
  }
}
