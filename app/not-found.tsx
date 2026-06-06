import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#fff9f0] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-[48px] select-none mb-4">★</div>
      <h1 className="font-brice text-[64px] font-bold text-[#131936] leading-none mb-2">
        404
      </h1>
      <p className="font-brice font-bold text-[#131936] text-[18px] mb-1">
        Lost at sea.
      </p>
      <p className="font-nunito text-[#131936]/50 text-[14px] mb-8 max-w-xs">
        The destination you&apos;re looking for isn&apos;t on the map.
      </p>
      <Link
        href="/home"
        className="px-6 py-3 rounded-full bg-[#131936] text-white font-brice font-bold text-[15px] hover:opacity-90 transition-opacity"
      >
        Take me home →
      </Link>
    </main>
  )
}
