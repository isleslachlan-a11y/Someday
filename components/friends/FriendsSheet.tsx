'use client'

/**
 * FriendsSheet — bottom sheet (mobile) / right drawer (desktop) with three tabs.
 *
 * Tab 1 — Friends:   accepted friends with overlap count + link to profile.
 * Tab 2 — Requests:  incoming pending requests; badge shows count.
 * Tab 3 — Discover:  search + "people you may know".
 *
 * Data is fetched lazily via Server Actions when the sheet first opens,
 * then cached in state for the session.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X, Search, Users, UserPlus, Compass, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Avatar from '@/components/Avatar'
import FriendshipButton from '@/components/friends/FriendshipButton'
import {
  getFriendsAction,
  getPendingRequestsAction,
  getFriendOverlapsAction,
  searchUsersAction,
  getSuggestedUsersAction,
  acceptFriendRequestAction,
  declineFriendRequestAction,
} from '@/app/actions/friends'
import { getOrCreateDMAction } from '@/app/actions/messaging'
import type { UserProfile } from '@/lib/types'
import type { PendingRequest, UserSearchResult, FriendshipStatus } from '@/lib/friends'

type Tab = 'friends' | 'requests' | 'discover'

interface Props {
  /** Shown as a button that opens the sheet (treated as a client-side trigger). */
  initialFriendCount: number
}

