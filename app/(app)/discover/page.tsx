import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Discover',
  description: 'Find your next someday.',
}

export default function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  void searchParams

  return (
    <div className="min-h-screen bg-[#fff9f0]">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-syne font-bold text-[#131936] text-[18px]">Discover</span>
          <Link
            href="/submit"
            className="px-3 py-1.5 rounded-full bg-[#f08c21] text-[#131936] font-nunito font-medium text-[13px]"
          >
            Submit a place
          </Link>
        </div>
      </header>

      <main className="max-w-[480px] mx-auto px-4 py-8">
        <p className="font-nunito text-[#131936]/50 text-[14px] text-center mt-16">
          Search and discovery coming soon.
        </p>
      </main>
    </div>
  )
}
