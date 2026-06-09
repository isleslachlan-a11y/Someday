'use client'

/**
 * ChatView — realtime chat interface for a single conversation.
 *
 * - Subscribes to Supabase Realtime for new messages (postgres_changes on messages table).
 * - Paginates: initial 50 messages from server; scroll-to-top loads more.
 * - Own messages: right-aligned, violet background.
 * - Others' messages: left-aligned, card background (with avatar in group chats).
 * - Place share messages: mini place card with type icon.
 * - Input bar: sticky at bottom with safe-area padding.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
  FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send } from 'lucide-react'
import Avatar from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'
import {
  sendMessageAction,
  getMessagesAction,
  getMessageAction,
  markAsReadAction,
} from '@/app/actions/messaging'
import type { Message, ConversationInfo } from '@/lib/types'

interface Props {
  conversation: ConversationInfo
  initialMessages: Message[]
  currentUserId: string
}

const TYPE_ICON: Record<string, string> = {
  destination: '🗺',
  experience:  '✨',
}

export default function ChatView({ conversation, initialMessages, currentUserId }: Props) {
  const [messages, setMessages]       = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue]   = useState('')
  const [hasMore, setHasMore]         = useState(initialMessages.length === 50)
  const [isLoadingMore, setLoadingMore] = useState(false)
  const [isSending, startSend]        = useTransition()
  const scrollRef                     = useRef<HTMLDivElement>(null)
  const bottomRef                     = useRef<HTMLDivElement>(null)
  const router                        = useRouter()

  // ── Scroll to bottom on initial load and on new own message ───────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [])

  // ── Supabase Realtime subscription ────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel  = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        async (payload) => {
          const raw = payload.new as { id: string; sender_id: string }
          // Skip messages we sent ourselves (already added optimistically)
          if (raw.sender_id === currentUserId) return

          // Fetch full message with sender profile via server action
          const msg = await getMessageAction(raw.id)
          if (!msg) return

          setMessages(prev => {
            // Deduplicate: don't add if already present
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })

          // Scroll to bottom for incoming messages
          setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 50)

          // Mark as read
          markAsReadAction(conversation.id).catch(() => {})
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversation.id, currentUserId])

  // ── Load more on scroll to top ────────────────────────────────────────────
  const handleScroll = useCallback(async () => {
    const el = scrollRef.current
    if (!el || isLoadingMore || !hasMore) return
    if (el.scrollTop > 120) return // only near the top

    const oldest = messages[0]?.created_at
    if (!oldest) return

    setLoadingMore(true)
    try {
      const older = await getMessagesAction(conversation.id, oldest)
      if (older.length === 0) {
        setHasMore(false)
        return
      }
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMsgs = older.filter(m => !existingIds.has(m.id))
        return [...newMsgs, ...prev]
      })
      if (older.length < 50) setHasMore(false)

      // Maintain scroll position after prepend
      const prevHeight = el.scrollHeight
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevHeight
      })
    } finally {
      setLoadingMore(false)
    }
  }, [conversation.id, messages, isLoadingMore, hasMore])

  // ── Send message ──────────────────────────────────────────────────────────
  function handleSend(e: FormEvent) {
    e.preventDefault()
    const content = inputValue.trim()
    if (!content) return

    // Optimistic update
    const optimistic: Message = {
      id:              `optimistic-${Date.now()}`,
      conversation_id: conversation.id,
      sender_id:       currentUserId,
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
      const result = await sendMessageAction(conversation.id, content)
      if (result.error) {
        // Revert optimistic update
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        setInputValue(content)
      } else if (result.messageId) {
        // Replace optimistic message with real one
        const real = await getMessageAction(result.messageId)
        if (real) {
          setMessages(prev =>
            prev.map(m => m.id === optimistic.id ? real : m),
          )
        }
      }
    })
  }

  // ── Conversation title ────────────────────────────────────────────────────
  const title = conversation.type === 'dm'
    ? (conversation.other_user?.username ? `@${conversation.other_user.username}` : 'Chat')
    : (conversation.title ?? (conversation.type === 'trip' ? 'Trip chat' : 'Group chat'))

  const isGroupOrTrip = conversation.type !== 'dm'

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[#fcd99a]/40 shrink-0 bg-[#fff9f0]">
        <Link
          href="/messages"
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white text-[#131936]/50 hover:text-[#131936] transition-colors"
          aria-label="Back to messages"
        >
          <ArrowLeft size={20} />
        </Link>

        {conversation.type === 'dm' && conversation.other_user ? (
          <Link
            href={`/profile/${conversation.other_user.username}`}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <Avatar
              avatarUrl={conversation.other_user.avatar_url}
              username={conversation.other_user.username ?? ''}
              size={32}
            />
            <span className="font-display font-bold text-[#131936] truncate text-sm">{title}</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#f89a14]/10 border border-[#f89a14]/25 flex items-center justify-center shrink-0">
              <span className="text-xs select-none">{conversation.type === 'trip' ? '✈️' : '👥'}</span>
            </div>
            <span className="font-display font-bold text-[#131936] truncate text-sm">{title}</span>
          </div>
        )}
      </div>

      {/* ── Message list ───────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {/* Load more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 border-2 border-[#f89a14]/30 border-t-violet-accent rounded-full animate-spin" />
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn  = msg.sender_id === currentUserId
          const prev   = messages[idx - 1]
          const showAvatar = !isOwn && isGroupOrTrip &&
            (!prev || prev.sender_id !== msg.sender_id)

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={isOwn}
              showAvatar={showAvatar}
              isGroupOrTrip={isGroupOrTrip}
            />
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[#fcd99a]/40 bg-[#fff9f0] px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
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
            placeholder="Message…"
            rows={1}
            className="flex-1 resize-none rounded-2xl bg-white border border-[#fcd99a]/40 text-sm text-[#131936] placeholder:text-[#131936]/40 px-4 py-3 focus:outline-none focus:border-[#f89a14]/40 transition-colors max-h-32 overflow-y-auto leading-relaxed"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSending}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-[#f89a14] hover:bg-[#f89a14]/90 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </>
  )
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isOwn,
  showAvatar,
  isGroupOrTrip,
}: {
  message: Message
  isOwn: boolean
  showAvatar: boolean
  isGroupOrTrip: boolean
}) {
  const isPlace = message.message_type === 'place'

  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar (group chats, others only) */}
      {!isOwn && isGroupOrTrip && (
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

      <div className={`max-w-[72%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {/* Sender name (group, first in a run) */}
        {showAvatar && !isOwn && (
          <span className="text-[10px] text-[#131936]/50 px-1">
            @{message.sender.username ?? 'unknown'}
          </span>
        )}

        {/* Bubble */}
        {isPlace ? (
          <PlaceCard message={message} isOwn={isOwn} />
        ) : (
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              isOwn
                ? 'bg-[#f89a14] text-white rounded-br-sm'
                : 'bg-white text-[#131936] rounded-bl-sm'
            } ${message.id.startsWith('optimistic-') ? 'opacity-60' : ''}`}
          >
            {message.content}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-[#131936]/50 px-1">
          {formatMessageTime(message.created_at)}
          {message.id.startsWith('optimistic-') && ' · sending…'}
        </span>
      </div>
    </div>
  )
}

// ─── Place share card ─────────────────────────────────────────────────────────

function PlaceCard({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const meta      = message.metadata ?? {}
  const placeId   = meta.place_id as string | undefined
  const placeName = (meta.place_name as string) || 'Shared place'
  const placeType = (meta.place_type as string) || 'city'
  const country   = (meta.place_country as string) || ''

  return (
    <div
      className={`rounded-2xl overflow-hidden border ${
        isOwn ? 'border-[#f89a14]/30' : 'border-white/[0.10]'
      } bg-white min-w-[200px]`}
    >
      <div className="px-4 py-3">
        <p className="text-[10px] text-[#131936]/50 font-semibold uppercase tracking-wider mb-1.5">
          📍 Place share
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xl select-none" aria-hidden>
            {TYPE_ICON[placeType] ?? '✦'}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-display font-bold text-[#131936] truncate">{placeName}</p>
            {country && <p className="text-xs text-[#131936]/50">{country}</p>}
          </div>
        </div>
      </div>
      {placeId && (
        <div className={`border-t ${isOwn ? 'border-[#f89a14]/20' : 'border-[#fcd99a]/40'}`}>
          <Link
            href={`/list/new?place_id=${placeId}`}
            className="flex items-center justify-center py-2.5 text-xs font-semibold text-[#f89a14] hover:text-[#131936] transition-colors"
          >
            Add to list →
          </Link>
        </div>
      )}
    </div>
  )
}

function formatMessageTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}
