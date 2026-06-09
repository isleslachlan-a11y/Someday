'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, Heart, Upload, MapPin, FolderPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { logEvent } from '@/lib/events'
import { addPlaceToList, removePlaceByPlaceId } from '@/app/actions/bucketList'
import { addPlaceToCollection, removePlaceFromCollection } from '@/app/actions/adminCollections'
import Avatar from '@/components/Avatar'
import type { Place } from '@/lib/types'
import type { FriendVisitor, Activity } from './PlaceDetailContent'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminCollection { id: string; name: string; slug: string }

interface ParentPlaceSnap {
  id: string
  name: string
  type: string
  image_thumb_url: string | null
  country: string
}

interface Props {
  place: Place
  userId: string
  initialIsSaved: boolean
  initialSavedIds?: string[]
  similarPlaces: Place[]
  statePlaces?: Place[]
  collectionContext?: { name: string; places: Place[] } | null
  friendVisitors: FriendVisitor[]
  activities?: Activity[]
  isAdmin?: boolean
  adminCollections?: AdminCollection[]
  initialPlaceCollectionIds?: string[]
  parentPlace?: ParentPlaceSnap | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExperienceDetailContent({
  place,
  userId,
  initialIsSaved,
  initialSavedIds = [],
  similarPlaces,
  statePlaces = [],
  collectionContext = null,
  friendVisitors,
  activities = [],
  isAdmin = false,
  adminCollections = [],
  initialPlaceCollectionIds = [],
  parentPlace = null,
}: Props) {
  const router = useRouter()
  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [descExpanded, setDescExpanded] = useState(false)
  const [activeDot, setActiveDot] = useState(0)
  const [savedSimilarIds, setSavedSimilarIds] = useState<Set<string>>(new Set(initialSavedIds))
  const [showCollectionSheet, setShowCollectionSheet] = useState(false)
  const [collectionIds, setCollectionIds] = useState<Set<string>>(new Set(initialPlaceCollectionIds))
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const scrollRef           = useRef<HTMLDivElement>(null)
  const stateScrollRef      = useRef<HTMLDivElement>(null)
  const collectionScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEvent(userId, 'page_viewed', { page: 'experience_detail', place_id: place.id })
  }, [userId, place.id])

  useEffect(() => {
    stateScrollRef.current      && (stateScrollRef.current.scrollLeft      = 0)
    scrollRef.current           && (scrollRef.current.scrollLeft           = 0)
    collectionScrollRef.current && (collectionScrollRef.current.scrollLeft = 0)
  }, [])

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
    const title = place.name
    const text = place.must_do
      ? `${place.name} — ${place.must_do}`
      : `${place.name}, ${place.country} — on my Someday list`

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        void logEvent(userId, 'place_shared', { place_id: place.id, source: 'experience_detail', method: 'native_share' })
      } catch { /* User cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied ✦')
      void logEvent(userId, 'place_shared', { place_id: place.id, source: 'experience_detail', method: 'clipboard' })
    }
  }

  async function handleSaveSimilar(placeId: string) {
    if (savedSimilarIds.has(placeId)) {
      setSavedSimilarIds(prev => { const s = new Set(prev); s.delete(placeId); return s })
      void logEvent(userId, 'item_removed', { place_id: placeId, source: 'experience_similar' })
      const result = await removePlaceByPlaceId(placeId)
      if (result.error) {
        setSavedSimilarIds(prev => new Set([...prev, placeId]))
        toast.error('Something went wrong.')
      }
    } else {
      setSavedSimilarIds(prev => new Set([...prev, placeId]))
      void logEvent(userId, 'place_saved', { place_id: placeId, source: 'experience_similar' })
      const result = await addPlaceToList(placeId)
      if (result.error) {
        setSavedSimilarIds(prev => { const s = new Set(prev); s.delete(placeId); return s })
        toast.error('Something went wrong.')
      }
    }
  }

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

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const ratio = el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth)
    setActiveDot(Math.round(ratio * 2))
  }

  // Derived values
  const location = place.state_province ? `${place.state_province}, ${place.country}` : place.country
  const countryCount = similarPlaces.filter(sp => sp.country === place.country).length

  return (
    <div className="min-h-screen bg-[#fff9f0]">

      {/* ── Full-bleed hero ────────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '4/3', background: 'linear-gradient(135deg, #f89a14 0%, #f5b05a 50%, #fcd99a 100%)' }}
      >
        {place.image_url && (
          <Image
            src={place.image_url}
            alt={place.name}
            fill
            sizes="100vw"
            className="object-cover object-[center_30%]"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/20" />

        {/* Top-left: back */}
        <div className="absolute top-12 left-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center"
            aria-label="Go back"
          >
            <ChevronLeft size={20} className="text-[#131936]" />
          </button>
        </div>

        {/* Top-right: share, save, collections */}
        <div className="absolute top-12 right-4 flex items-center gap-2">
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center"
            aria-label="Share"
          >
            <Upload size={18} className="text-white" />
          </button>
          <button
            onClick={isSaved ? handleRemove : handleAdd}
            className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center"
            aria-label={isSaved ? 'Remove from Someday' : 'Add to Someday'}
          >
            <Heart
              size={18}
              className={isSaved ? 'text-[#f89a14]' : 'text-white'}
              fill={isSaved ? '#f89a14' : 'transparent'}
            />
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowCollectionSheet(true)}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                collectionIds.size > 0 ? 'bg-[#f89a14]' : 'bg-black/30'
              }`}
              aria-label="Manage collections"
            >
              <FolderPlus size={18} className="text-white" />
            </button>
          )}
        </div>

        {/* Bottom overlay: name + location */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pointer-events-none">
          <h1 className="font-syne font-bold text-white text-[26px] leading-tight line-clamp-2">
            {place.name}
          </h1>
          {location && (
            <p className="flex items-center gap-1 font-nunito text-[13px] text-white/80 mt-1">
              <MapPin size={12} className="shrink-0" />
              {location}
            </p>
          )}
        </div>
      </div>

      {/* ── Parent breadcrumb ──────────────────────────────────────────────── */}
      {parentPlace && (
        <Link
          href={`/places/${parentPlace.id}`}
          className="flex items-center gap-1.5 px-5 py-3 font-nunito text-[12px] text-[#f89a14] bg-[#fff9f0] hover:opacity-80 transition-opacity"
        >
          <span>🗺</span>
          <span>Part of {parentPlace.name}</span>
          <span className="text-[10px]">→</span>
        </Link>
      )}

      {/* ── Flat content ───────────────────────────────────────────────────── */}
      <div className="bg-[#fff9f0] pb-24">
        <div className="max-w-[480px] mx-auto">

          {/* ── Quick info tiles ───────────────────────────────────────────── */}
          <div className="flex gap-2 px-5 mt-4">
            {[
              { value: place.duration ?? '—', label: 'Duration' },
              { value: place.cost ?? '—', label: 'Cost' },
              { value: place.must_do ? place.must_do.slice(0, 40) + (place.must_do.length > 40 ? '…' : '') : '—', label: 'Tip' },
              { value: place.not_for_you ? place.not_for_you.slice(0, 40) + (place.not_for_you.length > 40 ? '…' : '') : '—', label: 'Avoid if' },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="bg-white rounded-2xl p-3 flex-1 text-center border border-[#fcd99a]/50"
              >
                <p className="font-syne font-bold text-[#131936] text-[11px] leading-tight line-clamp-2">{value}</p>
                <p className="font-nunito text-[#131936]/50 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Description ────────────────────────────────────────────────── */}
          {place.description && (
            <div className="px-5 mt-6">
              <h2 className="font-syne font-bold text-[#131936] text-[17px]">Description</h2>
              <p className={`font-nunito text-[14px] text-[#131936]/70 leading-relaxed mt-2 ${descExpanded ? '' : 'line-clamp-3'}`}>
                {place.description}
              </p>
              {place.description.length > 120 && (
                <button
                  onClick={() => setDescExpanded(v => !v)}
                  className="mt-1 font-nunito text-[13px] text-[#f89a14] font-medium min-h-[44px] flex items-center"
                >
                  {descExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* ── Friends who've done this ───────────────────────────────────── */}
          <div className="px-5 mt-6">
            <div className="bg-white rounded-2xl p-4 border border-[#fcd99a]/40">
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
                      <Link href="/plan" className="font-nunito text-[#f89a14] text-[12px] mt-0.5 block">
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
                      <span className="font-nunito text-[12px] text-[#f89a14] shrink-0">
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
              <div className="absolute right-4 top-4 w-16 h-16 rounded-full bg-[#f89a14]/20" />
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
                <Link href={`/discover?country=${encodeURIComponent(place.country)}`} className="font-nunito text-[#f89a14] text-[13px]">
                  Explore →
                </Link>
              </div>
              <div
                ref={stateScrollRef}
                className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5"
                style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollBehavior: 'auto' }}
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
                <Link href={`/discover?type=${encodeURIComponent(place.type)}`} className="font-nunito text-[#f89a14] text-[13px]">
                  See all →
                </Link>
              </div>
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5"
                style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollBehavior: 'auto' }}
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
                      activeDot === dot ? 'w-4 h-1.5 bg-[#f89a14]' : 'w-1.5 h-1.5 bg-[#131936]/20'
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
                ref={collectionScrollRef}
                className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5"
                style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollBehavior: 'auto' }}
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
                        <div className="w-4 h-4 rounded-full border-2 border-[#f89a14] border-t-transparent animate-spin" />
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
      <div className="absolute inset-0 bg-gradient-to-br from-[#f89a14] to-[#fcd99a]" />
      {place.image_url && (
        <Image src={place.image_url} alt={place.name} fill sizes="144px" className="object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

      <Link href={`/places/${place.id}`} className="absolute inset-0 z-0" aria-label={`View ${place.name}`} />

      <div className="absolute top-2 left-2 z-10 pointer-events-none">
        <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
          <span className="text-[#f89a14] text-[11px]">✦</span>
        </div>
      </div>

      <div className="absolute top-1 right-1 z-10 w-9 h-9 flex items-center justify-center">
        <button
          onClick={e => { e.preventDefault(); onSave() }}
          className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center"
          aria-label={isSaved ? 'Remove from list' : 'Save to list'}
        >
          <Heart
            size={13}
            className={isSaved ? 'text-[#f89a14]' : 'text-[#131936]'}
            fill={isSaved ? '#f89a14' : 'transparent'}
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
