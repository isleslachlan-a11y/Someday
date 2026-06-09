'use client'

/**
 * OverlapCard — "get the trip out of the group chat" card.
 * Shows a place that the current user AND multiple friends all want to visit.
 */

import Link from 'next/link'
import Avatar from '@/components/Avatar'
import type { PlaceOverlap } from '@/lib/types'

interface Props {
  overlap: PlaceOverlap
  isAdded: boolean
  onAdd: (id: string) => void
  index?: number
}

export default function OverlapCard({ overlap, isAdded, onAdd, index = 0 }: Props) {
  const { place, matchingFriends } = overlap
  const shown = matchingFriends.slice(0, 3)
  const extra = matchingFriends.length - shown.length

  const friendNames = matchingFriends
    .slice(0, 2)
    .map(f => `@${f.username}`)
    .join(', ')
  const overflowLabel =
    matchingFriends.length > 2
      ? ` and ${matchingFriends.length - 2} ${matchingFriends.length - 2 === 1 ? 'other' : 'others'}`
      : ''

  return (
    <article
      className="w-full border-b border-[rgba(255,255,255,0.07)] px-4 py-5"
      style={{
        background: 'linear-gradient(135deg, rgba(123,79,232,0.08) 0%, rgba(123,79,232,0.03) 100%)',
        animationDelay: `${index * 40}ms`,
      }}
    >
      {/* Header label */}
      <p className="text-[11px] font-nunito font-bold text-violet-accent uppercase tracking-widest mb-3">
        ✦ You&apos;re not the only one
      </p>

      {/* Place name */}
      <h3 className="font-heading text-[20px] font-bold text-[#F0EEFF] leading-tight mb-0.5">
        {place.name}
      </h3>
      <p className="text-[12px] font-nunito text-[#9b8fc4] mb-4">
        {place.country}
        <span className="mx-1 opacity-40">·</span>
        <span className="capitalize">{place.type}</span>
      </p>

      {/* Friend overlap row */}
      <div className="flex items-center gap-3 mb-5">
        {/* Stacked avatars */}
        <div className="flex -space-x-2">
          {shown.map(f => (
            <div key={f.id} className="ring-2 ring-[#130f2a] rounded-full">
              <Avatar avatarUrl={f.avatar_url} username={f.username} size={32} />
            </div>
          ))}
          {extra > 0 && (
            <div className="w-8 h-8 rounded-full ring-2 ring-[#130f2a] bg-violet-accent/20 border border-violet-accent/30 flex items-center justify-center">
              <span className="text-[10px] font-nunito font-bold text-violet-accent">+{extra}</span>
            </div>
          )}
        </div>

        <p className="text-[13px] font-nunito text-[#9b8fc4] leading-snug">
          <span className="text-[#e8e0ff] font-medium">{friendNames}</span>
          {overflowLabel} {matchingFriends.length === 1 ? 'wants' : 'want'} to go here too
        </p>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3">
        {/* Start planning — links to /plan (CreateTripSheet opens there) */}
        <Link
          href="/plan"
          className="min-h-[44px] flex items-center justify-center flex-1 rounded-xl bg-violet-accent text-white text-[13px] font-nunito font-semibold transition-all active:scale-[0.97] hover:bg-violet-accent/90"
        >
          Start planning
        </Link>

        {!isAdded && (
          <button
            onClick={() => onAdd(place.id)}
            className="min-h-[44px] px-4 rounded-xl border border-white/15 text-[13px] font-nunito text-[#9b8fc4] hover:text-violet-accent hover:border-violet-accent/40 transition-colors"
          >
            Add to list
          </button>
        )}
      </div>
    </article>
  )
}
