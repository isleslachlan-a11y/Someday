'use client'

/**
 * FriendActivityCard — shows when a friend marks a place as completed.
 * The Strava-equivalent card: social proof + discovery.
 */

import Image from 'next/image'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import type { FriendActivity } from '@/lib/types'
import UnsplashAttribution from '@/components/ui/UnsplashAttribution'

const TYPE_GRADIENT: Record<string, string> = {
  city:       'from-violet-accent/25 via-violet-accent/8 to-transparent',
  nature:     'from-emerald-500/20 via-emerald-500/5 to-transparent',
  experience: 'from-pink-accent/20 via-pink-accent/5 to-transparent',
  food:       'from-amber-500/20 via-amber-500/5 to-transparent',
}
const FALLBACK = 'from-violet-accent/20 via-violet-accent/5 to-transparent'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

interface Props {
  activity: FriendActivity
  /** Whether the current user also has this place saved. */
  isOnYourList: boolean
  isAdded: boolean
  onAdd: (id: string) => void
  index?: number
}

export default function FriendActivityCard({
  activity,
  isOnYourList,
  isAdded,
  onAdd,
  index = 0,
}: Props) {
  const { place, profile, completion_note, completed_at } = activity
  const gradient = TYPE_GRADIENT[place.type] ?? FALLBACK

  return (
    <article
      className="w-full border-b border-[rgba(255,255,255,0.07)]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Link href={`/profile/${profile.username}`}>
          <Avatar avatarUrl={profile.avatar_url} username={profile.username} size={32} />
        </Link>
        <p className="flex-1 text-[13px] font-nunito text-[#9b8fc4] leading-snug">
          <span className="text-[#e8e0ff] font-semibold">@{profile.username}</span>
          {' '}checked this off their list
        </p>
        <span className="shrink-0 text-[11px] font-nunito text-[#5a4f7a]">
          {relativeTime(completed_at)}
        </span>
      </div>

      {/* Image area */}
      <Link href={`/places/${place.id}`} className="block">
        <div
          className={`relative h-[180px] bg-gradient-to-br ${gradient} bg-[#0d0b1a] overflow-hidden flex items-center justify-center`}
        >
          {/* Unsplash photo or gradient placeholder */}
          {place.image_url ? (
            <Image
              src={place.image_url}
              alt={place.name}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover"
            />
          ) : place.image_keyword ? (
            <span
              className="absolute font-brice-condensed font-black text-white select-none pointer-events-none whitespace-nowrap"
              style={{ fontSize: '100px', opacity: 0.04 }}
              aria-hidden
            >
              {place.image_keyword}
            </span>
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          {/* Attribution — required by Unsplash API terms */}
          <div className="absolute bottom-2 right-3">
            <UnsplashAttribution attribution={place.unsplash_attribution ?? null} />
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="px-4 py-4">
        <h3 className="font-brice-condensed text-[17px] font-bold text-[#F0EEFF] leading-tight mb-0.5">
          {place.name}
        </h3>
        <p className="text-[12px] font-nunito text-[#9b8fc4] mb-3">
          {place.country}
          <span className="mx-1 opacity-40">·</span>
          <span className="capitalize">{place.type}</span>
        </p>

        {/* Completion note or description */}
        {completion_note ? (
          <blockquote className="border-l-2 border-violet-accent pl-3 mb-4">
            <p className="text-[13px] font-nunito italic text-[#9b8fc4] line-clamp-3 leading-relaxed">
              &ldquo;{completion_note}&rdquo;
            </p>
          </blockquote>
        ) : place.description ? (
          <p className="text-[13px] font-nunito text-[#e8e0ff]/60 leading-relaxed line-clamp-2 mb-4">
            {place.description}
          </p>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => !isAdded && onAdd(place.id)}
            disabled={isAdded}
            className={`min-h-[44px] px-4 rounded-xl text-[13px] font-nunito font-semibold transition-all active:scale-[0.97] ${
              isAdded
                ? 'text-violet-accent cursor-default'
                : 'text-[#9b8fc4] hover:text-violet-accent'
            }`}
          >
            {isAdded ? 'On your list ✦' : 'Add to your list'}
          </button>

          {/* Overlap moment */}
          {isOnYourList && (
            <span className="text-[13px] font-nunito font-semibold text-[#FF8FAB]">
              On your list too ✦
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
