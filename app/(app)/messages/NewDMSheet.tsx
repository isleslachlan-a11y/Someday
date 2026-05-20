'use client'

/**
 * NewDMSheet — button in the messages header that opens a friend picker
 * to start a new DM. Only shows accepted friends.
 */

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PenSquare, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Avatar from '@/components/Avatar'
import { getFriendsForDMAction, getOrCreateDMAction } from '@/app/actions/messaging'
import type { UserProfile } from '@/lib/types'

export default function NewDMSheet() {
  const [isOpen, setIsOpen]   = useState(false)
  const [friends, setFriends] = useState<UserProfile[] | null>(null)
  const [isPending, start]    = useTransition()
  const router                = useRouter()

  // Load friends when sheet opens (lazy)
  useEffect(() => {
    if (!isOpen || friends !== null) return
    start(async () => {
      const list = await getFriendsForDMAction()
      setFriends(list)
    })
  }, [isOpen, friends])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  function handleSelectFriend(friendId: string) {
    start(async () => {
      const { conversationId, error } = await getOrCreateDMAction(friendId)
      if (error || !conversationId) {
        toast.error(error ?? 'Could not open conversation')
        return
      }
      setIsOpen(false)
      router.push(`/messages/${conversationId}`)
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="New message"
        className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-white text-[#131936]/50 hover:text-[#131936] transition-colors"
      >
        <PenSquare size={20} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />

          {/* Sheet */}
          <div className="relative w-full max-h-[70vh] lg:w-[420px] lg:max-h-[560px] bg-[#fff9f0] rounded-t-3xl lg:rounded-2xl border-t border-[#fcd99a]/40 lg:border flex flex-col shadow-2xl">
            {/* Drag handle (mobile) */}
            <div className="lg:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#131936]/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#fcd99a]/40 shrink-0">
              <h2 className="font-syne text-lg font-bold text-[#131936]">New message</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white text-[#131936]/50 hover:text-[#131936] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Friend list */}
            <div className="flex-1 overflow-y-auto">
              {isPending && friends === null ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#f08c21]/30 border-t-violet-accent rounded-full animate-spin" />
                </div>
              ) : !friends || friends.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-[#131936]/50 text-sm">No friends yet</p>
                  <p className="text-[#131936]/30 text-xs mt-1">Add friends from the Profile page</p>
                </div>
              ) : (
                <div className="divide-y divide-[#fcd99a]/20">
                  {friends.map(friend => (
                    <button
                      key={friend.id}
                      onClick={() => handleSelectFriend(friend.id)}
                      disabled={isPending}
                      className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white text-left transition-colors disabled:opacity-60"
                    >
                      <Avatar
                        avatarUrl={friend.avatar_url}
                        username={friend.username ?? ''}
                        size={40}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#131936]">
                          @{friend.username ?? 'unknown'}
                        </p>
                        {friend.bio && (
                          <p className="text-xs text-[#131936]/50 truncate">{friend.bio}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
