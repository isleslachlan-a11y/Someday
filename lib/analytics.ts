/**
 * Server-side analytics read functions for the B2B data product.
 * All functions use the service-role client and must only be called
 * from Server Components or Server Actions — never from the browser.
 */
import { createAdminClient } from '@/lib/supabase/admin'

export interface DateRange {
  from: Date
  to: Date
}

/**
 * Most-added destinations over the date range.
 * Reads from item_added events and aggregates by metadata.destination.
 */
export async function getTopDestinations(
  limit: number,
  dateRange: DateRange
): Promise<{ destination: string; count: number }[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('events')
    .select('metadata')
    .eq('event_type', 'item_added')
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())

  if (error || !data) return []

  const counts: Record<string, number> = {}
  for (const row of data) {
    const dest = (row.metadata as Record<string, unknown>)?.destination as string | undefined
    if (dest) counts[dest] = (counts[dest] ?? 0) + 1
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([destination, count]) => ({ destination, count }))
}

/**
 * Count of item_added events grouped by category over the date range.
 */
export async function getCategoryBreakdown(
  dateRange: DateRange
): Promise<{ category: string; count: number }[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('events')
    .select('metadata')
    .eq('event_type', 'item_added')
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())

  if (error || !data) return []

  const counts: Record<string, number> = {}
  for (const row of data) {
    const cat = (row.metadata as Record<string, unknown>)?.category as string | undefined
    if (cat) counts[cat] = (counts[cat] ?? 0) + 1
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }))
}

/**
 * Number of distinct users who fired any event over the date range.
 */
export async function getActiveUserCount(dateRange: DateRange): Promise<number> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('events')
    .select('user_id')
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())

  if (error || !data) return 0

  return new Set(data.map(r => r.user_id).filter(Boolean)).size
}

/**
 * Ratio of item_added events to user_signed_up events over the date range.
 * A proxy for activation: how many items does the average new user add?
 */
export async function getConversionRate(dateRange: DateRange): Promise<number> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('events')
    .select('event_type')
    .in('event_type', ['item_added', 'user_signed_up'])
    .gte('created_at', dateRange.from.toISOString())
    .lte('created_at', dateRange.to.toISOString())

  if (error || !data) return 0

  const signups = data.filter(r => r.event_type === 'user_signed_up').length
  const adds = data.filter(r => r.event_type === 'item_added').length

  return signups === 0 ? 0 : adds / signups
}
