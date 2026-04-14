'use server'

import { createClient } from '@/lib/supabase/server'
import type { Place } from '@/lib/types'

export interface SearchResult {
  data: Place[]
  error?: string
}

/**
 * Full-text search over the curated places catalogue.
 * Uses ilike across name and country fields.
 * Returns max 20 results ordered by popularity desc.
 */
export async function searchPlaces(query: string): Promise<SearchResult> {
  const trimmed = query.trim()
  if (!trimmed) return { data: [] }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { data: [], error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('places')
    .select('*')
    .or(`name.ilike.%${trimmed}%,country.ilike.%${trimmed}%`)
    .order('popularity', { ascending: false })
    .limit(20)

  if (error) return { data: [], error: error.message }

  const results = (data ?? []) as unknown as Place[]

  await supabase.from('events').insert({
    user_id: user.id,
    event_type: 'search_performed',
    metadata: { query: trimmed, result_count: results.length },
    platform: 'web',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
    country_code: null,
  })

  return { data: results }
}
