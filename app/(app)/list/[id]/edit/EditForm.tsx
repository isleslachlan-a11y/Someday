'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateItem, deleteItem } from '@/app/actions/bucketList'
import CategoryBadge from '@/components/CategoryBadge'
import { CATEGORIES, type BucketListItem } from '@/lib/types'

const INPUT_CLASS =
  'w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-white-soft placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-accent transition'

const LABEL_CLASS = 'block text-sm text-lavender mb-1.5'

interface Props {
  item: BucketListItem
}

export default function EditForm({ item }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [form, setForm] = useState({
    destination_name: item.destination_name,
    country: item.country,
    region: item.region ?? '',
    category: item.category,
    priority: item.priority,
    notes: item.notes ?? '',
    is_public: item.is_public,
  })

  function set(field: keyof typeof form, value: string | number | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function getChangedFields(): string[] {
    const changed: string[] = []
    if (form.destination_name !== item.destination_name) changed.push('destination_name')
    if (form.country !== item.country) changed.push('country')
    if ((form.region || null) !== item.region) changed.push('region')
    if (form.category !== item.category) changed.push('category')
    if (form.priority !== item.priority) changed.push('priority')
    if ((form.notes || null) !== item.notes) changed.push('notes')
    if (form.is_public !== item.is_public) changed.push('is_public')
    return changed
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const changedFields = getChangedFields()
    const result = await updateItem(item.id, { ...form, priority: Number(form.priority) }, changedFields)

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    router.push('/list')
  }

  async function handleDelete() {
    setError(null)
    setDeleting(true)

    const result = await deleteItem(item.id)

    if (result.error) {
      setError(result.error)
      setDeleting(false)
      setConfirmDelete(false)
      return
    }

    router.push('/list')
  }

  return (
    <div className="max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/list" className="text-muted hover:text-white-soft transition-colors text-sm">
          ← Back
        </Link>
        <h1 className="font-syne text-2xl font-bold text-white-soft">Edit destination</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

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
            className={`${INPUT_CLASS} resize-none`}
          />
        </div>

          {/* Privacy */}
          <div>
            <button
              type="button"
              onClick={() => set('is_public', !form.is_public)}
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors w-full ${
                form.is_public
                  ? 'border-violet-accent/30 bg-violet-accent/10 text-lavender'
                  : 'border-white/10 bg-white/5 text-muted'
              }`}
            >
              <span>{form.is_public ? '🌍' : '🔒'}</span>
              <span>{form.is_public ? 'Public — visible on your profile' : 'Private — only you can see this'}</span>
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
            disabled={saving || deleting}
            className="flex-1 rounded-xl bg-violet-accent hover:bg-violet-accent/90 disabled:opacity-50 px-4 py-2.5 font-syne font-semibold text-white-soft text-sm transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {/* Delete */}
      <div className="mt-8 pt-6 border-t border-white/10">
        {confirmDelete ? (
          <div className="rounded-xl border border-pink-accent/30 bg-pink-accent/5 p-4">
            <p className="text-sm text-white-soft mb-3">
              Remove <strong>{item.destination_name}</strong> from your bucket list?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-muted hover:text-white-soft transition-colors"
              >
                Keep it
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-pink-accent/20 hover:bg-pink-accent/30 border border-pink-accent/30 px-3 py-2 text-sm font-semibold text-pink-accent transition-colors disabled:opacity-50"
              >
                {deleting ? 'Removing…' : 'Yes, remove'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-muted hover:text-pink-accent transition-colors"
          >
            Remove from bucket list
          </button>
        )}
      </div>
    </div>
  )
}
