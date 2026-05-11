import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DiscoverContent from './DiscoverContent'
import type { Place } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Discover',
  description: 'Find your next someday.',
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; region?: string }>
}) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams

  // App uses symmetric friendships, not a follows table
  const [placesResult, friendshipsResult, bucketResult] = await Promise.all([
    supabase
      .from('places')
      .select('*')
      .order('popularity', { ascending: false }),
    supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted'),
    supabase
      .from('bucket_list_items')
      .select('place_id')
      .eq('user_id', user.id),
  ])

  const places = (placesResult.data ?? []) as unknown as Place[]
  const savedPlaceIds = (bucketResult.data ?? []).map(r => r.place_id as string).filter(Boolean)

  // Resolve friend IDs from symmetric friendship rows
  const friendIds = (friendshipsResult.data ?? []).map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )

  let friendProfiles: { id: string; username: string; avatar_url: string | null }[] = []
  if (friendIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', friendIds)
      .limit(10)
    friendProfiles = (profiles ?? []).map(p => ({
      id: p.id as string,
      username: (p.username as string | null) ?? 'user',
      avatar_url: p.avatar_url as string | null,
    }))
  }

  // Top creators — active users with avatars (excluding current user)
  const { data: creatorData } = await admin
    .from('profiles')
    .select('id, username, avatar_url')
    .not('avatar_url', 'is', null)
    .neq('id', user.id)
    .limit(8)

  const creators = (creatorData ?? []).map(p => ({
    id: p.id as string,
    username: (p.username as string | null) ?? 'user',
    avatar_url: p.avatar_url as string | null,
  }))

  return (
    <div className="min-h-screen bg-[#fff9f0]">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-syne font-bold text-[#131936] text-[18px]">Discover</span>
          <Link
            href="/submit"
            className="px-3 py-1.5 rounded-full bg-[#f08c21] text-[#131936] font-nunito font-medium text-[13px]"
          >
            Submit a place
          </Link>
        </div>
      </header>

      <Suspense fallback={<DiscoverSkeleton />}>
        <DiscoverContent
          places={places}
          friendProfiles={friendProfiles}
          creators={creators}
          userId={user.id}
          initialSavedIds={savedPlaceIds}
          initialQuery={params.q ?? ''}
        />
      </Suspense>
    </div>
  )
}

function DiscoverSkeleton() {
  return (
    <div className="max-w-[480px] mx-auto px-4 pt-4 animate-pulse space-y-6">
      <div className="h-11 rounded-full bg-[#fcd99a]/30" />
      <div className="flex gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-[#fcd99a]/30" />
            <div className="w-12 h-2 rounded bg-[#fcd99a]/30" />
          </div>
        ))}
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 rounded bg-[#fcd99a]/30" />
          <div className="flex gap-3">
            {[0, 1, 2].map(j => (
              <div key={j} className="w-36 h-48 rounded-2xl bg-[#fcd99a]/30 shrink-0" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
