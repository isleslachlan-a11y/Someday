import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOverlaps } from '@/lib/overlaps'
import { getConversations } from '@/lib/messaging'
import PlanContent from './PlanContent'
import type { Trip, OverlapResult } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Plan',
  description: 'Plan your next trip with friends.',
}

export default async function PlanPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Fetch trips where the user is creator or member ──────────────────────
  const { data: tripsData } = await supabase
    .from('trips')
    .select('*')
    .or(`created_by.eq.${user.id},members.cs.{${user.id}}`)
    .order('created_at', { ascending: false })

  const trips: Trip[] = (tripsData ?? []).map(t => ({
    id: t.id as string,
    title: t.title as string,
    description: (t.description as string | null) ?? null,
    destination: (t.destination as string | null) ?? null,
    start_date: (t.start_date as string | null) ?? null,
    end_date: (t.end_date as string | null) ?? null,
    created_by: t.created_by as string,
    members: (t.members as string[]) ?? [],
    icon: (t.icon as string) ?? '✈️',
    created_at: t.created_at as string,
    conversation_id: (t.conversation_id as string | null) ?? null,
  }))

  // ── Overlap data (STATE A: no trips) — always fetch for seamless transition ──
  let overlaps: OverlapResult = { byPlace: {}, byFriend: {} }
  try {
    overlaps = await getOverlaps(user.id)
  } catch {
    // follows table may not exist yet — degrade gracefully
  }

  // ── Unread counts for trip conversations ──────────────────────────────────
  let tripUnreadMap: Record<string, number> = {}
  try {
    const conversations = await getConversations(user.id)
    for (const conv of conversations) {
      if (conv.type === 'trip' && conv.trip_id && conv.unread_count > 0) {
        tripUnreadMap[conv.trip_id] = conv.unread_count
      }
    }
  } catch {
    // Non-fatal
  }

  // ── Member profiles for trip cards ────────────────────────────────────────
  const allMemberIds = [...new Set(trips.flatMap(t => t.members))]
  let memberProfiles: Record<string, { username: string; avatar_url: string | null }> = {}

  if (allMemberIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', allMemberIds)

    for (const p of profiles ?? []) {
      memberProfiles[p.id as string] = {
        username: (p.username as string | null) ?? 'user',
        avatar_url: (p.avatar_url as string | null) ?? null,
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#fff9f0]">
      <PlanContent
        trips={trips}
        overlaps={overlaps}
        memberProfiles={memberProfiles}
        userId={user.id}
        tripUnreadMap={tripUnreadMap}
      />
    </main>
  )
}
