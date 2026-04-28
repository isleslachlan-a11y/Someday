import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Place } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Place',
}

// TODO: Build full place detail page in a later session.
export default async function PlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: place } = await supabase
    .from('places')
    .select('*')
    .eq('id', id)
    .single()

  if (!place) redirect('/home')

  const p = place as unknown as Place

  return (
    <main className="min-h-screen bg-indigo-deep px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-white-soft mb-6 transition-colors"
        >
          ← Back
        </Link>

        <h1 className="font-syne text-3xl font-bold text-white-soft mb-1">{p.name}</h1>
        <p className="text-muted text-sm mb-6">
          {p.country}
          {p.region ? ` · ${p.region}` : ''}
          <span className="mx-1 opacity-40">·</span>
          <span className="capitalize">{p.type}</span>
        </p>

        {p.description && (
          <p className="text-white-soft/70 text-sm leading-relaxed mb-6">{p.description}</p>
        )}

        {p.tags && p.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {p.tags.map(tag => (
              <span
                key={tag}
                className="rounded-full bg-white/[0.06] border border-white/10 px-3 py-0.5 text-xs text-lavender"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-muted italic mt-8">
          Full place detail page coming soon.
        </p>
      </div>
    </main>
  )
}
