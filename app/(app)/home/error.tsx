'use client'

export default function HomeError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#fff9f0] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-[40px] select-none mb-4">✦</div>
      <h2 className="font-brice text-[20px] font-bold text-[#131936] mb-2">
        Something went wrong
      </h2>
      <p className="font-nunito text-[#131936]/50 text-[14px] mb-6">
        Try refreshing the page.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-full bg-[#131936] text-white font-brice font-bold text-[15px] hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </main>
  )
}
