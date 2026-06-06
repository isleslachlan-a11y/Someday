'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { logEvent } from '@/lib/events'
import { addPlaceToList, removePlaceByPlaceId } from '@/app/actions/bucketList'
import DiscoverPlaceCard from '@/components/DiscoverPlaceCard'
import type { Place } from '@/lib/types'

// ── Category definitions ───────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'asia',        label: 'Asia',        filter: (p: Place) => p.region === 'Asia' },
  { id: 'europe',      label: 'Europe',      filter: (p: Place) => p.region === 'Europe' },
  { id: 'americas',    label: 'Americas',    filter: (p: Place) => p.region === 'Americas' },
  { id: 'africa',      label: 'Africa',      filter: (p: Place) => p.region === 'Africa' },
  { id: 'oceania',     label: 'Oceania',     filter: (p: Place) => p.region === 'Oceania' },
  { id: 'adventure',   label: 'Adventure',   filter: (p: Place) => (p.vibes ?? []).includes('Adventure') },
  { id: 'romantic',    label: 'Romantic',    filter: (p: Place) => (p.vibes ?? []).includes('Romantic') },
  { id: 'foodie',      label: 'Foodie',      filter: (p: Place) => (p.vibes ?? []).includes('Foodie') || p.primary_category?.slug === 'food-drink' },
  { id: 'epic',        label: 'Epic',        filter: (p: Place) => (p.vibes ?? []).includes('Epic') },
  { id: 'nature',      label: 'Nature',      filter: (p: Place) => p.primary_category?.slug === 'nature-wilderness' },
  { id: 'cities',      label: 'Cities',      filter: (p: Place) => p.type === 'destination' && p.primary_category?.slug === 'city-escapes' },
  { id: 'experiences', label: 'Experiences', filter: (p: Place) => p.type === 'experience' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type PersonProfile = { id: string; username: string; avatar_url: string | null }

export interface DiscoverCollection {
  id: string
  slug: string
  name: string
  description: string | null
  type: string
}

interface Props {
  places: Place[]
  friendProfiles: PersonProfile[]
  creators: PersonProfile[]
  userId: string
  initialSavedIds: string[]
  initialQuery: string
  collections: DiscoverCollection[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DiscoverContent({
  places,
  friendProfiles,
  creators,
  userId,
  initialSavedIds,
  initialQuery,
  collections,
}: Props) {
  const collectionMap = new Map(collections.map(c => [c.slug, c]))
  const [savedIds, setSavedIds]           = useState<Set<string>>(new Set(initialSavedIds))
  const scrollRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  function setScrollRef(id: string, el: HTMLDivElement | null) {
    if (el) {
      scrollRefs.current.set(id, el)
      el.scrollLeft = 0
    }
  }
  const [searchQuery, setSearchQuery]     = useState(initialQuery)
  const [searchResults, setSearchResults] = useState<Place[] | null>(null)

  // Page view event
  useEffect(() => {
    void logEvent(userId, 'page_viewed', { page: 'discover' })
  }, [userId])

  // Search: filter immediately, log after 1 s
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim()

    if (!q) {
      setSearchResults(null)
      return
    }

    const results = places.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q) ||
      p.region?.toLowerCase().includes(q) ||
      (p.tags ?? []).some(t => t.toLowerCase().includes(q)) ||
      (p.vibes ?? []).some(v => v.toLowerCase().includes(q))
    )
    setSearchResults(results)

    const logTimer = setTimeout(() => {
      void logEvent(userId, 'search_initiated', { source: 'discover', query: searchQuery })
    }, 1000)

    return () => clearTimeout(logTimer)
  }, [searchQuery, places, userId])

  // ── Save handler ────────────────────────────────────────────────────────────

  async function handleSave(placeId: string) {
    const isNowSaved = !savedIds.has(placeId)
    setSavedIds(prev => {
      const next = new Set(prev)
      isNowSaved ? next.add(placeId) : next.delete(placeId)
      return next
    })
    void logEvent(userId, isNowSaved ? 'place_saved' : 'item_removed',
      { place_id: placeId, source: 'discover' })
    const result = isNowSaved
      ? await addPlaceToList(placeId)
      : await removePlaceByPlaceId(placeId)
    if (result.error) {
      setSavedIds(prev => {
        const next = new Set(prev)
        isNowSaved ? next.delete(placeId) : next.add(placeId)
        return next
      })
      toast.error('Something went wrong.')
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const allPeople = [
    ...friendProfiles,
    ...creators.filter(c => !friendProfiles.some(f => f.id === c.id)),
  ].slice(0, 10)

  const isSearching = searchQuery.trim().length > 0

  return (
    <div className="max-w-[480px] mx-auto px-4 pt-4 pb-24">

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 bg-white rounded-full border border-[#fcd99a] px-4 h-11">
        <Search size={16} className="text-[#f08c21] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search destinations, countries, vibes…"
          className="flex-1 bg-transparent text-[#131936] text-[14px] font-nunito outline-none h-full"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="w-6 h-6 flex items-center justify-center text-[#131936]/40 font-nunito text-[14px] shrink-0"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {isSearching ? (
        /* ── Search results ─────────────────────────────────────────────────── */
        <div className="mt-4">
          <p className="font-nunito text-[#131936]/50 text-[13px] mb-4">
            {searchResults?.length ?? 0} result{searchResults?.length !== 1 ? 's' : ''}{' '}
            for &ldquo;{searchQuery}&rdquo;
          </p>
          {searchResults && searchResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {searchResults.map((place, index) => (
                <DiscoverPlaceCard
                  key={place.id}
                  place={place}
                  isSaved={savedIds.has(place.id)}
                  onSave={() => handleSave(place.id)}
                  index={index % 4}
                  gridMode
                />
              ))}
            </div>
          ) : searchResults !== null ? (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="font-brice font-bold text-[#131936] text-[16px]">No results</p>
              <p className="font-nunito text-[#131936]/50 text-[13px] mt-1">Try a different search</p>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {/* ── People row ────────────────────────────────────────────────── */}
          <p className="font-brice font-bold text-[#131936] text-[15px] mt-5 mb-3">People</p>
          {allPeople.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
              {allPeople.map(person => (
                <Link
                  key={person.id}
                  href={`/profile/${person.username}`}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-16"
                >
                  {person.avatar_url ? (
                    <Image
                      src={person.avatar_url}
                      alt={person.username}
                      width={56}
                      height={56}
                      className="rounded-full object-cover border-2 border-[#fcd99a]"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#131936] border-2 border-[#fcd99a] flex items-center justify-center">
                      <span className="font-brice font-bold text-[#f08c21] text-[18px]">
                        {person.username.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="font-nunito text-[#131936] text-[11px] text-center leading-tight truncate w-full">
                    {person.username}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="font-nunito text-[#131936]/40 text-[13px] text-center py-2">
              Follow travellers to see them here
            </p>
          )}

          {/* ── Category sections ─────────────────────────────────────────── */}
          {CATEGORIES.map(category => {
            const categoryPlaces = places.filter(category.filter)
            if (categoryPlaces.length < 3) return null
            return (
              <section key={category.id} className="mt-6">
                {(() => {
                  const col = collectionMap.get(category.id)
                  return (
                    <div className="mb-3">
                      <div className="flex items-center justify-between">
                        <h2 className="font-brice font-bold text-[#131936] text-[16px]">
                          {category.label}
                        </h2>
                        {col ? (
                          <Link
                            href={`/discover/collections/${col.slug}`}
                            className="font-nunito text-[#f08c21] text-[13px]"
                          >
                            see all →
                          </Link>
                        ) : (
                          <button
                            onClick={() => setSearchQuery(category.label.toLowerCase())}
                            className="font-nunito text-[#f08c21] text-[13px]"
                          >
                            see all →
                          </button>
                        )}
                      </div>
                      {col?.description && (
                        <p className="font-nunito text-[#131936]/50 text-[13px] mt-0.5">
                          {col.description}
                        </p>
                      )}
                    </div>
                  )
                })()}
                <div
                  ref={el => setScrollRef(category.id, el)}
                  className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none"
                >
                  {categoryPlaces.slice(0, 6).map((place, index) => (
                    <DiscoverPlaceCard
                      key={place.id}
                      place={place}
                      isSaved={savedIds.has(place.id)}
                      onSave={() => handleSave(place.id)}
                      index={index}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </>
      )}

      {/* ── Shooting star footer ──────────────────────────────────────── */}
      <div className="mt-12 mb-6 flex flex-col items-center gap-3">
        <div className="relative w-full flex items-center justify-center h-8 overflow-hidden">
          <div className="flex items-center gap-1">
            <span className="text-[#fcd99a] text-[10px] opacity-30">·</span>
            <span className="text-[#fcd99a] text-[10px] opacity-50">·</span>
            <span className="text-[#fcd99a] text-[12px] opacity-70">·</span>
            <span className="text-[#f08c21] text-[20px]">★</span>
            <span className="text-[#fcd99a] text-[12px] opacity-70">·</span>
            <span className="text-[#fcd99a] text-[10px] opacity-50">·</span>
            <span className="text-[#fcd99a] text-[10px] opacity-30">·</span>
          </div>
        </div>
        <p className="font-nunito text-[#131936]/40 text-[13px] text-center">
          See what&apos;s suggested for you
        </p>
        <Link
          href="/home"
          className="flex items-center gap-1.5 font-nunito font-semibold text-[#f08c21] text-[14px] hover:opacity-80 transition-opacity"
        >
          Back to home
          <span className="text-[16px]">→</span>
        </Link>
      </div>
    </div>
  )
}

