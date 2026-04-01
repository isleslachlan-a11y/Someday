import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Your Someday profile and public bucket list.',
}
import Avatar from '@/components/Avatar'
import CategoryBadge from '@/components/CategoryBadge'
import ProfileViewTracker from './ProfileViewTracker'
import type { BucketListItem, UserProfile } from '@/lib/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileResult, itemsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('bucket_list_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileResult.data as UserProfile | null
  if (!profile) redirect('/login')

  const allItems = (itemsResult.data ?? []) as BucketListItem[]
  const total = allItems.length
  const countries = new Set(allItems.map(i => i.country)).size
  const visited = allItems.filter(i => i.status === 'visited').length
  const publicItems = allItems.filter(i => i.public)

  return (
    <>
      <ProfileViewTracker userId={user.id} viewedUserId={user.id} isOwnProfile />

      <main className="min-h-screen bg-indigo-deep px-4 py-8">
        <div className="max-w-3xl mx-auto">

          {/* Profile header */}
          <div className="flex items-start gap-5 mb-8">
            <Avatar avatarUrl={profile.avatar_url} username={profile.username ?? ''} size={80} />
            <div className="flex-1 min-w-0">
              <h1 className="font-syne text-2xl font-bold text-white-soft leading-tight">
                @{profile.username}
              </h1>
              {profile.bio ? (
                <p className="text-sm text-white-soft/70 mt-1 leading-relaxed">{profile.bio}</p>
              ) : (
                <p className="text-sm text-muted mt-1 italic">No bio yet.</p>
              )}
              <p className="text-xs text-muted mt-2">
                Joined {new Date(profile.created_at).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <Link
              href="/profile/edit"
              className="shrink-0 rounded-xl border border-white/15 hover:border-violet-accent/40 hover:bg-violet-accent/5 px-4 py-2 text-sm font-semibold text-white-soft/80 transition-colors"
            >
              Edit profile
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <StatCard value={total} label="Saved" accent="violet" />
            <StatCard value={countries} label={countries === 1 ? 'Country' : 'Countries'} accent="lavender" />
            <StatCard value={visited} label="Visited" accent="pink" />
          </div>

          {/* Bucket list preview */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-syne text-lg font-bold text-white-soft">Your list</h2>
              <Link href="/list" className="text-sm text-lavender hover:text-white-soft transition-colors">
                Manage →
              </Link>
            </div>

            {publicItems.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center">
                <p className="text-muted text-sm">Nothing public yet.</p>
                <Link
                  href="/list/new"
                  className="inline-block mt-4 text-sm text-lavender hover:text-white-soft transition-colors"
                >
                  Add a destination →
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {publicItems.slice(0, 6).map(item => (
                  <ProfileListItem key={item.id} item={item} />
                ))}
              </div>
            )}

            {publicItems.length > 6 && (
              <p className="text-xs text-muted text-center mt-4">
                +{publicItems.length - 6} more —{' '}
                <Link href="/list" className="text-lavender hover:text-white-soft transition-colors">
                  see all
                </Link>
              </p>
            )}
          </section>

        </div>
      </main>
    </>
  )
}

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
    violet: 'text-violet-accent',
    lavender: 'text-lavender',
    pink: 'text-pink-accent',
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center">
      <p className={`font-syne text-3xl font-bold ${colorMap[accent]}`}>{value}</p>
      <p className="text-muted text-xs mt-1">{label}</p>
    </div>
  )
}

function ProfileListItem({ item }: { item: BucketListItem }) {
  return (
    <Link
      href={`/list/${item.id}/edit`}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 hover:border-violet-accent/30 p-4 transition-colors"
    >
      <CategoryBadge category={item.category} size="sm" />
      <div className="min-w-0">
        <p className="font-syne text-sm font-semibold text-white-soft truncate">
          {item.destination_name}
        </p>
        <p className="text-xs text-muted">{item.country}</p>
      </div>
      {item.status === 'visited' && (
        <span className="ml-auto shrink-0 text-xs text-pink-accent">✓</span>
      )}
    </Link>
  )
}
