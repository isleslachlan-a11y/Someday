'use server'

console.log('Worker URL:', process.env.SOCIAL_IMPORT_WORKER_URL)
console.log('Auth Token set:', !!process.env.SOCIAL_IMPORT_AUTH_TOKEN)

import { createClient } from '@/lib/supabase/server'
import { detectPlatform } from '@/lib/socialImport'
import type { SocialImportResult, ExtractedPlace } from '@/lib/socialImport'

const WORKER_URL = process.env.SOCIAL_IMPORT_WORKER_URL!
const AUTH_TOKEN = process.env.SOCIAL_IMPORT_AUTH_TOKEN!

function logImportEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  eventType: string,
  metadata: Record<string, unknown>,
) {
  // fire-and-forget — never block the import flow on event logging
  void supabase.from('events').insert({
    user_id: userId,
    event_type: eventType,
    metadata,
    platform: 'web',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
  })
}

export async function importPlaceFromUrl(url: string): Promise<SocialImportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Not authenticated' }

  const platform = detectPlatform(url)
  if (!platform) {
    return { status: 'error', message: 'Paste a TikTok or Pinterest URL' }
  }

  let workerData: { success: boolean; place: ExtractedPlace | null; error?: string }
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': AUTH_TOKEN,
      },
      body: JSON.stringify({ url, platform }),
    })
    workerData = (await res.json()) as typeof workerData
  } catch (err) {
  console.error('Worker fetch error:', err)
  return { status: 'error', message: 'Could not reach import service' }
  }

  if (!workerData.success || !workerData.place) {
    return { status: 'error', message: workerData.error || 'Import failed' }
  }

  const place = workerData.place

  logImportEvent(supabase, user.id, 'social_import', {
    platform,
    source_url: url,
    place_name: place.name,
    confidence: place.confidence,
  })

  if (place.confidence < 0.6) {
    return { status: 'low_confidence', place }
  }

  // Match against existing Someday places by name + country
  const { data: match } = await supabase
    .from('places')
    .select('id, name')
    .ilike('name', `%${place.name}%`)
    .eq('country', place.country ?? '')
    .limit(1)
    .maybeSingle()

  if (match) {
    logImportEvent(supabase, user.id, 'social_import_matched', {
      platform,
      source_url: url,
      matched_place_id: (match as { id: string }).id,
    })
    return {
      status: 'matched',
      placeId: (match as { id: string }).id,
      placeName: (match as { name: string }).name,
    }
  }

  return { status: 'new', place }
}
