'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { createBrowserClient } from '@supabase/ssr'
import Avatar from '@/components/Avatar'
import HomeViewTracker from './HomeViewTracker'
import { assembleFeed } from '@/lib/feed'
import { addPlaceToList } from '@/app/actions/bucketList'
import DailyHighlightCard from '@/components/feed/DailyHighlightCard'
import PlaceCard from '@/components/feed/PlaceCard'
import FriendActivityCard from '@/components/feed/FriendActivityCard'
import OverlapCard from '@/components/feed/OverlapCard'
import PromoCard from '@/components/feed/PromoCard'
import type { FeedItem, StoryUser } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string
  profile: { username: string; avatar_url: string | null }
  initialBucketPlaceIds: string[]
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="w-full border-b border-[rgba(255,255,255,0.07)] animate-pulse">
      <div className="h-[200px] bg-white/[0.04]" />
      <div className="px-4 py-4 space-y-2">
        <div className="h-5 w-2/3 rounded-lg bg-white/[0.06]" />
        <div className="h-3 w-1/3 rounded-lg bg-white/[0.04]" />
        <div className="h-3 w-full rounded-lg bg-white/[0.04]" />
        <div className="h-3 w-3/4 rounded-lg bg-white/[0.04]" />
      </div>
    </div>
  )
}

// ─── New-activity banner ──────────────────────────────────────────────────────

function NewActivityBanner({ onRefresh }: { onRefresh: () => void }) {
  return (
    <button
      onClick={onRefresh}
      className="w-full flex items-center justify-center gap-2 py-3 bg-violet-accent/10 border-b border-violet-accent/20 text-[13px] font-nunito font-semibold text-violet-accent transition-colors hover:bg-violet-accent/15"
    >
      <span>✦</span>
      New activity from a friend
      <span className="text-[11px] font-normal text-[#9b8fc4]">Tap to refresh</span>
    </button>
  )
}

// ─── Find-friends prompt card ─────────────────────────────────────────────────

