// UNSPLASH API COMPLIANCE:
// 1. Attribution must be displayed wherever images are shown
//    (handled by UnsplashAttribution component)
// 2. UTM parameters must be appended to all Unsplash links
//    (?utm_source=someday&utm_medium=referral)
// 3. Images must not be stored/re-hosted without a commercial licence
//    (we store URLs only, images served from Unsplash CDN directly)
// 4. The Unsplash API must not be used for bulk downloading
//    (bulkLinkImages uses 500ms delays to stay within rate limits)

import { createAdminClient } from '@/lib/supabase/admin'

const UTM = '?utm_source=someday&utm_medium=referral'

export interface UnsplashResult {
  id: string
  image_url: string
  image_thumb_url: string
  attribution: {
    photographer_name: string
    photographer_url: string
    photo_url: string
  }
}

/**
 * Search Unsplash for a relevant photo. Server-side only.
 * Returns the first landscape result, or null if none found.
 */
export async function searchUnsplashImage(query: string): Promise<UnsplashResult | null> {
  if (typeof window !== 'undefined') {
    throw new Error('searchUnsplashImage must be called server-side only')
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    console.error('[unsplash] UNSPLASH_ACCESS_KEY is not set')
    return null
  }

  const params = new URLSearchParams({
    query,
    per_page: '5',
    orientation: 'landscape',
    content_filter: 'high',
  })

  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error(`[unsplash] API error ${res.status}: ${res.statusText}`)
      return null
    }

    const data = await res.json()
    const results: unknown[] = data.results ?? []

    if (results.length === 0) {
      console.warn(`[unsplash] No results for query: "${query}"`)
      return null
    }

    const photo = results[0] as {
      id: string
      urls: { regular: string; small: string }
      user: { name: string; links: { html: string } }
      links: { html: string }
    }

    return {
      id: photo.id,
      image_url: photo.urls.regular,
      image_thumb_url: photo.urls.small,
      attribution: {
        photographer_name: photo.user.name,
        photographer_url: `${photo.user.links.html}${UTM}`,
        photo_url: `${photo.links.html}${UTM}`,
      },
    }
  } catch (err) {
    console.error('[unsplash] Unexpected fetch error:', err)
    return null
  }
}

/**
 * Fetch an Unsplash image for a place and write the URLs back to the DB.
 * Uses the service-role client to bypass RLS on places (admin-write only).
 * Returns true if an image was found and saved, false otherwise.
 */
export async function linkImageToPlace(placeId: string, query?: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    throw new Error('linkImageToPlace must be called server-side only')
  }

  const supabase = createAdminClient()

  // 1. Fetch the place
  const { data: place, error: fetchError } = await supabase
    .from('places')
    .select('id, name, country, type, image_keyword')
    .eq('id', placeId)
    .single()

  if (fetchError || !place) {
    console.error(`[unsplash] Failed to fetch place ${placeId}:`, fetchError?.message)
    return false
  }

  // 2. Build search query
  const searchQuery =
    query ??
    (place.image_keyword
      ? String(place.image_keyword)
      : `${place.name} ${place.country} travel`)

  // 3. Primary search
  let result = await searchUnsplashImage(searchQuery)

  // 4. Fallback search
  if (!result) {
    const fallback = `${place.name} ${place.type}`
    console.log(`[unsplash] Trying fallback query: "${fallback}"`)
    result = await searchUnsplashImage(fallback)
  }

  if (!result) {
    console.warn(`[unsplash] No image found for: ${place.name} (${placeId})`)
    return false
  }

  // 5. Persist to DB
  const { error: updateError } = await supabase
    .from('places')
    .update({
      image_url: result.image_url,
      image_thumb_url: result.image_thumb_url,
      unsplash_photo_id: result.id,
      unsplash_attribution: result.attribution,
    })
    .eq('id', placeId)

  if (updateError) {
    console.error(`[unsplash] Failed to update place ${placeId}:`, updateError.message)
    return false
  }

  console.log(`[unsplash] ✓ Linked image to: ${place.name}`)
  return true
}
