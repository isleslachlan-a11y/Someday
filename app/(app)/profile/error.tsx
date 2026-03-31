'use client'

export default function ProfileError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-indigo-deep flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-4xl text-violet-accent mb-4 select-none">✦</div>
        <h2 className="font-syne text-xl font-bold text-white-soft mb-2">Something went wrong</h2>
        <p className="text-lavender text-sm mb-6">Try refreshing the page.</p>
        <button
          onClick={reset}
          className="rounded-xl bg-violet-accent hover:bg-violet-accent/90 px-6 py-2.5 font-syne font-semibold text-white-soft text-sm transition-colors"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
