'use client'

import Avatar from '@/components/Avatar'
import type { ListEntry, FriendBucketItem, BucketListStatus } from '@/lib/types'

// ─── Style maps ───────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<BucketListStatus, string> = {
  wishlist:  'bg-lavender/10    text-lavender     border-lavender/20',
  planning:  'bg-violet-accent/10 text-violet-accent border-violet-accent/20',
  completed: 'bg-pink-accent/10  text-pink-accent   border-pink-accent/20',
}

const STATUS_LABEL: Record<BucketListStatus, string> = {
  wishlist:  '✦ Wishlist',
  planning:  '📅 Planning',
  completed: '✓ Completed',
}

const TYPE_ICON: Record<string, string> = {
  city:       '🏙',
  nature:     '🌿',
  experience: '✨',
  food:       '🍜',
}

// Full static class strings required for Tailwind to include them at build time
const TYPE_STRIP: Record<string, string> = {
  city:       'bg-violet-accent',
  nature:     'bg-emerald-500',
  experience: 'bg-pink-accent',
  food:       'bg-amber-500',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  entry: ListEntry
  friendMatches: FriendBucketItem[]
  onClick: () => void
}

export default function BucketListCard({ entry, friendMatches, onClick }: Props) {
  const { place, status, target_date } = entry
  const strip = TYPE_STRIP[place.type] ?? 'bg-violet-accent'

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] hover:border-violet-accent/35 hover:bg-white/[0.05] active:scale-[0.98] transition-all overflow-hidden"
    >
      {/* Coloured type accent strip */}
      <div className={`h-1 w-full ${strip} opacity-50`} />

      <div className="p-4">
        {/* Type icon + status badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-xl select-none" aria-hidden>
            {TYPE_ICON[place.type] ?? '✦'}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_BADGE[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>

        {/* Place name */}
        <h3 className="font-brice-condensed font-bold text-white-soft leading-snug line-clamp-2 mb-0.5">
          {place.name}
        </h3>

        {/* Country */}
        <p className="text-xs text-muted mb-3">{place.country}</p>

        {/* Vibes (max 2) */}
        {place.vibes && place.vibes.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {place.vibes.slice(0, 2).map(vibe => (
              <span
                key={vibe}
                className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-lavender"
              >
                {vibe}
              </span>
            ))}
          </div>
        )}

        {/* Target date */}
        {target_date && (
          <p className="text-xs text-muted flex items-center gap-1 mb-2">
            <span aria-hidden>🗓</span>
            {new Date(target_date).toLocaleDateString('en-AU', {
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}

        {/* Social proof */}
        {friendMatches.length > 0 && <SocialProof matches={friendMatches} />}
      </div>
    </button>
  )
}

// ─── Social proof ─────────────────────────────────────────────────────────────

function SocialProof({ matches }: { matches: FriendBucketItem[] }) {
  if (matches.length >= 3) {
    return (
      <p className="text-xs text-muted flex items-center gap-1.5 mt-1">
        <span aria-hidden>👥</span>
        <span>{matches.length} friends want this too</span>
      </p>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex -space-x-1">
        {matches.slice(0, 2).map(m => (
          <Avatar
            key={m.user_id}
            avatarUrl={m.avatar_url}
            username={m.username}
            size={20}
            className="ring-1 ring-indigo-deep"
          />
        ))}
      </div>
      <span className="text-xs text-muted">
        {matches.length === 1
          ? `${matches[0].username} wants this`
          : `${matches[0].username} + 1 want this`}
      </span>
    </div>
  )
}
