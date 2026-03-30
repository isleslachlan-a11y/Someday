'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toggleStatus } from '@/app/actions/bucketList'
import CategoryBadge from '@/components/CategoryBadge'
import type { BucketListItem, ItemStatus } from '@/lib/types'

interface Props {
  item: BucketListItem
}

function PriorityStars({ priority }: { priority: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`Priority ${priority} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < priority ? 'text-violet-accent' : 'text-white/15'}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  )
}

export default function BucketListCard({ item }: Props) {
  const [isPending, startTransition] = useTransition()

  const nextStatus: ItemStatus = item.status === 'want' ? 'visited' : 'want'

  function handleToggle() {
    startTransition(async () => {
      await toggleStatus(item.id, nextStatus)
    })
  }

  return (
    <article
      className={`group relative rounded-2xl border bg-white/5 p-5 transition-opacity ${
        isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'
      } ${
        item.status === 'visited'
          ? 'border-pink-accent/20'
          : 'border-white/10 hover:border-violet-accent/40'
      }`}
    >
      {/* Top row: badge + priority */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <CategoryBadge category={item.category} />
        <PriorityStars priority={item.priority} />
      </div>

      {/* Destination */}
      <h3 className="font-syne text-lg font-semibold text-white-soft leading-snug mb-1">
        {item.destination_name}
      </h3>

      {/* Location */}
      <p className="text-sm text-muted mb-3">
        {item.country}
        {item.region ? ` · ${item.region}` : ''}
      </p>

      {/* Notes preview */}
      {item.notes && (
        <p className="text-sm text-white-soft/60 line-clamp-2 mb-4">{item.notes}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-auto pt-1">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            item.status === 'want'
              ? 'bg-pink-accent/15 text-pink-accent hover:bg-pink-accent/25 border border-pink-accent/20'
              : 'bg-white/5 text-muted hover:bg-white/10 border border-white/10'
          }`}
        >
          {isPending
            ? '…'
            : item.status === 'want'
            ? '✓ Mark visited'
            : '↩ Move to Someday'}
        </button>

        <Link
          href={`/list/${item.id}/edit`}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-muted hover:text-white-soft hover:border-white/20 transition-colors"
        >
          Edit
        </Link>
      </div>
    </article>
  )
}
