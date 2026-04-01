import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Your travel bucket list dashboard.',
}
import CategoryBadge from '@/components/CategoryBadge'
import EmptyBucketList from '@/components/EmptyBucketList'
import HomeViewTracker from './HomeViewTracker'
import type { BucketListItem } from '@/lib/types'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch profile and all items in parallel
  const [profileResult, itemsResult] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user.id).single(),
    supabase
      .from('bucket_list_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const username = profileResult.data?.username ?? user.email?.split('@')[0] ?? 'traveller'
  const allItems = (itemsResult.data ?? []) as BucketListItem[]

  // Stats
  const total = allItems.length
  const countries = new Set(allItems.map(i => i.country)).size
  const visited = allItems.filter(i => i.status === 'visited').length
  const recentItems = allItems.slice(0, 5)

  return (
    <>
      <HomeViewTracker userId={user.id} />

      <main className="min-h-screen bg-indigo-deep px-4 py-8">
        <div className="max-w-3xl mx-auto">

          {/* Welcome */}
          <div className="mb-8">
            <h1 className="font-syne text-3xl font-bold text-white-soft">
              Hey, {username} <span className="text-violet-accent">✦</span>
            </h1>
            <p className="text-muted mt-1 text-sm">
              {total === 0
                ? 'Where do you want to go someday?'
                : `You have ${total} destination${total !== 1 ? 's' : ''} on your list.`}
            </p>
          </div>

          {total === 0 ? (
            <EmptyBucketList />
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <StatCard value={total} label="Saved" accent="violet" />
                <StatCard value={countries} label={countries === 1 ? 'Country' : 'Countries'} accent="lavender" />
                <StatCard value={visited} label="Visited" accent="pink" />
              </div>

              {/* Recently added */}
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-syne text-lg font-bold text-white-soft">Recently added</h2>
                  <Link href="/list" className="text-sm text-lavender hover:text-white-soft transition-colors">
                    View all →
                  </Link>
                </div>

                {/* Horizontal scroll strip */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
                  {recentItems.map(item => (
                    <RecentCard key={item.id} item={item} />
                  ))}
                </div>
              </section>

              {/* CTA */}
              <Link
                href="/list/new"
                className="flex items-center justify-center gap-2 w-full rounded-2xl border-2 border-dashed border-violet-accent/30 hover:border-violet-accent/60 hover:bg-violet-accent/5 py-5 text-violet-accent font-syne font-semibold text-sm transition-colors"
              >
                <span className="text-xl leading-none">+</span>
                Add destination
              </Link>
            </>
          )}

        </div>
      </main>
    </>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  accent,
}: {
  value: number
  label: string
  accent: 'violet' | 'lavender' | 'pink'
}) {
  const colorMap = {
    violet:  'text-violet-accent',
    lavender: 'text-lavender',
    pink:    'text-pink-accent',
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center">
      <p className={`font-syne text-3xl font-bold ${colorMap[accent]}`}>{value}</p>
      <p className="text-muted text-xs mt-1">{label}</p>
    </div>
  )
}

function RecentCard({ item }: { item: BucketListItem }) {
  return (
    <Link
      href={`/list/${item.id}/edit`}
      className="snap-start shrink-0 w-44 rounded-2xl border border-white/10 bg-white/5 hover:border-violet-accent/40 hover:bg-white/8 p-4 transition-colors"
    >
      <div className="mb-3">
        <CategoryBadge category={item.category} />
      </div>
      <p className="font-syne text-sm font-semibold text-white-soft leading-snug line-clamp-2 mb-1">
        {item.destination_name}
      </p>
      <p className="text-xs text-muted">{item.country}</p>
      {item.status === 'visited' && (
        <span className="inline-block mt-2 text-xs text-pink-accent">✓ visited</span>
      )}
    </Link>
  )
}
