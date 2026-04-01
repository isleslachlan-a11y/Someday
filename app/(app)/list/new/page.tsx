'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { addItem } from '@/app/actions/bucketList'
import CategoryBadge from '@/components/CategoryBadge'
import { CATEGORIES } from '@/lib/types'

const INPUT_CLASS =
  'w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-white-soft placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-accent transition'

const LABEL_CLASS = 'block text-sm text-lavender mb-1.5'

export default function NewItemPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    destination_name: '',
    country: '',
    region: '',
    category: CATEGORIES[0],
    priority: 3,
    notes: '',
    public: true,
  })

  function set(field: keyof typeof form, value: string | number | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await addItem({
      ...form,
      priority: Number(form.priority),
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/list')
  }

  return (
    <main className="min-h-screen bg-indigo-deep px-4 py-8">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/list" className="text-muted hover:text-white-soft transition-colors text-sm">
            ← Back
          </Link>
          <h1 className="font-syne text-2xl font-bold text-white-soft">Add destination</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Destination name */}
          <div>
            <label htmlFor="destination_name" className={LABEL_CLASS}>
              Destination <span className="text-pink-accent">*</span>
            </label>
            <input
              id="destination_name"
              type="text"
              required
              value={form.destination_name}
              onChange={e => set('destination_name', e.target.value)}
              placeholder="e.g. Northern Lights, Kyoto temples…"
              className={INPUT_CLASS}
            />
          </div>

          {/* Country + Region */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="country" className={LABEL_CLASS}>
                Country <span className="text-pink-accent">*</span>
              </label>
              <input
                id="country"
                type="text"
                required
                value={form.country}
                onChange={e => set('country', e.target.value)}
                placeholder="e.g. Japan"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="region" className={LABEL_CLASS}>
                Region
              </label>
              <input
                id="region"
                type="text"
                value={form.region}
                onChange={e => set('region', e.target.value)}
                placeholder="e.g. Kyoto"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <span className={LABEL_CLASS}>Category</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set('category', cat)}
                  className={`transition-transform hover:scale-105 ${
                    form.category === cat ? 'ring-2 ring-violet-accent rounded-full' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <CategoryBadge category={cat} size="md" />
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className={LABEL_CLASS}>Priority</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set('priority', n)}
                  className={`text-2xl transition-transform hover:scale-110 ${
                    n <= form.priority ? 'text-violet-accent' : 'text-white/15 hover:text-white/30'
                  }`}
                  aria-label={`Priority ${n}`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-1">
              {['', 'Low', 'Low-medium', 'Medium', 'High', 'Dream destination'][form.priority]}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className={LABEL_CLASS}>
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Best time to visit, who to go with, why it matters…"
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          {/* Privacy */}
          <div>
            <button
              type="button"
              onClick={() => set('public', !form.public)}
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors w-full ${
                form.public
                  ? 'border-violet-accent/30 bg-violet-accent/10 text-lavender'
                  : 'border-white/10 bg-white/5 text-muted'
              }`}
            >
              <span>{form.public ? '🌍' : '🔒'}</span>
              <span>{form.public ? 'Public — visible on your profile' : 'Private — only you can see this'}</span>
            </button>
          </div>

          {error && <p role="alert" className="text-pink-accent text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Link
              href="/list"
              className="flex-1 text-center rounded-xl border border-white/10 px-4 py-2.5 text-sm text-muted hover:text-white-soft hover:border-white/20 transition-colors font-semibold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-violet-accent hover:bg-violet-accent/90 disabled:opacity-50 px-4 py-2.5 font-syne font-semibold text-white-soft text-sm transition-colors"
            >
              {loading ? 'Saving…' : 'Save destination'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
