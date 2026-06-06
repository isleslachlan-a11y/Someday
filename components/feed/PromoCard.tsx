'use client'

/**
 * PromoCard — admin-created editorial content.
 * Intentionally subtle ("From Someday" label) — editorial, not ad-like.
 * TODO: Replace gradient with real image via next/image once image_url is populated.
 */

import Link from 'next/link'
import type { PromoPost } from '@/lib/types'

interface Props {
  promo: PromoPost
  index?: number
}

export default function PromoCard({ promo, index = 0 }: Props) {
  const isInternal = promo.cta_url?.startsWith('/')

  return (
    <article
      className="w-full border-b border-[rgba(255,255,255,0.07)]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Image area */}
      <div className="relative h-[220px] bg-gradient-to-br from-[#1a1035] via-[#130f2a] to-[#0d0b1a] overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Subtle watermark with title words */}
        <span
          className="absolute font-brice-condensed font-black text-white select-none pointer-events-none text-center px-8 leading-tight"
          style={{ fontSize: '72px', opacity: 0.04 }}
          aria-hidden
        >
          {promo.title.split(' ')[0]}
        </span>

        {/* "From Someday" badge */}
        <span className="absolute top-4 left-4 text-[11px] font-nunito text-[#5a4f7a] rounded-full border border-white/[0.08] bg-black/30 px-2.5 py-0.5">
          From Someday
        </span>

        {/* Title over image */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <h3 className="font-brice-condensed text-[20px] font-bold text-white leading-tight">
            {promo.title}
          </h3>
        </div>
      </div>

      {/* Body + CTA */}
      <div className="px-4 py-4">
        {promo.body && (
          <p className="text-[13px] font-nunito text-[#9b8fc4] leading-relaxed line-clamp-3 mb-4">
            {promo.body}
          </p>
        )}

        {promo.cta_label && promo.cta_url && (
          isInternal ? (
            <Link
              href={promo.cta_url}
              className="inline-flex items-center min-h-[44px] rounded-xl border border-violet-accent/50 px-5 text-[13px] font-nunito font-semibold text-violet-accent hover:bg-violet-accent/10 transition-colors"
            >
              {promo.cta_label}
            </Link>
          ) : (
            <a
              href={promo.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center min-h-[44px] rounded-xl border border-violet-accent/50 px-5 text-[13px] font-nunito font-semibold text-violet-accent hover:bg-violet-accent/10 transition-colors"
            >
              {promo.cta_label} ↗
            </a>
          )
        )}
      </div>
    </article>
  )
}
