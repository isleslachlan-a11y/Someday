'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
  useMemo,
  FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Send } from 'lucide-react'
import Avatar from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'
import {
  addTripItem,
  removeTripItem,
  voteOnTripItem,
  removeVote,
  searchPlaces,
  createTripChatAction,
  addMemberToTripAction,
} from '@/app/actions/trips'
import {
  sendMessageAction,
  getMessagesAction,
  getMessageAction,
  markAsReadAction,
} from '@/app/actions/messaging'
import { getFriendsAction } from '@/app/actions/friends'
import type { Trip, TripItem, TripItemVote, Message } from '@/lib/types'
import type { UserProfile } from '@/lib/types'

const TYPE_ICON: Record<string, string> = {
  destination: '🗺',
  experience:  '✨',
}

type TripTab = 'experiences' | 'chat' | 'map'

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  trip: Trip
  tripItems: TripItem[]
  memberProfiles: Record<string, { username: string; avatar_url: string | null }>
  myListPlaces: { id: string; name: string; country: string; type: string }[]
  userId: string
  initialMessages: Message[]
  initialTab: TripTab
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function TripDetail({
  trip,
  tripItems: initialItems,
  memberProfiles,
  myListPlaces,
  userId,
  initialMessages,
  initialTab,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TripTab>(initialTab)
  const [tripItems, setTripItems] = useState(initialItems)
  const [showAdd, setShowAdd] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleVote(tripItemId: string, vote: boolean) {
    const existing = tripItems
      .find(i => i.id === tripItemId)
      ?.votes.find(v => v.user_id === userId)

    if (existing?.vote === vote) {
      setTripItems(prev =>
        prev.map(item =>
          item.id === tripItemId
            ? { ...item, votes: item.votes.filter(v => v.user_id !== userId) }
            : item
        )
      )
      startTransition(async () => {
        const result = await removeVote(tripItemId, trip.id)
        if (result.error) {
          toast.error('Could not update vote.')
          setTripItems(initialItems)
        }
      })
      return
    }

    const newVote: TripItemVote = {
      id: 'optimistic',
      trip_item_id: tripItemId,
      user_id: userId,
      vote,
      created_at: new Date().toISOString(),
    }
    setTripItems(prev =>
      prev.map(item =>
        item.id === tripItemId
          ? { ...item, votes: [...item.votes.filter(v => v.user_id !== userId), newVote] }
          : item
      )
    )
    startTransition(async () => {
      const result = await voteOnTripItem(tripItemId, trip.id, vote)
      if (result.error) {
        toast.error('Could not save vote.')
        setTripItems(initialItems)
      }
    })
  }

  function handleRemoveItem(tripItemId: string) {
    const snapshot = tripItems
    setTripItems(prev => prev.filter(i => i.id !== tripItemId))
    startTransition(async () => {
      const result = await removeTripItem(tripItemId, trip.id)
      if (result.error) {
        toast.error('Could not remove item.')
        setTripItems(snapshot)
      }
    })
  }

  function handleItemAdded(newItem: TripItem) {
    setTripItems(prev => [...prev, newItem])
    setShowAdd(false)
  }

  const dateLabel = useMemo(() => {
    if (!trip.start_date) return 'Date TBC'
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
    const start = new Date(trip.start_date).toLocaleDateString('en-AU', opts)
    if (!trip.end_date) return start
    const end = new Date(trip.end_date).toLocaleDateString('en-AU', opts)
    return `${start} – ${end}`
  }, [trip.start_date, trip.end_date])

  const countdown = useMemo(() => {
    if (!trip.start_date) return null
    const start = new Date(trip.start_date)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = Math.round((start.getTime() - now.getTime()) / 86_400_000)
    if (diff < 0) return null
    if (diff === 0) return 'Today!'
    if (diff === 1) return 'Tomorrow'
    return `in ${diff} days`
  }, [trip.start_date])

  return (
    <>
      {/* Back nav */}
      <button
        onClick={() => router.push('/plan')}
        className="flex items-center gap-1 text-[#131936]/50 hover:text-[#131936] text-sm mb-6 transition-colors"
      >
        ‹ Plan
      </button>

      {/* ── Trip header ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#fcd99a]/40 bg-white p-5 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl select-none" aria-hidden>
            {trip.icon}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="font-brice text-2xl font-bold text-[#131936] leading-snug">
              {trip.title}
            </h1>
            {trip.destination && (
              <p className="text-[#f08c21] text-sm mt-0.5">{trip.destination}</p>
            )}
          </div>
          {countdown && (
            <span className="shrink-0 rounded-full bg-pink-accent/10 border border-pink-accent/20 px-2.5 py-1 text-xs font-semibold text-[#f08c21]">
              {countdown}
            </span>
          )}
        </div>

        <p className="text-xs text-[#131936]/50 flex items-center gap-1.5 mb-4">
          <span aria-hidden>🗓</span>
          {dateLabel}
        </p>

        {trip.members.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {trip.members.slice(0, 5).map(memberId => {
                const profile = memberProfiles[memberId]
                return profile ? (
                  <Avatar
                    key={memberId}
                    avatarUrl={profile.avatar_url}
                    username={profile.username}
                    size={28}
                    className="ring-1 ring-white"
                  />
                ) : null
              })}
            </div>
            <span className="text-xs text-[#131936]/50">
              {trip.members.length} member{trip.members.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-[#fcd99a]/40 mb-6">
        {(['experiences', 'chat', 'map'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === t
                ? 'bg-[#f08c21] text-[#131936]'
                : 'text-[#131936]/50 hover:text-[#131936]'
            }`}
          >
            {t === 'experiences' ? 'Experiences' : t === 'chat' ? 'Chat' : 'Map'}
          </button>
        ))}
      </div>

      {/* ── Experiences tab ───────────────────────────────────────────────────── */}
      {activeTab === 'experiences' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-brice font-bold text-[#131936]">Experiences</h2>
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs font-semibold text-[#f08c21] hover:text-[#131936] transition-colors flex items-center gap-1"
            >
              + Add
            </button>
          </div>

          {tripItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#fcd99a]/50 p-8 text-center">
              <p className="text-3xl mb-3">🌍</p>
              <p className="text-[#131936] font-brice font-bold mb-1">No experiences yet</p>
              <p className="text-[#131936]/50 text-sm mb-4">
                Add places you want to visit on this trip.
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="rounded-xl bg-[#f08c21] hover:bg-[#f08c21]/90 px-4 py-2 text-sm font-brice font-semibold text-[#131936] transition-colors"
              >
                Add first experience
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tripItems.map(item => (
                <ExperienceCard
                  key={item.id}
                  item={item}
                  userId={userId}
                  isOwner={item.added_by === userId}
                  onVote={vote => handleVote(item.id, vote)}
                  onRemove={() => handleRemoveItem(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Chat tab ──────────────────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <TripChatPanel
          trip={trip}
          memberProfiles={memberProfiles}
          userId={userId}
          initialMessages={initialMessages}
        />
      )}

      {/* ── Map tab ───────────────────────────────────────────────────────────── */}
      {activeTab === 'map' && (
        <div className="rounded-2xl overflow-hidden mb-6 h-36 bg-gradient-to-br from-violet-accent/20 via-indigo-deep to-pink-accent/10 border border-[#fcd99a]/40 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl mb-1" aria-hidden>🗺️</p>
            <p className="text-xs text-[#131936]/50">Map view — coming soon</p>
          </div>
        </div>
      )}

      {showAdd && (
        <AddExperienceSheet
          tripId={trip.id}
          myListPlaces={myListPlaces}
          existingPlaceIds={new Set(tripItems.map(i => i.place_id))}
          userId={userId}
          onAdded={handleItemAdded}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  )
}

// ─── TripChatPanel ────────────────────────────────────────────────────────────

function TripChatPanel({
  trip,
  memberProfiles,
  userId,
  initialMessages,
}: {
  trip: Trip
  memberProfiles: Record<string, { username: string; avatar_url: string | null }>
  userId: string
  initialMessages: Message[]
}) {
  const [conversationId, setConversationId] = useState<string | null>(trip.conversation_id)
  const [messages, setMessages]             = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue]         = useState('')
  const [hasMore, setHasMore]               = useState(initialMessages.length === 50)
  const [isLoadingMore, setLoadingMore]     = useState(false)
  const [isCreatingChat, startCreateChat]   = useTransition()
  const [isSending, startSend]              = useTransition()
  const [showInvite, setShowInvite]         = useState(false)
  const scrollRef                           = useRef<HTMLDivElement>(null)
  const bottomRef                           = useRef<HTMLDivElement>(null)

  // Scroll to bottom on mount / when conversation first appears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [conversationId])

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return

    const supabase = createClient()
    const channel  = supabase
      .channel(`trip-chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const raw = payload.new as { id: string; sender_id: string }
          if (raw.sender_id === userId) return

          const msg = await getMessageAction(raw.id)
          if (!msg) return

          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
          markAsReadAction(conversationId).catch(() => {})
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, userId])

  // Pagination — load older messages when scrolling to top
  const handleScroll = useCallback(async () => {
    const el = scrollRef.current
    if (!el || isLoadingMore || !hasMore || !conversationId) return
    if (el.scrollTop > 120) return

    const oldest = messages[0]?.created_at
    if (!oldest) return

    setLoadingMore(true)
    try {
      const older = await getMessagesAction(conversationId, oldest)
      if (older.length === 0) { setHasMore(false); return }

      const prevHeight = el.scrollHeight
      setMessages(prev => {
        const ids = new Set(prev.map(m => m.id))
        return [...older.filter(m => !ids.has(m.id)), ...prev]
      })
      if (older.length < 50) setHasMore(false)
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevHeight
      })
    } finally {
      setLoadingMore(false)
    }
  }, [conversationId, messages, isLoadingMore, hasMore])

  function handleCreateChat() {
    startCreateChat(async () => {
      const result = await createTripChatAction(trip.id)
      if (result.error || !result.conversationId) {
        toast.error('Could not create group chat.')
        return
      }
      setConversationId(result.conversationId)
      toast.success('Group chat started!')
    })
  }

  function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!conversationId) return
    const content = inputValue.trim()
    if (!content) return

    const optimistic: Message = {
      id:              `optimistic-${Date.now()}`,
      conversation_id: conversationId,
      sender_id:       userId,
      content,
      message_type:    'text',
      metadata:        null,
      created_at:      new Date().toISOString(),
      edited_at:       null,
      sender:          { username: null, avatar_url: null },
    }
    setMessages(prev => [...prev, optimistic])
    setInputValue('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    startSend(async () => {
      const result = await sendMessageAction(conversationId, content)
      if (result.error) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        setInputValue(content)
      } else if (result.messageId) {
        const real = await getMessageAction(result.messageId)
        if (real) setMessages(prev => prev.map(m => m.id === optimistic.id ? real : m))
      }
    })
  }

  async function handleMemberAdded() {
    if (!conversationId) return
    const refreshed = await getMessagesAction(conversationId)
    setMessages(refreshed)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  // Empty state — no conversation yet
  if (!conversationId) {
    return (
      <div className="rounded-2xl border border-[#fcd99a]/40 bg-white p-8 text-center mb-6">
        <p className="text-3xl mb-3">💬</p>
        <p className="font-brice font-bold text-[#131936] mb-1">No group chat yet</p>
        <p className="text-[#131936]/50 text-sm mb-5">
          Start a group chat to coordinate with your trip crew.
        </p>
        <button
          onClick={handleCreateChat}
          disabled={isCreatingChat}
          className="rounded-xl bg-[#f08c21] hover:bg-[#f08c21]/90 disabled:opacity-50 px-5 py-2.5 font-brice font-semibold text-[#131936] text-sm transition-colors"
        >
          {isCreatingChat ? 'Creating…' : 'Start group chat'}
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-2xl border border-[#fcd99a]/40 overflow-hidden flex flex-col h-[400px] md:h-[520px] mb-6">

        {/* Member header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#fcd99a]/40 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {trip.members.slice(0, 6).map(mid => {
                const p = memberProfiles[mid]
                return p ? (
                  <Avatar
                    key={mid}
                    avatarUrl={p.avatar_url}
                    username={p.username}
                    size={24}
                    className="ring-1 ring-white"
                  />
                ) : null
              })}
              {trip.members.length > 6 && (
                <span className="w-6 h-6 rounded-full bg-[#fcd99a]/20 border border-[#fcd99a]/60 flex items-center justify-center text-[9px] text-[#131936]/50 ring-1 ring-white">
                  +{trip.members.length - 6}
                </span>
              )}
            </div>
            <span className="text-xs text-[#131936]/50">
              {trip.members.length} member{trip.members.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="text-xs font-semibold text-[#f08c21] hover:text-[#131936] transition-colors"
          >
            + Invite
          </button>
        </div>

        {/* Message list */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        >
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-[#f08c21]/30 border-t-violet-accent rounded-full animate-spin" />
            </div>
          )}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <p className="text-2xl mb-2">👋</p>
              <p className="text-[#131936]/50 text-sm">Send the first message!</p>
            </div>
          )}

          {messages.map((msg, idx) => {
            if (msg.message_type === 'trip_invite') {
              return <TripInviteMessage key={msg.id} content={msg.content} />
            }

            const isOwn      = msg.sender_id === userId
            const prev       = messages[idx - 1]
            const showAvatar = !isOwn && (!prev || prev.sender_id !== msg.sender_id || prev.message_type === 'trip_invite')

            return (
              <TripMessageBubble
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                showAvatar={showAvatar}
              />
            )
          })}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="shrink-0 border-t border-[#fcd99a]/40 bg-[#fff9f0] px-4 py-3">
          <form onSubmit={handleSend} className="flex items-end gap-3">
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e as unknown as FormEvent)
                }
              }}
              placeholder="Message the trip…"
              rows={1}
              className="flex-1 resize-none rounded-2xl bg-white border border-[#fcd99a]/40 text-sm text-[#131936] placeholder:text-[#131936]/40 px-4 py-3 focus:outline-none focus:border-[#f08c21]/40 transition-colors max-h-32 overflow-y-auto leading-relaxed"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isSending}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-[#f08c21] hover:bg-[#f08c21]/90 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {showInvite && (
        <InviteFriendsSheet
          tripId={trip.id}
          existingMemberIds={new Set(trip.members)}
          onMemberAdded={handleMemberAdded}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  )
}

// ─── Trip invite system message ───────────────────────────────────────────────

function TripInviteMessage({ content }: { content: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 border-t border-[#fcd99a]/40" />
      <span className="text-[11px] text-[#131936]/50 whitespace-nowrap px-1">{content}</span>
      <div className="flex-1 border-t border-[#fcd99a]/40" />
    </div>
  )
}

// ─── Trip message bubble ──────────────────────────────────────────────────────

function TripMessageBubble({
  message,
  isOwn,
  showAvatar,
}: {
  message: Message
  isOwn: boolean
  showAvatar: boolean
}) {
  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div className="w-7 shrink-0">
          {showAvatar && (
            <Avatar
              avatarUrl={message.sender.avatar_url}
              username={message.sender.username ?? ''}
              size={28}
            />
          )}
        </div>
      )}

      <div className={`max-w-[72%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
        {showAvatar && !isOwn && (
          <span className="text-[10px] text-[#131936]/50 px-1">
            @{message.sender.username ?? 'unknown'}
          </span>
        )}

        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? 'bg-[#f08c21] text-white rounded-br-sm'
              : 'bg-white text-[#131936] rounded-bl-sm'
          } ${message.id.startsWith('optimistic-') ? 'opacity-60' : ''}`}
        >
          {message.content}
        </div>

        <span className="text-[10px] text-[#131936]/50 px-1">
          {new Date(message.created_at).toLocaleTimeString('en-AU', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
          {message.id.startsWith('optimistic-') && ' · sending…'}
        </span>
      </div>
    </div>
  )
}

// ─── Invite friends sheet ─────────────────────────────────────────────────────

function InviteFriendsSheet({
  tripId,
  existingMemberIds,
  onMemberAdded,
  onClose,
}: {
  tripId: string
  existingMemberIds: Set<string>
  onMemberAdded: () => void
  onClose: () => void
}) {
  const [friends, setFriends]   = useState<UserProfile[]>([])
  const [adding, setAdding]     = useState<string | null>(null)
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    getFriendsAction().then(f => {
      setFriends(f)
      setLoading(false)
    })
  }, [])

  const invitable = friends.filter(f => !existingMemberIds.has(f.id))

  async function handleAdd(friendId: string) {
    setAdding(friendId)
    const result = await addMemberToTripAction(tripId, friendId)
    setAdding(null)

    if (result.error) {
      toast.error('Could not add member.')
      return
    }

    toast.success('Friend added to trip!')
    onMemberAdded()
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[#fff9f0] border-t border-[#fcd99a]/40 animate-slide-up max-h-[75dvh] flex flex-col">
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#131936]/20" />
        </div>

        <div className="px-5 pb-3 shrink-0">
          <h2 className="font-brice font-bold text-xl text-[#131936] mb-1">Invite to Trip</h2>
          <p className="text-[#131936]/50 text-sm">Add friends to this trip and group chat.</p>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-8">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#f08c21]/30 border-t-violet-accent rounded-full animate-spin" />
            </div>
          ) : invitable.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[#131936]/50 text-sm">
                {friends.length === 0
                  ? 'Add friends first to invite them to trips.'
                  : 'All your friends are already in this trip.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {invitable.map(friend => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 rounded-xl border border-[#fcd99a]/40 bg-white px-4 py-3"
                >
                  <Avatar
                    avatarUrl={friend.avatar_url}
                    username={friend.username ?? ''}
                    size={36}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#131936] text-sm font-semibold truncate">
                      {friend.username ?? 'user'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAdd(friend.id)}
                    disabled={adding === friend.id}
                    className="shrink-0 rounded-lg bg-[#f08c21] hover:bg-[#f08c21]/90 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-[#131936] transition-colors"
                  >
                    {adding === friend.id ? '…' : '+ Add'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Experience card ──────────────────────────────────────────────────────────

function ExperienceCard({
  item,
  userId,
  isOwner,
  onVote,
  onRemove,
}: {
  item: TripItem
  userId: string
  isOwner: boolean
  onVote: (vote: boolean) => void
  onRemove: () => void
}) {
  const [confirmRemove, setConfirmRemove] = useState(false)

  const upCount   = item.votes.filter(v => v.vote).length
  const downCount = item.votes.filter(v => !v.vote).length
  const myVote    = item.votes.find(v => v.user_id === userId)?.vote

  return (
    <div className="rounded-2xl border border-[#fcd99a]/40 bg-white p-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-xl select-none mt-0.5" aria-hidden>
          {TYPE_ICON[item.place.type] ?? '✦'}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-brice font-bold text-[#131936] leading-snug">{item.place.name}</h3>
          <p className="text-xs text-[#131936]/50">{item.place.country}</p>
          {item.proposed_date && (
            <p className="text-xs text-[#131936]/50 mt-0.5">
              📅{' '}
              {new Date(item.proposed_date).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
              })}
            </p>
          )}
        </div>

        {isOwner && !confirmRemove && (
          <button
            onClick={() => setConfirmRemove(true)}
            className="text-[#131936]/50 hover:text-[#131936] text-lg transition-colors"
            aria-label="Remove"
          >
            ×
          </button>
        )}
      </div>

      {confirmRemove && (
        <div className="flex gap-2 mb-3 text-sm">
          <span className="text-[#131936]/50 flex-1">Remove this place?</span>
          <button
            onClick={onRemove}
            className="text-[#f08c21] font-semibold hover:text-[#f08c21]/80 transition-colors"
          >
            Remove
          </button>
          <button
            onClick={() => setConfirmRemove(false)}
            className="text-[#131936]/50 hover:text-[#131936] transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => onVote(true)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border transition-colors ${
            myVote === true
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-white border-[#fcd99a]/40 text-[#131936]/50 hover:border-[#fcd99a]/60 hover:text-[#131936]'
          }`}
        >
          👍 {upCount > 0 && <span>{upCount}</span>}
        </button>
        <button
          onClick={() => onVote(false)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border transition-colors ${
            myVote === false
              ? 'bg-red-500/20 border-red-500/40 text-red-400'
              : 'bg-white border-[#fcd99a]/40 text-[#131936]/50 hover:border-[#fcd99a]/60 hover:text-[#131936]'
          }`}
        >
          👎 {downCount > 0 && <span>{downCount}</span>}
        </button>
      </div>
    </div>
  )
}

// ─── Add experience sheet ─────────────────────────────────────────────────────

function AddExperienceSheet({
  tripId,
  myListPlaces,
  existingPlaceIds,
  userId,
  onAdded,
  onClose,
}: {
  tripId: string
  myListPlaces: { id: string; name: string; country: string; type: string }[]
  existingPlaceIds: Set<string>
  userId: string
  onAdded: (item: TripItem) => void
  onClose: () => void
}) {
  const [query, setQuery]               = useState('')
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; country: string; type: string }[]
  >([])
  const [isSearching, setIsSearching]   = useState(false)
  const [adding, setAdding]             = useState<string | null>(null)
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filteredMyList = useMemo(() => {
    if (!query.trim()) return myListPlaces
    const q = query.toLowerCase()
    return myListPlaces.filter(
      p => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q)
    )
  }, [myListPlaces, query])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setSearchResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      const result = await searchPlaces(value)
      setSearchResults(
        (result.data ?? []).filter(
          p => !existingPlaceIds.has(p.id) && !myListPlaces.some(m => m.id === p.id)
        )
      )
      setIsSearching(false)
    }, 350)
  }

  async function handleAdd(placeId: string, placeName: string) {
    setAdding(placeId)
    const result = await addTripItem(tripId, placeId)
    setAdding(null)

    if (result.error) { toast.error('Could not add experience.'); return }

    const place = [...myListPlaces, ...searchResults].find(p => p.id === placeId)
    if (!place) { onClose(); return }

    const newItem: TripItem = {
      id: result.id ?? 'optimistic',
      trip_id: tripId,
      place_id: placeId,
      proposed_date: null,
      added_by: userId,
      created_at: new Date().toISOString(),
      place: {
        id: placeId,
        name: place.name,
        country: place.country,
        type: place.type,
        description: null,
        tags: null,
        vibes: null,
        intensity: null,
        image_keyword: null,
      },
      votes: [],
    }
    onAdded(newItem)
    toast.success(`${place.name} added!`)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[#fff9f0] border-t border-[#fcd99a]/40 animate-slide-up max-h-[85dvh] flex flex-col">
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#131936]/20" />
        </div>

        <div className="px-5 pb-2 shrink-0">
          <h2 className="font-brice font-bold text-xl text-[#131936] mb-4">Add Experience</h2>
          <input
            autoFocus
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Search destinations…"
            className="w-full rounded-xl bg-white border border-[#fcd99a]/40 px-4 py-3 text-[#131936] placeholder:text-[#131936]/40 text-sm focus:outline-none focus:border-[#f08c21]/60 transition-colors mb-4"
          />
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-8">
          {filteredMyList.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-[#131936]/50 font-semibold uppercase tracking-wider mb-2">
                From your list
              </p>
              <div className="space-y-2">
                {filteredMyList.map(place => (
                  <PlaceAddRow
                    key={place.id}
                    place={place}
                    isAdding={adding === place.id}
                    onAdd={() => handleAdd(place.id, place.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {query.trim() && (
            <div>
              <p className="text-xs text-[#131936]/50 font-semibold uppercase tracking-wider mb-2">
                {isSearching ? 'Searching…' : 'All destinations'}
              </p>
              {!isSearching && searchResults.length === 0 && (
                <p className="text-[#131936]/50 text-sm py-4 text-center">No results for "{query}"</p>
              )}
              <div className="space-y-2">
                {searchResults.map(place => (
                  <PlaceAddRow
                    key={place.id}
                    place={place}
                    isAdding={adding === place.id}
                    onAdd={() => handleAdd(place.id, place.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {!query.trim() && filteredMyList.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[#131936]/50 text-sm">
                Search for a destination above to add it to this trip.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function PlaceAddRow({
  place,
  isAdding,
  onAdd,
}: {
  place: { id: string; name: string; country: string; type: string }
  isAdding: boolean
  onAdd: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#fcd99a]/40 bg-white px-4 py-3">
      <span className="text-lg select-none" aria-hidden>
        {TYPE_ICON[place.type] ?? '✦'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[#131936] text-sm font-semibold truncate">{place.name}</p>
        <p className="text-xs text-[#131936]/50">{place.country}</p>
      </div>
      <button
        onClick={onAdd}
        disabled={isAdding}
        className="shrink-0 rounded-lg bg-[#f08c21] hover:bg-[#f08c21]/90 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-[#131936] transition-colors"
      >
        {isAdding ? '…' : '+ Add'}
      </button>
    </div>
  )
}
