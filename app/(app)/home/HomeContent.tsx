'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Avatar from '@/components/Avatar'
import HomeViewTracker from './HomeViewTracker'
import { addPlaceToList } from '@/app/actions/bucketList'
import type { Place } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

// Full static strings required — no template literals — so Tailwind includes them
const TYPE_ICON: Record<string, string> = {
  city:       '🏙',
  nature:     '🌿',
  experience: '✨',
  food:       '🍜',
}

const TYPE_GRADIENT: Record<string, string> = {
  city:       'from-violet-accent/25 via-violet-accent/5 to-transparent',
  nature:     'from-emerald-500/20 via-emerald-500/5 to-transparent',
  experience: 'from-pink-accent/20 via-pink-accent/5 to-transparent',
  food:       'from-amber-500/20 via-amber-500/5 to-transparent',
}

const FALLBACK_GRADIENT = 'from-violet-accent/20 via-violet-accent/5 to-transparent'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string
  profile: { username: string; avatar_url: string | null }
  dailyPick: Place | null
  trending: Place[]
  vibeRows: { vibe: string; places: Place[] }[]
  initialBucketPlaceIds: string[]
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HomeContent({
  userId,
  profile,
  dailyPick,
  trending,
  vibeRows,
  initialBucketPlaceIds,
}: Props) {
  const [bucketPlaceIds, setBucketPlaceIds] = useState<string[]>(initialBucketPlaceIds)

  async function handleAdd(placeId: string) {
    if (bucketPlaceIds.includes(placeId)) return

    // Optimistic update
    setBucketPlaceIds(prev => [...prev, placeId])
    toast.success('Added to your list ✦')

    const result = await addPlaceToList(placeId)
    if (result.error) {
      // Roll back
      setBucketPlaceIds(prev => prev.filter(id => id !== placeId))
      toast.error('Something went wrong. Please try again.')
    }
  }

  const hasContent = dailyPick || trending.length > 0 || vibeRows.some(r => r.places.length > 0)

  return (
    <>
      <HomeViewTracker userId={userId} />

      {/* ── Sticky mobile top bar ─────────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-30 bg-indigo-deep/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 h-14 shrink-0">
        <span className="font-syne text-lg font-bold text-white-soft">
          <span className="text-violet-accent">✦</span> Someday
        </span>
        <Link href="/profile" aria-label="Your profile">
          <Avatar avatarUrl={profile.avatar_url} username={profile.username} size={32} />
        </Link>
      </header>

      <main className="min-h-screen bg-indigo-deep">
        <div className="max-w-3xl mx-auto px-4">

          {/* ── Page heading ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between pt-6 pb-8">
            <div>
              <h1 className="font-syne text-2xl font-bold text-white-soft">
                Hey, {profile.username}
                <span className="text-violet-accent"> ✦</span>
              </h1>
              <p className="text-muted text-sm mt-1">Discover your next someday.</p>
            </div>
            {/* Avatar shown on desktop only — mobile has it in the sticky bar */}
            <Link href="/profile" aria-label="Your profile" className="hidden md:block shrink-0 ml-4">
              <Avatar avatarUrl={profile.avatar_url} username={profile.username} size={40} />
            </Link>
          </div>

          {!hasContent ? (
            <div className="py-20 text-center">
              <p className="text-muted text-sm">The catalogue is being curated.</p>
              <p className="text-muted text-xs mt-1">Check back soon.</p>
            </div>
          ) : (
            <>
              {/* ── Section 1: Daily Highlight ─────────────────────────────── */}
              {dailyPick && (
                <section className="mb-12">
                  <SectionLabel>Today&apos;s Pick</SectionLabel>
                  <HeroCard
                    place={dailyPick}
                    isAdded={bucketPlaceIds.includes(dailyPick.id)}
                    onAdd={handleAdd}
                  />
                </section>
              )}

              {/* ── Section 2: Trending ────────────────────────────────────── */}
              {trending.length > 0 && (
                <section className="mb-12">
                  <SectionLabel>Trending</SectionLabel>
                  <ScrollRow>
                    {trending.map(place => (
                      <PlaceCard
                        key={place.id}
                        place={place}
                        isAdded={bucketPlaceIds.includes(place.id)}
                        onAdd={handleAdd}
                      />
                    ))}
                  </ScrollRow>
                </section>
              )}

              {/* ── Section 3: Explore by Vibe ────────────────────────────── */}
              {vibeRows.map(({ vibe, places }) =>
                places.length > 0 ? (
                  <section key={vibe} className="mb-12">
                    <SectionLabel>{vibe}</SectionLabel>
                    <ScrollRow>
                      {places.map(place => (
                        <PlaceCard
                          key={place.id}
                          place={place}
                          isAdded={bucketPlaceIds.includes(place.id)}
                          onAdd={handleAdd}
                        />
                      ))}
                    </ScrollRow>
                  </section>
                ) : null
              )}
            </>
          )}

        </div>
      </main>
    </>
  )
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-syne text-xs font-bold text-muted uppercase tracking-widest mb-4">
      {children}
    </h2>
  )
}

