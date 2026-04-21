'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getOrCreateDMAction } from '@/app/actions/messaging'

interface Props {
  friendId: string
}

/**
 * Shown on another user's profile page when the viewer is friends with them.
 * Opens (or creates) a DM conversation and navigates to it.
 */
export default function MessageButton({ friendId }: Props) {
  const [isPending, setIsPending] = useState(false)
  const router                    = useRouter()

  async function handleClick() {
    setIsPending(true)
    const { conversationId, error } = await getOrCreateDMAction(friendId)
    setIsPending(false)
    if (error || !conversationId) {
      toast.error(error ?? 'Could not open conversation')
      return
    }
    router.push(`/messages/${conversationId}`)
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-xl border border-white/15 hover:border-white/30 px-4 py-2 text-sm font-semibold text-white-soft/80 hover:text-white-soft transition-colors min-h-[44px] disabled:opacity-60"
    >
      {isPending
        ? <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        : <MessageCircle size={16} />
      }
      Message
    </button>
  )
}
