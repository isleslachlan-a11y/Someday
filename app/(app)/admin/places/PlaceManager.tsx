'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, Trash2, MapPin, ExternalLink, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminDeletePlace } from '@/app/actions/adminPlaces'
import type { Place } from '@/lib/types'

const TYPE_ICON: Record<string, string> = {
  destination: '🗺',
  experience:  '✨',
}

const TYPE_OPTIONS = ['all', 'city', 'nature', 'experience', 'food'] as const
type TypeFilter = (typeof TYPE_OPTIONS)[number]

interface Props {
  places: Place[]
  taggedCount: number
}

export default function PlaceManager({ places: initialPlaces, taggedCount }: Props) {
  const [places, setPlaces]         = useState<Place[]>(initialPlaces)
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [confirmId, setConfirmId]   = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return places.filter(p => {
      const matchesType = typeFilter === 'all' || p.type === typeFilter
      const matchesSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.country.toLowerCase().includes(search.toLowerCase()) ||
        (p.region ?? '').toLowerCase().includes(search.toLowerCase())
      return matchesType && matchesSearch
    })
  }, [places, search, typeFilter])

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(placeId: string, placeName: string) {
    setDeletingId(placeId)
    const result = await adminDeletePlace(placeId)
    setDeletingId(null)
    setConfirmId(null)

    if (result.error) {
      toast.error(result.error)
    } else {
      setPlaces(prev => prev.filter(p => p.id !== placeId))
      toast.success(`"${placeName}" removed from database`)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>

      {/* Stats */}
      <p className="font-nunito text-[#131936]/50 text-[13px] mb-4">
        {places.length} places in database
        {filtered.length !== places.length && (
          <span className="text-[#f89a14]"> · {filtered.length} shown</span>
        )}
        <span className="text-[#131936]/30"> · </span>
        <span className={taggedCount === places.length ? 'text-[#16a34a]' : 'text-[#f89a14]'}>
          {taggedCount}/{places.length} tagged
        </span>
      </p>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f89a14] shrink-0" />
        <input
          id="admin-place-search"
          name="admin-place-search"
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, country, region…"
          className="w-full rounded-full border border-[#fcd99a] bg-white pl-9 pr-4 py-2.5 font-nunito text-[14px] text-[#131936] placeholder:text-[#131936]/40 focus:outline-none focus:ring-2 focus:ring-[#f89a14]/30"
        />
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-4">
        {TYPE_OPTIONS.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`shrink-0 px-3 py-1.5 rounded-full border font-nunito text-[12px] font-medium transition-all capitalize ${
              typeFilter === t
                ? 'bg-[#f89a14] border-[#f89a14] text-white'
                : 'bg-white border-[#fcd99a] text-[#131936]/60'
            }`}
          >
            {t === 'all' ? `All (${places.length})` : `${TYPE_ICON[t] ?? '✦'} ${t}`}
          </button>
        ))}
      </div>

      {/* Place list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-nunito text-[#131936]/40 text-[14px]">No places match</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(place => (
            <div key={place.id}>
              <div className="bg-white rounded-2xl border border-[#fcd99a]/40 overflow-hidden">
                <div className="flex items-center gap-3 p-3">

                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#fcd99a]/30 flex items-center justify-center">
                    {place.image_thumb_url ? (
                      <Image
                        src={place.image_thumb_url}
                        alt={place.name}
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-[20px]">{TYPE_ICON[place.type] ?? '✦'}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-[#131936] text-[14px] truncate">
                      {place.name}
                    </p>
                    <p className="font-nunito text-[#131936]/50 text-[12px] flex items-center gap-1">
                      <MapPin size={10} className="shrink-0" />
                      {[place.country, place.region].filter(Boolean).join(' · ')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-nunito text-[10px] text-[#131936]/40 capitalize">
                        {TYPE_ICON[place.type]} {place.type}
                      </span>
                      <span className="text-[#131936]/20 text-[10px]">·</span>
                      <span className="font-nunito text-[10px] text-[#131936]/40">
                        {place.popularity}/100
                      </span>
                      {place.trending && (
                        <>
                          <span className="text-[#131936]/20 text-[10px]">·</span>
                          <span className="font-nunito text-[10px] text-[#f89a14]">trending</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/places/${place.id}`}
                      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#fcd99a]/30 transition-colors"
                      aria-label="View place"
                    >
                      <ExternalLink size={15} className="text-[#131936]/40" />
                    </Link>
                    <Link
                      href={`/admin/places/${place.id}/tag`}
                      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#fcd99a]/30 transition-colors"
                      aria-label="Tag place"
                    >
                      <Tag size={15} className="text-[#131936]/40" />
                    </Link>
                    <button
                      onClick={() => setConfirmId(confirmId === place.id ? null : place.id)}
                      disabled={deletingId === place.id}
                      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors disabled:opacity-40"
                      aria-label="Delete place"
                    >
                      <Trash2
                        size={15}
                        className={confirmId === place.id ? 'text-red-500' : 'text-[#131936]/30'}
                      />
                    </button>
                  </div>
                </div>

                {/* Inline confirm */}
                {confirmId === place.id && (
                  <div className="border-t border-red-100 bg-red-50/50 px-4 py-3 flex items-center justify-between gap-3">
                    <p className="font-nunito text-[13px] text-red-600 flex-1 leading-snug">
                      Delete <strong>{place.name}</strong>? This also removes it from all users&apos; lists.
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-3 py-1.5 rounded-full border border-[#fcd99a] bg-white font-nunito text-[12px] text-[#131936] font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => void handleDelete(place.id, place.name)}
                        disabled={deletingId === place.id}
                        className="px-3 py-1.5 rounded-full bg-red-500 text-white font-nunito text-[12px] font-semibold disabled:opacity-50"
                      >
                        {deletingId === place.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
