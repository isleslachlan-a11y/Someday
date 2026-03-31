import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'My List',
  description: 'Every place and experience you want to have someday.',
}
import ListFilters from './ListFilters'
import type { BucketListItem } from '@/lib/types'

export default async function ListPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  // redirect() throws (never returns), but TS doesn't narrow through it without @types/next being resolved
  const userId = user!.id

  const { data, error } = await supabase
    .from('bucket_list_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen bg-indigo-deep px-4 py-8">
        <p className="text-pink-accent text-sm">Failed to load your bucket list.</p>
      </main>
    )
  }

  const items = (data ?? []) as BucketListItem[]

  return (
    <main className="min-h-screen bg-indigo-deep px-4 py-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-syne text-3xl font-bold text-white-soft">My Bucket List</h1>
            <p className="text-muted text-sm mt-1">
              {items.length} destination{items.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <Link
            href="/list/new"
            className="rounded-xl bg-violet-accent hover:bg-violet-accent/90 px-4 py-2.5 font-syne font-semibold text-white-soft text-sm transition-colors"
          >
            + Add destination
          </Link>
        </div>

        {/* Filters, tabs, and card grid — all client-side */}
        <Suspense fallback={<FiltersPlaceholder />}>
          <ListFilters items={items} userId={user.id} />
        </Suspense>

      </div>
    </main>
  )
}

function FiltersPlaceholder() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 rounded-xl bg-white/5" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-6 w-16 rounded-full bg-white/5" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-44 rounded-2xl bg-white/5" />
        ))}
      </div>
    </div>
  )
}
