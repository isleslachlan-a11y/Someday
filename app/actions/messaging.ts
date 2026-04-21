'use server'

/**
 * Server Actions for the messaging system.
 * Thin wrappers around lib/messaging.ts that expose safe, auth-gated endpoints
 * to Client Components.
 */

import { revalidatePath } from 'next/cache'
import {
  getOrCreateDM,
  createGroupChat,
  getMessages,
  getMessage,
  sendMessage,
  markAsRead,
} from '@/lib/messaging'
import { getFriends } from '@/lib/friends'
import { createClient } from '@/lib/supabase/server'
import type { Message } from '@/lib/types'
import type { UserProfile } from '@/lib/types'

// ─── DM / group management ────────────────────────────────────────────────────

export async function getOrCreateDMAction(
  friendId: string,
): Promise<{ conversationId: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { conversationId: '', error: 'Not authenticated' }

  return getOrCreateDM(user.id, friendId)
}

export async function createGroupChatAction(
  title: string,
  memberIds: string[],
): Promise<{ conversationId: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { conversationId: '', error: 'Not authenticated' }

  return createGroupChat(title, user.id, memberIds)
}

// ─── Message fetching ─────────────────────────────────────────────────────────

export async function getMessagesAction(
  conversationId: string,
  before?: string,
): Promise<Message[]> {
  return getMessages(conversationId, 50, before)
}

export async function getMessageAction(messageId: string): Promise<Message | null> {
  return getMessage(messageId)
}

// ─── Sending ──────────────────────────────────────────────────────────────────

export async function sendMessageAction(
  conversationId: string,
  content: string,
  type: 'text' | 'place' | 'trip_invite' = 'text',
  metadata?: Record<string, unknown>,
): Promise<{ messageId?: string; error?: string }> {
  const result = await sendMessage(conversationId, content, type, metadata)
  if (!result.error) {
    revalidatePath(`/messages/${conversationId}`)
  }
  return result
}

// ─── Mark as read ─────────────────────────────────────────────────────────────

export async function markAsReadAction(conversationId: string): Promise<void> {
  await markAsRead(conversationId)
  revalidatePath('/messages', 'layout')
}

// ─── Friends list (for DM picker) ─────────────────────────────────────────────

export async function getFriendsForDMAction(): Promise<UserProfile[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []
  return getFriends(user.id)
}