function FindFriendsCard() {
  return (
    <div
      className="mx-4 my-2 rounded-2xl p-5 border border-pink-accent/20"
      style={{ background: 'linear-gradient(135deg, rgba(255,143,171,0.08) 0%, rgba(123,79,232,0.05) 100%)' }}
    >
      <p className="font-syne font-bold text-[#F0EEFF] text-[15px] mb-3">
        Find friends to see what they&apos;re planning ✦
      </p>
      <Link
        href="/profile"
        className="inline-flex items-center min-h-[44px] rounded-xl bg-violet-accent/20 border border-violet-accent/30 px-4 text-[13px] font-nunito font-semibold text-violet-accent hover:bg-violet-accent/30 transition-colors"
      >
        Discover people
      </Link>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

export default function HomeContent({ userId, profile, initialBucketPlaceIds }: Props) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [storiesUsers, setStoriesUsers] = useState<StoryUser[]>([])
  const [friendIds, setFriendIds] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [newActivity, setNewActivity] = useState(false)
  const [bucketPlaceIds, setBucketPlaceIds] = useState<string[]>(initialBucketPlaceIds)

  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef(0)  // track current page without stale closure

  // ── Feed loading ──────────────────────────────────────────────────────────

  const loadFeed = useCallback(async (pageNum: number, replace = false) => {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      const result = await assembleFeed(pageNum)
      if (replace) {
        setItems(result.items)
        setStoriesUsers(result.storiesUsers)
        setFriendIds(result.friendIds)
        pageRef.current = 0
        setPage(0)
      } else {
        setItems(prev => [...prev, ...result.items])
        if (pageNum === 0) {
          setStoriesUsers(result.storiesUsers)
          setFriendIds(result.friendIds)
        }
        pageRef.current = pageNum
      }
      setHasMore(result.items.length >= PAGE_SIZE)
      setNewActivity(false)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadFeed(0)
  }, [loadFeed])

  // ── Infinite scroll via IntersectionObserver ──────────────────────────────

  useEffect(() => {
    if (!hasMore || loading) return
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingRef.current && hasMore) {
          const next = pageRef.current + 1
          setPage(next)
          loadFeed(next)
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadFeed])

  // ── Realtime: friend completions ──────────────────────────────────────────

  useEffect(() => {
    if (friendIds.length === 0) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
    )

    const channel = supabase
      .channel(`home-friend-completions:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bucket_list_items' },
        payload => {
          const row = payload.new as Record<string, unknown>
          if (
            row.status === 'completed' &&
            row.user_id !== userId &&
            friendIds.includes(row.user_id as string)
          ) {
            setNewActivity(true)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [friendIds, userId])

  // ── Add to list ───────────────────────────────────────────────────────────

  async function handleAdd(placeId: string) {
    if (bucketPlaceIds.includes(placeId)) return
    setBucketPlaceIds(prev => [...prev, placeId])
    toast.success('Added to your list ✦')
    const result = await addPlaceToList(placeId)
    if (result.error) {
      setBucketPlaceIds(prev => prev.filter(id => id !== placeId))
      toast.error('Something went wrong. Please try again.')
    }
  }

  // ── Render item ───────────────────────────────────────────────────────────

  function renderItem(item: FeedItem, index: number) {
    const key = `${item.type}-${index}`

    switch (item.type) {
      case 'daily_highlight':
        return (
          <DailyHighlightCard
            key={key}
            place={item.data}
            isAdded={bucketPlaceIds.includes(item.data.id)}
            onAdd={handleAdd}
            index={index}
          />
        )
      case 'place':
        return (
          <PlaceCard
            key={key}
            place={item.data}
            isAdded={bucketPlaceIds.includes(item.data.id)}
            onAdd={handleAdd}
            index={index}
          />
        )
      case 'friend_activity':
        return (
          <FriendActivityCard
            key={key}
            activity={item.data}
            isAdded={bucketPlaceIds.includes(item.data.place_id)}
            isOnYourList={bucketPlaceIds.includes(item.data.place_id)}
            onAdd={handleAdd}
            index={index}
          />
        )
      case 'overlap':
        return (
          <OverlapCard
            key={key}
            overlap={item.data}
            isAdded={bucketPlaceIds.includes(item.data.place.id)}
            onAdd={handleAdd}
            index={index}
          />
        )
      case 'promotional':
        return <PromoCard key={key} promo={item.data} index={index} />
    }
  }

  // Detect new-user state (no friends, place cards only)
  const hasNoSocialContent =
    !loading &&
    items.every(i => i.type === 'place' || i.type === 'daily_highlight' || i.type === 'promotional')

  return (
    <>
      <HomeViewTracker userId={userId} />

      {/* ── Sticky mobile top bar ──────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-30 bg-indigo-deep/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 h-14 shrink-0">
        <span className="font-syne text-lg font-bold text-white-soft">
          <span className="text-violet-accent">✦</span> Someday
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/submit"
            aria-label="Submit a place"
            className="flex items-center justify-center w-10 h-11 rounded-full"
          >
            <span
              className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-accent"
              style={{ boxShadow: '0 4px 12px rgba(123,79,232,0.4)' }}
            >
              <Plus size={20} strokeWidth={2.5} className="text-white" />
            </span>
          </Link>
          <Link href="/profile" aria-label="Your profile">
            <Avatar avatarUrl={profile.avatar_url} username={profile.username} size={32} />
          </Link>
        </div>
      </header>

      <main className="min-h-screen bg-indigo-deep">

        {/* ── Desktop page heading ─────────────────────────────────────── */}
        <div className="hidden md:flex items-center justify-between px-8 pt-8 pb-6 max-w-3xl mx-auto">
          <div>
            <h1 className="font-syne text-2xl font-bold text-white-soft">
              Hey, {profile.username}<span className="text-violet-accent"> ✦</span>
            </h1>
            <p className="text-muted text-sm mt-1">Discover your next someday.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <Link
              href="/submit"
              aria-label="Submit a place"
              className="flex items-center justify-center w-11 h-11 rounded-full"
            >
              <span
                className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-accent"
                style={{ boxShadow: '0 4px 12px rgba(123,79,232,0.4)' }}
              >
                <Plus size={20} strokeWidth={2.5} className="text-white" />
              </span>
            </Link>
            <Link href="/profile" aria-label="Your profile">
              <Avatar avatarUrl={profile.avatar_url} username={profile.username} size={40} />
            </Link>
          </div>
        </div>

        {/* ── New-activity banner ──────────────────────────────────────── */}
        {newActivity && <NewActivityBanner onRefresh={() => loadFeed(0, true)} />}

        {/* ── Stories row ─────────────────────────────────────────────── */}
        {!loading && storiesUsers.length > 0 && (
          <div className="flex gap-4 overflow-x-auto scrollbar-none px-4 py-4 border-b border-[rgba(255,255,255,0.07)]">
            {/* Current user (always first) */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-[52px] h-[52px] rounded-full border-2 border-white/20 flex items-center justify-center bg-white/[0.04] overflow-hidden">
                <Avatar avatarUrl={profile.avatar_url} username={profile.username} size={44} />
              </div>
              <span className="text-[10px] font-nunito text-[#9b8fc4] max-w-[52px] truncate text-center">
                You
              </span>
            </div>

            {storiesUsers.slice(0, 7).map(u => (
              <Link
                key={u.id}
                href={`/profile/${u.username}`}
                className="flex flex-col items-center gap-1 shrink-0"
              >
                <div
                  className="w-[52px] h-[52px] rounded-full overflow-hidden"
                  style={{
                    boxShadow: u.hasUnread
                      ? '0 0 0 2px #7B4FE8'
                      : '0 0 0 2px rgba(255,255,255,0.1)',
                  }}
                >
                  <Avatar avatarUrl={u.avatar_url} username={u.username} size={52} />
                </div>
                <span className="text-[10px] font-nunito text-[#9b8fc4] max-w-[52px] truncate text-center">
                  {u.username}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* ── Feed ──────────────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto lg:border-x lg:border-[rgba(255,255,255,0.07)]">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              {items.map((item, index) => renderItem(item, index))}

              {/* Find-friends prompt after 3rd item for new users */}
              {hasNoSocialContent && items.length >= 3 && (
                <FindFriendsCard />
              )}

              {/* Sentinel for infinite scroll */}
              <div ref={sentinelRef} className="h-1" />

              {/* Load more indicator */}
              {!hasMore && items.length > 0 && (
                <p className="text-center text-xs text-[#5a4f7a] py-8 font-nunito">
                  You&apos;ve seen everything for now ✦
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </>
  )
}
