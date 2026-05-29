'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, Heart, Share2, Compass, Locate, FolderPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { logEvent } from '@/lib/events'
import { addPlaceToList, removePlaceByPlaceId } from '@/app/actions/bucketList'
import { addPlaceToCollection, removePlaceFromCollection } from '@/app/actions/adminCollections'
import { parseBestTimeToMonths } from '@/lib/bestTimeParser'
import Avatar from '@/components/Avatar'
import type { Place } from '@/lib/types'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

const PIN_COLOR: Record<string, string> = {
  destination: '#131936',
  experience:  '#f08c21',
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FriendVisitor {
  id: string
  username: string
  avatar_url: string | null
}

export interface Activity {
  id: string
  name: string
  description: string | null
  duration: string | null
  category: string | null
  rating: number | null
}

interface AdminCollection { id: string; name: string; slug: string }

interface Props {
  place: Place
  userId: string
  initialIsSaved: boolean
  similarPlaces: Place[]
  statePlaces?: Place[]
  collectionContext?: { name: string; places: Place[] } | null
  friendVisitors: FriendVisitor[]
  activities: Activity[]
  isAdmin?: boolean
  adminCollections?: AdminCollection[]
  initialPlaceCollectionIds?: string[]
  childExperiencePlaces?: Place[]
}

// ─── Month logic ──────────────────────────────────────────────────────────────

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

function getPeakAndShoulder(tags: string[] | null): { peak: Set<number>; shoulder: Set<number> } {
  const t = tags ?? []
  let peak: number[]
  if (t.includes('summer'))      peak = [5, 6, 7]
  else if (t.includes('winter')) peak = [11, 0, 1]
  else if (t.includes('spring')) peak = [2, 3, 4]
  else                           peak = [3, 4, 8]

  const peakSet = new Set(peak)
  const shoulderSet = new Set<number>()
  for (const m of peak) {
    const prev = (m - 1 + 12) % 12
    const next = (m + 1) % 12
    if (!peakSet.has(prev)) shoulderSet.add(prev)
    if (!peakSet.has(next)) shoulderSet.add(next)
  }
  const trimmed = new Set<number>()
  let count = 0
  for (const m of shoulderSet) {
    if (count >= 2) break
    trimmed.add(m)
    count++
  }
  return { peak: peakSet, shoulder: trimmed }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlaceDetailContent({
  place,
  userId,
  initialIsSaved,
  similarPlaces,
  statePlaces = [],
  collectionContext = null,
  friendVisitors,
  activities,
  isAdmin = false,
  adminCollections = [],
  initialPlaceCollectionIds = [],
  childExperiencePlaces = [],
}: Props) {
  const router = useRouter()
  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [descExpanded, setDescExpanded] = useState(false)
  const [activeDot, setActiveDot] = useState(0)
  const [savedSimilarIds, setSavedSimilarIds] = useState<Set<string>>(new Set())
  const [showCollectionSheet, setShowCollectionSheet] = useState(false)
  const [collectionIds, setCollectionIds] = useState<Set<string>>(new Set(initialPlaceCollectionIds))
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<import('react-map-gl/mapbox').MapRef>(null)

  useEffect(() => {
    logEvent(userId, 'page_viewed', { page: 'place_detail', place_id: place.id })
  }, [userId, place.id])

  // ── Save / remove ─────────────────────────────────────────────────────────

  async function handleSave() {
    setIsSaved(true)
    void logEvent(userId, 'place_saved', { place_id: place.id, source: 'detail_page' })
    const result = await addPlaceToList(place.id, 'detail_page')
    if (result.error) {
      setIsSaved(false)
      toast.error('Something went wrong. Please try again.')
    } else {
      toast.success('Added to your list ✦')
    }
  }

  async function handleRemove() {
    setIsSaved(false)
    void logEvent(userId, 'item_removed', { place_id: place.id, source: 'detail_page' })
    const result = await removePlaceByPlaceId(place.id)
    if (result.error) {
      setIsSaved(true)
      toast.error('Something went wrong. Please try again.')
    }
  }

  async function handleSaveSimilar(placeId: string) {
    setSavedSimilarIds(prev => new Set([...prev, placeId]))
    void logEvent(userId, 'place_saved', { place_id: placeId, source: 'detail_similar' })
    const result = await addPlaceToList(placeId, 'detail_similar')
    if (result.error) {
      setSavedSimilarIds(prev => { const s = new Set(prev); s.delete(placeId); return s })
      toast.error('Something went wrong.')
    }
  }

  // ── Share ─────────────────────────────────────────────────────────────────

  async function handleShare() {
    const url = window.location.href
    const title = place.name
    const text = place.must_do
      ? `${place.name} — ${place.must_do}`
      : `${place.name}, ${place.country} — on my Someday list`

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        void logEvent(userId, 'place_shared', { place_id: place.id, source: 'place_detail', method: 'native_share' })
      } catch { /* User cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied ✦')
      void logEvent(userId, 'place_shared', { place_id: place.id, source: 'place_detail', method: 'clipboard' })
    }
  }

  // ── Admin: toggle collection membership ──────────────────────────────────

  async function handleCollectionToggle(collectionId: string) {
    setTogglingId(collectionId)
    const isIn = collectionIds.has(collectionId)
    setCollectionIds(prev => {
      const next = new Set(prev)
      isIn ? next.delete(collectionId) : next.add(collectionId)
      return next
    })
    const result = isIn
      ? await removePlaceFromCollection({ collectionId, placeId: place.id })
      : await addPlaceToCollection({ collectionId, placeId: place.id })
    if (result.error) {
      setCollectionIds(prev => {
        const next = new Set(prev)
        isIn ? next.add(collectionId) : next.delete(collectionId)
        return next
      })
      toast.error(result.error)
    }
    setTogglingId(null)
  }

  // ── Recentre map ──────────────────────────────────────────────────────────

  function recentreMap() {
    if (!mapRef.current || !place.lat || !place.lng) return
    mapRef.current.flyTo({
      center:   [place.lng, place.lat],
      zoom:     12,
      duration: 800,
    })
  }

  // ── Scroll tracking ───────────────────────────────────────────────────────

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const ratio = el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth)
    setActiveDot(Math.round(ratio * 2))
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const { peak, shoulder } = (() => {
    const parsed = parseBestTimeToMonths(place.best_time)
    if (parsed) return parsed
    return getPeakAndShoulder(place.tags)
  })()
  const location   = place.state_province ? `${place.state_province}, ${place.country}` : place.country
  const seasonTags = (place.tags ?? []).slice(0, 2)

  return (
    <div className="min-h-screen bg-[#fff9f0] pb-24">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div className="relative h-64 w-full bg-gradient-to-br from-[#f08c21] to-[#fcd99a]">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/30 flex items-center justify-center"
          aria-label="Go back"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>

        {/* Place info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-nunito text-white/70 text-[12px] capitalize mb-0.5">{place.type}</p>
          <h1 className="font-syne font-bold text-white text-[26px] leading-tight">{place.name}</h1>
          {location && (
            <p className="font-nunito text-white/70 text-[13px] mt-0.5">{location}</p>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="max-w-[480px] mx-auto">

        {/* Tags */}
        {(place.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-4">
            {(place.tags ?? []).map(tag => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-[#fcd99a]/50 text-[#131936] font-nunito text-[11px]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {place.description && (
          <div className="px-4 pt-4">
            <p
              className={`font-nunito text-[14px] text-[#131936]/70 leading-relaxed ${
                descExpanded ? '' : 'line-clamp-3'
              }`}
            >
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

        {/* ── About this place (Hinge fields) ──────────────────────────────── */}
        {(place.must_do || place.hidden_gem || place.not_for_you || place.best_time || (place.vibe_tags && place.vibe_tags.length > 0)) && (
          <div className="px-4 pt-6 space-y-2">
            <h2 className="font-syne font-bold text-[#131936] text-[16px] mb-3">About this place</h2>

            {place.must_do && (
              <div className="rounded-2xl border border-[#fcd99a] bg-white px-4 py-3">
                <p className="font-syne font-bold text-[#131936] text-[13px] mb-1">🎯 Must do</p>
                <p className="font-nunito text-[#131936] text-[15px] leading-snug">{place.must_do}</p>
              </div>
            )}

            {place.hidden_gem && (
              <div className="rounded-2xl border border-[#fcd99a] bg-white px-4 py-3">
                <p className="font-syne font-bold text-[#131936] text-[13px] mb-1">💎 Local secret</p>
                <p className="font-nunito text-[#131936] text-[15px] leading-snug">{place.hidden_gem}</p>
              </div>
            )}

            {place.not_for_you && (
              <div className="rounded-2xl border border-[#fcd99a] bg-white px-4 py-3">
                <p className="font-syne font-bold text-[#131936] text-[13px] mb-1">⚠️ Not for you if</p>
                <p className="font-nunito text-[#131936] text-[15px] leading-snug">{place.not_for_you}</p>
              </div>
            )}

            {place.best_time && (
              <div className="rounded-2xl border border-[#fcd99a] bg-white px-4 py-3">
                <p className="font-syne font-bold text-[#131936] text-[13px] mb-1">🗓 Best time</p>
                <p className="font-nunito text-[#131936] text-[15px] leading-snug">{place.best_time}</p>
              </div>
            )}

            {place.vibe_tags && place.vibe_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {place.vibe_tags.map(vibe => (
                  <span
                    key={vibe}
                    className="px-3 py-1 rounded-full bg-[#fcd99a]/50 border border-[#fcd99a] font-nunito text-[12px] text-[#131936]"
                  >
                    {vibe}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Map ──────────────────────────────────────────────────────────── */}
        <div className="pt-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="font-syne font-bold text-[#131936] text-[16px]">Where the magic is</h2>
            {place.lat && place.lng && (
              <Link
                href={`/map?lat=${place.lat}&lng=${place.lng}&name=${encodeURIComponent(place.name)}`}
                className="font-nunito text-[13px] text-[#f08c21]"
              >
                Open map →
              </Link>
            )}
          </div>

          {place.lat && place.lng ? (
            <div className="mx-4 rounded-2xl overflow-hidden relative" style={{ height: 280 }}>
              {MAPBOX_TOKEN ? (
                <>
                  <Map
                    ref={mapRef}
                    initialViewState={{
                      longitude: place.lng,
                      latitude:  place.lat,
                      zoom:      12,
                    }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/light-v11"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    interactive={true}
                    reuseMaps
                  >
                    <NavigationControl position="bottom-right" showCompass={false} />

                    {/* Primary place pin */}
                    <Marker longitude={place.lng} latitude={place.lat} anchor="bottom">
                      <div
                        style={{
                          width:           36,
                          height:          36,
                          borderRadius:    '50%',
                          backgroundColor: '#f08c21',
                          border:          '3px solid white',
                          boxShadow:       '0 2px 10px rgba(240,140,33,0.6)',
                          display:         'flex',
                          alignItems:      'center',
                          justifyContent:  'center',
                          cursor:          'pointer',
                        }}
                      >
                        <span style={{ fontSize: 16, lineHeight: 1 }}>★</span>
                      </div>
                    </Marker>

                    {/* Nearby place pins from similarPlaces */}
                    {similarPlaces
                      .filter(sp => sp.lat != null && sp.lng != null)
                      .map(sp => {
                        const color = PIN_COLOR[sp.type] ?? '#131936'
                        return (
                          <Marker
                            key={sp.id}
                            longitude={sp.lng!}
                            latitude={sp.lat!}
                            anchor="bottom"
                          >
                            <Link href={`/places/${sp.id}`} aria-label={sp.name}>
                              <div
                                style={{
                                  width:           28,
                                  height:          28,
                                  borderRadius:    '50%',
                                  backgroundColor: color,
                                  border:          '2px solid white',
                                  boxShadow:       `0 2px 6px ${color}66`,
                                  display:         'flex',
                                  alignItems:      'center',
                                  justifyContent:  'center',
                                  cursor:          'pointer',
                                }}
                                title={sp.name}
                              >
                                <span style={{ fontSize: 11, color: 'white', lineHeight: 1 }}>
                                  {sp.type === 'experience' ? '✦' : '●'}
                                </span>
                              </div>
                            </Link>
                          </Marker>
                        )
                      })}
                  </Map>

                  {/* Recentre button */}
                  <button
                    onClick={recentreMap}
                    aria-label="Re-centre map"
                    style={{
                      position:        'absolute',
                      top:             12,
                      right:           12,
                      zIndex:          10,
                      width:           36,
                      height:          36,
                      borderRadius:    '50%',
                      backgroundColor: 'white',
                      border:          '1px solid rgba(19,25,54,0.15)',
                      boxShadow:       '0 2px 6px rgba(0,0,0,0.12)',
                      display:         'flex',
                      alignItems:      'center',
                      justifyContent:  'center',
                      cursor:          'pointer',
                    }}
                  >
                    <Locate size={16} color="#131936" strokeWidth={1.75} />
                  </button>

                </>
              ) : (
                <div className="w-full h-full bg-[#fcd99a]/30 flex items-center justify-center rounded-2xl">
                  <p className="font-nunito text-[#131936]/30 text-[12px]">Map not configured</p>
                </div>
              )}
            </div>
          ) : (
            <div
              className="mx-4 rounded-2xl bg-[#fcd99a]/30 flex items-center justify-center"
              style={{ height: 280 }}
            >
              <p className="font-nunito text-[#131936]/30 text-[12px]">No location data</p>
            </div>
          )}
        </div>

        {/* ── What to do here ───────────────────────────────────────────────── */}
        <div className="pt-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-syne font-bold text-[#131936] text-[16px]">What to do here</h2>
            <span className="font-nunito text-[#131936]/40 text-[12px]">
              {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
            </span>
          </div>

          {activities.length > 0 ? (
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
          ) : (
            <div className="rounded-2xl bg-[#fcd99a]/20 border border-[#fcd99a]/40 p-6 text-center">
              <p className="font-nunito text-[#131936]/40 text-[13px]">
                Activities coming soon for {place.name}
              </p>
            </div>
          )}
        </div>

        {/* ── Best time to visit ────────────────────────────────────────────── */}
        <div className="px-4 pt-6">
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-syne font-bold text-[#131936] text-[16px]">Best time to visit</h2>
              {seasonTags.length > 0 && (
                <span className="font-nunito text-[12px] text-[#f08c21] capitalize">
                  {seasonTags.join(' · ')}
                </span>
              )}
            </div>

            {/* Month bubbles */}
            <div className="flex justify-between">
              {MONTHS.map((letter, i) => {
                const isPeak = peak.has(i)
                const isShoulder = !isPeak && shoulder.has(i)
                return (
                  <div
                    key={i}
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-nunito text-[10px] ${
                      isPeak
                        ? 'bg-[#f08c21] text-white'
                        : isShoulder
                        ? 'bg-[#fcd99a] text-[#131936]'
                        : 'bg-[#131936]/[0.08] text-[#131936]/50'
                    }`}
                  >
                    {letter}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#f08c21]" />
                <span className="font-nunito text-[11px] text-[#131936]/60">Peak</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#fcd99a]" />
                <span className="font-nunito text-[11px] text-[#131936]/60">Shoulder</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── More in {state_province} ──────────────────────────────────────── */}
        {statePlaces.length > 0 && (
          <div className="pt-6">
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="font-syne font-bold text-[#131936] text-[16px]">
                More in {place.state_province}
              </h2>
              <Link
                href={`/discover?country=${encodeURIComponent(place.country)}`}
                className="font-nunito text-[13px] text-[#f08c21]"
              >
                Explore →
              </Link>
            </div>
            <div
              className="flex gap-3 overflow-x-auto px-4 pb-3"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
            >
              {statePlaces.map(sp => (
                <SimilarCard
                  key={sp.id}
                  place={sp}
                  isSaved={savedSimilarIds.has(sp.id)}
                  onSave={() => handleSaveSimilar(sp.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Things to do here (child experiences) ────────────────────────── */}
        {childExperiencePlaces.length > 0 && (
          <div className="pt-6">
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="font-syne font-bold text-[#131936] text-[16px]">
                Things to do here
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-3 scrollbar-none" style={{ scrollSnapType: 'x mandatory' }}>
              {childExperiencePlaces.map(exp => (
                <SimilarCard
                  key={exp.id}
                  place={exp}
                  isSaved={savedSimilarIds.has(exp.id)}
                  onSave={() => handleSaveSimilar(exp.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── More like this (same category) ────────────────────────────────── */}
        {similarPlaces.length > 0 && (
          <div className="pt-6">
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="font-syne font-bold text-[#131936] text-[16px]">
                More like this
              </h2>
              <Link
                href={`/discover?type=${encodeURIComponent(place.type)}`}
                className="font-nunito text-[13px] text-[#f08c21]"
              >
                Explore →
              </Link>
            </div>
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex gap-3 overflow-x-auto px-4 pb-3"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
            >
              {similarPlaces.map(sp => (
                <SimilarCard
                  key={sp.id}
                  place={sp}
                  isSaved={savedSimilarIds.has(sp.id)}
                  onSave={() => handleSaveSimilar(sp.id)}
                />
              ))}
            </div>
            <div className="flex justify-center gap-1.5 mt-1">
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
          <div className="pt-6">
            <div className="px-4 mb-3">
              <h2 className="font-syne font-bold text-[#131936] text-[16px]">
                More from {collectionContext.name}
              </h2>
            </div>
            <div
              className="flex gap-3 overflow-x-auto px-4 pb-3"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
            >
              {collectionContext.places.map(sp => (
                <SimilarCard
                  key={sp.id}
                  place={sp}
                  isSaved={savedSimilarIds.has(sp.id)}
                  onSave={() => handleSaveSimilar(sp.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Friends who've been ───────────────────────────────────────────── */}
        <div className="px-4 pt-6">
          <div className="bg-white rounded-2xl p-4">
            <h2 className="font-syne font-bold text-[#131936] text-[16px] mb-3">
              Your friends who&apos;ve been
            </h2>
            {friendVisitors.length > 0 ? (
              <div className="flex items-center gap-3">
                {/* Avatar stack */}
                <div className="flex items-center">
                  {friendVisitors.slice(0, 5).map((friend, i) => (
                    <div
                      key={friend.id}
                      className="rounded-full border-2 border-[#fff9f0]"
                      style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 5 - i, position: 'relative' }}
                    >
                      <Avatar
                        avatarUrl={friend.avatar_url}
                        username={friend.username}
                        size={36}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-nunito text-[13px] text-[#131936]/70">
                    {friendVisitors.length} friend{friendVisitors.length !== 1 ? 's' : ''} have visited {place.country}
                  </p>
                  <Link href="/plan" className="font-nunito text-[13px] text-[#f08c21] font-medium">
                    See trip notes →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="font-nunito text-[13px] text-[#131936]/40">
                Be the first of your friends to go
              </p>
            )}
          </div>
        </div>

      </div>

      {/* ── Fixed bottom CTA ─────────────────────────────────────────────────── */}
      {/*
        Sits above the AppShell bottom nav (h-16 = 64px) on mobile,
        at the true bottom on desktop where the sidebar replaces the nav.
      */}
      <div
        className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-[#fff9f0] border-t border-[#fcd99a]/50 px-4 py-3 z-40"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="max-w-[480px] mx-auto flex items-center gap-2">
          {/* Save / saved button */}
          <button
            onClick={isSaved ? handleRemove : handleSave}
            className={`flex-1 h-12 rounded-full font-syne font-bold text-[14px] transition-colors ${
              isSaved ? 'bg-[#f08c21] text-[#131936]' : 'bg-[#131936] text-white'
            }`}
          >
            {isSaved ? 'Saved ✦' : '+ Add to my Someday'}
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="w-12 h-12 rounded-full bg-white border border-[#fcd99a] flex items-center justify-center shrink-0"
            aria-label="Share"
          >
            <Share2 size={18} className="text-[#131936]" />
          </button>

          {/* Explore */}
          <Link
            href={`/discover?type=${encodeURIComponent(place.type)}`}
            className="w-12 h-12 rounded-full bg-[#f08c21] flex items-center justify-center shrink-0"
            aria-label="Explore similar"
          >
            <Compass size={18} className="text-[#131936]" />
          </Link>

          {/* Admin: collections */}
          {isAdmin && (
            <button
              onClick={() => setShowCollectionSheet(true)}
              className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 ${
                collectionIds.size > 0 ? 'bg-[#131936] border-[#131936]' : 'bg-white border-[#fcd99a]'
              }`}
              aria-label="Manage collections"
            >
              <FolderPlus size={18} className={collectionIds.size > 0 ? 'text-[#f08c21]' : 'text-[#131936]'} />
            </button>
          )}
        </div>
      </div>

      {/* ── Admin collection sheet ─────────────────────────────────────────────── */}
      {isAdmin && showCollectionSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCollectionSheet(false)} />
          <div className="relative w-full bg-[#fff9f0] rounded-t-3xl px-4 pt-5 pb-10 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-syne font-bold text-[#131936] text-[16px]">Collections</h3>
              <button
                onClick={() => setShowCollectionSheet(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#131936]/10"
                aria-label="Close"
              >
                <X size={14} className="text-[#131936]" />
              </button>
            </div>
            {adminCollections.length === 0 ? (
              <p className="font-nunito text-[#131936]/40 text-[13px] text-center py-4">
                No active collections
              </p>
            ) : (
              <div className="space-y-2">
                {adminCollections.map(col => {
                  const isIn = collectionIds.has(col.id)
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => void handleCollectionToggle(col.id)}
                      disabled={togglingId === col.id}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-colors ${
                        isIn ? 'bg-[#131936] border-[#131936]' : 'bg-white border-[#fcd99a]/60'
                      }`}
                    >
                      <span className={`text-[18px] ${isIn ? 'opacity-100' : 'opacity-40'}`}>
                        {isIn ? '★' : '☆'}
                      </span>
                      <span className={`font-nunito font-semibold text-[14px] flex-1 ${
                        isIn ? 'text-white' : 'text-[#131936]'
                      }`}>
                        {col.name}
                      </span>
                      {togglingId === col.id && (
                        <div className="w-4 h-4 rounded-full border-2 border-[#f08c21] border-t-transparent animate-spin" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Similar place card ───────────────────────────────────────────────────────

function SimilarCard({
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
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f08c21] to-[#fcd99a]" />
      {place.image_url && (
        <Image
          src={place.image_url}
          alt={place.name}
          fill
          sizes="144px"
          className="object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

      {/* Full-card link (z-0) */}
      <Link
        href={`/places/${place.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View ${place.name}`}
      />

      {/* Top-left similarity badge */}
      <div className="absolute top-2 left-2 z-10 pointer-events-none">
        <span className="font-nunito text-[11px] font-bold text-white bg-black/30 rounded-full px-2 py-0.5">
          +{Math.round(place.popularity)}%
        </span>
      </div>

      {/* Top-right heart button */}
      <div className="absolute top-1 right-1 z-10 w-11 h-11 flex items-center justify-center">
        <button
          onClick={e => { e.preventDefault(); onSave() }}
          disabled={isSaved}
          className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center"
          aria-label={isSaved ? 'Saved' : 'Save to list'}
        >
          <Heart
            size={13}
            className={isSaved ? 'text-[#f08c21]' : 'text-[#131936]'}
            fill={isSaved ? '#f08c21' : 'transparent'}
          />
        </button>
      </div>

      {/* Bottom text */}
      <div className="absolute bottom-0 left-0 right-0 p-2 pointer-events-none">
        <p className="font-syne font-bold text-white text-[13px] leading-tight line-clamp-2">
          {place.name}
        </p>
        <p className="font-nunito text-white/70 text-[11px] mt-0.5">{place.country}</p>
      </div>
    </div>
  )
}
