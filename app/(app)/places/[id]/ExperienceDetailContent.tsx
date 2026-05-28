'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, Heart, Share2, Bookmark, MapPin, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { logEvent } from '@/lib/events'
import { addPlaceToList, removePlaceByPlaceId } from '@/app/actions/bucketList'
import { parseBestTimeToMonths } from '@/lib/bestTimeParser'
import Avatar from '@/components/Avatar'
import type { Place } from '@/lib/types'
import type { FriendVisitor, Activity } from './PlaceDetailContent'

// ── Derived value helpers ──────────────────────────────────────────────────────

function getDuration(intensity: string | null): string {
  if (intensity === 'low') return '1-2 days'
  if (intensity === 'medium') return '3-5 days'
  if (intensity === 'high') return '5-7 days'
  return 'Varies'
}

function getBestMonth(tags: string[] | null): string {
  const t = tags ?? []
  if (t.includes('winter')) return 'Dec–Feb'
  if (t.includes('summer')) return 'Jun–Aug'
  if (t.includes('spring')) return 'Mar–May'
  if (t.includes('autumn')) return 'Sep–Nov'
  return 'Year-round'
}

function getCost(popularity: number): string {
  if (popularity >= 70) return '$$$'
  if (popularity >= 40) return '$$'
  return '$'
}

function getSeasonalBadge(tags: string[] | null, type: string): string {
  const t = tags ?? []
  const seasonMap: Record<string, string> = {
    winter: 'Dec', summer: 'Jun', spring: 'Mar', autumn: 'Sep', seasonal: 'Peak',
  }
  const season = Object.keys(seasonMap).find(s => t.includes(s))
  if (season) return `✦ Seasonal · ${seasonMap[season]}`
  const capitalised = type.charAt(0).toUpperCase() + type.slice(1)
  return `✦ ${capitalised} experience`
}

function getFestiveBadge(tags: string[] | null, vibes: string[] | null): string {
  const t = tags ?? []
  if (t.includes('festive') || t.includes('christmas') || t.includes('holiday')) {
    return '🎄 Festive Pick'
  }
  return vibes?.[0] ?? 'Must-do'
}