export default function FriendsSheet({ initialFriendCount }: Props) {
  const [isOpen, setIsOpen]       = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('friends')
  const router                    = useRouter()

  // Friends tab
  const [friends, setFriends]           = useState<UserProfile[] | null>(null)
  const [overlapCounts, setOverlapCounts] = useState<Record<string, number>>({})
  const [friendsLoaded, setFriendsLoaded] = useState(false)

  // Requests tab
  const [requests, setRequests]     = useState<PendingRequest[] | null>(null)
  const [requestsLoaded, setRequestsLoaded] = useState(false)

  // Discover tab
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[] | null>(null)
  const [isSearching, setIsSearching]   = useState(false)
  const [suggestions, setSuggestions]   = useState<UserSearchResult[] | null>(null)
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startTransition] = useTransition()

  // ── Open / close ───────────────────────────────────────────────────────────

  function open() {
    setIsOpen(true)
    setActiveTab('friends')
  }

  function close() {
    setIsOpen(false)
  }

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  // Prevent body scroll while open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // ── Data loading ───────────────────────────────────────────────────────────

  // Load friends + overlaps when sheet opens on friends tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'friends' || friendsLoaded) return
    setFriendsLoaded(true)
    startTransition(async () => {
      const [friendList, overlaps] = await Promise.all([
        getFriendsAction(),
        getFriendOverlapsAction(),
      ])
      setFriends(friendList)
      setOverlapCounts(overlaps)
    })
  }, [isOpen, activeTab, friendsLoaded])

  // Load requests when tab opens
  useEffect(() => {
    if (!isOpen || activeTab !== 'requests' || requestsLoaded) return
    setRequestsLoaded(true)
    startTransition(async () => {
      const reqs = await getPendingRequestsAction()
      setRequests(reqs)
    })
  }, [isOpen, activeTab, requestsLoaded])

  // Load suggestions when discover tab opens
  useEffect(() => {
    if (!isOpen || activeTab !== 'discover' || suggestionsLoaded) return
    setSuggestionsLoaded(true)
    startTransition(async () => {
      const s = await getSuggestedUsersAction()
      setSuggestions(s)
    })
  }, [isOpen, activeTab, suggestionsLoaded])

  // ── Debounced search ───────────────────────────────────────────────────────

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) {
      setSearchResults(null)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchUsersAction(q.trim())
        setSearchResults(results)
      } catch {
        /* ignore */
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }, [])

  // ── Request actions ────────────────────────────────────────────────────────

  function handleAcceptRequest(friendshipId: string) {
    startTransition(async () => {
      const result = await acceptFriendRequestAction(friendshipId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setRequests(prev => prev?.filter(r => r.friendshipId !== friendshipId) ?? null)
      // Invalidate friends cache so it reloads
      setFriends(null)
      setFriendsLoaded(false)
      setOverlapCounts({})
    })
  }

  function handleDeclineRequest(friendshipId: string) {
    startTransition(async () => {
      const result = await declineFriendRequestAction(friendshipId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setRequests(prev => prev?.filter(r => r.friendshipId !== friendshipId) ?? null)
    })
  }

  // ── Pending count ──────────────────────────────────────────────────────────

  const pendingCount = requests?.length ?? 0

  // ── Render ─────────────────────────────────────────────────────────────────

  const friendCount = friends?.length ?? initialFriendCount

  return (
    <>
      {/* Trigger button — rendered inline by the profile page */}
      <button
        onClick={open}
        className="flex flex-col items-center gap-0.5 rounded-2xl border border-[#fcd99a]/40 bg-white px-4 py-5 text-center hover:border-[#f89a14]/30 hover:bg-white transition-colors cursor-pointer"
      >
        <p className="font-display text-3xl font-bold text-[#f89a14]">{friendCount}</p>
        <p className="text-[#131936]/50 text-xs mt-1">Friends</p>
      </button>

      {/* Sheet overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-stretch lg:justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
            aria-hidden
          />

          {/* Panel */}
          <div className="relative w-full max-h-[88vh] lg:w-[400px] lg:max-h-full lg:h-full bg-[#fff9f0] rounded-t-3xl lg:rounded-none border-t border-[#fcd99a]/40 lg:border-t-0 lg:border-l flex flex-col shadow-2xl">

            {/* Drag handle (mobile only) */}
            <div className="lg:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#131936]/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#fcd99a]/40 shrink-0">
              <h2 className="font-display text-lg font-bold text-[#131936]">Friends</h2>
              <button
                onClick={close}
                className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white text-[#131936]/50 hover:text-[#131936] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#fcd99a]/40 shrink-0">
              {([
                { id: 'friends',  label: 'Friends',  Icon: Users },
                { id: 'requests', label: 'Requests', Icon: UserPlus },
                { id: 'discover', label: 'Discover', Icon: Compass },
              ] as { id: Tab; label: string; Icon: React.ElementType }[]).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold font-nunito transition-colors relative ${
                    activeTab === id
                      ? 'text-[#f89a14]'
                      : 'text-[#131936]/50 hover:text-[#131936]'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                  {id === 'requests' && pendingCount > 0 && (
                    <span className="absolute top-2 right-[20%] flex items-center justify-center w-4 h-4 rounded-full bg-pink-accent text-white text-[10px] font-bold leading-none">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                  {activeTab === id && (
                    <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-[#f89a14] rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'friends' && (
                <FriendsTab
                  friends={friends}
                  overlapCounts={overlapCounts}
                  isLoading={friends === null}
                  onMessage={async (friendId) => {
                    const { conversationId, error } = await getOrCreateDMAction(friendId)
                    if (error || !conversationId) { toast.error(error ?? 'Could not open chat'); return }
                    setIsOpen(false)
                    router.push(`/messages/${conversationId}`)
                  }}
                />
              )}
              {activeTab === 'requests' && (
                <RequestsTab
                  requests={requests}
                  isLoading={requests === null}
                  onAccept={handleAcceptRequest}
                  onDecline={handleDeclineRequest}
                />
              )}
              {activeTab === 'discover' && (
                <DiscoverTab
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                  searchResults={searchResults}
                  isSearching={isSearching}
                  suggestions={suggestions}
                  suggestionsLoading={suggestions === null}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Friends tab ──────────────────────────────────────────────────────────────

function FriendsTab({
  friends,
  overlapCounts,
  isLoading,
  onMessage,
}: {
  friends: UserProfile[] | null
  overlapCounts: Record<string, number>
  isLoading: boolean
  onMessage: (friendId: string) => Promise<void>
}) {
  const [messaging, setMessaging] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-[#f89a14]/30 border-t-violet-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (!friends || friends.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <div className="text-3xl mb-3 select-none">✦</div>
        <p className="text-[#131936]/50 text-sm">No friends yet — find people to add</p>
        <p className="text-[#131936]/30 text-xs mt-1">Search in Discover</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#fcd99a]/20">
      {friends.map(friend => {
        const count = overlapCounts[friend.id] ?? 0
        return (
          <div key={friend.id} className="flex items-center gap-3 px-5 py-4">
            <Link
              href={`/profile/${friend.username}`}
              className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              <Avatar avatarUrl={friend.avatar_url} username={friend.username ?? ''} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#131936] truncate">
                  @{friend.username ?? 'unknown'}
                </p>
                {count > 0 ? (
                  <p className="text-xs text-[#f89a14] mt-0.5">
                    {count} place{count !== 1 ? 's' : ''} in common
                  </p>
                ) : (
                  <p className="text-xs text-[#131936]/50 mt-0.5">No overlaps yet</p>
                )}
              </div>
            </Link>
            {/* Message icon button */}
            <button
              onClick={async () => {
                setMessaging(friend.id)
                await onMessage(friend.id)
                setMessaging(null)
              }}
              disabled={messaging === friend.id}
              aria-label={`Message @${friend.username}`}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-[#fcd99a]/50 text-[#131936]/50 hover:text-[#131936] hover:border-[#fcd99a]/60 transition-colors disabled:opacity-40 shrink-0"
            >
              {messaging === friend.id
                ? <div className="w-4 h-4 border-2 border-[#f89a14]/30 border-t-violet-accent rounded-full animate-spin" />
                : <MessageCircle size={16} />
              }
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Requests tab ─────────────────────────────────────────────────────────────

function RequestsTab({
  requests,
  isLoading,
  onAccept,
  onDecline,
}: {
  requests: PendingRequest[] | null
  isLoading: boolean
  onAccept: (id: string) => void
  onDecline: (id: string) => void
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-[#f89a14]/30 border-t-violet-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <div className="text-3xl mb-3 select-none">✉️</div>
        <p className="text-[#131936]/50 text-sm">No pending requests</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#fcd99a]/20">
      {requests.map(req => (
        <div key={req.friendshipId} className="flex items-center gap-3 px-5 py-4">
          <Avatar
            avatarUrl={req.profile.avatar_url}
            username={req.profile.username ?? ''}
            size={40}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#131936] truncate">
              @{req.profile.username ?? 'unknown'}
            </p>
            <p className="text-xs text-[#131936]/50 mt-0.5">
              {new Date(req.createdAt).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onAccept(req.friendshipId)}
              className="px-3 py-1.5 rounded-lg bg-[#f89a14] hover:bg-[#f89a14]/90 text-white text-xs font-semibold transition-colors min-h-[36px]"
            >
              Accept
            </button>
            <button
              onClick={() => onDecline(req.friendshipId)}
              className="px-3 py-1.5 rounded-lg border border-[#fcd99a]/50 text-[#131936]/60 hover:text-[#131936] text-xs font-semibold transition-colors min-h-[36px]"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Discover tab ─────────────────────────────────────────────────────────────

function DiscoverTab({
  searchQuery,
  onSearchChange,
  searchResults,
  isSearching,
  suggestions,
  suggestionsLoading,
}: {
  searchQuery: string
  onSearchChange: (q: string) => void
  searchResults: UserSearchResult[] | null
  isSearching: boolean
  suggestions: UserSearchResult[] | null
  suggestionsLoading: boolean
}) {
  const showSearch = searchQuery.trim().length >= 2

  return (
    <div className="flex flex-col">
      {/* Search input */}
      <div className="px-5 py-4 border-b border-white/[0.05]">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#131936]/50 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by username…"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full h-11 pl-9 pr-4 rounded-xl bg-white border border-[#fcd99a]/40 text-sm text-[#131936] placeholder:text-[#131936]/40 focus:outline-none focus:border-[#f89a14]/40 transition-colors"
          />
        </div>
      </div>

      {/* Results or suggestions */}
      {showSearch ? (
        <SearchResults results={searchResults} isSearching={isSearching} />
      ) : (
        <Suggestions suggestions={suggestions} isLoading={suggestionsLoading} />
      )}
    </div>
  )
}

function SearchResults({
  results,
  isSearching,
}: {
  results: UserSearchResult[] | null
  isSearching: boolean
}) {
  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-[#f89a14]/30 border-t-violet-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (!results) return null

  if (results.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-[#131936]/50 text-sm">No users found</p>
      </div>
    )
  }

  return (
    <UserResultList results={results} />
  )
}

function Suggestions({
  suggestions,
  isLoading,
}: {
  suggestions: UserSearchResult[] | null
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-[#f89a14]/30 border-t-violet-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-[#131936]/50 text-sm">Add more places to your list to discover people</p>
      </div>
    )
  }

  return (
    <>
      <div className="px-5 pt-4 pb-2">
        <p className="text-xs text-[#131936]/50 font-semibold uppercase tracking-wider">
          People you may know
        </p>
      </div>
      <UserResultList results={suggestions} />
    </>
  )
}

function UserResultList({ results }: { results: UserSearchResult[] }) {
  const [overrides, setOverrides] = useState<Record<string, { status: FriendshipStatus; id: string | null }>>({})

  function handleStatusChange(profileId: string, newStatus: FriendshipStatus, newId: string | null) {
    setOverrides(prev => ({ ...prev, [profileId]: { status: newStatus, id: newId } }))
  }

  return (
    <div className="divide-y divide-[#fcd99a]/20">
      {results.map(item => {
        const override    = overrides[item.profile.id]
        const status      = override?.status      ?? item.friendshipStatus
        const friendshipId = override?.id ?? item.friendshipId

        return (
          <div key={item.profile.id} className="flex items-center gap-3 px-5 py-4">
            <Avatar
              avatarUrl={item.profile.avatar_url}
              username={item.profile.username ?? ''}
              size={40}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#131936] truncate">
                @{item.profile.username ?? 'unknown'}
              </p>
              {item.profile.bio && (
                <p className="text-xs text-[#131936]/50 mt-0.5 truncate">{item.profile.bio}</p>
              )}
            </div>
            <div className="shrink-0">
              <FriendshipButton
                compact
                initialStatus={status}
                initialFriendshipId={friendshipId}
                addresseeId={item.profile.id}
                onStatusChange={(s, id) => handleStatusChange(item.profile.id, s, id)}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
