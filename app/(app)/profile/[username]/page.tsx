import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Avatar from '@/components/Avatar'
import CategoryBadge from '@/components/CategoryBadge'
import ProfileViewTracker from '../ProfileViewTracker'
import type { BucketListItem, UserProfile } from '@/lib/types'

interface Props {
  params: Promise<{ username: string }>
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch the profile for this username
  const { data: profileData } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  if (!profileData) notFound()

  const profile = profileData as UserProfile

  // Redirect to /profile if viewing own page
  if (profile.id === user.id) redirect('/profile')

  // Fetch their public bucket list items
  const { data: itemsData } = await supabase
    .from('bucket_list_items')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  const items = (itemsData ?? []) as BucketListItem[]
  const wantItems = items.filter(i => i.status === 'want')
  const visitedItems = items.filter(i => i.status === 'visited')
  const countries = new Set(items.map(i => i.country)).size

  return (
    <>
      <ProfileViewTracker
        userId={user.id}
        viewedUserId={profile.id}
        isOwnProfile={false}
      />

      <main className="min-h-screen bg-indigo-deep px-4 py-8">
        <div className="max-w-3xl mx-auto">

          {/* Profile header */}
          <div className="flex items-start gap-5 mb-8">
            <Avatar avatarUrl={profile.avatar_url} username={profile.username} size={80} />
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
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <StatCard value={items.length} label="Saved" accent="violet" />
            <StatCard value={countries} label={countries === 1 ? 'Country' : 'Countries'} accent="lavender" />
            <StatCard value={visitedItems.length} label="Visited" accent="pink" />
          </div>

          {/* Bucket list */}
          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
              <div className="text-4xl mb-3 select-none">✦</div>
              <p className="text-muted text-sm">Nothing public on their list yet.</p>
            </div>
          ) : (
            <>
              {wantItems.length > 0 && (
                <section className="mb-8">
                  <h2 className="font-syne text-base font-bold text-white-soft mb-3">
                    Someday ({wantItems.length})
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {wantItems.map(item => (
                      <PublicCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              )}

              {visitedItems.length > 0 && (
                <section>
                  <h2 className="font-syne text-base font-bold text-white-soft mb-3">
                    Been there ({visitedItems.length})
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {visitedItems.map(item => (
                      <PublicCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

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

function PublicCard({ item }: { item: BucketListItem }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <CategoryBadge category={item.category} size="sm" />
      <div className="min-w-0">
        <p className="font-syne text-sm font-semibold text-white-soft truncate">
          {item.destination_name}
        </p>
        <p className="text-xs text-muted">{item.country}{item.region ? ` · ${item.region}` : ''}</p>
      </div>
      {item.status === 'visited' && (
        <span className="ml-auto shrink-0 text-xs text-pink-accent">✓</span>
      )}
    </div>
  )
}