function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
      {children}
    </div>
  )
}

// ─── Hero card (daily pick) ───────────────────────────────────────────────────

function HeroCard({
  place,
  isAdded,
  onAdd,
}: {
  place: Place
  isAdded: boolean
  onAdd: (id: string) => void
}) {
  const gradient = TYPE_GRADIENT[place.type] ?? FALLBACK_GRADIENT
  const icon = TYPE_ICON[place.type] ?? '✦'

  return (
    <article className="rounded-3xl border border-white/10 overflow-hidden bg-white/[0.03]">
      {/* Image area */}
      <div className={`relative h-52 bg-gradient-to-br ${gradient} bg-indigo-deep flex items-center justify-center overflow-hidden`}>
        {/* Today's Pick badge */}
        <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 px-3 py-1">
          <span className="text-violet-accent text-xs">✦</span>
          <span className="text-xs font-semibold text-white-soft">Today&apos;s Pick</span>
        </div>

        {/* Faint watermark text */}
        {place.image_keyword && (
          <span
            className="absolute font-syne font-black text-white select-none pointer-events-none whitespace-nowrap"
            style={{ fontSize: '96px', opacity: 0.035 }}
            aria-hidden
          >
            {place.image_keyword}
          </span>
        )}

        {/* Type icon */}
        <span className="text-6xl opacity-40 select-none" aria-hidden>
          {icon}
        </span>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="font-syne text-2xl font-bold text-white-soft mb-1 leading-tight">
          {place.name}
        </h3>
        <p className="text-muted text-sm mb-4">
          {place.country}
          {place.type ? ` · ${place.type}` : ''}
        </p>

        {place.description && (
          <p className="text-white-soft/65 text-sm leading-relaxed line-clamp-3 mb-5">
            {place.description}
          </p>
        )}

        {/* Tags */}
        {place.tags && place.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {place.tags.slice(0, 5).map(tag => (
              <span
                key={tag}
                className="rounded-full bg-white/[0.07] border border-white/10 px-3 py-0.5 text-xs text-lavender"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Add button */}
        <button
          onClick={() => !isAdded && onAdd(place.id)}
          disabled={isAdded}
          className={`w-full rounded-xl py-3.5 font-syne font-semibold text-sm transition-all active:scale-[0.98] ${
            isAdded
              ? 'bg-violet-accent/15 text-violet-accent border border-violet-accent/25 cursor-default'
              : 'bg-violet-accent hover:bg-violet-accent/90 text-white-soft'
          }`}
        >
          {isAdded ? '✦ Saved to list' : 'Add to List'}
        </button>
      </div>
    </article>
  )
}

// ─── Compact place card (horizontal scroll rows) ──────────────────────────────

function PlaceCard({
  place,
  isAdded,
  onAdd,
}: {
  place: Place
  isAdded: boolean
  onAdd: (id: string) => void
}) {
  const gradient = TYPE_GRADIENT[place.type] ?? FALLBACK_GRADIENT
  const icon = TYPE_ICON[place.type] ?? '✦'

  return (
    <article className="snap-start shrink-0 w-44 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-violet-accent/30 transition-colors">
      {/* Image area */}
      <div
        className={`relative h-28 bg-gradient-to-br ${gradient} bg-indigo-deep flex items-center justify-center overflow-hidden`}
      >
        {place.image_keyword && (
          <span
            className="absolute font-syne font-black text-white select-none pointer-events-none whitespace-nowrap"
            style={{ fontSize: '72px', opacity: 0.04 }}
            aria-hidden
          >
            {place.image_keyword}
          </span>
        )}
        <span className="text-3xl opacity-45 select-none" aria-hidden>
          {icon}
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="font-syne font-semibold text-white-soft text-sm leading-snug line-clamp-2 mb-1">
          {place.name}
        </p>
        <p className="text-xs text-muted mb-3">{place.country}</p>

        {/* Add button — small circle icon */}
        <button
          onClick={() => !isAdded && onAdd(place.id)}
          disabled={isAdded}
          aria-label={isAdded ? `${place.name} saved to list` : `Add ${place.name} to list`}
          className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold transition-all active:scale-90 ${
            isAdded
              ? 'bg-violet-accent/20 text-violet-accent border border-violet-accent/30'
              : 'border border-white/20 text-muted hover:border-violet-accent hover:text-violet-accent'
          }`}
        >
          {isAdded ? '✓' : '+'}
        </button>
      </div>
    </article>
  )
}
