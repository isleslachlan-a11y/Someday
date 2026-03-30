import Link from 'next/link'

export default function EmptyBucketList() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      {/* Decorative constellation */}
      <div className="relative mb-8 select-none" aria-hidden="true">
        <span className="text-6xl text-violet-accent/80">✦</span>
        <span className="absolute -top-3 -right-4 text-2xl text-lavender/50">✦</span>
        <span className="absolute -bottom-2 -left-5 text-xl text-pink-accent/40">✦</span>
      </div>

      <h2 className="font-syne text-2xl font-bold text-white-soft mb-3">
        Your adventure starts here
      </h2>
      <p className="text-muted text-sm max-w-xs leading-relaxed mb-8">
        Every great journey begins with a dream. Start adding the places and
        experiences you want to have someday.
      </p>

      <Link
        href="/list/new"
        className="rounded-xl bg-violet-accent hover:bg-violet-accent/90 px-6 py-3 font-syne font-semibold text-white-soft text-sm transition-colors"
      >
        Add your first destination
      </Link>

      {/* Subtle inspiration line */}
      <p className="text-white/20 text-xs mt-10 italic">
        &ldquo;The world is a book, and those who do not travel read only one page.&rdquo;
      </p>
    </div>
  )
}
