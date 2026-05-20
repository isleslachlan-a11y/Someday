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
    <main className="min-h-screen bg-[#fff9f0]">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 grid grid-cols-3 items-center">
          <div />
          <div className="flex justify-center">
            <span className="font-syne font-bold text-[#131936] text-[20px] tracking-widest uppercase">
              MESSAGES
            </span>
          </div>
          <div className="flex items-center justify-end">
            <NewDMSheet />
          </div>
        </div>
      </header>

      <ConversationList
        conversations={conversations}
        currentUserId={user.id}
      />
    </main>
  )
}
