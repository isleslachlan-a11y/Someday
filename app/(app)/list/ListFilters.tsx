'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import BucketListCard from '@/components/BucketListCard'
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
  wishlist:  'bg-lavender/15    border-lavender/30    text-lavender',
  planning:  'bg-violet-accent/15 border-violet-accent/30 text-violet-accent',
  completed: 'bg-pink-accent/15  border-pink-accent/30  text-pink-accent',
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

  // Local entries state — allows optimistic updates without page refresh
  const [entries, setEntries] = useState<ListEntry[]>(initialEntries)
  const [selectedEntry, setSelectedEntry] = useState<ListEntry | null>(null)

  // Sync when server data changes (e.g. navigation back)
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

  // ── Social proof map (place_id → matching friends) ─────────────────────────

  const friendsByPlace = useMemo(() => {
    const map = new Map<string, FriendBucketItem[]>()
    for (const fi of friendItems) {
      if (!fi.place_id) continue
      const existing = map.get(fi.place_id) ?? []
      map.set(fi.place_id, [...existing, fi])
    }
    return map
  }, [friendItems])

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

  const hasActiveFilters = !!qParam || !!selectedType || sort !== 'date'

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
      {/* ── Status filter (pill tabs) ──────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-5">
        {STATUS_OPTIONS.map(({ value, label }) => {
          const active = status === value
          const count = counts[value] ?? 0
          return (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={`flex items-center gap-2 shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all ${
                active
                  ? 'bg-violet-accent/15 border-violet-accent/40 text-violet-accent'
                  : 'border-white/10 text-muted hover:border-white/20 hover:text-white-soft'
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    active ? 'bg-violet-accent/20 text-lavender' : 'bg-white/10 text-muted'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Type chips (horizontal scroll) ─────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4 mb-5">
        {TYPE_OPTIONS.map(({ value, label, icon }) => {
          const active = selectedType === value
          return (
            <button
              key={value ?? 'all'}
              onClick={() => setType(value)}
              className={`flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                active
                  ? 'bg-violet-accent/15 border-violet-accent/40 text-lavender'
                  : 'border-white/10 text-muted hover:border-white/20 hover:text-white-soft'
              }`}
            >
              <span aria-hidden>{icon}</span>
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Search + Sort ──────────────────────────────────────────────── */}
      <div className="flex gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none select-none text-sm">
            ⌕
          </span>
          <input
            type="search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search places or countries…"
            className="w-full rounded-xl bg-white/5 border border-white/10 pl-8 pr-4 py-2.5 text-sm text-white-soft placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-accent transition"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white-soft text-xs transition-colors"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="appearance-none rounded-xl bg-white/5 border border-white/10 pl-3 pr-8 py-2.5 text-sm text-white-soft focus:outline-none focus:ring-2 focus:ring-violet-accent transition cursor-pointer"
          >
            <option value="date">Date added</option>
            <option value="az">A – Z</option>
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">
            ▾
          </span>
        </div>
      </div>

      {/* ── Count + clear ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted">
          {hasActiveFilters ? (
            <>
              Showing{' '}
              <span className="text-white-soft font-semibold">{filtered.length}</span>
              {' '}of{' '}
              <span className="text-white-soft font-semibold">{statusFiltered.length}</span>
              {' '}place{statusFiltered.length !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              <span className="text-white-soft font-semibold">{statusFiltered.length}</span>
              {' '}place{statusFiltered.length !== 1 ? 's' : ''}
            </>
          )}
        </p>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-lavender hover:text-white-soft transition-colors flex items-center gap-1"
          >
            Clear filters ✕
          </button>
        )}
      </div>

      {/* ── Grid or empty states ────────────────────────────────────────── */}
      {statusFiltered.length === 0 ? (
        <EmptyStatus status={status} />
      ) : filtered.length === 0 ? (
        <EmptySearch onClear={clearFilters} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map(entry => (
            <BucketListCard
              key={entry.id}
              entry={entry}
              friendMatches={friendsByPlace.get(entry.place_id) ?? []}
              onClick={() => setSelectedEntry(entry)}
            />
          ))}
        </div>
      )}

      {/* ── Bottom sheet ────────────────────────────────────────────────── */}
      {selectedEntry && (
        <ListItemSheet
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSave={handleSave}
          onRemove={handleRemove}
        />
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

  // Show prompt when status first moves to 'completed' and it wasn't already completed
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
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-indigo-deep border-t border-white/10 max-h-[88vh] overflow-y-auto animate-slide-up"
      >
        {/* Drag handle */}
        <div className="sticky top-0 bg-indigo-deep/95 backdrop-blur-sm z-10 flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-6 pb-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pt-2 pb-5 border-b border-white/10 mb-5">
            <div>
              <h2 className="font-syne text-xl font-bold text-white-soft leading-tight">
                {entry.place.name}
              </h2>
              <p className="text-muted text-sm mt-1">
                {entry.place.country}
                {entry.place.type ? ` · ${entry.place.type}` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted hover:text-white-soft hover:border-white/20 transition-colors text-sm"
            >
              ✕
            </button>
          </div>

          {/* Place details */}
          {entry.place.description && (
            <p className="text-white-soft/65 text-sm leading-relaxed mb-5">
              {entry.place.description}
            </p>
          )}

          {/* Tags */}
          {entry.place.tags && entry.place.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {entry.place.tags.map(tag => (
                <span
                  key={tag}
                  className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs text-lavender"
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
                  className="rounded-full bg-violet-accent/10 border border-violet-accent/20 px-2.5 py-0.5 text-xs text-violet-accent"
                >
                  {vibe}
                </span>
              ))}
            </div>
          )}

          {/* Intensity */}
          {entry.place.intensity && (
            <p className="text-xs text-muted mb-6">
              Intensity:{' '}
              <span className="text-lavender capitalize">{entry.place.intensity}</span>
            </p>
          )}

          {/* ── List settings ────────────────────────────────────────────── */}
          <div className="border-t border-white/10 pt-5 space-y-5">

            {/* Status selector */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-3">
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
                          : 'border-white/10 text-muted hover:border-white/20 hover:text-white-soft'
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Completion prompt — shown when status first moves to completed */}
            {showCompletionPrompt && (
              <div className="rounded-2xl border border-pink-accent/20 bg-pink-accent/5 p-4">
                <p className="font-syne font-bold text-white-soft text-sm mb-1">
                  You did it. ✦
                </p>
                <p className="text-xs text-muted mb-3">
                  Add a note? (optional)
                </p>
                <textarea
                  rows={2}
                  value={completionNote}
                  onChange={e => setCompletionNote(e.target.value)}
                  placeholder="How was it? Any tips for friends…"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white-soft placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-pink-accent transition resize-none mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(completionNote.trim() || null)}
                    disabled={saving}
                    className="flex-1 rounded-xl bg-pink-accent/20 hover:bg-pink-accent/30 border border-pink-accent/30 py-2.5 text-sm font-semibold text-pink-accent transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => handleSave(null)}
                    disabled={saving}
                    className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-muted hover:text-white-soft transition-colors disabled:opacity-50"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            {/* Target date */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Target date{' '}
                <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                type="month"
                value={form.target_date}
                onChange={e => update('target_date', e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white-soft focus:outline-none focus:ring-2 focus:ring-violet-accent transition"
              />
              {form.target_date && (
                <button
                  type="button"
                  onClick={() => update('target_date', '')}
                  className="mt-1.5 text-xs text-muted hover:text-lavender transition-colors"
                >
                  Clear date
                </button>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Notes{' '}
                <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
                placeholder="Best time to visit, who to go with…"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white-soft placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-accent transition resize-none"
              />
            </div>

            {/* Save — hidden when completion prompt is showing (it has its own Save/Skip) */}
            {!showCompletionPrompt && (
              <button
                onClick={() => handleSave()}
                disabled={saving || removing}
                className="w-full rounded-xl bg-violet-accent hover:bg-violet-accent/90 disabled:opacity-50 py-3.5 font-syne font-semibold text-white-soft text-sm transition-all active:scale-[0.98]"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}

            {/* Remove */}
            <div className="pt-2 border-t border-white/10">
              {confirmRemove ? (
                <div className="rounded-xl border border-pink-accent/30 bg-pink-accent/5 p-4">
                  <p className="text-sm text-white-soft mb-3">
                    Remove <strong>{entry.place.name}</strong> from your list?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmRemove(false)}
                      disabled={removing}
                      className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-muted hover:text-white-soft transition-colors"
                    >
                      Keep it
                    </button>
                    <button
                      onClick={handleRemove}
                      disabled={removing}
                      className="flex-1 rounded-lg bg-pink-accent/20 hover:bg-pink-accent/30 border border-pink-accent/30 px-3 py-2 text-sm font-semibold text-pink-accent transition-colors disabled:opacity-50"
                    >
                      {removing ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRemove(true)}
                  disabled={removing}
                  className="w-full py-2 text-center text-sm text-muted hover:text-pink-accent transition-colors"
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
    planning:  { icon: '📅', heading: 'Not planning yet',          body: 'Move items from Wishlist to Planning when you\'re ready to book.' },
    completed: { icon: '🌍', heading: 'No completed trips yet',   body: 'Mark places as completed when you experience them.' },
  }[status]

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4 select-none">{content.icon}</div>
      <h2 className="font-syne text-xl font-bold text-white-soft mb-2">{content.heading}</h2>
      <p className="text-muted text-sm max-w-xs">{content.body}</p>
    </div>
  )
}

function EmptySearch({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4 select-none">🔍</div>
      <h2 className="font-syne text-xl font-bold text-white-soft mb-2">No results</h2>
      <p className="text-muted text-sm max-w-xs mb-6">
        Try a different search or remove some filters.
      </p>
      <button
        onClick={onClear}
        className="rounded-xl border border-violet-accent/40 hover:bg-violet-accent/10 px-5 py-2.5 text-sm font-semibold text-lavender transition-colors"
      >
        Clear filters
      </button>
    </div>
  )
}
