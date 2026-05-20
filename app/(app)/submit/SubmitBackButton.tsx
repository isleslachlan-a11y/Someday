'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function SubmitBackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center justify-center w-11 h-11 rounded-full"
      aria-label="Go back"
    >
      <ChevronLeft size={22} className="text-[#131936]" />
    </button>
  )
}
