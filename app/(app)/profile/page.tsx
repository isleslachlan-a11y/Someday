import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFriends } from '@/lib/friends'
import Avatar from '@/components/Avatar'
import ProfileViewTracker from './ProfileViewTracker'
import TravelProfileSection from './TravelProfileSection'
import PastTripsSection from './PastTripsSection'
import FriendsSheet from '@/components/friends/FriendsSheet'
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

  const [profileResult, itemsResult, contextResult, tripsResult, friends] = await Promise.all([
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

    getFriends(user.id).catch(() => [] as UserProfile[]),
  ])

  const profile = profileResult.data as UserProfile | null
  if (!profile) redirect('/login')

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

  const friendCount = friends.length
  const placeCount  = entries.length
  const tripCount   = tripsResult.data?.length ?? 0

  const travelContext: UserContext | null = contextResult.data
    ? {
        travel_style:     (contextResult.data.travel_style as string[] | null) ?? null,
        comfort_zone:     (contextResult.data.comfort_zone as string | null) ?? null,
        budget_range:     (contextResult.data.budget_range as string | null) ?? null,
        travel_frequency: (contextResult.data.travel_frequency as string | null) ?? null,
        group_preference: (contextResult.data.group_preference as string | null) ?? null,
      }
    : null

  const pastTrips: PastTrip[] = (tripsResult.data ?? []).map(t => ({
    id:         t.id as string,
    place_name: t.place_name as string,
    country:    (t.country as string | null) ?? null,
    year:       (t.year as number | null) ?? null,
  }))

  return (
    <>
      <ProfileViewTracker userId={user.id} viewedUserId={user.id} isOwnProfile />

      <main className="min-h-screen bg-[#fff9f0]">

        {/* Sticky top bar */}
        <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
          <div className="max-w-[480px] mx-auto px-4 h-14 grid grid-cols-3 items-center">
            <div />
            <div className="flex justify-center">
              <span className="font-syne font-bold text-[#131936] text-[20px] tracking-widest uppercase">
                PROFILE
              </span>
            </div>
            <div className="flex justify-end">
              <Link
                href="/profile/edit"
                className="px-3 py-1.5 rounded-full border border-[#fcd99a] bg-white font-nunito font-medium text-[#131936] text-[13px]"
              >
                Edit
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-[480px] mx-auto px-4 pt-6 pb-24">

          {/* Avatar + name block */}
          <div className="flex flex-col items-center text-center mb-6">
            <Avatar avatarUrl={profile.avatar_url} username={profile.username ?? ''} size={80} />
            <h1 className="font-syne text-[22px] font-bold text-[#131936] mt-3">
              @{profile.username}
            </h1>
            {profile.bio ? (
              <p className="font-nunito text-[#131936]/60 text-[14px] mt-1 leading-relaxed max-w-xs">
                {profile.bio}
              </p>
            ) : (
              <p className="font-nunito text-[#131936]/30 text-[13px] mt-1 italic">
                No bio yet.
              </p>
            )}
            <p className="font-nunito text-[#131936]/30 text-[12px] mt-1">
              Joined{' '}
              {new Date(profile.created_at).toLocaleDateString('en-AU', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <FriendsSheet initialFriendCount={friendCount} />
            <Link
              href="/list"
              className="flex flex-col items-center gap-0.5 rounded-2xl border border-[#fcd99a]/40 bg-white px-4 py-5 text-center"
            >
              <p className="font-syne text-[28px] font-bold text-[#f08c21]">{placeCount}</p>
              <p className="font-nunito text-[#131936]/50 text-[11px] mt-0.5">Places</p>
            </Link>
            <Link
              href="/plan"
              className="flex flex-col items-center gap-0.5 rounded-2xl border border-[#fcd99a]/40 bg-white px-4 py-5 text-center"
            >
              <p className="font-syne text-[28px] font-bold text-[#f08c21]">{tripCount}</p>
              <p className="font-nunito text-[#131936]/50 text-[11px] mt-0.5">Trips</p>
            </Link>
          </div>

          {/* Travel profile section */}
          <TravelProfileSection context={travelContext} />

          {/* Past trips section */}
          <PastTripsSection trips={pastTrips} />

          {/* Bucket list grid */}
          <section className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-syne font-bold text-[#131936] text-[17px]">Your list</h2>
              <Link href="/list" className="font-nunito text-[#f08c21] text-[13px]">
                Manage →
              </Link>
            </div>
            {entries.length === 0 ? (
              <div className="rounded-2xl border border-[#fcd99a]/40 bg-white px-6 py-10 text-center">
                <p className="font-nunito text-[#131936]/40 text-[14px]">Nothing saved yet.</p>
                <Link href="/home" className="inline-block mt-3 font-nunito text-[#f08c21] text-[13px]">
                  Discover places →
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-2">
                {entries.slice(0, 8).map(entry => (
                  <ProfilePlaceCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
            {entries.length > 8 && (
              <p className="font-nunito text-[#131936]/40 text-[12px] text-center mt-4">
                +{entries.length - 8} more —{' '}
                <Link href="/list" className="text-[#f08c21]">see all</Link>
              </p>
            )}
          </section>

        </div>
      </main>
    </>
  )
}

// ─── Profile place card ───────────────────────────────────────────────────────

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
          ? 'border-[#fcd99a]/20 bg-white opacity-60'
          : 'border-[#fcd99a]/40 bg-white'
      }`}
    >
      <span className="text-xl select-none shrink-0" aria-hidden>
        {TYPE_ICON[entry.place.type] ?? '✦'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-syne text-sm font-semibold text-[#131936] truncate">
          {entry.place.name}
        </p>
        <p className="text-xs text-[#131936]/50">{entry.place.country}</p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-[#f08c21]">
        {STATUS_LABEL[entry.status]}
      </span>
    </div>
  )
}
