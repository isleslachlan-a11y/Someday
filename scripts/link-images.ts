/**
 * Bulk-links Unsplash images to all places that have image_keyword set
 * but image_url is null.
 *
 * Run with:
 *   npx tsx scripts/link-images.ts
 *
 * (tsx is required — ts-node does not support moduleResolution: bundler
 * or the @/ path aliases used by lib/unsplash.ts)
 *
 * Prerequisites:
 *   UNSPLASH_ACCESS_KEY and SUPABASE_SERVICE_ROLE_KEY must be in .env.local
 *   Unsplash demo keys: 50 requests/hour — the 500ms delay keeps us safe
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { linkImageToPlace } from '../lib/unsplash'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: places, error } = await supabase
    .from('places')
    .select('id, name')
    .is('image_url', null)
    .not('image_keyword', 'is', null)

  if (error) {
    console.error('Failed to fetch places:', error.message)
    process.exit(1)
  }

  const total = places.length
  if (total === 0) {
    console.log('No places need images.')
    return
  }

  console.log(`Found ${total} place(s) to link.\n`)

  let succeeded = 0
  let failed = 0

  for (let i = 0; i < places.length; i++) {
    const place = places[i]
    console.log(`[${i + 1}/${total}] Linking: ${place.name}`)

    const ok = await linkImageToPlace(place.id)
    if (ok) {
      console.log('  ✓ done')
      succeeded++
    } else {
      console.log('  ✗ no image found')
      failed++
    }

    if (i < places.length - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`\n${succeeded} linked, ${failed} failed out of ${total} total`)
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
