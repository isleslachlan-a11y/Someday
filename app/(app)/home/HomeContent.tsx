'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Bell, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { logEvent } from '@/lib/events'
import { logRecommendationEvent, logImpressions } from '@/lib/recommendations'
import { addPlaceToList, removePlaceByPlaceId } from '@/app/actions/bucketList'
import HomeHeroCard from '@/components/HomeHeroCard'
import HomePlaceCard from '@/components/HomePlaceCard'
import type { Place, RecommendedPlace } from '@/lib/types'

// ─── Search prompts ───────────────────────────────────────────────────────────

const SEARCH_PROMPTS = [
  "Somewhere with better weather than here…",
  "A beach where I can ignore my emails…",
  "Overpriced coffee with an incredible view…",
  "Somewhere my passport finally earns its keep…",
  "A place where jetlag is worth it…",
  "Hot springs. Preferably remote. Definitely Instagram-worthy…",
  "Somewhere I'll tell people I discovered…",
  "A market where I'll buy things I don't need…",
  "Hiking trail, moderate difficulty, stunning payoff…",
  "Street food that ruins all future street food…",
  "A city that makes me feel cultured…",
  "Somewhere my out-of-office actually means something…",
  "A sunrise worth a 4am alarm…",
  "Somewhere I'd move to if I wasn't so comfortable…",
  "Chaos, colour, and really good noodles…",
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string
  profile: { username: string; avatar_url: string | null }
  heroPlace: Place | null
  gridPlaces: RecommendedPlace[]
  initialBucketPlaceIds: string[]
  isPersonalised: boolean
  sessionId: string
  isFirstSession: boolean
  isNewUser: boolean
  travelStyle: string[] | null
  startHerePlaces: Place[]
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
          style={{ height: 260, background: '#fcd99a40' }}
        />
      ))}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="font-display font-bold text-[#131936] text-[16px]">
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
  isPersonalised,
  sessionId,
  isFirstSession,
  isNewUser,
  travelStyle,
  startHerePlaces,
}: Props) {
  const router = useRouter()
  const [bucketPlaceIds, setBucketPlaceIds] = useState<string[]>(initialBucketPlaceIds)
  const [searchQuery, setSearchQuery] = useState('')

  // ── Typewriter placeholder ────────────────────────────────────────────────
  const [promptIndex, setPromptIndex] = useState(0)
  const [displayed, setDisplayed]     = useState('')
  const [isTyping, setIsTyping]       = useState(true)

  useEffect(() => {
    setPromptIndex(Math.floor(Math.random() * SEARCH_PROMPTS.length))
  }, [])

  useEffect(() => {
    const target = SEARCH_PROMPTS[promptIndex]

    if (isTyping) {
      if (displayed.length < target.length) {
        const t = setTimeout(() => {
          setDisplayed(target.slice(0, displayed.length + 1))
        }, 45)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setIsTyping(false), 3000)
        return () => clearTimeout(t)
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => {
          setDisplayed(prev => prev.slice(0, -1))
        }, 22)
        return () => clearTimeout(t)
      } else {
        setPromptIndex(prev => (prev + 1) % SEARCH_PROMPTS.length)
        setIsTyping(true)
      }
    }
  }, [displayed, isTyping, promptIndex])

  // ── Infinite scroll state ─────────────────────────────────────────────────
  const [allGridPlaces, setAllGridPlaces] = useState<Place[]>(gridPlaces)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(gridPlaces.length === 12)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Page view
  useEffect(() => {
    logEvent(userId, 'page_viewed', { page: 'home' })
  }, [userId])

  // ── Impression logging (fires once on mount) ──────────────────────────────
  const impressionsLogged = useRef(false)

  useEffect(() => {
    if (impressionsLogged.current) return
    impressionsLogged.current = true
    void logImpressions(userId, gridPlaces, sessionId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load more ─────────────────────────────────────────────────────────────

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const offset = (page + 1) * 12
      let res: Response
      if (isPersonalised) {
        const params = new URLSearchParams({ offset: String(offset), sessionId })
        res = await fetch(`/api/places/recommendations?${params}`)
      } else {
        const params = new URLSearchParams({ offset: String(offset) })
        if (heroPlace?.id) params.set('excludeHeroId', heroPlace.id)
        res = await fetch(`/api/places/feed?${params}`)
      }
      const json = await res.json()
      const newPlaces: Place[] = json.places ?? []
      setAllGridPlaces(prev => [...prev, ...newPlaces])
      setPage(p => p + 1)
      setHasMore(newPlaces.length === 12)
    } catch {
      toast.error('Couldn\'t load more places.')
    } finally {
      setLoadingMore(false)
    }
  }

  // ── Intersection observer for infinite scroll ─────────────────────────────

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [page, hasMore, loadingMore]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save handlers ─────────────────────────────────────────────────────────

  async function handleAdd(place: Place, source: string) {
    const placeId = place.id
    setBucketPlaceIds(prev => (prev.includes(placeId) ? prev : [...prev, placeId]))
    void logEvent(userId, 'place_saved', { place_id: placeId, source })
    const rec = place as RecommendedPlace
    if (rec.recommendation_source) {
      void logRecommendationEvent({
        userId,
        experienceId: placeId,
        eventType: 'saved',
        recommendationSource: rec.recommendation_source,
        sessionId,
        metadata: { source },
      })
    }
    const result = await addPlaceToList(placeId)
    if (result.error) {
      setBucketPlaceIds(prev => prev.filter(id => id !== placeId))
      toast.error('Something went wrong. Please try again.')
    } else {
      toast.success('Added to your list ✦')
    }
  }

  async function handleRemove(place: Place, source: string) {
    const placeId = place.id
    setBucketPlaceIds(prev => prev.filter(id => id !== placeId))
    void logEvent(userId, 'item_removed', { place_id: placeId, source })
    const rec = place as RecommendedPlace
    if (rec.recommendation_source) {
      void logRecommendationEvent({
        userId,
        experienceId: placeId,
        eventType: 'dismissed',
        recommendationSource: rec.recommendation_source,
        sessionId,
        metadata: { source },
      })
    }
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
        <div className="max-w-[480px] mx-auto px-4 h-14 grid grid-cols-3 items-center">
          {/* Left: profile avatar */}
          <div className="flex items-center">
            <Link href="/profile" aria-label="Your profile" className="flex items-center justify-center w-11 h-11">
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
                  <span className="font-display font-bold text-[#f89a14] text-[13px]">{initials}</span>
                </div>
              )}
            </Link>
          </div>

          {/* Centre: wordmark */}
          <div className="flex justify-center">
            <span className="font-display font-bold text-[#131936] text-[18px] tracking-widest uppercase">
              SOMEDAY
            </span>
          </div>

          {/* Right: bell */}
          <div className="flex items-center justify-end">
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="flex items-center justify-center w-11 h-11 rounded-full"
            >
              <Bell size={20} className="text-[#131936]" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <main className="max-w-[480px] mx-auto px-4 pt-4 pb-8">

        {/* First-session welcome banner */}
        {isFirstSession && (
          <div className="mb-5 rounded-2xl bg-[#131936] px-5 py-4 relative overflow-hidden">
            <div className="absolute top-3 right-4 text-[#f89a14] text-[24px] opacity-40 select-none">✦</div>
            <p className="font-display font-bold text-white text-[16px] mb-1">
              Your Someday starts here.
            </p>
            <p className="font-nunito text-white/60 text-[13px] leading-relaxed">
              {travelStyle && travelStyle.length > 0
                ? `We've tailored your feed for ${travelStyle.slice(0, 2).join(' & ')} travellers.`
                : 'Save places as you discover them. Your list builds itself.'
              }
            </p>
            <div className="flex gap-2 mt-3">
              <Link
                href="/discover"
                className="px-4 py-1.5 rounded-full bg-[#f89a14] text-[#131936] font-nunito font-semibold text-[12px]"
              >
                Explore →
              </Link>
              <Link
                href="/list"
                className="px-4 py-1.5 rounded-full bg-white/10 text-white font-nunito font-semibold text-[12px]"
              >
                My list
              </Link>
            </div>
          </div>
        )}

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="mb-5">
          <div className="relative flex items-center gap-2 bg-white rounded-full border border-[#fcd99a] px-4 h-11">
            <Search size={16} className="text-[#f89a14] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              className="flex-1 bg-transparent text-[#131936] text-[14px] font-nunito outline-none h-full"
            />
            {!searchQuery && (
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-[#131936]/40 text-[14px] font-nunito pointer-events-none truncate max-w-[calc(100%-3rem)]">
                {displayed}
                {isTyping && <span className="animate-pulse ml-0.5">|</span>}
              </span>
            )}
          </div>
        </form>

        {/* Hero card */}
        {heroPlace ? (
          <HomeHeroCard
            place={heroPlace}
            isAdded={bucketPlaceIds.includes(heroPlace.id)}
            onAdd={() => handleAdd(heroPlace, 'home_hero')}
            onRemove={() => handleRemove(heroPlace, 'home_hero')}
            userId={userId}
          />
        ) : (
          <HeroSkeleton />
        )}

        {/* Start-here collection for new users */}
        {startHerePlaces.length > 0 && isNewUser && (
          <div className="mt-5 mb-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-[#131936] text-[16px]">Start here</h2>
              <Link href="/discover" className="font-nunito text-[#f89a14] text-[13px]">see all →</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
              {startHerePlaces.map((place, i) => (
                <div key={place.id} className="shrink-0 w-40">
                  <HomePlaceCard
                    place={{ ...place, recommendation_source: 'editorial', recommendation_score: 0 } as RecommendedPlace}
                    isAdded={bucketPlaceIds.includes(place.id)}
                    onAdd={() => handleAdd(place, 'start_here')}
                    onRemove={() => handleRemove(place, 'start_here')}
                    index={i % 4}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bucket list section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-[#131936] text-[18px]">
              {isNewUser ? 'Start building your list' : isPersonalised ? 'Picked for you' : 'For your bucket list'}
            </h2>
            <Link href="/list" className="font-nunito text-[13px] text-[#f89a14]">
              See all →
            </Link>
          </div>
          {isNewUser ? (
            <p className="font-nunito text-[#131936]/40 text-[11px] -mt-3 mb-4">
              Save anything that sparks something. No pressure.
            </p>
          ) : isPersonalised ? (
            <p className="font-nunito text-[#131936]/40 text-[11px] -mt-3 mb-4">
              Based on your travel style
            </p>
          ) : null}

          {allGridPlaces.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {allGridPlaces.map((place, index) => (
                  <HomePlaceCard
                    key={place.id}
                    place={place}
                    isAdded={bucketPlaceIds.includes(place.id)}
                    onAdd={() => handleAdd(place, 'home_grid')}
                    onRemove={() => handleRemove(place, 'home_grid')}
                    index={index % 4}
                  />
                ))}
              </div>

              {/* Sentinel — triggers next page load */}
              {hasMore && (
                <div ref={sentinelRef} className="h-8" />
              )}

              {/* Loading spinner */}
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 rounded-full border-2 border-[#f89a14] border-t-transparent animate-spin" />
                </div>
              )}

              {/* End of feed */}
              {!hasMore && allGridPlaces.length > 0 && (
                <p className="text-center font-nunito text-[#131936]/40 text-[12px] py-6">
                  You&apos;ve seen it all ✦
                </p>
              )}
            </>
          ) : !heroPlace ? (
            <GridSkeleton />
          ) : (
            <EmptyState />
          )}
        </div>

      </main>
    </div>
  )
}
