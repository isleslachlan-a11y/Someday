'use client'

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export function WaitlistNav() {
  return (
    <nav className="sticky top-0 z-50 bg-[#fff9f0] border-b border-[rgba(252,217,154,0.5)] h-14 flex items-center px-6">
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between">

        <span className="font-syne font-bold text-[#131936] text-lg tracking-tight select-none">
          Someday
        </span>

        <div className="hidden md:flex items-center gap-8">
          {([
            { label: 'Features', id: 'tour' },
            { label: 'About',    id: 'about' },
            { label: 'FAQ',      id: 'faq' },
          ] as const).map(({ label, id }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              className="font-nunito text-sm text-[rgba(19,25,54,0.6)] hover:text-[#131936] transition-colors"
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollTo('waitlist-form')}
          className="bg-[#f08c21] text-white font-nunito font-semibold text-sm px-5 py-2 rounded-full hover:bg-[#e07010] transition-colors"
        >
          Join the waitlist
        </button>

      </div>
    </nav>
  )
}
