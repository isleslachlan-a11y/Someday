/**
 * lib/messaging.ts — server-only messaging utility functions.
 *
 * Called from Server Actions in app/actions/messaging.ts.
 * Never import in Client Components.
 *
 * Read functions  → admin client (bypasses RLS; userId is always a
 *                   validated, authenticated user ID from a Server Action).
 * Write functions → server client (RLS enforces sender_id = auth.uid()
 *                   and membership check).
 *
 * Realtime subscriptions are client-side only — see ChatView.tsx.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFriendshipStatus } from '@/lib/friends'
import type { Message, ConversationListItem, ConversationInfo } from '@/lib/types'

// ─── Internal helpers ─────────────────────────────────────────────────────────

function toMessage(row: Record<string, unknown>): Message {
  const senderRaw = row.profiles as Record<string, unknown> | null
  return {
    id:              row.id as string,
    conversation_id: row.conversation_id as string,
    sender_id:       row.sender_id as string,
    content:         row.content as string,
    message_type:    row.message_type as 'text' | 'place' | 'trip_invite',
    metadata:        (row.metadata as Record<string, unknown> | null) ?? null,
    created_at:      row.created_at as string,
    edited_at:       (row.edited_at as string | null) ?? null,
    sender: {
      username:   (senderRaw?.username as string | null) ?? null,
      avatar_url: (senderRaw?.avatar_url as string | null) ?? null,
    },
  }
}

// ─── getConversations ─────────────────────────────────────────────────────────

/**
 * Return all conversations the user is a member of, ordered by most recent
 * activity. Includes last message preview and unread indicator.
 */
export async function getConversations(userId: string): Promise<ConversationListItem[]> {
  const admin = createAdminClient()

  // 1. All membership rows for this user
  const { data: memberRows } = await admin
    .from('conversation_members')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId)

  if (!memberRows || memberRows.length === 0) return []

  const convIds       = memberRows.map(r => r.conversation_id as string)
  const lastReadMap   = new Map(
    memberRows.map(r => [r.conversation_id as string, r.last_read_at as string | null]),
  )

  // 2. Conversations ordered by most recent activity
  const { data: convs } = await admin
    .from('conversations')
    .select('id, type, title, trip_id, created_at, updated_at')
    .in('id', convIds)
    .order('updated_at', { ascending: false })

  if (!convs || convs.length === 0) return []

  // 3. For DMs, fetch the other participant's profile in one batch
  const dmConvIds = convs.filter(c => c.type === 'dm').map(c => c.id as string)
  const dmOtherUserMap = new Map<string, { id: string; username: string | null; avatar_url: string | null }>()

  if (dmConvIds.length > 0) {
    const { data: otherMembers } = await admin
      .from('conversation_members')
      .select('conversation_id, user_id')
      .in('conversation_id', dmConvIds)
      .neq('user_id', userId)

    const otherIds = [...new Set((otherMembers ?? []).map(m => m.user_id as string))]

    if (otherIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', otherIds)

      const profileMap = new Map(
        (profiles ?? []).map(p => [p.id as string, {
          id:         p.id as string,
          username:   (p.username as string | null) ?? null,
          avatar_url: (p.avatar_url as string | null) ?? null,
        }]),
      )

      for (const m of otherMembers ?? []) {
        const profile = profileMap.get(m.user_id as string)
        if (profile) dmOtherUserMap.set(m.conversation_id as string, profile)
      }
    }
  }

  // 4. Get last message per conversation — fetch recent messages and group client-side
  //    We fetch up to 200 messages (sufficient for up to 200 conversations).
  const { data: recentMessages } = await admin
    .from('messages')
    .select('id, conversation_id, sender_id, content, message_type, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })
    .limit(200)

  const lastMsgMap = new Map<string, {
    content: string; created_at: string; sender_id: string; message_type: string
  }>()
  for (const msg of recentMessages ?? []) {
    const cid = msg.conversation_id as string
    if (!lastMsgMap.has(cid)) {
      lastMsgMap.set(cid, {
        content:      msg.content as string,
        created_at:   msg.created_at as string,
        sender_id:    msg.sender_id as string,
        message_type: msg.message_type as string,
      })
    }
  }

  // 5. Assemble result
  return convs.map(conv => {
    const cid      = conv.id as string
    const lastRead = lastReadMap.get(cid) ?? null
    const lastMsg  = lastMsgMap.get(cid) ?? null
    const hasUnread =
      lastMsg !== null &&
      lastMsg.sender_id !== userId &&
      (lastRead === null || lastMsg.created_at > lastRead)

    return {
      id:          cid,
      type:        conv.type as 'dm' | 'group' | 'trip',
      title:       (conv.title as string | null) ?? null,
      trip_id:     (conv.trip_id as string | null) ?? null,
      other_user:  dmOtherUserMap.get(cid) ?? null,
      last_message: lastMsg,
      unread_count: hasUnread ? 1 : 0,
      updated_at:  conv.updated_at as string,
    }
  })
}

// ─── getConversationInfo ──────────────────────────────────────────────────────

/**
 * Return metadata for a single conversation, from the given user's perspective.
 * Returns null if the user is not a member (call leads to 404).
 */
