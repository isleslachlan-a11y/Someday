'use client'

import Link from 'next/link'
import Avatar from '@/components/Avatar'
import type { ConversationListItem } from '@/lib/types'

interface Props {
  conversations: ConversationListItem[]
  currentUserId: string
}

export default function ConversationList({ conversations, currentUserId }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="text-4xl mb-4 select-none">✉️</div>
        <p className="font-syne font-bold text-[#131936] mb-1">No messages yet</p>
        <p className="text-sm text-[#131936]/50">Start a conversation with a friend</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#fcd99a]/20">
      {conversations.map(conv => (
        <ConversationRow
          key={conv.id}
          conv={conv}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}

function ConversationRow({
  conv,
  currentUserId,
}: {
  conv: ConversationListItem
  currentUserId: string
}) {
  const isDM      = conv.type === 'dm'
  const otherUser = conv.other_user
  const hasUnread = conv.unread_count > 0

  // Title and avatar to show
  const displayName = isDM
    ? (otherUser?.username ? `@${otherUser.username}` : 'Unknown')
    : (conv.title ?? (conv.type === 'trip' ? 'Trip chat' : 'Group chat'))

  const avatarUrl  = isDM ? (otherUser?.avatar_url ?? null) : null
  const avatarName = isDM ? (otherUser?.username ?? '') : displayName

  // Last message preview
  let preview = 'No messages yet'
  if (conv.last_message) {
    const isOwn = conv.last_message.sender_id === currentUserId
    const prefix = isOwn ? 'You: ' : ''
    if (conv.last_message.message_type === 'place') {
      preview = `${prefix}📍 Shared a place`
    } else if (conv.last_message.message_type === 'trip_invite') {
      preview = `${prefix}✈️ Trip invite`
    } else {
      preview = `${prefix}${conv.last_message.content}`
    }
  }

  // Relative time
  const timeLabel = conv.last_message
    ? formatTime(conv.last_message.created_at)
    : ''

  return (
    <Link
      href={`/messages/${conv.id}`}
      className="flex items-center gap-3 px-4 py-4 hover:bg-white active:bg-white transition-colors"
    >
      {/* Avatar */}
      {isDM ? (
        <Avatar avatarUrl={avatarUrl} username={avatarName} size={48} />
      ) : (
        <div className="w-12 h-12 rounded-full bg-[#f08c21]/10 border border-[#f08c21]/25 flex items-center justify-center shrink-0">
          <span className="text-lg select-none">
            {conv.type === 'trip' ? '✈️' : '👥'}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={`text-sm font-semibold truncate ${hasUnread ? 'text-white' : 'text-[#131936]'}`}>
            {displayName}
          </p>
          {timeLabel && (
            <span className={`text-xs shrink-0 ${hasUnread ? 'text-[#f08c21]' : 'text-[#131936]/50'}`}>
              {timeLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className={`text-xs truncate flex-1 ${hasUnread ? 'text-[#131936]/90' : 'text-[#131936]/50'}`}>
            {preview}
          </p>
          {hasUnread && (
            <span className="shrink-0 w-2 h-2 rounded-full bg-[#f08c21]" />
          )}
        </div>
      </div>
    </Link>
  )
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now  = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (hrs < 24) return `${hrs}h`
  if (days < 7) return `${days}d`
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}
