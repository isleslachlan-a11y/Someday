/**
 * QA tool: query the events table and print a summary of event_type counts.
 *
 * Usage:
 *   npx tsx scripts/check-events.ts
 *   npx ts-node scripts/check-events.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

async function main() {
  // Fetch all events (select only the fields we need)
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/events?select=event_type,platform,created_at&order=created_at.desc`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Accept: 'application/json',
      },
    }
  )

  if (!res.ok) {
    console.error('Failed to fetch events:', res.status, await res.text())
    process.exit(1)
  }

  const events = (await res.json()) as { event_type: string; platform: string; created_at: string }[]

  if (events.length === 0) {
    console.log('\nNo events recorded yet.\n')
    return
  }

  // Count by event_type
  const typeCounts: Record<string, number> = {}
  for (const e of events) {
    typeCounts[e.event_type] = (typeCounts[e.event_type] ?? 0) + 1
  }

  // Count by platform
  const platformCounts: Record<string, number> = {}
  for (const e of events) {
    const p = e.platform ?? 'unknown'
    platformCounts[p] = (platformCounts[p] ?? 0) + 1
  }

  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
  const mostRecent = events[0].created_at

  const divider = '─'.repeat(44)
  console.log(`\nSomeday · Event summary`)
  console.log(`Total: ${events.length} events  ·  Most recent: ${new Date(mostRecent).toLocaleString()}`)
  console.log(divider)
  for (const [type, count] of sortedTypes) {
    const bar = '█'.repeat(Math.min(Math.round((count / events.length) * 20), 20))
    console.log(`  ${type.padEnd(28)} ${String(count).padStart(5)}  ${bar}`)
  }
  console.log(divider)
  console.log('  Platform breakdown:')
  for (const [platform, count] of Object.entries(platformCounts)) {
    console.log(`    ${platform.padEnd(10)} ${count}`)
  }
  console.log()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
