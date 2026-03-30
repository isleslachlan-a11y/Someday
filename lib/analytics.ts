// Thin wrapper kept for backward compatibility.
// Prefer logEvent() from @/lib/events for new code (includes userId).
import { createClient } from '@/lib/supabase/client'

export async function logEvent(eventType: string, properties: Record<string, unknown>): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('events').insert({ event_type: eventType, metadata: properties })
  if (error) {
    console.error('[logEvent] failed:', error.message)
  }
}