export async function getConversationInfo(
  conversationId: string,
  userId: string,
): Promise<ConversationInfo | null> {
  const admin = createAdminClient()

  // Verify membership
  const { data: membership } = await admin
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership) return null

  const { data: conv } = await admin
    .from('conversations')
    .select('id, type, title, trip_id')
    .eq('id', conversationId)
    .single()

  if (!conv) return null

  let otherUser: { id: string; username: string | null; avatar_url: string | null } | null = null

  if ((conv.type as string) === 'dm') {
    const { data: otherMember } = await admin
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (otherMember) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', otherMember.user_id as string)
        .single()
      if (profile) {
        otherUser = {
          id:         profile.id as string,
          username:   (profile.username as string | null) ?? null,
          avatar_url: (profile.avatar_url as string | null) ?? null,
        }
      }
    }
  }

  return {
    id:         conv.id as string,
    type:       conv.type as 'dm' | 'group' | 'trip',
    title:      (conv.title as string | null) ?? null,
    trip_id:    (conv.trip_id as string | null) ?? null,
    other_user: otherUser,
  }
}

// ─── getOrCreateDM ────────────────────────────────────────────────────────────

/**
 * Find or create a DM conversation between two accepted friends.
 * Only allowed when friendshipStatus === 'accepted'.
 */
export async function getOrCreateDM(
  userId: string,
  friendId: string,
): Promise<{ conversationId: string; error?: string }> {
  const admin = createAdminClient()

  // Gate: must be accepted friends
  const status = await getFriendshipStatus(userId, friendId)
  if (status !== 'accepted') {
    return { conversationId: '', error: 'You can only message accepted friends' }
  }

  // Find existing DM: conversations where both users are members and type = 'dm'
  const { data: userConvIds } = await admin
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId)

  const ids = (userConvIds ?? []).map(r => r.conversation_id as string)

  if (ids.length > 0) {
    const { data: sharedConvIds } = await admin
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', friendId)
      .in('conversation_id', ids)

    const sharedIds = (sharedConvIds ?? []).map(r => r.conversation_id as string)

    if (sharedIds.length > 0) {
      const { data: dmConv } = await admin
        .from('conversations')
        .select('id')
        .eq('type', 'dm')
        .in('id', sharedIds)
        .limit(1)
        .maybeSingle()

      if (dmConv) return { conversationId: dmConv.id as string }
    }
  }

  // Create a new DM conversation
  const { data: newConv, error: createErr } = await admin
    .from('conversations')
    .insert({ type: 'dm', created_by: userId })
    .select('id')
    .single()

  if (createErr || !newConv) {
    return { conversationId: '', error: createErr?.message ?? 'Failed to create conversation' }
  }

  const convId = newConv.id as string

  const { error: memberErr } = await admin
    .from('conversation_members')
    .insert([
      { conversation_id: convId, user_id: userId },
      { conversation_id: convId, user_id: friendId },
    ])

  if (memberErr) {
    return { conversationId: '', error: memberErr.message }
  }

  return { conversationId: convId }
}

// ─── createGroupChat ──────────────────────────────────────────────────────────

/**
 * Create a new group conversation. The creator is automatically added as a member.
 * memberIds should include the creator's ID.
 */
export async function createGroupChat(
  title: string,
  createdBy: string,
  memberIds: string[],
): Promise<{ conversationId: string; error?: string }> {
  const admin = createAdminClient()

  const { data: conv, error } = await admin
    .from('conversations')
    .insert({ type: 'group', title: title.trim(), created_by: createdBy })
    .select('id')
    .single()

  if (error || !conv) {
    return { conversationId: '', error: error?.message ?? 'Failed to create group chat' }
  }

  const convId   = conv.id as string
  const uniqueIds = [...new Set([createdBy, ...memberIds])]

  const { error: memberErr } = await admin
    .from('conversation_members')
    .insert(uniqueIds.map(uid => ({ conversation_id: convId, user_id: uid })))

  if (memberErr) {
    return { conversationId: '', error: memberErr.message }
  }

  return { conversationId: convId }
}

// ─── getMessages ──────────────────────────────────────────────────────────────

/**
 * Return paginated messages for a conversation.
 * Results are ordered oldest → newest for display.
 * Pass `before` (ISO timestamp) to fetch messages older than that point.
 */
export async function getMessages(
  conversationId: string,
  limit = 50,
  before?: string,
): Promise<Message[]> {
  const admin = createAdminClient()

  let query = admin
    .from('messages')
    .select(`
      id, conversation_id, sender_id, content, message_type, metadata, created_at, edited_at,
      profiles ( username, avatar_url )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data } = await query

  // Reverse so oldest message is first in the returned array
  return (data ?? []).reverse().map(row => toMessage(row as Record<string, unknown>))
}

// ─── getMessage ───────────────────────────────────────────────────────────────

/**
 * Fetch a single message with sender profile — used by ChatView
 * when a realtime event arrives and we need full profile data.
 */
export async function getMessage(messageId: string): Promise<Message | null> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('messages')
    .select(`
      id, conversation_id, sender_id, content, message_type, metadata, created_at, edited_at,
      profiles ( username, avatar_url )
    `)
    .eq('id', messageId)
    .maybeSingle()

  if (!data) return null
  return toMessage(data as Record<string, unknown>)
}

// ─── sendMessage ──────────────────────────────────────────────────────────────

/**
 * Insert a message into a conversation. Uses the server client so RLS
 * enforces sender_id = auth.uid() and membership.
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  type: 'text' | 'place' | 'trip_invite' = 'text',
  metadata?: Record<string, unknown>,
): Promise<{ messageId?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id:       user.id,
      content:         content.trim(),
      message_type:    type,
      metadata:        metadata ?? null,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to send message' }

  return { messageId: data.id as string }
}

// ─── markAsRead ───────────────────────────────────────────────────────────────

/**
 * Update last_read_at for the user in this conversation.
 * Safe to call on every conversation open.
 */
export async function markAsRead(conversationId: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
}
