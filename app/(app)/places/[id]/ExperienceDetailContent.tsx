'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, Heart, Share2, Compass, Bell, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { logEvent } from '@/lib/events'
import { addPlaceToList, removePlaceByPlaceId } from '@/app/actions/bucketList'
import type { Place } from '@/lib/types'
import type { FriendVisitor } from './PlaceDetailContent'

interface Props {
  place: Place
  userId: string
  initialIsSaved: boolean
  similarPlaces: Place[]
  friendVisitors: FriendVisitor[]
}

export default function ExperienceDetailContent({
  place,
  userId,
  initialIsSaved,
  similarPlaces,
}: Props) {
  const router = useRouter()
  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [descExpanded, setDescExpanded] = useState(false)

  useEffect(() => {
    logEvent(userId, 'page_viewed', { page: 'experience_detail', place_id: place.id })
  }, [userId, place.id])

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

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: place.name, url }) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied!')
    }
  }

  const typeLabel = place.type === 'food' ? 'Food Experience' : 'Experience'
  const location = [place.region, place.country].filter(Boolean).join(', ')
  const vibes = (place.vibes ?? []).slice(0, 3)
  const filteredSimilar = similarPlaces.filter(sp => sp.type === place.type)

  return (
    <div className="min-h-screen bg-[#fff9f0] pb-32">

      {/* ── Sticky top bar ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 grid grid-cols-3 items-center">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-11 h-11"
              aria-label="Go back"
            >
              <ChevronLeft size={22} className="text-[#131936]" />
            </button>
          </div>
          <div className="flex justify-center">
            <span className="font-syne font-bold text-[#131936] text-[17px]">{typeLabel}</span>
          </div>
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

      <div className="max-w-[480px] mx-auto">

        {/* ── Hero image ───────────────────────────────────────────────────── */}
        <div className="px-4 pt-4">
          <div
            className="relative rounded-[20px] overflow-hidden w-full"
            style={{ height: 220, background: 'linear-gradient(135deg, #f08c21 0%, #fcd99a 100%)' }}
          >
            {place.image_url && (
              <Image
                src={place.image_url}
                alt={place.name}
                fill
                sizes="(max-width: 480px) 100vw, 480px"
                className="object-cover"
                priority
              />
            )}
            {place.image_url && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            )}

            {/* Heart button */}
            <div className="absolute top-2 right-2 z-10 w-11 h-11 flex items-center justify-center">
              <button
                onClick={isSaved ? handleRemove : handleSave}
                className="w-7 h-7 rounded-full bg-white flex items-center justify-center"
                aria-label={isSaved ? 'Remove from list' : 'Save to list'}
              >
                <Heart
                  size={14}
                  className={isSaved ? 'text-[#f08c21]' : 'text-[#131936]'}
                  fill={isSaved ? '#f08c21' : 'transparent'}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ── Identity block ───────────────────────────────────────────────── */}
        <div className="px-4 pt-4">
          <h1 className="font-syne font-bold text-[#131936] text-[28px] leading-tight">{place.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="bg-[#fcd99a] text-[#131936] font-nunito text-[12px] px-3 py-1 rounded-full capitalize">
              {place.type}
            </span>
            {location && (
              <p className="flex items-center gap-1 font-nunito text-[13px] text-[#131936]/60">
                <MapPin size={12} className="shrink-0" />
                <span>{location}</span>
              </p>
            )}
          </div>
          {vibes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {vibes.map(vibe => (
                <span key={vibe} className="px-3 py-1 rounded-full bg-[#fcd99a]/50 text-[#131936] font-nunito text-[11px]">
                  {vibe}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── About card ──────────────────────────────────────────────────── */}
        {place.description && (
          <div className="px-4 pt-5">
            <div className="bg-white rounded-2xl p-4">
              <h2 className="font-syne font-bold text-[#131936] text-[16px] mb-2">About this experience</h2>
              <p className={`font-nunito text-[14px] text-[#131936]/70 leading-relaxed ${descExpanded ? '' : 'line-clamp-3'}`}>
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
          </div>
        )}

        {/* ── Placeholder section ──────────────────────────────────────────── */}
        <div className="px-4 pt-5">
          <div className="bg-[#fcd99a]/30 rounded-2xl p-6 border border-[#fcd99a] flex flex-col items-center">
            <span className="text-[#f08c21] text-[32px] leading-none">✦</span>
            <h2 className="font-syne font-bold text-[#131936] text-[16px] mt-2 text-center">
              More details coming soon
            </h2>
            <p className="font-nunito text-[#131936]/50 text-[13px] text-center mt-1 leading-relaxed">
              Full experience details — booking info, duration, what&apos;s included, and tips — will appear here.
            </p>
          </div>
        </div>

        {/* ── Similar experiences ──────────────────────────────────────────── */}
        {filteredSimilar.length > 0 && (
          <div className="pt-6">
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="font-syne font-bold text-[#131936] text-[16px]">More like this</h2>
              <Link
                href={`/discover?type=${encodeURIComponent(place.type)}`}
                className="font-nunito text-[13px] text-[#f08c21]"
              >
                Explore →
              </Link>
            </div>
            <div
              className="flex gap-3 overflow-x-auto px-4 pb-3"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
            >
              {filteredSimilar.map(sp => (
                <Link
                  key={sp.id}
                  href={`/places/${sp.id}`}
                  className="relative w-36 h-48 rounded-2xl overflow-hidden shrink-0 block"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#f08c21] to-[#fcd99a]" />
                  {sp.image_url && (
                    <Image src={sp.image_url} alt={sp.name} fill sizes="144px" className="object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 pointer-events-none">
                    <p className="font-syne font-bold text-white text-[13px] leading-tight line-clamp-2">{sp.name}</p>
                    <p className="font-nunito text-white/70 text-[11px] mt-0.5">{sp.country}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Fixed bottom CTA ─────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-[#fff9f0] border-t border-[#fcd99a]/50 px-4 py-3 z-40"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="max-w-[480px] mx-auto flex items-center gap-2">
          <button
            onClick={isSaved ? handleRemove : handleSave}
            className={`flex-1 h-12 rounded-full font-syne font-bold text-[14px] transition-colors ${
              isSaved ? 'bg-[#f08c21] text-[#131936]' : 'bg-[#131936] text-white'
            }`}
          >
            {isSaved ? 'Saved ✦' : '+ Add to my Someday'}
          </button>
          <button
            onClick={handleShare}
            className="w-12 h-12 rounded-full bg-white border border-[#fcd99a] flex items-center justify-center shrink-0"
            aria-label="Share"
          >
            <Share2 size={18} className="text-[#131936]" />
          </button>
          <Link
            href={`/discover?type=${encodeURIComponent(place.type)}`}
            className="w-12 h-12 rounded-full bg-[#f08c21] flex items-center justify-center shrink-0"
            aria-label="Explore similar"
          >
            <Compass size={18} className="text-[#131936]" />
          </Link>
        </div>
      </div>

    </div>
  )
}
