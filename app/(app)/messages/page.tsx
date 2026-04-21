import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getConversations } from '@/lib/messaging'
import ConversationList from './ConversationList'
import NewDMSheet from './NewDMSheet'

export const metadata: Metadata = {
  title: 'Messages · Someday',
  description: 'Your conversations on Someday.',
}

export default async function MessagesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const conversations = await getConversations(user.id)

  return (
    <main className="min-h-screen bg-indigo-deep">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-indigo-deep/95 backdrop-blur-sm border-b border-white/[0.06] safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-syne text-xl font-bold text-white-soft">Messages</h1>
          <NewDMSheet />
        </div>
      </div>

      {/* ── Conversation list ─────────────────────────────────────────────── */}
      <ConversationList
        conversations={conversations}
        currentUserId={user.id}
      />
    </main>
  )
}
