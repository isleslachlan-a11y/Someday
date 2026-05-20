export default function HomeLoading() {
  return (
    <main className="min-h-screen bg-[#fff9f0] animate-pulse">
      <div className="h-14 border-b border-[#fcd99a]/30 mb-4" />
      <div className="max-w-[480px] mx-auto px-4 space-y-4">
        <div className="h-11 rounded-full bg-[#fcd99a]/30" />
        <div className="h-[220px] rounded-[20px] bg-[#fcd99a]/30" />
        <div className="flex justify-between items-center">
          <div className="h-5 w-40 rounded bg-[#fcd99a]/30" />
          <div className="h-4 w-16 rounded bg-[#fcd99a]/20" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[260px] rounded-2xl bg-[#fcd99a]/30" />
          ))}
        </div>
      </div>
    </main>
  )
}
