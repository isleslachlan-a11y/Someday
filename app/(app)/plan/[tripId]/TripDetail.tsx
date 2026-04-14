'use client'

import { useState, useMemo, useTransition, useRef } from 'react'

const TYPE_ICON: Record<string, string> = {
  city: '🏙',
  nature: '🌿',
  experience: '✨',
  food: '🍜',
}
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Avatar from '@/components/Avatar'
import {
  addTripItem,
  removeTripItem,
  voteOnTripItem,
  removeVote,
  searchPlaces,
} from '@/app/actions/trips'
import type { Trip, TripItem, TripItemVote } from '@/lib/types'

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  trip: Trip
  tripItems: TripItem[]
  memberProfiles: Record<string, { username: string; avatar_url: string | null }>
  myListPlaces: { id: string; name: string; country: string; type: string }[]
  userId: string
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function TripDetail({
  trip,
  tripItems: initialItems,
  memberProfiles,
  myListPlaces,
  userId,
}: Props) {
  const router = useRouter()
  const [tripItems, setTripItems] = useState(initialItems)
  const [showAdd, setShowAdd] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Optimistic vote
  function handleVote(tripItemId: string, vote: boolean) {
    const existing = tripItems
      .find(i => i.id === tripItemId)
      ?.votes.find(v => v.user_id === userId)

    // Toggle off if same vote
    if (existing?.vote === vote) {
      setTripItems(prev =>
        prev.map(item =>
          item.id === tripItemId
            ? { ...item, votes: item.votes.filter(v => v.user_id !== userId) }
            : item
        )
      )
      startTransition(async () => {
        const result = await removeVote(tripItemId, trip.id)
        if (result.error) {
          toast.error('Could not update vote.')
          setTripItems(initialItems)
        }
      })
      return
    }

    // Upsert vote optimistically
    const newVote: TripItemVote = {
      id: 'optimistic',
      trip_item_id: tripItemId,
      user_id: userId,
      vote,
      created_at: new Date().toISOString(),
    }
    setTripItems(prev =>
      prev.map(item =>
        item.id === tripItemId
          ? {
              ...item,
              votes: [
                ...item.votes.filter(v => v.user_id !== userId),
                newVote,
              ],
            }
          : item
      )
    )
    startTransition(async () => {
      const result = await voteOnTripItem(tripItemId, trip.id, vote)
      if (result.error) {
        toast.error('Could not save vote.')
        setTripItems(initialItems)
      }
    })
  }

  function handleRemoveItem(tripItemId: string) {
    const snapshot = tripItems
    setTripItems(prev => prev.filter(i => i.id !== tripItemId))
    startTransition(async () => {
      const result = await removeTripItem(tripItemId, trip.id)
      if (result.error) {
        toast.error('Could not remove item.')
        setTripItems(snapshot)
      }
    })
  }

  function handleItemAdded(newItem: TripItem) {
    setTripItems(prev => [...prev, newItem])
    setShowAdd(false)
  }

  // Dates
  const dateLabel = useMemo(() => {
    if (!trip.start_date) return 'Date TBC'
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
    const start = new Date(trip.start_date).toLocaleDateString('en-AU', opts)
    if (!trip.end_date) return start
    const end = new Date(trip.end_date).toLocaleDateString('en-AU', opts)
    return `${start} – ${end}`
  }, [trip.start_date, trip.end_date])

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

  return (
    <>
      {/* Back nav */}
      <button
        onClick={() => router.push('/plan')}
        className="flex items-center gap-1 text-muted hover:text-white-soft text-sm mb-6 transition-colors"
      >
        ‹ Plan
      </button>

      {/* ── Trip header ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl select-none" aria-hidden>
            {trip.icon}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="font-syne text-2xl font-bold text-white-soft leading-snug">
              {trip.title}
            </h1>
            {trip.destination && (
              <p className="text-lavender text-sm mt-0.5">{trip.destination}</p>
            )}
          </div>
          {countdown && (
            <span className="shrink-0 rounded-full bg-pink-accent/10 border border-pink-accent/20 px-2.5 py-1 text-xs font-semibold text-pink-accent">
              {countdown}
            </span>
          )}
        </div>

        {/* Date */}
        <p className="text-xs text-muted flex items-center gap-1.5 mb-4">
          <span aria-hidden>🗓</span>
          {dateLabel}
        </p>

        {/* Members */}
        {trip.members.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {trip.members.slice(0, 5).map(memberId => {
                const profile = memberProfiles[memberId]
                return profile ? (
                  <Avatar
                    key={memberId}
                    avatarUrl={profile.avatar_url}
                    username={profile.username}
                    size={28}
                    className="ring-1 ring-indigo-deep"
                  />
                ) : null
              })}
            </div>
            <span className="text-xs text-muted">
              {trip.members.length} member{trip.members.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Map placeholder ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden mb-6 h-36 bg-gradient-to-br from-violet-accent/20 via-indigo-deep to-pink-accent/10 border border-white/10 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-1" aria-hidden>
            🗺️
          </p>
          <p className="text-xs text-muted">Map view — coming soon</p>
        </div>
      </div>

      {/* ── Experiences ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-syne font-bold text-white-soft">Experiences</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs font-semibold text-lavender hover:text-white-soft transition-colors flex items-center gap-1"
          >
            + Add
          </button>
        </div>

        {tripItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
            <p className="text-3xl mb-3">🌍</p>
            <p className="text-white-soft font-syne font-bold mb-1">No experiences yet</p>
            <p className="text-muted text-sm mb-4">
              Add places you want to visit on this trip.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-xl bg-violet-accent hover:bg-violet-accent/90 px-4 py-2 text-sm font-syne font-semibold text-white-soft transition-colors"
            >
              Add first experience
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tripItems.map(item => (
              <ExperienceCard
                key={item.id}
                item={item}
                userId={userId}
                isOwner={item.added_by === userId}
                onVote={vote => handleVote(item.id, vote)}
                onRemove={() => handleRemoveItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Trip chat placeholder ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-syne font-bold text-white-soft mb-2">Trip Chat</h2>
        <p className="text-muted text-sm">Group messaging is coming soon.</p>
      </div>

      {/* Add experience sheet */}
      {showAdd && (
        <AddExperienceSheet
          tripId={trip.id}
          myListPlaces={myListPlaces}
          existingPlaceIds={new Set(tripItems.map(i => i.place_id))}
          userId={userId}
          onAdded={handleItemAdded}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  )
}

// ─── Experience card ──────────────────────────────────────────────────────────

function ExperienceCard({
  item,
  userId,
  isOwner,
  onVote,
  onRemove,
}: {
  item: TripItem
  userId: string
  isOwner: boolean
  onVote: (vote: boolean) => void
  onRemove: () => void
}) {
  const [confirmRemove, setConfirmRemove] = useState(false)

  const upCount = item.votes.filter(v => v.vote).length
  const downCount = item.votes.filter(v => !v.vote).length
  const myVote = item.votes.find(v => v.user_id === userId)?.vote

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      {/* Place info */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-xl select-none mt-0.5" aria-hidden>
          {TYPE_ICON[item.place.type] ?? '✦'}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-syne font-bold text-white-soft leading-snug">{item.place.name}</h3>
          <p className="text-xs text-muted">{item.place.country}</p>
          {item.proposed_date && (
            <p className="text-xs text-muted mt-0.5">
              📅{' '}
              {new Date(item.proposed_date).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
              })}
            </p>
          )}
        </div>

        {/* Remove button (owner only) */}
        {isOwner && !confirmRemove && (
          <button
            onClick={() => setConfirmRemove(true)}
            className="text-muted hover:text-white-soft text-lg transition-colors"
            aria-label="Remove"
          >
            ×
          </button>
        )}
      </div>

      {/* Confirm remove */}
      {confirmRemove && (
        <div className="flex gap-2 mb-3 text-sm">
          <span className="text-muted flex-1">Remove this place?</span>
          <button
            onClick={onRemove}
            className="text-pink-accent font-semibold hover:text-pink-accent/80 transition-colors"
          >
            Remove
          </button>
          <button
            onClick={() => setConfirmRemove(false)}
            className="text-muted hover:text-white-soft transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Votes */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onVote(true)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border transition-colors ${
            myVote === true
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-white/5 border-white/10 text-muted hover:border-white/25 hover:text-white-soft'
          }`}
        >
          👍 {upCount > 0 && <span>{upCount}</span>}
        </button>
        <button
          onClick={() => onVote(false)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border transition-colors ${
            myVote === false
              ? 'bg-red-500/20 border-red-500/40 text-red-400'
              : 'bg-white/5 border-white/10 text-muted hover:border-white/25 hover:text-white-soft'
          }`}
        >
          👎 {downCount > 0 && <span>{downCount}</span>}
        </button>
      </div>
    </div>
  )
}

// ─── Add experience sheet ─────────────────────────────────────────────────────

function AddExperienceSheet({
  tripId,
  myListPlaces,
  existingPlaceIds,
  userId,
  onAdded,
  onClose,
}: {
  tripId: string
  myListPlaces: { id: string; name: string; country: string; type: string }[]
  existingPlaceIds: Set<string>
  userId: string
  onAdded: (item: TripItem) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; country: string; type: string }[]
  >([])
  const [isSearching, setIsSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter my list locally
  const filteredMyList = useMemo(() => {
    if (!query.trim()) return myListPlaces
    const q = query.toLowerCase()
    return myListPlaces.filter(
      p => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q)
    )
  }, [myListPlaces, query])

  // Debounced search of all places
  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      const result = await searchPlaces(value)
      setSearchResults(
        (result.data ?? []).filter(
          p =>
            !existingPlaceIds.has(p.id) &&
            !myListPlaces.some(m => m.id === p.id)
        )
      )
      setIsSearching(false)
    }, 350)
  }

  async function handleAdd(placeId: string, placeName: string) {
    setAdding(placeId)
    const result = await addTripItem(tripId, placeId)
    setAdding(null)

    if (result.error) {
      toast.error('Could not add experience.')
      return
    }

    // Build a minimal TripItem for optimistic UI
    const place = [...myListPlaces, ...searchResults].find(p => p.id === placeId)
    if (!place) {
      onClose()
      return
    }

    const newItem: TripItem = {
      id: result.id ?? 'optimistic',
      trip_id: tripId,
      place_id: placeId,
      proposed_date: null,
      added_by: userId,
      created_at: new Date().toISOString(),
      place: {
        id: placeId,
        name: place.name,
        country: place.country,
        type: place.type,
        description: null,
        tags: null,
        vibes: null,
        intensity: null,
        image_keyword: null,
      },
      votes: [],
    }
    onAdded(newItem)
    toast.success(`${place.name} added!`)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} aria-hidden />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[#13112a] border-t border-white/10 animate-slide-up max-h-[85dvh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-2 shrink-0">
          <h2 className="font-syne font-bold text-xl text-white-soft mb-4">Add Experience</h2>

          {/* Search */}
          <input
            autoFocus
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Search destinations…"
            className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3 text-white-soft placeholder:text-muted text-sm focus:outline-none focus:border-violet-accent/60 transition-colors mb-4"
          />
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 px-5 pb-8">
          {/* From my list */}
          {filteredMyList.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">
                From your list
              </p>
              <div className="space-y-2">
                {filteredMyList.map(place => (
                  <PlaceAddRow
                    key={place.id}
                    place={place}
                    isAdding={adding === place.id}
                    onAdd={() => handleAdd(place.id, place.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Search results */}
          {query.trim() && (
            <div>
              <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">
                {isSearching ? 'Searching…' : 'All destinations'}
              </p>
              {!isSearching && searchResults.length === 0 && (
                <p className="text-muted text-sm py-4 text-center">No results for "{query}"</p>
              )}
              <div className="space-y-2">
                {searchResults.map(place => (
                  <PlaceAddRow
                    key={place.id}
                    place={place}
                    isAdding={adding === place.id}
                    onAdd={() => handleAdd(place.id, place.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {!query.trim() && filteredMyList.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted text-sm">
                Search for a destination above to add it to this trip.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function PlaceAddRow({
  place,
  isAdding,
  onAdd,
}: {
  place: { id: string; name: string; country: string; type: string }
  isAdding: boolean
  onAdd: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="text-lg select-none" aria-hidden>
        {TYPE_ICON[place.type] ?? '✦'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-white-soft text-sm font-semibold truncate">{place.name}</p>
        <p className="text-xs text-muted">{place.country}</p>
      </div>
      <button
        onClick={onAdd}
        disabled={isAdding}
        className="shrink-0 rounded-lg bg-violet-accent hover:bg-violet-accent/90 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white-soft transition-colors"
      >
        {isAdding ? '…' : '+ Add'}
      </button>
    </div>
  )
}
