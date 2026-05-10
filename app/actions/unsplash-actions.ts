'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { linkImageToPlace } from '@/lib/unsplash'

export interface BulkLinkResult {
  total: number
  succeeded: number
  failed: number
  failedPlaces: string[]
}

/**
 * Process all places that have no image_url, fetching and saving
 * an Unsplash image for each. 500ms delay between calls to stay
 * within Unsplash's 50 req/hour demo rate limit.
 */
export async function bulkLinkImages(): Promise<BulkLinkResult> {
  const supabase = createAdminClient()

  const { data: places, error } = await supabase
    .from('places')
    .select('id, name')
    .is('image_url', null)

  if (error || !places) {
    throw new Error(`Failed to fetch unlinked places: ${error?.message}`)
  }

  const result: BulkLinkResult = {
    total: places.length,
    succeeded: 0,
    failed: 0,
    failedPlaces: [],
  }

  for (const place of places) {
    const success = await linkImageToPlace(place.id)
    if (success) {
      result.succeeded++
    } else {
      result.failed++
      result.failedPlaces.push(place.name as string)
    }
    await new Promise(r => setTimeout(r, 500))
  }

  return result
}

/**
 * Fetch and save an Unsplash image for a single place by ID.
 */
export async function linkSinglePlaceImage(placeId: string): Promise<boolean> {
  return linkImageToPlace(placeId)
}
