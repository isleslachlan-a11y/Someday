'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Link as LinkIcon, Plus, FolderPlus } from 'lucide-react'
import { SocialImportModal } from './SocialImportModal'

interface DiscoverHeaderProps {
  isAdmin: boolean
}

export function DiscoverHeader({ isAdmin }: DiscoverHeaderProps) {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 grid grid-cols-3 items-center">

          {/* Left: Import button */}
          <div className="flex items-center">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                         bg-[#131936] text-[#fff9f0] font-nunito font-medium text-[13px]
                         hover:bg-[#131936]/90 transition-colors"
            >
              <LinkIcon size={12} />
              Import
            </button>
          </div>

          {/* Centre: wordmark */}
          <div className="flex justify-center">
            <span className="font-brice font-syne font-bold text-[#131936] text-[20px] tracking-widest uppercase">
              DISCOVER
            </span>
          </div>

          {/* Right: admin collections + submit */}
          <div className="flex items-center justify-end gap-2">
            {isAdmin && (
              <Link
                href="/discover/collections/new"
                aria-label="Create collection"
                className="flex items-center justify-center w-9 h-9 rounded-full bg-[#fcd99a]/60 text-[#131936]"
              >
                <FolderPlus size={18} />
              </Link>
            )}
            <Link
              href="/submit"
              aria-label="Submit a place"
              className="flex items-center justify-center w-11 h-11 rounded-full bg-[#f89a14] text-white"
            >
              <Plus size={22} strokeWidth={2.5} />
            </Link>
          </div>

        </div>
      </header>

      <SocialImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </>
  )
}
