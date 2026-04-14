import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Avatar from '@/components/Avatar'
import ProfileViewTracker from './ProfileViewTracker'
import TravelProfileSection from './TravelProfileSection'
import PastTripsSection from './PastTripsSection'
import type { UserProfile, BucketListStatus, PlaceSnap } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Your Someday profile and travel identity.',
}

// ─── Types (page-local) ───────────────────────────────────────────────────────

interface UserContext {
  travel_style: string[] | null
  comfort_zone: string | null
  budget_range: string | null
  travel_frequency: string | null
  group_preference: string | null
}

interface PastTrip {
  id: string
  place_name: string
  country: string | null
  year: number | null
}

interface BucketEntry {
  id: string
  status: BucketListStatus
  place: PlaceSnap
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Parallel queries ────────────────────────────────────────────────────────
  const [profileResult, itemsResult, contextResult, tripsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),

    supabase
      .from('bucket_list_items')
      .select(`
        id, status,
        places ( id, name, country, type, description, tags, vibes, intensity, image_keyword )
      `)
      .eq('user_id', user.id)
      .order('added_at', { ascending: false }),

    supabase
      .from('user_context')
      .select('travel_style, comfort_zone, budget_range, travel_frequency, group_preference')
      .eq('user_id', user.id)
      .maybeSingle(),

    supabase
      .from('past_trips')
      .select('id, place_name, country, year')
      .eq('user_id', user.id)
      .order('year', { ascending: false, nullsFirst: false }),
  ])

  const profile = profileResult.data as UserProfile | null
  if (!profile) redirect('/login')

  // Transform bucket list items
  const entries: BucketEntry[] = []
  for (const row of itemsResult.data ?? []) {
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

  // Stats
  const total = entries.length
  const countries = new Set(entries.map(e => e.place.country).filter(Boolean)).size
  const completed = entries.filter(e => e.status === 'completed').length

  const travelContext: UserContext | null = contextResult.data
    ? {
        travel_style: (contextResult.data.travel_style as string[] | null) ?? null,
        comfort_zone: (contextResult.data.comfort_zone as string | null) ?? null,
        budget_range: (contextResult.data.budget_range as string | null) ?? null,
        travel_frequency: (contextResult.data.travel_frequency as string | null) ?? null,
        group_preference: (contextResult.data.group_preference as string | null) ?? null,
      }
    : null

  const pastTrips: PastTrip[] = (tripsResult.data ?? []).map(t => ({
    id: t.id as string,
    place_name: t.place_name as string,
    country: (t.country as string | null) ?? null,
    year: (t.year as number | null) ?? null,
  }))

  return (
    <>
      <ProfileViewTracker userId={user.id} viewedUserId={user.id} isOwnProfile />

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
            <Link
              href="/profile/edit"
              className="shrink-0 rounded-xl border border-white/15 hover:border-violet-accent/40 hover:bg-violet-accent/5 px-4 py-2 text-sm font-semibold text-white-soft/80 transition-colors"
            >
              Edit profile
            </Link>
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

          {/* ── Travel Profile (new) ─────────────────────────────────────────── */}
          <TravelProfileSection context={travelContext} />

          {/* ── Past Trips (new) ─────────────────────────────────────────────── */}
          <PastTripsSection trips={pastTrips} />

          {/* ── Bucket list grid (updated schema) ───────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-syne text-lg font-bold text-white-soft">Your list</h2>
              <Link
                href="/list"
                className="text-sm text-lavender hover:text-white-soft transition-colors"
              >
                Manage →
              </Link>
            </div>

            {entries.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center">
                <p className="text-muted text-sm">Nothing saved yet.</p>
                <Link
                  href="/home"
                  className="inline-block mt-4 text-sm text-lavender hover:text-white-soft transition-colors"
                >
                  Discover places →
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {entries.slice(0, 8).map(entry => (
                  <ProfilePlaceCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}

            {entries.length > 8 && (
              <p className="text-xs text-muted text-center mt-4">
                +{entries.length - 8} more —{' '}
                <Link
                  href="/list"
                  className="text-lavender hover:text-white-soft transition-colors"
                >
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

// ─── Stat card (unchanged) ─────────────────────────────────────────────────────

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

// ─── Profile place card (replaces ProfileListItem) ────────────────────────────

const TYPE_ICON: Record<string, string> = {
  city:       '🏙',
  nature:     '🌿',
  experience: '✨',
  food:       '🍜',
}

const STATUS_LABEL: Record<string, string> = {
  wishlist:  '✦ Wishlist',
  planning:  '📅 Planning',
  completed: '✓ Done',
}

function ProfilePlaceCard({ entry }: { entry: BucketEntry }) {
  const isCompleted = entry.status === 'completed'

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
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
      <span
        className={`shrink-0 text-xs font-semibold ${
          isCompleted
            ? 'text-pink-accent'
            : entry.status === 'planning'
            ? 'text-lavender'
            : 'text-muted'
        }`}
      >
        {STATUS_LABEL[entry.status]}
      </span>
    </div>
  )
}
