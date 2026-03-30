'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import BucketListCard from '@/components/BucketListCard'
import CategoryBadge from '@/components/CategoryBadge'
import { CATEGORIES, type BucketListItem, type ItemStatus } from '@/lib/types'
import { logEvent } from '@/lib/events'

type SortOption = 'date' | 'priority' | 'az'

interface Props {
  items: BucketListItem[]
  userId: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildUrl(pathname: string, base: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(base.toString())
  for (const [key, val] of Object.entries(updates)) {
    if (!val) next.delete(key)
    else next.set(key, val)
  }
  const qs = next.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ListFilters({ items, userId }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  // Derive state from URL params
  const tab = (searchParams.get('tab') ?? 'want') as ItemStatus
  const qParam = searchParams.get('q') ?? ''
  const selectedCats = useMemo(
    () => searchParams.get('cat')?.split(',').filter(Boolean) ?? [],
    [searchParams]
  )
  const sort = (searchParams.get('sort') ?? 'date') as SortOption

  // Local state for text input so typing is instant
  const [searchInput, setSearchInput] = useState(qParam)

  // Keep local input in sync when URL changes externally (e.g. browser back)
  useEffect(() => {
    setSearchInput(qParam)
  }, [qParam])

  // Debounce search input → push to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const url = buildUrl(pathname, searchParams, { q: searchInput || null })
      startTransition(() => router.replace(url, { scroll: false }))
      if (searchInput && searchInput !== qParam) {
        logEvent(userId, 'list_filtered', { filter_type: 'search', value: searchInput })
      }
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  // ── Param update helpers ─────────────────────────────────────────────────

  function navigate(updates: Record<string, string | null>) {
    const url = buildUrl(pathname, searchParams, updates)
    startTransition(() => router.replace(url, { scroll: false }))
  }

  function setTab(next: ItemStatus) {
    navigate({ tab: next === 'want' ? null : next })
  }

  function toggleCategory(cat: string) {
    const next = selectedCats.includes(cat)
      ? selectedCats.filter(c => c !== cat)
      : [...selectedCats, cat]
    navigate({ cat: next.length ? next.join(',') : null })
    logEvent(userId, 'list_filtered', {
      filter_type: 'category',
      value: cat,
      active: !selectedCats.includes(cat),
    })
  }

  function setSort(next: SortOption) {
    navigate({ sort: next === 'date' ? null : next })
    logEvent(userId, 'list_sorted', { sort_by: next })
  }

  function clearFilters() {
    setSearchInput('')
    navigate({ q: null, cat: null, sort: null })
  }

  // ── Filtering + sorting (client-side) ────────────────────────────────────

  const tabItems = useMemo(() => items.filter(i => i.status === tab), [items, tab])

  const filteredItems = useMemo(() => {
    let result = tabItems

    if (qParam) {
      const lower = qParam.toLowerCase()
      result = result.filter(
        item =>
          item.destination_name.toLowerCase().includes(lower) ||
          item.country.toLowerCase().includes(lower)
      )
    }

    if (selectedCats.length > 0) {
      result = result.filter(item => selectedCats.includes(item.category))
    }

    const sorted = [...result]
    if (sort === 'az') {
      sorted.sort((a, b) => a.destination_name.localeCompare(b.destination_name))
    } else if (sort === 'priority') {
      sorted.sort(
        (a, b) =>
          b.priority - a.priority ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } else {
      sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    return sorted
  }, [tabItems, qParam, selectedCats, sort])

  const wantCount = items.filter(i => i.status === 'want').length
  const visitedCount = items.filter(i => i.status === 'visited').length
  const hasActiveFilters = !!qParam || selectedCats.length > 0 || sort !== 'date'

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-white/10 pb-1 mb-5">
        <TabButton active={tab === 'want'} count={wantCount} onClick={() => setTab('want')}>
          Someday
        </TabButton>
        <TabButton active={tab === 'visited'} count={visitedCount} onClick={() => setTab('visited')}>
          Been There
        </TabButton>
      </div>

      {/* ── Search + Sort ───────────────────────────────────────────────── */}
      <div className="flex gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none select-none">
            ⌕
          </span>
          <input
            type="search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search destinations or countries…"
            className="w-full rounded-xl bg-white/5 border border-white/10 pl-8 pr-4 py-2.5 text-sm text-white-soft placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-accent transition"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white-soft transition-colors text-xs"
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
            <option value="priority">Priority</option>
            <option value="az">A – Z</option>
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">
            ▾
          </span>
        </div>
      </div>

      {/* ── Category chips ──────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button
          onClick={() => navigate({ cat: null })}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            selectedCats.length === 0
              ? 'bg-violet-accent/20 border-violet-accent/40 text-lavender'
              : 'border-white/10 text-muted hover:text-white-soft hover:border-white/20'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => {
          const active = selectedCats.includes(cat)
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`transition-all ${active ? 'ring-2 ring-violet-accent rounded-full' : 'opacity-60 hover:opacity-100'}`}
            >
              <CategoryBadge category={cat} size="sm" />
            </button>
          )
        })}
      </div>

      {/* ── Count + clear ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted">
          {hasActiveFilters ? (
            <>
              Showing{' '}
              <span className="text-white-soft font-semibold">{filteredItems.length}</span>
              {' '}of{' '}
              <span className="text-white-soft font-semibold">{tabItems.length}</span>
              {' '}destination{tabItems.length !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              <span className="text-white-soft font-semibold">{tabItems.length}</span>
              {' '}destination{tabItems.length !== 1 ? 's' : ''}
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

      {/* ── Items grid or empty states ──────────────────────────────────── */}
      {tabItems.length === 0 ? (
        <TabEmptyState tab={tab} />
      ) : filteredItems.length === 0 ? (
        <FilterEmptyState query={qParam} categories={selectedCats} onClear={clearFilters} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredItems.map(item => (
            <BucketListCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
        active
          ? 'text-white-soft border-b-2 border-violet-accent -mb-[1px]'
          : 'text-muted hover:text-white-soft/80'
      }`}
    >
      {children}
      <span
        className={`rounded-full px-1.5 py-0.5 text-xs ${
          active ? 'bg-violet-accent/20 text-lavender' : 'bg-white/10 text-muted'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function TabEmptyState({ tab }: { tab: ItemStatus }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4 select-none">{tab === 'want' ? '✦' : '🌍'}</div>
      <h2 className="font-syne text-xl font-bold text-white-soft mb-2">
        {tab === 'want' ? 'Start dreaming' : 'No visited places yet'}
      </h2>
      <p className="text-muted text-sm max-w-xs">
        {tab === 'want'
          ? 'Add the places and experiences you want to have someday.'
          : 'Mark destinations as visited when you experience them.'}
      </p>
      {tab === 'want' && (
        <Link
          href="/list/new"
          className="mt-6 rounded-xl bg-violet-accent hover:bg-violet-accent/90 px-5 py-2.5 font-syne font-semibold text-white-soft text-sm transition-colors"
        >
          Add your first destination
        </Link>
      )}
    </div>
  )
}

function FilterEmptyState({
  query,
  categories,
  onClear,
}: {
  query: string
  categories: string[]
  onClear: () => void
}) {
  const description =
    query && categories.length > 0
      ? `"${query}" in ${categories.join(', ')}`
      : query
      ? `"${query}"`
      : categories.join(', ')

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4 select-none">🔍</div>
      <h2 className="font-syne text-xl font-bold text-white-soft mb-2">No results found</h2>
      <p className="text-muted text-sm max-w-xs mb-6">
        Nothing matched {description}. Try a different search or remove some filters.
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
