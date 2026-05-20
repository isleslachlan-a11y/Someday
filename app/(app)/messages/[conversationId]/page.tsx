import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getConversationInfo, getMessages, markAsRead } from '@/lib/messaging'
import ChatView from './ChatView'

interface Props {
  params: Promise<{ conversationId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { conversationId } = await params
  return { title: `Chat · Someday` }
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Verify membership and get conversation info in parallel with messages
  const [convInfo, initialMessages] = await Promise.all([
    getConversationInfo(conversationId, user.id),
    getMessages(conversationId, 50),
  ])

  if (!convInfo) notFound()

  // Mark as read on open (fire-and-forget — don't await in render)
  markAsRead(conversationId).catch(() => {})

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] lg:h-dvh bg-[#fff9f0]">
      <ChatView
        conversation={convInfo}
        initialMessages={initialMessages}
        currentUserId={user.id}
      />
    </div>
  )
}
