'use server'

import { createClient } from '@/lib/supabase/server'
import type { BucketListItem } from '@/lib/types'

export interface SearchResult {
  data: BucketListItem[]
  error?: string
}

/**
 * Full-text search over a user's bucket list items.
 * Uses ilike across destination_name and country fields.
 * Returns max 20 results ordered by priority desc.
 */
export async function searchBucketList(query: string): Promise<SearchResult> {
  const trimmed = query.trim()
  if (!trimmed) return { data: [] }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { data: [], error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('bucket_list_items')
    .select('*')
    .eq('user_id', user.id)
    .or(`destination_name.ilike.%${trimmed}%,country.ilike.%${trimmed}%,region.ilike.%${trimmed}%`)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return { data: [], error: error.message }

  return { data: (data ?? []) as BucketListItem[] }
}
