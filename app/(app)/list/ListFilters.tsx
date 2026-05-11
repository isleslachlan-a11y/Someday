'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import BucketListCard from '@/components/BucketListCard'
import HomePlaceCard from '@/components/HomePlaceCard'
import { updateListEntry, removeFromList } from '@/app/actions/bucketList'
import { logEvent } from '@/lib/events'
import type { ListEntry, FriendBucketItem, BucketListStatus } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: 'all' | BucketListStatus; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'wishlist',  label: 'Wishlist' },
  { value: 'planning',  label: 'Planning' },
  { value: 'completed', label: 'Completed' },
]

const TYPE_OPTIONS: { value: string | null; label: string; icon: string }[] = [
  { value: null,         label: 'All types',   icon: '✦' },
  { value: 'city',       label: 'Cities',      icon: '🏙' },
  { value: 'nature',     label: 'Nature',      icon: '🌿' },
  { value: 'experience', label: 'Experiences', icon: '✨' },
  { value: 'food',       label: 'Food',        icon: '🍜' },
]

const STATUS_LABEL: Record<BucketListStatus, string> = {
  wishlist:  '✦ Wishlist',
  planning:  '📅 Planning',
  completed: '✓ Completed',
}

const STATUS_ACTIVE: Record<BucketListStatus, string> = {
  wishlist:  'bg-[#f08c21]/10 border-[#f08c21]/30 text-[#f08c21]',
  planning:  'bg-[#f08c21]/10 border-[#f08c21]/30 text-[#f08c21]',
  completed: 'bg-[#f08c21]/10 border-[#f08c21]/30 text-[#f08c21]',
}

type SortOption = 'date' | 'az'

// ─── URL helper ───────────────────────────────────────────────────────────────

