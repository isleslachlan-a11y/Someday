'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Bell, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { logEvent } from '@/lib/events'
import { addPlaceToList, removePlaceByPlaceId } from '@/app/actions/bucketList'
import HomeHeroCard from '@/components/HomeHeroCard'
import HomePlaceCard from '@/components/HomePlaceCard'
import type { Place } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string
  profile: { username: string; avatar_url: string | null }
  heroPlace: Place | null
  gridPlaces: Place[]
  initialBucketPlaceIds: string[]
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div
      className="rounded-[20px] w-full animate-pulse"
      style={{ height: 220, background: '#fcd99a40' }}
    />
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="rounded-2xl animate-pulse"
          style={{ height: 160, background: '#fcd99a40' }}
        />
      ))}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="font-syne font-bold text-[#131936] text-[16px]">
        Couldn&apos;t load right now
      </p>
      <p className="font-nunito text-[#131936]/60 text-[13px] mt-1">
        Pull to refresh
      </p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeContent({
  userId,
  profile,
  heroPlace,
  gridPlaces,
  initialBucketPlaceIds,
}: Props) {
  const router = useRouter()
  const [bucketPlaceIds, setBucketPlaceIds] = useState<string[]>(initialBucketPlaceIds)
  const [searchQuery, setSearchQuery] = useState('')

  // Page view
  useEffect(() => {
    logEvent(userId, 'page_viewed', { page: 'home' })
  }, [userId])

  // ── Save handlers ─────────────────────────────────────────────────────────

  async function handleAdd(placeId: string, source: string) {
    setBucketPlaceIds(prev => (prev.includes(placeId) ? prev : [...prev, placeId]))
    void logEvent(userId, 'place_saved', { place_id: placeId, source })
    const result = await addPlaceToList(placeId)
    if (result.error) {
      setBucketPlaceIds(prev => prev.filter(id => id !== placeId))
      toast.error('Something went wrong. Please try again.')
    } else {
      toast.success('Added to your list ✦')
    }
  }

  async function handleRemove(placeId: string, source: string) {
    setBucketPlaceIds(prev => prev.filter(id => id !== placeId))
    void logEvent(userId, 'item_removed', { place_id: placeId, source })
    const result = await removePlaceByPlaceId(placeId)
    if (result.error) {
      setBucketPlaceIds(prev => [...prev, placeId])
      toast.error('Something went wrong. Please try again.')
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────

  function handleSearchFocus() {
    void logEvent(userId, 'search_initiated', { source: 'home' })
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) router.push(`/discover?q=${encodeURIComponent(q)}`)
  }

  const initials = profile.username.slice(0, 1).toUpperCase()

  return (
    <div className="min-h-screen bg-[#fff9f0]">

      {/* ── Sticky top bar ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full bg-[#131936] flex items-center justify-center shrink-0"
              aria-hidden
            >
              <span className="text-[#f08c21] text-[14px] leading-none">★</span>
            </div>
            <span className="font-syne font-bold text-[#131936] text-[18px]">someday</span>
          </div>

          {/* Right: bell + avatar */}
          <div className="flex items-center gap-1">
            {/* Bell — no badge (notifications table not yet built) */}
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="flex items-center justify-center w-11 h-11 rounded-full"
            >
              <Bell size={20} className="text-[#131936]" strokeWidth={1.75} />
            </Link>

            {/* Profile avatar */}
            <Link
              href="/profile"
              aria-label="Your profile"
              className="flex items-center justify-center w-11 h-11"
            >
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#131936] flex items-center justify-center">
                  <span className="font-syne font-bold text-[#f08c21] text-[13px]">{initials}</span>
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <main className="max-w-[480px] mx-auto px-4 pt-4 pb-8">

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="mb-5">
          <div className="flex items-center gap-2 bg-white rounded-full border border-[#fcd99a] px-4 h-11">
            <Search size={16} className="text-[#f08c21] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              placeholder="Search bucket-list moments…"
              className="flex-1 bg-transparent text-[#131936] text-[14px] font-nunito placeholder:text-[#131936]/40 outline-none h-full"
            />
          </div>
        </form>

        {/* Hero card */}
        {heroPlace ? (
          <HomeHeroCard
            place={heroPlace}
            isAdded={bucketPlaceIds.includes(heroPlace.id)}
            onAdd={() => handleAdd(heroPlace.id, 'home_hero')}
            onRemove={() => handleRemove(heroPlace.id, 'home_hero')}
            userId={userId}
          />
        ) : (
          <HeroSkeleton />
        )}

        {/* Bucket list grid */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-syne font-bold text-[#131936] text-[18px]">For your bucket list</h2>
            <Link href="/list" className="font-nunito text-[13px] text-[#f08c21]">
              See all →
            </Link>
          </div>

          {gridPlaces.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {gridPlaces.slice(0, 4).map((place, index) => (
                <HomePlaceCard
                  key={place.id}
                  place={place}
                  isAdded={bucketPlaceIds.includes(place.id)}
                  onAdd={() => handleAdd(place.id, 'home_grid')}
                  onRemove={() => handleRemove(place.id, 'home_grid')}
                  index={index}
                />
              ))}
            </div>
          ) : gridPlaces.length === 0 && heroPlace !== null ? (
            <EmptyState />
          ) : (
            <GridSkeleton />
          )}
        </div>

      </main>
    </div>
  )
}
