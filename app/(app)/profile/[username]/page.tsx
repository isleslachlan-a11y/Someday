import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOverlaps } from '@/lib/overlaps'
import Avatar from '@/components/Avatar'
import ProfileViewTracker from '../ProfileViewTracker'
import OverlapBanner from './OverlapBanner'
import type { UserProfile, BucketListStatus, PlaceSnap } from '@/lib/types'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return {
    title: `@${username}`,
    description: `${username}'s travel bucket list on Someday.`,
  }
}

interface Props {
  params: Promise<{ username: string }>
}

interface BucketEntry {
  id: string
  status: BucketListStatus
  place: PlaceSnap
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params

  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Fetch the viewed profile ───────────────────────────────────────────────
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profileData) notFound()

  const profile = profileData as UserProfile

  if (profile.id === user.id) redirect('/profile')

  // ── Fetch their bucket list items (admin — bypasses owner-only RLS) ────────
  const { data: itemsData } = await admin
    .from('bucket_list_items')
    .select(`
      id, status,
      places ( id, name, country, type, description, tags, vibes, intensity, image_keyword )
    `)
    .eq('user_id', profile.id)
    .order('added_at', { ascending: false })

  const entries: BucketEntry[] = []
  for (const row of itemsData ?? []) {
    const place = row.places as unknown as Record<string, unknown> | null
    if (!place) continue
    entries.push({
      id: row.id as string,
      status: (row.status as BucketListStatus) ?? 'wishlist',
      place: {
        id: place.id as string,
        name: place.name as string,
        country: place.country as string,
        type: place.type as string,
        description: (place.description as string | null) ?? null,
        tags: (place.tags as string[] | null) ?? null,
        vibes: (place.vibes as string[] | null) ?? null,
        intensity: (place.intensity as string | null) ?? null,
        image_keyword: (place.image_keyword as string | null) ?? null,
      },
    })
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total = entries.length
  const countries = new Set(entries.map(e => e.place.country).filter(Boolean)).size
  const completed = entries.filter(e => e.status === 'completed').length

  // ── Overlap data (graceful — follows table may not yet exist) ──────────────
  let sharedPlaces: PlaceSnap[] = []
  try {
    const overlaps = await getOverlaps(user.id)
    const friendOverlap = overlaps.byFriend[profile.id]
    if (friendOverlap) {
      sharedPlaces = friendOverlap.matchingPlaces.map(p => ({
        id: p.id,
        name: p.name,
        country: p.country,
        type: p.type,
        description: p.description ?? null,
        tags: p.tags ?? null,
        vibes: p.vibes ?? null,
        intensity: p.intensity ?? null,
        image_keyword: p.image_keyword ?? null,
      }))
    }
  } catch {
    // degrade gracefully
  }

  return (
    <>
      <ProfileViewTracker
        userId={user.id}
        viewedUserId={profile.id}
        isOwnProfile={false}
      />

      <main className="min-h-screen bg-indigo-deep px-4 py-8">
        <div className="max-w-3xl mx-auto">

          {/* ── Profile header (unchanged layout) ─────────────────────────── */}
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
                Joined{' '}
                {new Date(profile.created_at).toLocaleDateString('en-AU', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* ── Stats (updated for new schema) ──────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <StatCard value={total} label="Saved" accent="violet" />
            <StatCard
              value={countries}
              label={countries === 1 ? 'Country' : 'Countries'}
              accent="lavender"
            />
            <StatCard value={completed} label="Done" accent="pink" />
          </div>

          {/* ── Overlap banner (new — only when following and overlaps exist) ─ */}
          {sharedPlaces.length > 0 && (
            <OverlapBanner places={sharedPlaces} username={profile.username ?? username} viewerUserId={user.id} />
          )}

          {/* ── Bucket list grid (updated schema) ───────────────────────────── */}
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
              <div className="text-4xl mb-3 select-none">✦</div>
              <p className="text-muted text-sm">Nothing on their list yet.</p>
            </div>
          ) : (
            <>
              {/* Active (wishlist + planning) */}
              {entries.filter(e => e.status !== 'completed').length > 0 && (
                <section className="mb-6">
                  <h2 className="font-syne text-base font-bold text-white-soft mb-3">
                    Someday ({entries.filter(e => e.status !== 'completed').length})
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {entries
                      .filter(e => e.status !== 'completed')
                      .map(entry => (
                        <PublicPlaceCard key={entry.id} entry={entry} />
                      ))}
                  </div>
                </section>
              )}

              {/* Completed */}
              {entries.filter(e => e.status === 'completed').length > 0 && (
                <section>
                  <h2 className="font-syne text-base font-bold text-white-soft mb-3">
                    Been there ({entries.filter(e => e.status === 'completed').length})
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {entries
                      .filter(e => e.status === 'completed')
                      .map(entry => (
                        <PublicPlaceCard key={entry.id} entry={entry} />
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

// ─── Stat card ────────────────────────────────────────────────────────────────

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

// ─── Public place card ────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  city:       '🏙',
  nature:     '🌿',
  experience: '✨',
  food:       '🍜',
}

function PublicPlaceCard({ entry }: { entry: BucketEntry }) {
  const isCompleted = entry.status === 'completed'

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-4 ${
        isCompleted
          ? 'border-white/5 bg-white/[0.02] opacity-60'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <span className="text-xl select-none shrink-0" aria-hidden>
        {TYPE_ICON[entry.place.type] ?? '✦'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-syne text-sm font-semibold text-white-soft truncate">
          {entry.place.name}
        </p>
        <p className="text-xs text-muted">{entry.place.country}</p>
      </div>
      {isCompleted && (
        <span className="ml-auto shrink-0 text-xs text-pink-accent font-semibold">✓</span>
      )}
    </div>
  )
}