const STEP_SUBTITLES = [
  'Getting there · first stop',
  'Main experience · half day',
  'Local culture · evening',
  'Final day · departure',
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  place: Place
  userId: string
  initialIsSaved: boolean
  similarPlaces: Place[]
  statePlaces?: Place[]
  collectionContext?: { name: string; places: Place[] } | null
  friendVisitors: FriendVisitor[]
  activities?: Activity[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExperienceDetailContent({
  place,
  userId,
  initialIsSaved,
  similarPlaces,
  statePlaces = [],
  collectionContext = null,
  friendVisitors,
  activities = [],
}: Props) {
  const router = useRouter()
  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [descExpanded, setDescExpanded] = useState(false)
  const [activeDot, setActiveDot] = useState(0)
  const [savedSimilarIds, setSavedSimilarIds] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEvent(userId, 'page_viewed', { page: 'experience_detail', place_id: place.id })
  }, [userId, place.id])

  async function handleAdd() {
    setIsSaved(true)
    void logEvent(userId, 'place_saved', { place_id: place.id, source: 'experience_detail' })
    const result = await addPlaceToList(place.id)
    if (result.error) {
      setIsSaved(false)
      toast.error('Something went wrong.')
    } else {
      toast.success('Added to your Someday ✦')
    }
  }

  async function handleRemove() {
    setIsSaved(false)
    void logEvent(userId, 'item_removed', { place_id: place.id, source: 'experience_detail' })
    const result = await removePlaceByPlaceId(place.id)
    if (result.error) {
      setIsSaved(true)
      toast.error('Something went wrong.')
    }
  }

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: place.name, url }) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied!')
    }
  }

  async function handleSaveSimilar(placeId: string) {
    setSavedSimilarIds(prev => new Set([...prev, placeId]))
    void logEvent(userId, 'place_saved', { place_id: placeId, source: 'experience_similar' })
    const result = await addPlaceToList(placeId)
    if (result.error) {
      setSavedSimilarIds(prev => { const s = new Set(prev); s.delete(placeId); return s })
      toast.error('Something went wrong.')
    }
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const ratio = el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth)
    setActiveDot(Math.round(ratio * 2))
  }

  // Derived values
  const duration = getDuration(place.intensity)
  const bestMonth = (() => {
    const parsed = parseBestTimeToMonths(place.best_time)
    if (parsed) {
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      return [...parsed.peak].map(m => monthNames[m]).join('–')
    }
    return getBestMonth(place.tags)
  })()
  const cost = getCost(place.popularity)
  const seasonalBadge = getSeasonalBadge(place.tags, place.type)
  const festiveBadge = getFestiveBadge(place.tags, place.vibes)
  const vibe = place.vibes?.[0] ?? place.type
  const vibeLabel = vibe.charAt(0).toUpperCase() + vibe.slice(1)
  const location = place.state_province ? `${place.state_province}, ${place.country}` : place.country
  const steps = (place.tags ?? []).slice(0, 4)
  const countryCount = similarPlaces.filter(sp => sp.country === place.country).length

  return (
    <div className="min-h-screen bg-[#fff9f0]">

      {/* ── Full-bleed hero ────────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 300, background: 'linear-gradient(135deg, #f08c21 0%, #f5b05a 50%, #fcd99a 100%)' }}
      >
        {place.image_url && (
          <Image
            src={place.image_url}
            alt={place.name}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

        {/* Top-left: back + share */}
        <div className="absolute top-12 left-4 flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center"
            aria-label="Go back"
          >
            <ChevronLeft size={20} className="text-[#131936]" />
          </button>
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center"
            aria-label="Share"
          >
            <Share2 size={18} className="text-[#131936]" />
          </button>
        </div>

        {/* Top-right: heart + bookmark */}
        <div className="absolute top-12 right-4 flex items-center gap-2">
          <button
            onClick={isSaved ? handleRemove : handleAdd}
            className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center"
            aria-label={isSaved ? 'Remove from list' : 'Save to list'}
          >
            <Heart
              size={18}
              className={isSaved ? 'text-[#f08c21]' : 'text-[#131936]'}
              fill={isSaved ? '#f08c21' : 'transparent'}
            />
          </button>
          <button
            onClick={isSaved ? handleRemove : handleAdd}
            className="w-10 h-10 rounded-full bg-[#f08c21] flex items-center justify-center"
            aria-label={isSaved ? 'Remove from list' : 'Save to list'}
          >
            <Bookmark size={18} className="text-white" />
          </button>
        </div>

        {/* Bottom-left: seasonal badge */}
        <div className="absolute bottom-20 left-4">
          <span className="bg-white/90 text-[#131936] font-nunito text-[12px] font-semibold px-3 py-1.5 rounded-full">
            {seasonalBadge}
          </span>
        </div>
      </div>

      {/* ── White content sheet ────────────────────────────────────────────── */}
      <div className="bg-white rounded-t-3xl -mt-16 relative z-10 pb-48">

        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-[#131936]/20 mx-auto mt-3 mb-4" />

        <div className="max-w-[480px] mx-auto">

          {/* ── Identity block ─────────────────────────────────────────────── */}
          <div className="px-5">
            <h1 className="font-syne font-bold text-[#131936] text-[26px] leading-tight">
              {place.name}
            </h1>

            {location && (
              <p className="flex items-center gap-1 font-nunito text-[13px] text-[#131936]/60 mt-1">
                <MapPin size={14} className="text-[#f08c21] shrink-0" />
                {location}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="font-nunito text-[13px] text-[#131936]">
                <span className="text-[#f08c21]">★</span> 4.8
              </span>
              <span className="font-nunito text-[13px] text-[#131936]/50">(1,902 reviews)</span>
              <span className="text-[#131936]/30">·</span>
              <span className="bg-[#fcd99a] text-[#131936] font-nunito text-[11px] px-2 py-0.5 rounded-full">
                {festiveBadge}
              </span>
            </div>
          </div>

          {/* ── Quick info tiles ───────────────────────────────────────────── */}
          <div className="flex gap-2 px-5 mt-4">
            {[
              { value: duration, label: 'Duration' },
              { value: vibeLabel, label: 'Vibe' },
              { value: bestMonth, label: 'Best month' },
              { value: cost, label: 'Cost' },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="bg-[#fff9f0] rounded-2xl p-3 flex-1 text-center border border-[#fcd99a]/50"
              >
                <p className="font-syne font-bold text-[#131936] text-[15px] leading-tight">{value}</p>
                <p className="font-nunito text-[#131936]/50 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Friends who've done this ───────────────────────────────────── */}
          <div className="px-5 mt-6">
            <div className="bg-[#fff9f0] rounded-2xl p-4 border border-[#fcd99a]/40">
              {friendVisitors.length > 0 ? (
                <>
                  <div className="flex items-center gap-3">
                    {/* Avatar stack */}
                    <div className="flex items-center shrink-0">
                      {friendVisitors.slice(0, 3).map((f, i) => (
                        <div
                          key={f.id}
                          className="rounded-full border-2 border-white"
                          style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i, position: 'relative', width: 36, height: 36 }}
                        >
                          <Avatar avatarUrl={f.avatar_url} username={f.username} size={36} />
                        </div>
                      ))}
                      {friendVisitors.length > 3 && (
                        <div
                          className="w-9 h-9 rounded-full bg-[#fcd99a] flex items-center justify-center border-2 border-white"
                          style={{ marginLeft: -8, position: 'relative', zIndex: 0 }}
                        >
                          <span className="font-nunito font-bold text-[#131936] text-[11px]">
                            +{friendVisitors.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-syne font-bold text-[#131936] text-[14px]">
                        {friendVisitors.length} friend{friendVisitors.length !== 1 ? 's' : ''} spent time here
                      </p>
                      <Link href="/plan" className="font-nunito text-[#f08c21] text-[12px] mt-0.5 block">
                        Tap to read their notes →
                      </Link>
                    </div>
                  </div>
                  {(place.vibes ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(place.vibes ?? []).map(v => (
                        <span key={v} className="bg-[#fcd99a]/60 text-[#131936] font-nunito text-[11px] px-2.5 py-1 rounded-full">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="font-nunito text-[#131936]/40 text-[13px] text-center py-2">
                  Be the first of your friends to do this
                </p>
              )}
            </div>
          </div>

          {/* ── About this experience ──────────────────────────────────────── */}
          {place.description && (
            <div className="px-5 mt-6">
              <h2 className="font-syne font-bold text-[#131936] text-[17px]">About this experience</h2>
              <p className={`font-nunito text-[14px] text-[#131936]/70 leading-relaxed mt-2 ${descExpanded ? '' : 'line-clamp-3'}`}>
                {place.description}
              </p>
              {place.description.length > 120 && (
                <button
                  onClick={() => setDescExpanded(v => !v)}
                  className="mt-1 font-nunito text-[13px] text-[#f08c21] font-medium min-h-[44px] flex items-center"
                >
                  {descExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* ── Categories ─────────────────────────────────────────────────── */}
          {(place.tags ?? []).length > 0 && (
            <div className="px-5 mt-6">
              <h2 className="font-syne font-bold text-[#131936] text-[17px]">Categories</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {(place.tags ?? []).map(tag => (
                  <span
                    key={tag}
                    className="bg-[#131936] text-white font-nunito text-[12px] px-3 py-1.5 rounded-full capitalize"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── What to expect ─────────────────────────────────────────────── */}
          {steps.length > 0 && (
            <div className="px-5 mt-6">
              <div className="flex items-center justify-between">
                <h2 className="font-syne font-bold text-[#131936] text-[17px]">What to expect</h2>
                <Link href="/discover" className="font-nunito text-[#f08c21] text-[13px]">
                  Full guide →
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {steps.map((tag, i) => (
                  <div key={tag} className="bg-white rounded-2xl p-3 flex items-center gap-3 border border-[#fcd99a]/40">
                    <div className="w-9 h-9 rounded-full bg-[#fcd99a]/60 flex items-center justify-center shrink-0">
                      <span className="font-syne font-bold text-[#131936] text-[14px]">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-syne font-bold text-[#131936] text-[14px] capitalize">{tag}</p>
                      <p className="font-nunito text-[#131936]/50 text-[12px]">{STEP_SUBTITLES[i]}</p>
                    </div>
                    <ChevronRight size={16} className="text-[#131936]/30 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── What to do here (activities) ──────────────────────────────── */}
          {activities.length > 0 && (
            <div className="px-5 mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-syne font-bold text-[#131936] text-[17px]">What to do here</h2>
                <span className="font-nunito text-[#131936]/40 text-[12px]">
                  {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                </span>
              </div>
              <div className="space-y-2">
                {activities.slice(0, 4).map((activity, i) => (
                  <div
                    key={activity.id}
                    className="bg-white rounded-2xl p-3 flex items-center gap-3 border border-[#fcd99a]/40"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#fcd99a]/60 flex items-center justify-center shrink-0">
                      <span className="font-syne font-bold text-[#131936] text-[14px]">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-syne font-bold text-[#131936] text-[14px] leading-tight">
                        {activity.name}
                      </p>
                      <p className="font-nunito text-[#131936]/50 text-[12px] mt-0.5">
                        {[activity.category, activity.duration].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {activity.rating && (
                      <span className="font-nunito text-[12px] text-[#f08c21] shrink-0">
                        ★ {activity.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Discover country banner ────────────────────────────────────── */}
          <div className="px-5 mt-6">
            <Link
              href={`/discover?country=${encodeURIComponent(place.country)}`}
              className="block bg-[#131936] rounded-2xl p-5 relative overflow-hidden"
            >
              <div className="absolute right-4 top-4 w-16 h-16 rounded-full bg-[#f08c21]/20" />
              <p className="font-nunito text-[#fcd99a]/60 text-[10px] font-semibold tracking-widest uppercase">
                DISCOVER COUNTRY →
              </p>
              <p className="font-syne font-bold text-white text-[22px] mt-1">{place.country}</p>
              <p className="font-nunito text-[#fcd99a]/60 text-[12px] mt-0.5">
                {countryCount} more experience{countryCount !== 1 ? 's' : ''} · {place.popularity} saves
              </p>
            </Link>
          </div>

          {/* ── More in {state_province} ──────────────────────────────────────── */}
          {statePlaces.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between px-5 mb-3">
                <h2 className="font-syne font-bold text-[#131936] text-[17px]">
                  More in {place.state_province}
                </h2>
                <Link href={`/discover?country=${encodeURIComponent(place.country)}`} className="font-nunito text-[#f08c21] text-[13px]">
                  Explore →
                </Link>
              </div>
              <div
                className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5"
                style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
              >
                {statePlaces.map(sp => (
                  <ExpSimilarCard
                    key={sp.id}
                    place={sp}
                    isSaved={savedSimilarIds.has(sp.id)}
                    onSave={() => void handleSaveSimilar(sp.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── More like this (same category) ────────────────────────────────── */}
          {similarPlaces.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between px-5 mb-3">
                <h2 className="font-syne font-bold text-[#131936] text-[17px]">More like this</h2>
                <Link href={`/discover?type=${encodeURIComponent(place.type)}`} className="font-nunito text-[#f08c21] text-[13px]">
                  See all →
                </Link>
              </div>
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5"
                style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
              >
                {similarPlaces.map(sp => (
                  <ExpSimilarCard
                    key={sp.id}
                    place={sp}
                    isSaved={savedSimilarIds.has(sp.id)}
                    onSave={() => void handleSaveSimilar(sp.id)}
                  />
                ))}
              </div>
              <div className="flex justify-center gap-1.5 mt-2">
                {[0, 1, 2].map(dot => (
                  <div
                    key={dot}
                    className={`rounded-full transition-all duration-200 ${
                      activeDot === dot ? 'w-4 h-1.5 bg-[#f08c21]' : 'w-1.5 h-1.5 bg-[#131936]/20'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── More from {collection} ─────────────────────────────────────────── */}
          {collectionContext && collectionContext.places.length > 0 && (
            <div className="mt-6">
              <div className="px-5 mb-3">
                <h2 className="font-syne font-bold text-[#131936] text-[17px]">
                  More from {collectionContext.name}
                </h2>
              </div>
              <div
                className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5"
                style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
              >
                {collectionContext.places.map(sp => (
                  <ExpSimilarCard
                    key={sp.id}
                    place={sp}
                    isSaved={savedSimilarIds.has(sp.id)}
                    onSave={() => void handleSaveSimilar(sp.id)}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Fixed bottom CTA bar ────────────────────────────────────────────── */}
      <div
        className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-white border-t border-[#fcd99a]/50 px-5 py-3 z-40"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="max-w-[480px] mx-auto flex items-center gap-3">
          {/* Heart */}
          <button
            onClick={isSaved ? handleRemove : handleAdd}
            className="w-12 h-12 rounded-full bg-white border border-[#fcd99a] flex items-center justify-center shrink-0"
            aria-label={isSaved ? 'Remove from list' : 'Save to list'}
          >
            <Heart
              size={20}
              className={isSaved ? 'text-[#f08c21]' : 'text-[#131936]'}
              fill={isSaved ? '#f08c21' : 'transparent'}
            />
          </button>

          {/* Add to Someday */}
          <button
            onClick={isSaved ? handleRemove : handleAdd}
            className={`flex-1 h-12 rounded-full font-syne font-bold text-[14px] transition-colors ${
              isSaved ? 'bg-[#f08c21] text-[#131936]' : 'bg-[#131936] text-white'
            }`}
          >
            {isSaved ? 'Added to Someday ✦' : '+ Add to Someday'}
          </button>

          {/* Plan it + */}
          <Link
            href="/plan"
            className="px-5 h-12 rounded-full bg-[#f08c21] text-[#131936] font-syne font-bold text-[14px] flex items-center justify-center shrink-0"
          >
            Plan it +
          </Link>
        </div>
      </div>

    </div>
  )
}

// ─── Similar place card ───────────────────────────────────────────────────────

function ExpSimilarCard({
  place,
  isSaved,
  onSave,
}: {
  place: Place
  isSaved: boolean
  onSave: () => void
}) {
  return (
    <div
      className="relative w-36 h-48 rounded-2xl overflow-hidden shrink-0"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#f08c21] to-[#fcd99a]" />
      {place.image_url && (
        <Image src={place.image_url} alt={place.name} fill sizes="144px" className="object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

      <Link href={`/places/${place.id}`} className="absolute inset-0 z-0" aria-label={`View ${place.name}`} />

      <div className="absolute top-2 left-2 z-10 pointer-events-none">
        <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
          <span className="text-[#f08c21] text-[11px]">✦</span>
        </div>
      </div>

      <div className="absolute top-1 right-1 z-10 w-9 h-9 flex items-center justify-center">
        <button
          onClick={e => { e.preventDefault(); onSave() }}
          disabled={isSaved}
          className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center"
          aria-label={isSaved ? 'Saved' : 'Save'}
        >
          <Heart
            size={13}
            className={isSaved ? 'text-[#f08c21]' : 'text-[#131936]'}
            fill={isSaved ? '#f08c21' : 'transparent'}
          />
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-2 pointer-events-none">
        <p className="font-syne font-bold text-white text-[13px] leading-tight line-clamp-2">{place.name}</p>
        <p className="font-nunito text-white/70 text-[11px] mt-0.5">{place.country}</p>
      </div>
    </div>
  )
}
