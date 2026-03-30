import { createClient } from '@/lib/supabase/client'

/**
 * Log a user action to the events table — the foundation of the B2B data product.
 * Must be called on every meaningful user action throughout the app.
 */
export async function logEvent(
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('events').insert({
    user_id: userId,
    event_type: eventType,
    metadata,
  })
  if (error) {
    console.error('[logEvent] failed:', error.message)
  }
}
