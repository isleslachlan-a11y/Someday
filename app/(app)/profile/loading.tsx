export default function ProfileLoading() {
  return (
    <main className="min-h-screen bg-indigo-deep px-4 py-8 animate-pulse">
      <div className="max-w-3xl mx-auto">

        {/* Profile header */}
        <div className="flex items-start gap-5 mb-8">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-white/10 shrink-0" />
          <div className="flex-1 min-w-0 pt-1">
            <div className="h-7 w-36 rounded-lg bg-white/10 mb-2" />
            <div className="h-4 w-56 rounded bg-white/5 mb-1" />
            <div className="h-3 w-32 rounded bg-white/5" />
          </div>
          <div className="h-9 w-28 rounded-xl bg-white/10 shrink-0" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center">
              <div className="h-9 w-10 rounded-lg bg-white/10 mx-auto mb-1" />
              <div className="h-3 w-14 rounded bg-white/5 mx-auto" />
            </div>
          ))}
        </div>

        {/* List section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-20 rounded-lg bg-white/10" />
            <div className="h-4 w-20 rounded bg-white/5" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl border border-white/10 bg-white/5" />
            ))}
          </div>
        </section>

      </div>
    </main>
  )
}