function buildUrl(
  pathname: string,
  base: URLSearchParams,
  updates: Record<string, string | null>
) {
  const next = new URLSearchParams(base.toString())
  for (const [key, val] of Object.entries(updates)) {
    if (!val) next.delete(key)
    else next.set(key, val)
  }
  const qs = next.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  entries: ListEntry[]
  userId: string
  friendItems: FriendBucketItem[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ListFilters({ entries: initialEntries, userId, friendItems }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const [entries, setEntries] = useState<ListEntry[]>(initialEntries)
  const [selectedEntry, setSelectedEntry] = useState<ListEntry | null>(null)
  const [showFilterSheet, setShowFilterSheet] = useState(false)

  useEffect(() => {
    setEntries(initialEntries)
  }, [initialEntries])

  // ── URL param state ────────────────────────────────────────────────────────

  const status = (searchParams.get('status') ?? 'all') as 'all' | BucketListStatus
  const selectedType = searchParams.get('type') ?? null
  const qParam = searchParams.get('q') ?? ''
  const sort = (searchParams.get('sort') ?? 'date') as SortOption

  const [searchInput, setSearchInput] = useState(qParam)

  useEffect(() => {
    setSearchInput(qParam)
  }, [qParam])

  useEffect(() => {
    const t = setTimeout(() => {
      const url = buildUrl(pathname, searchParams, { q: searchInput || null })
      startTransition(() => router.replace(url, { scroll: false }))
      if (searchInput && searchInput !== qParam) {
        logEvent(userId, 'list_filtered', { filter_type: 'search', value: searchInput })
      }
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  function navigate(updates: Record<string, string | null>) {
    const url = buildUrl(pathname, searchParams, updates)
    startTransition(() => router.replace(url, { scroll: false }))
  }

  function setStatus(next: 'all' | BucketListStatus) {
    navigate({ status: next === 'all' ? null : next })
    logEvent(userId, 'list_filtered', { filter_type: 'status', value: next })
  }

  function setType(next: string | null) {
    navigate({ type: next })
    logEvent(userId, 'list_filtered', { filter_type: 'type', value: next ?? 'all' })
  }

  function setSort(next: SortOption) {
    navigate({ sort: next === 'date' ? null : next })
    logEvent(userId, 'list_sorted', { sort_by: next })
  }

  function clearFilters() {
    setSearchInput('')
    navigate({ q: null, type: null, sort: null, status: null })
  }

  // ── Social proof map ───────────────────────────────────────────────────────

  const friendsByPlace = useMemo(() => {
    const map = new Map<string, FriendBucketItem[]>()
    for (const fi of friendItems) {
      if (!fi.place_id) continue
      const existing = map.get(fi.place_id) ?? []
      map.set(fi.place_id, [...existing, fi])
    }
    return map
  }, [friendItems])

  // Suppress unused warning — friendsByPlace is kept for BucketListCard compatibility
  void friendsByPlace

  // ── Filtering + sorting ───────────────────────────────────────────────────

  const statusFiltered = useMemo(
    () => (status === 'all' ? entries : entries.filter(e => e.status === status)),
    [entries, status]
  )

  const filtered = useMemo(() => {
    let result = statusFiltered

    if (selectedType) {
      result = result.filter(e => e.place.type === selectedType)
    }

    if (qParam) {
      const q = qParam.toLowerCase()
      result = result.filter(
        e =>
          e.place.name.toLowerCase().includes(q) ||
          e.place.country.toLowerCase().includes(q)
      )
    }

    const sorted = [...result]
    if (sort === 'az') {
      sorted.sort((a, b) => a.place.name.localeCompare(b.place.name))
    } else {
      sorted.sort(
        (a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
      )
    }
    return sorted
  }, [statusFiltered, selectedType, qParam, sort])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length }
    for (const e of entries) {
      c[e.status] = (c[e.status] ?? 0) + 1
    }
    return c
  }, [entries])

  const hasActiveFilters = !!qParam || !!selectedType || sort !== 'date' || status !== 'all'

  // ── Optimistic mutations ──────────────────────────────────────────────────

  async function handleSave(
    id: string,
    data: {
      status: BucketListStatus
      target_date: string | null
      notes: string | null
      completed_at?: string | null
      completion_note?: string | null
    }
  ) {
    const snapshot = entries
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, ...data } : e)))
    setSelectedEntry(null)

    const result = await updateListEntry(id, data)
    if (result.error) {
      setEntries(snapshot)
      toast.error('Failed to update. Please try again.')
    }
  }

  async function handleRemove(id: string) {
    const snapshot = entries
    setEntries(prev => prev.filter(e => e.id !== id))
    setSelectedEntry(null)
    toast.success('Removed from your list.')

    const result = await removeFromList(id)
    if (result.error) {
      setEntries(snapshot)
      toast.error('Failed to remove. Please try again.')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Search + Filter button ─────────────────────────────────────── */}
      <div className="flex gap-2 mb-4">
        {/* Search input */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none select-none">
            <Search size={15} className="text-[#f08c21]" />
          </span>
          <input
            type="search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search your Someday's…"
            className="w-full rounded-full bg-white border border-[#fcd99a] pl-9 pr-4 py-2.5 text-[14px] text-[#131936] font-nunito placeholder:text-[#131936]/40 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30 transition"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#131936]/40 hover:text-[#131936] text-xs transition-colors"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter button */}
        <button
          onClick={() => setShowFilterSheet(true)}
          className={`relative flex items-center justify-center w-11 h-11 rounded-full border transition-all shrink-0 ${
            hasActiveFilters
              ? 'bg-[#f08c21] border-[#f08c21]'
              : 'bg-white border-[#fcd99a]'
          }`}
          aria-label="Filters"
        >
          <SlidersHorizontal
            size={18}
            className={hasActiveFilters ? 'text-white' : 'text-[#131936]'}
          />
          {hasActiveFilters && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#131936] border-2 border-[#fff9f0]" />
          )}
        </button>
      </div>

      {/* ── Grid or empty states ────────────────────────────────────────── */}
      {statusFiltered.length === 0 ? (
        <EmptyStatus status={status} />
      ) : filtered.length === 0 ? (
        <EmptySearch onClear={clearFilters} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((entry, index) => {
            // Build a Place-shaped object from PlaceSnap + the extra fields fetched in page.tsx
            const p = entry.place as unknown as Record<string, unknown>
            const placeForCard = {
              ...entry.place,
              region: null,
              popularity: (p.popularity as number) ?? 0,
              trending: false,
              image_url: (p.image_url as string | null) ?? null,
              image_thumb_url: (p.image_thumb_url as string | null) ?? null,
              unsplash_photo_id: null,
              unsplash_attribution: null,
              created_at: entry.added_at,
              lat: (p.lat as number | null) ?? null,
              lng: (p.lng as number | null) ?? null,
            }
            return (
              <HomePlaceCard
                key={entry.id}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                place={placeForCard as any}
                isAdded
                onAdd={() => {}}
                onRemove={() => setSelectedEntry(entry)}
                index={index % 4}
              />
            )
          })}
        </div>
      )}

      {/* ── List item sheet ─────────────────────────────────────────────── */}
      {selectedEntry && (
        <ListItemSheet
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSave={handleSave}
          onRemove={handleRemove}
        />
      )}

      {/* ── Filter sheet ────────────────────────────────────────────────── */}
      {showFilterSheet && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setShowFilterSheet(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter options"
            className="fixed inset-x-0 bottom-0 z-50 bg-[#fff9f0] rounded-t-3xl border-t border-[#fcd99a]/50 pb-[env(safe-area-inset-bottom)]"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-10 h-1 rounded-full bg-[#131936]/20" />
            </div>

            <div className="px-5 pb-8 space-y-6">

              {/* Header row */}
              <div className="flex items-center justify-between">
                <h2 className="font-syne font-bold text-[#131936] text-[18px]">Filter & Sort</h2>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setSearchInput('')
                      navigate({ q: null, type: null, sort: null, status: null })
                      setShowFilterSheet(false)
                    }}
                    className="font-nunito text-[#f08c21] text-[13px]"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Status */}
              <div>
                <p className="font-syne font-bold text-[#131936] text-[13px] uppercase tracking-wider mb-3">
                  Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(({ value, label }) => {
                    const active = status === value
                    return (
                      <button
                        key={value}
                        onClick={() => setStatus(value)}
                        className={`px-4 py-2 rounded-full border font-nunito text-[13px] font-medium transition-all ${
                          active
                            ? 'bg-[#f08c21] border-[#f08c21] text-white'
                            : 'bg-white border-[#fcd99a] text-[#131936]'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Type */}
              <div>
                <p className="font-syne font-bold text-[#131936] text-[13px] uppercase tracking-wider mb-3">
                  Type
                </p>
                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map(({ value, label, icon }) => {
                    const active = selectedType === value
                    return (
                      <button
                        key={value ?? 'all'}
                        onClick={() => setType(value)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full border font-nunito text-[13px] font-medium transition-all ${
                          active
                            ? 'bg-[#f08c21] border-[#f08c21] text-white'
                            : 'bg-white border-[#fcd99a] text-[#131936]'
                        }`}
                      >
                        <span aria-hidden>{icon}</span>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sort */}
              <div>
                <p className="font-syne font-bold text-[#131936] text-[13px] uppercase tracking-wider mb-3">
                  Sort by
                </p>
                <div className="flex gap-2">
                  {([
                    { value: 'date', label: 'Date added' },
                    { value: 'az',   label: 'A – Z' },
                  ] as { value: SortOption; label: string }[]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSort(value)}
                      className={`flex-1 py-2.5 rounded-full border font-nunito text-[13px] font-medium transition-all ${
                        sort === value
                          ? 'bg-[#f08c21] border-[#f08c21] text-white'
                          : 'bg-white border-[#fcd99a] text-[#131936]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Apply */}
              <button
                onClick={() => setShowFilterSheet(false)}
                className="w-full h-12 rounded-full bg-[#131936] text-white font-syne font-bold text-[15px]"
              >
                Show results
              </button>

            </div>
          </div>
        </>
      )}
    </>
  )
}

// ─── Bottom sheet ─────────────────────────────────────────────────────────────

function ListItemSheet({
  entry,
  onClose,
  onSave,
  onRemove,
}: {
  entry: ListEntry
  onClose: () => void
  onSave: (
    id: string,
    data: {
      status: BucketListStatus
      target_date: string | null
      notes: string | null
      completed_at?: string | null
      completion_note?: string | null
    }
  ) => Promise<void>
  onRemove: (id: string) => Promise<void>
}) {
  const [form, setForm] = useState({
    status: entry.status,
    target_date: entry.target_date ? entry.target_date.slice(0, 7) : '',
    notes: entry.notes ?? '',
  })
  const [completionNote, setCompletionNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const showCompletionPrompt =
    form.status === 'completed' && entry.status !== 'completed'

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave(note?: string | null) {
    setSaving(true)
    const isNewCompletion = form.status === 'completed' && entry.status !== 'completed'
    await onSave(entry.id, {
      status: form.status,
      target_date: form.target_date ? `${form.target_date}-01` : null,
      notes: form.notes.trim() || null,
      ...(isNewCompletion ? {
        completed_at: new Date().toISOString(),
        completion_note: note ?? null,
      } : {}),
    })
    setSaving(false)
  }

  async function handleRemove() {
    setRemoving(true)
    await onRemove(entry.id)
    setRemoving(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={entry.place.name}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[#fff9f0] border-t border-[#fcd99a]/50 max-h-[88vh] overflow-y-auto animate-slide-up"
      >
        {/* Drag handle */}
        <div className="sticky top-0 bg-[#fff9f0]/95 backdrop-blur-sm z-10 flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#131936]/20" />
        </div>

        <div className="px-6 pb-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pt-2 pb-5 border-b border-[#fcd99a]/50 mb-5">
            <div>
              <h2 className="font-syne text-xl font-bold text-[#131936] leading-tight">
                {entry.place.name}
              </h2>
              <p className="text-[#131936]/50 text-sm mt-1">
                {entry.place.country}
                {entry.place.type ? ` · ${entry.place.type}` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 w-8 h-8 rounded-full border border-[#fcd99a]/40 flex items-center justify-center text-[#131936]/50 hover:text-[#131936] hover:border-[#fcd99a]/60 transition-colors text-sm"
            >
              ✕
            </button>
          </div>

          {/* Place details */}
          {entry.place.description && (
            <p className="text-[#131936]/60 text-sm leading-relaxed mb-5">
              {entry.place.description}
            </p>
          )}

          {/* Tags */}
          {entry.place.tags && entry.place.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {entry.place.tags.map(tag => (
                <span
                  key={tag}
                  className="rounded-full bg-[#fcd99a]/20 border border-[#fcd99a]/40 px-2.5 py-0.5 text-xs text-[#f08c21]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Vibes */}
          {entry.place.vibes && entry.place.vibes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {entry.place.vibes.map(vibe => (
                <span
                  key={vibe}
                  className="rounded-full bg-[#f08c21]/10 border border-[#f08c21]/20 px-2.5 py-0.5 text-xs text-[#f08c21]"
                >
                  {vibe}
                </span>
              ))}
            </div>
          )}

          {/* Intensity */}
          {entry.place.intensity && (
            <p className="text-xs text-[#131936]/50 mb-6">
              Intensity:{' '}
              <span className="text-[#f08c21] capitalize">{entry.place.intensity}</span>
            </p>
          )}

          {/* ── List settings ────────────────────────────────────────────── */}
          <div className="border-t border-[#fcd99a]/50 pt-5 space-y-5">

            {/* Status selector */}
            <div>
              <label className="block text-xs font-semibold text-[#131936]/50 uppercase tracking-wider mb-3">
                Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['wishlist', 'planning', 'completed'] as BucketListStatus[]).map(s => {
                  const active = form.status === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update('status', s)}
                      className={`rounded-xl border py-2.5 text-xs font-semibold capitalize transition-all ${
                        active
                          ? STATUS_ACTIVE[s]
                          : 'border-[#fcd99a]/40 text-[#131936]/50 hover:border-[#fcd99a]/60 hover:text-[#131936]'
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Completion prompt */}
            {showCompletionPrompt && (
              <div className="rounded-2xl border border-[#f08c21]/20 bg-[#f08c21]/5 p-4">
                <p className="font-syne font-bold text-[#131936] text-sm mb-1">
                  You did it. ✦
                </p>
                <p className="text-xs text-[#131936]/50 mb-3">
                  Add a note? (optional)
                </p>
                <textarea
                  rows={2}
                  value={completionNote}
                  onChange={e => setCompletionNote(e.target.value)}
                  placeholder="How was it? Any tips for friends…"
                  className="w-full rounded-xl bg-white border border-[#fcd99a]/40 px-4 py-2.5 text-sm text-[#131936] placeholder:text-[#131936]/40 focus:outline-none focus:ring-2 focus:ring-[#f08c21] transition resize-none mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(completionNote.trim() || null)}
                    disabled={saving}
                    className="flex-1 rounded-xl bg-[#f08c21]/20 hover:bg-[#f08c21]/30 border border-[#f08c21]/30 py-2.5 text-sm font-semibold text-[#f08c21] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => handleSave(null)}
                    disabled={saving}
                    className="flex-1 rounded-xl border border-[#fcd99a]/40 py-2.5 text-sm text-[#131936]/50 hover:text-[#131936] transition-colors disabled:opacity-50"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            {/* Target date */}
            <div>
              <label className="block text-xs font-semibold text-[#131936]/50 uppercase tracking-wider mb-2">
                Target date{' '}
                <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                type="month"
                value={form.target_date}
                onChange={e => update('target_date', e.target.value)}
                className="w-full rounded-xl bg-white border border-[#fcd99a]/40 px-4 py-2.5 text-sm text-[#131936] focus:outline-none focus:ring-2 focus:ring-[#f08c21] transition"
              />
              {form.target_date && (
                <button
                  type="button"
                  onClick={() => update('target_date', '')}
                  className="mt-1.5 text-xs text-[#131936]/50 hover:text-[#f08c21] transition-colors"
                >
                  Clear date
                </button>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-[#131936]/50 uppercase tracking-wider mb-2">
                Notes{' '}
                <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
                placeholder="Best time to visit, who to go with…"
                className="w-full rounded-xl bg-white border border-[#fcd99a]/40 px-4 py-2.5 text-sm text-[#131936] placeholder:text-[#131936]/40 focus:outline-none focus:ring-2 focus:ring-[#f08c21] transition resize-none"
              />
            </div>

            {/* Save */}
            {!showCompletionPrompt && (
              <button
                onClick={() => handleSave()}
                disabled={saving || removing}
                className="w-full rounded-xl bg-[#131936] hover:bg-[#131936]/90 disabled:opacity-50 py-3.5 font-syne font-semibold text-white text-sm transition-all active:scale-[0.98]"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}

            {/* Remove */}
            <div className="pt-2 border-t border-[#fcd99a]/50">
              {confirmRemove ? (
                <div className="rounded-xl border border-[#f08c21]/30 bg-[#f08c21]/5 p-4">
                  <p className="text-sm text-[#131936] mb-3">
                    Remove <strong>{entry.place.name}</strong> from your list?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmRemove(false)}
                      disabled={removing}
                      className="flex-1 rounded-lg border border-[#fcd99a]/40 px-3 py-2 text-sm text-[#131936]/50 hover:text-[#131936] transition-colors"
                    >
                      Keep it
                    </button>
                    <button
                      onClick={handleRemove}
                      disabled={removing}
                      className="flex-1 rounded-lg bg-[#f08c21]/20 hover:bg-[#f08c21]/30 border border-[#f08c21]/30 px-3 py-2 text-sm font-semibold text-[#f08c21] transition-colors disabled:opacity-50"
                    >
                      {removing ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRemove(true)}
                  disabled={removing}
                  className="w-full py-2 text-center text-sm text-[#131936]/50 hover:text-[#f08c21] transition-colors"
                >
                  Remove from list
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyStatus({ status }: { status: 'all' | BucketListStatus }) {
  const content = {
    all:       { icon: '✦',  heading: 'Your list is empty',       body: 'Add places from the home page or search the catalogue.' },
    wishlist:  { icon: '✦',  heading: 'Nothing on your wishlist', body: 'Save places from the home screen to start dreaming.' },
    planning:  { icon: '📅', heading: 'Not planning yet',          body: "Move items from Wishlist to Planning when you're ready to book." },
    completed: { icon: '🌍', heading: 'No completed trips yet',   body: 'Mark places as completed when you experience them.' },
  }[status]

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4 select-none">{content.icon}</div>
      <h2 className="font-syne text-xl font-bold text-[#131936] mb-2">{content.heading}</h2>
      <p className="text-[#131936]/50 text-sm max-w-xs">{content.body}</p>
    </div>
  )
}

function EmptySearch({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4 select-none">🔍</div>
      <h2 className="font-syne text-xl font-bold text-[#131936] mb-2">No results</h2>
      <p className="text-[#131936]/50 text-sm max-w-xs mb-6">
        Try a different search or remove some filters.
      </p>
      <button
        onClick={onClear}
        className="rounded-xl border border-[#f08c21]/40 hover:bg-[#f08c21]/10 px-5 py-2.5 text-sm font-semibold text-[#f08c21] transition-colors"
      >
        Clear filters
      </button>
    </div>
  )
}

// Keep BucketListCard referenced to avoid tree-shaking — used for type compatibility
export { BucketListCard as _BucketListCard }
