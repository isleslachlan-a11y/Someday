export default function HomeLoading() {
  return (
    <main className="min-h-screen bg-indigo-deep px-4 py-8 animate-pulse">
      <div className="max-w-3xl mx-auto">

        {/* Welcome */}
        <div className="mb-8">
          <div className="h-9 w-56 rounded-xl bg-white/10 mb-2" />
          <div className="h-4 w-44 rounded-lg bg-white/5" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center">
              <div className="h-9 w-10 rounded-lg bg-white/10 mx-auto mb-1" />
              <div className="h-3 w-12 rounded bg-white/5 mx-auto" />
            </div>
          ))}
        </div>

        {/* Recently added */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-36 rounded-lg bg-white/10" />
            <div className="h-4 w-16 rounded bg-white/5" />
          </div>
          <div className="flex gap-3 overflow-hidden -mx-4 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-44 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="h-5 w-16 rounded-full bg-white/10 mb-3" />
                <div className="h-4 w-32 rounded bg-white/10 mb-1" />
                <div className="h-3 w-20 rounded bg-white/5" />
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="h-16 rounded-2xl border-2 border-dashed border-white/10" />

      </div>
    </main>
  )
}
