'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Avatar from '@/components/Avatar'
import { createTrip } from '@/app/actions/trips'
import { logEvent } from '@/lib/events'
import type { Trip, OverlapResult, OverlapProfile, Place } from '@/lib/types'

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  trips: Trip[]
  overlaps: OverlapResult
  memberProfiles: Record<string, { username: string; avatar_url: string | null }>
  userId: string
  tripUnreadMap: Record<string, number>
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function PlanContent({ trips, overlaps, memberProfiles, userId, tripUnreadMap }: Props) {
  const [showCreate, setShowCreate] = useState(false)

  // Log overlap_viewed when user lands on Plan page with active overlaps
  useEffect(() => {
    const placeIds = Object.keys(overlaps.byPlace)
    if (placeIds.length > 0) {
      logEvent(userId, 'overlap_viewed', {
        source: 'plan_page',
        place_count: placeIds.length,
        friend_count: Object.keys(overlaps.byFriend).length,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-syne text-3xl font-bold text-white-soft">Plan</h1>
          <p className="text-muted text-sm mt-1">
            {trips.length > 0
              ? `${trips.length} trip${trips.length !== 1 ? 's' : ''}`
              : 'Turn overlaps into adventures'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-xl bg-violet-accent hover:bg-violet-accent/90 px-4 py-2.5 font-syne font-semibold text-white-soft text-sm transition-colors"
        >
          + Trip
        </button>
      </div>

      {/* State A or B */}
      {trips.length === 0 ? (
        <OverlapState overlaps={overlaps} userId={userId} onCreateTrip={() => setShowCreate(true)} />
      ) : (
        <TripListState
          trips={trips}
          memberProfiles={memberProfiles}
          overlaps={overlaps}
          tripUnreadMap={tripUnreadMap}
          onCreateTrip={() => setShowCreate(true)}
        />
      )}

      {/* Create trip sheet */}
      {showCreate && <CreateTripSheet onClose={() => setShowCreate(false)} />}
    </>
  )
}

// ─── STATE A: Overlap view ────────────────────────────────────────────────────

type OverlapTab = 'place' | 'friend'

function OverlapState({
  overlaps,
  userId,
  onCreateTrip,
}: {
  overlaps: OverlapResult
  userId: string
  onCreateTrip: () => void
}) {
  const [tab, setTab] = useState<OverlapTab>('place')
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null)

  const byPlaceEntries = useMemo(
    () =>
      Object.values(overlaps.byPlace).sort(
        (a, b) => b.matchingFriends.length - a.matchingFriends.length
      ),
    [overlaps.byPlace]
  )

  const byFriendEntries = useMemo(
    () =>
      Object.values(overlaps.byFriend).sort(
        (a, b) => b.matchingPlaces.length - a.matchingPlaces.length
      ),
    [overlaps.byFriend]
  )

  const hasOverlaps = byPlaceEntries.length > 0

  // Friend detail view
  if (selectedFriend) {
    const entry = overlaps.byFriend[selectedFriend]
    if (!entry) {
      setSelectedFriend(null)
      return null
    }
    return (
      <FriendDetail
        friend={entry.friend}
        places={entry.matchingPlaces}
        onBack={() => setSelectedFriend(null)}
        onCreateTrip={onCreateTrip}
      />
    )
  }

  return (
    <div>
      {/* Explainer */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
        <p className="text-xs text-lavender font-semibold uppercase tracking-wider mb-1">
          ✦ Overlap
        </p>
        <p className="text-white-soft font-syne font-bold text-lg leading-snug mb-1">
          People you follow who want to go to the same places as you.
        </p>
        <p className="text-muted text-sm">
          When you both want the same destination, it's a sign. Start a trip together.
        </p>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10 mb-6 w-fit">
        {(['place', 'friend'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === t
                ? 'bg-violet-accent text-white-soft'
                : 'text-muted hover:text-white-soft'
            }`}
          >
            {t === 'place' ? 'By Place' : 'By Friend'}
          </button>
        ))}
      </div>

      {!hasOverlaps ? (
        <EmptyOverlap onCreateTrip={onCreateTrip} />
      ) : tab === 'place' ? (
        <div className="space-y-3">
          {byPlaceEntries.map(({ place, matchingFriends }) => (
            <PlaceOverlapCard
              key={place.id}
              place={place}
              friends={matchingFriends}
              onCreateTrip={onCreateTrip}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {byFriendEntries.map(({ friend, matchingPlaces }) => (
            <FriendOverlapCard
              key={friend.id}
              friend={friend}
              places={matchingPlaces}
              onSelect={() => setSelectedFriend(friend.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Place overlap card ───────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  city: '🏙',
  nature: '🌿',
  experience: '✨',
  food: '🍜',
}

function PlaceOverlapCard({
  place,
  friends,
  onCreateTrip,
}: {
  place: Place
  friends: OverlapProfile[]
  onCreateTrip: () => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-4">
      {/* Icon */}
      <span className="text-2xl select-none mt-0.5" aria-hidden>
        {TYPE_ICON[place.type] ?? '✦'}
      </span>

      <div className="flex-1 min-w-0">
        <h3 className="font-syne font-bold text-white-soft leading-snug">{place.name}</h3>
        <p className="text-xs text-muted mb-2">{place.country}</p>

        {/* Friends */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {friends.slice(0, 3).map(f => (
              <Avatar
                key={f.id}
                avatarUrl={f.avatar_url}
                username={f.username}
                size={22}
                className="ring-1 ring-indigo-deep"
              />
            ))}
          </div>
          <span className="text-xs text-lavender">
            {friends.length === 1
              ? `${friends[0].username} wants this too`
              : `${friends.length} friends want this too`}
          </span>
        </div>
      </div>

      <button
        onClick={onCreateTrip}
        className="shrink-0 rounded-lg bg-violet-accent/15 hover:bg-violet-accent/30 border border-violet-accent/30 px-3 py-1.5 text-xs font-semibold text-lavender transition-colors"
      >
        Plan it
      </button>
    </div>
  )
}

// ─── Friend overlap card ──────────────────────────────────────────────────────

function FriendOverlapCard({
  friend,
  places,
  onSelect,
}: {
  friend: OverlapProfile
  places: Place[]
  onSelect: () => void
}) {
  const preview = places.slice(0, 2).map(p => p.name)
  const extra = places.length - 2

  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] hover:border-violet-accent/35 hover:bg-white/[0.05] transition-all p-4 flex items-center gap-4"
    >
      <Avatar avatarUrl={friend.avatar_url} username={friend.username} size={44} />
      <div className="flex-1 min-w-0">
        <p className="font-syne font-bold text-white-soft">{friend.username}</p>
        <p className="text-xs text-muted truncate">
          You both want:{' '}
          <span className="text-lavender">
            {preview.join(', ')}
            {extra > 0 ? ` and ${extra} other${extra !== 1 ? 's' : ''}` : ''}
          </span>
        </p>
      </div>
      <span className="text-muted text-lg">›</span>
    </button>
  )
}

// ─── Friend detail view ───────────────────────────────────────────────────────

function FriendDetail({
  friend,
  places,
  onBack,
  onCreateTrip,
}: {
  friend: OverlapProfile
  places: Place[]
  onBack: () => void
  onCreateTrip: () => void
}) {
  return (
    <div>
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-muted hover:text-white-soft text-sm mb-6 transition-colors"
      >
        ‹ Back
      </button>

      {/* Friend header */}
      <div className="flex items-center gap-3 mb-6">
        <Avatar avatarUrl={friend.avatar_url} username={friend.username} size={48} />
        <div>
          <p className="font-syne font-bold text-white-soft">{friend.username}</p>
          <p className="text-xs text-muted">
            {places.length} shared destination{places.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {places.map(place => (
          <div
            key={place.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-4"
          >
            <span className="text-2xl select-none mt-0.5" aria-hidden>
              {TYPE_ICON[place.type] ?? '✦'}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-syne font-bold text-white-soft">{place.name}</h3>
              <p className="text-xs text-muted">{place.country}</p>
              {place.vibes && place.vibes.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {place.vibes.slice(0, 2).map(v => (
                    <span
                      key={v}
                      className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-lavender"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onCreateTrip}
              className="shrink-0 rounded-lg bg-violet-accent/15 hover:bg-violet-accent/30 border border-violet-accent/30 px-3 py-1.5 text-xs font-semibold text-lavender transition-colors"
            >
              Start trip
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Empty overlap ────────────────────────────────────────────────────────────

function EmptyOverlap({ onCreateTrip }: { onCreateTrip: () => void }) {
  return (
    <div className="text-center py-16">
      <p className="text-4xl mb-4">🌍</p>
      <p className="font-syne font-bold text-white-soft mb-2">No overlaps yet</p>
      <p className="text-muted text-sm mb-6 max-w-xs mx-auto">
        Follow friends and add places to your list — overlaps appear when you both want the same
        destination.
      </p>
      <button
        onClick={onCreateTrip}
        className="rounded-xl bg-violet-accent hover:bg-violet-accent/90 px-5 py-2.5 font-syne font-semibold text-white-soft text-sm transition-colors"
      >
        Start a trip anyway
      </button>
    </div>
  )
}

// ─── STATE B: Trip list ───────────────────────────────────────────────────────

function TripListState({
  trips,
  memberProfiles,
  overlaps,
  tripUnreadMap,
  onCreateTrip,
}: {
  trips: Trip[]
  memberProfiles: Record<string, { username: string; avatar_url: string | null }>
  overlaps: OverlapResult
  tripUnreadMap: Record<string, number>
  onCreateTrip: () => void
}) {
  const hasOverlaps = Object.keys(overlaps.byPlace).length > 0

  return (
    <div>
      {/* Trip cards */}
      <div className="space-y-4 mb-8">
        {trips.map(trip => (
          <TripCard
            key={trip.id}
            trip={trip}
            memberProfiles={memberProfiles}
            unreadCount={tripUnreadMap[trip.id] ?? 0}
          />
        ))}
      </div>

      {/* Overlap teaser if there are overlaps */}
      {hasOverlaps && (
        <div className="rounded-2xl border border-violet-accent/20 bg-violet-accent/5 p-4">
          <p className="text-xs text-lavender font-semibold uppercase tracking-wider mb-1">
            ✦ Overlap
          </p>
          <p className="text-white-soft text-sm font-syne font-bold mb-1">
            {Object.keys(overlaps.byPlace).length} destination
            {Object.keys(overlaps.byPlace).length !== 1 ? 's' : ''} shared with friends
          </p>
          <p className="text-muted text-xs">
            {Object.values(overlaps.byPlace)
              .slice(0, 2)
              .map(e => e.place.name)
              .join(', ')}
            {Object.keys(overlaps.byPlace).length > 2
              ? ` and ${Object.keys(overlaps.byPlace).length - 2} more`
              : ''}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Trip card ────────────────────────────────────────────────────────────────

function TripCard({
  trip,
  memberProfiles,
  unreadCount = 0,
}: {
  trip: Trip
  memberProfiles: Record<string, { username: string; avatar_url: string | null }>
  unreadCount?: number
}) {
  const router = useRouter()

  const countdown = useMemo(() => {
    if (!trip.start_date) return null
    const start = new Date(trip.start_date)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = Math.round((start.getTime() - now.getTime()) / 86_400_000)
    if (diff < 0) return null
    if (diff === 0) return 'Today!'
    if (diff === 1) return 'Tomorrow'
    return `in ${diff} days`
  }, [trip.start_date])

  const dateLabel = useMemo(() => {
    if (!trip.start_date) return 'Date TBC'
    const start = new Date(trip.start_date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    if (!trip.end_date) return start
    const end = new Date(trip.end_date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return `${start} – ${end}`
  }, [trip.start_date, trip.end_date])

  return (
    <button
      onClick={() => router.push(`/plan/${trip.id}`)}
      className="group w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] hover:border-violet-accent/35 hover:bg-white/[0.05] active:scale-[0.99] transition-all p-4"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-2xl select-none mt-0.5" aria-hidden>
          {trip.icon}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-syne font-bold text-white-soft leading-snug">{trip.title}</h3>
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-pink-accent shrink-0" aria-label="Unread messages" />
            )}
            {countdown && (
              <span className="rounded-full bg-pink-accent/10 border border-pink-accent/20 px-2 py-0.5 text-xs font-semibold text-pink-accent whitespace-nowrap">
                {countdown}
              </span>
            )}
          </div>

          {trip.destination && (
            <p className="text-sm text-lavender mb-1">{trip.destination}</p>
          )}

          <p className="text-xs text-muted mb-3">🗓 {dateLabel}</p>

          {/* Member avatars */}
          {trip.members.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {trip.members.slice(0, 4).map(memberId => {
                  const profile = memberProfiles[memberId]
                  return profile ? (
                    <Avatar
                      key={memberId}
                      avatarUrl={profile.avatar_url}
                      username={profile.username}
                      size={24}
                      className="ring-1 ring-indigo-deep"
                    />
                  ) : null
                })}
              </div>
              {trip.members.length > 4 && (
                <span className="text-xs text-muted">+{trip.members.length - 4}</span>
              )}
            </div>
          )}
        </div>

        <span className="text-muted text-lg group-hover:text-white-soft transition-colors">›</span>
      </div>
    </button>
  )
}

// ─── Create trip sheet ────────────────────────────────────────────────────────

const TRIP_ICONS = ['✈️', '🏖️', '🏔️', '🌆', '🌴', '🎒', '🗺️', '🏕️']

function CreateTripSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [icon, setIcon] = useState('✈️')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    startTransition(async () => {
      const result = await createTrip({
        title,
        destination,
        icon,
        start_date: startDate || null,
        end_date: endDate || null,
      })

      if (result.error) {
        toast.error('Could not create trip.')
        return
      }

      toast.success('Trip created!')
      onClose()
      if (result.id) router.push(`/plan/${result.id}?tab=chat`)
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[#13112a] border-t border-white/10 animate-slide-up max-h-[90dvh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-8">
          <h2 className="font-syne font-bold text-xl text-white-soft mb-5">New Trip</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Icon picker */}
            <div>
              <label className="block text-xs text-muted font-semibold uppercase tracking-wider mb-2">
                Icon
              </label>
              <div className="flex gap-2 flex-wrap">
                {TRIP_ICONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`text-2xl w-11 h-11 rounded-xl border transition-colors ${
                      icon === emoji
                        ? 'border-violet-accent bg-violet-accent/20'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs text-muted font-semibold uppercase tracking-wider mb-1.5">
                Trip Name *
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Bali with the lads"
                required
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3 text-white-soft placeholder:text-muted text-sm focus:outline-none focus:border-violet-accent/60 transition-colors"
              />
            </div>

            {/* Destination */}
            <div>
              <label className="block text-xs text-muted font-semibold uppercase tracking-wider mb-1.5">
                Destination
              </label>
              <input
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="e.g. Bali, Indonesia"
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3 text-white-soft placeholder:text-muted text-sm focus:outline-none focus:border-violet-accent/60 transition-colors"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted font-semibold uppercase tracking-wider mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-3 text-white-soft text-sm focus:outline-none focus:border-violet-accent/60 transition-colors [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs text-muted font-semibold uppercase tracking-wider mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-3 text-white-soft text-sm focus:outline-none focus:border-violet-accent/60 transition-colors [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-muted hover:text-white-soft hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !title.trim()}
                className="flex-1 rounded-xl bg-violet-accent hover:bg-violet-accent/90 disabled:opacity-50 py-3 text-sm font-syne font-semibold text-white-soft transition-colors"
              >
                {isPending ? 'Creating…' : 'Create Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
