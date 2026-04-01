import { createClient } from '@/lib/supabase/client'

const APP_VERSION = '0.1.0'

function getCountryCode(): string | null {
  if (typeof window === 'undefined') return null
  const parts = navigator.language.split('-')
  return parts.length >= 2 ? parts[parts.length - 1].toUpperCase() : null
}

/**
 * Log a user action to the events table — the foundation of the B2B data product.
 * Must be called on every meaningful user action throughout the app.
 * Never throws — event logging must never crash the UI.
 */
export async function logEvent(
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('events').insert({
      user_id: userId,
      event_type: eventType,
      metadata,
      platform: 'web',
      app_version: APP_VERSION,
      country_code: getCountryCode(),
    })
    if (error) {
      console.error('[logEvent] failed:', error.message)
    }
  } catch (err) {
    console.error('[logEvent] unexpected error:', err)
  }
}
