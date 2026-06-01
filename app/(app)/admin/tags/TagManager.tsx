'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { createTag, deleteTag, mergeTag, createLabel, deleteLabel, type TagRecord, type LabelRecord } from '@/app/actions/adminTags'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  activity:     'Activity',
  landscape:    'Landscape',
  vibe:         'Vibe',
  setting:      'Setting',
  season:       'Season',
  'food-drink': 'Food & Drink',
}

const PLACE_TYPES = ['destination', 'experience'] as const
type PlaceType = (typeof PLACE_TYPES)[number]

// ── Props ─────────────────────────────────────────────────────────────────────

const DIMENSIONS = [
  'activity', 'landscape', 'vibe',
  'setting', 'season', 'food-drink',
] as const

interface Props {
  grouped: Record<string, TagRecord[]>
  categories: string[]
  labels: LabelRecord[]
}

// ── Create form ───────────────────────────────────────────────────────────────

interface CreateFormProps {
  onCreated: (tag: TagRecord) => void
  onCancel: () => void
}

function CreateForm({ onCreated, onCancel }: CreateFormProps) {
  const [name, setName]           = useState('')
  const [slug, setSlug]           = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [category, setCategory]   = useState('activity')
  const [dimension, setDimension] = useState('activity')
  const [placeType, setPlaceType] = useState<PlaceType[]>([])
  const [saving, setSaving]       = useState(false)

  function handleNameChange(val: string) {
    setName(val)
    if (!slugEdited) {
      setSlug(val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    }
  }

  function togglePlaceType(pt: PlaceType) {
    setPlaceType(prev =>
      prev.includes(pt) ? prev.filter(t => t !== pt) : [...prev, pt]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setSaving(true)
    const result = await createTag({ name: name.trim(), slug: slug.trim(), category, dimension, place_type: placeType })
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else if (result.tag) {
      toast.success(`Tag "${result.tag.name}" created`)
      onCreated(result.tag)
    }
  }

  return (
    <form
      onSubmit={e => void handleSubmit(e)}
      className="bg-white rounded-2xl border border-[#fcd99a] p-4 mb-6 space-y-3"
    >
      <p className="font-syne font-bold text-[#131936] text-[14px]">Create tag</p>

      <div>
        <label className="font-nunito text-[11px] text-[#131936]/50 uppercase tracking-wider mb-1 block">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          placeholder="e.g. street food"
          required
          className="w-full rounded-xl border border-[#fcd99a] bg-white px-3 py-2 font-nunito text-[14px] text-[#131936] placeholder:text-[#131936]/30 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30"
        />
      </div>

      <div>
        <label className="font-nunito text-[11px] text-[#131936]/50 uppercase tracking-wider mb-1 block">
          Slug
        </label>
        <input
          type="text"
          value={slug}
          onChange={e => { setSlug(e.target.value); setSlugEdited(true) }}
          placeholder="e.g. street-food"
          required
          className="w-full rounded-xl border border-[#fcd99a] bg-white px-3 py-2 font-nunito text-[13px] text-[#131936]/60 placeholder:text-[#131936]/30 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30"
        />
      </div>

      <div>
        <label className="font-nunito text-[11px] text-[#131936]/50 uppercase tracking-wider mb-1 block">
          Category
        </label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full rounded-xl border border-[#fcd99a] bg-white px-3 py-2 font-nunito text-[14px] text-[#131936] focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30"
        >
          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="font-nunito text-[11px] text-[#131936]/50 uppercase tracking-wider mb-1 block">
          Dimension
        </label>
        <select
          value={dimension}
          onChange={e => setDimension(e.target.value)}
          className="w-full rounded-xl border border-[#fcd99a] bg-white px-3 py-2 font-nunito text-[14px] text-[#131936] focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30"
        >
          {DIMENSIONS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="font-nunito text-[11px] text-[#131936]/50 uppercase tracking-wider mb-2">
          Place types <span className="normal-case font-normal">(leave empty for all)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {PLACE_TYPES.map(pt => (
            <button
              key={pt}
              type="button"
              onClick={() => togglePlaceType(pt)}
              className={`px-3 py-1 rounded-full border font-nunito text-[12px] font-medium capitalize transition-all ${
                placeType.includes(pt)
                  ? 'bg-[#f08c21] border-[#f08c21] text-[#131936]'
                  : 'bg-white border-[#fcd99a] text-[#131936]/60'
              }`}
            >
              {pt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 h-10 rounded-full bg-[#131936] text-white font-syne font-bold text-[13px] disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create tag'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 h-10 rounded-full border border-[#fcd99a] bg-white font-nunito text-[13px] text-[#131936]/60"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Tag row ───────────────────────────────────────────────────────────────────

interface TagRowProps {
  tag: TagRecord
  categoryPeers: TagRecord[]
  onDeleted: (id: string) => void
  onMerged: (fromId: string, intoId: string) => void
}

function TagRow({ tag, categoryPeers, onDeleted, onMerged }: TagRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [mergeTarget, setMergeTarget]     = useState('')
  const [merging, setMerging]             = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteTag(tag.id)
    setDeleting(false)
    if (result.error) {
      toast.error(result.error)
      setConfirmDelete(false)
    } else {
      toast.success(`"${tag.name}" deleted`)
      onDeleted(tag.id)
    }
  }

  async function handleMerge() {
    if (!mergeTarget) return
    setMerging(true)
    const result = await mergeTag(tag.id, mergeTarget)
    setMerging(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      const targetTag = categoryPeers.find(t => t.id === mergeTarget)
      toast.success(`Merged into "${targetTag?.name ?? 'tag'}"`)
      onMerged(tag.id, mergeTarget)
    }
  }

  const date = new Date(tag.created_at).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="bg-white rounded-2xl border border-[#fcd99a]/40 px-3 py-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-nunito font-semibold text-[#131936] text-[14px]">{tag.name}</span>

        {/* place_type badges */}
        {tag.place_type.length > 0
          ? tag.place_type.map(pt => (
              <span
                key={pt}
                className="px-2 py-0.5 rounded-full bg-[#fcd99a]/50 font-nunito text-[10px] text-[#131936]/60 capitalize"
              >
                {pt}
              </span>
            ))
          : (
            <span className="px-2 py-0.5 rounded-full bg-[#131936]/5 font-nunito text-[10px] text-[#131936]/40">
              all types
            </span>
          )
        }

        <span className="font-nunito text-[11px] text-[#131936]/30 ml-auto">
          {tag.places_count} place{tag.places_count !== 1 ? 's' : ''} · {date}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Merge dropdown */}
        <select
          value={mergeTarget}
          onChange={e => setMergeTarget(e.target.value)}
          disabled={merging}
          className="flex-1 min-w-0 rounded-xl border border-[#fcd99a] bg-white px-2.5 py-1.5 font-nunito text-[12px] text-[#131936]/60 focus:outline-none focus:ring-1 focus:ring-[#f08c21]/30"
        >
          <option value="">Merge into…</option>
          {categoryPeers
            .filter(t => t.id !== tag.id)
            .map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))
          }
        </select>

        {mergeTarget && (
          <button
            onClick={() => void handleMerge()}
            disabled={merging}
            className="px-3 py-1.5 rounded-xl bg-[#131936] text-white font-nunito text-[12px] font-medium disabled:opacity-50 shrink-0"
          >
            {merging ? 'Merging…' : 'Merge'}
          </button>
        )}

        {/* Delete */}
        {confirmDelete ? (
          <>
            <button
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="px-3 py-1.5 rounded-xl bg-red-500 text-white font-nunito text-[12px] font-medium disabled:opacity-50 shrink-0"
            >
              {deleting ? 'Deleting…' : 'Confirm delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 rounded-xl border border-[#fcd99a] bg-white font-nunito text-[12px] text-[#131936]/60 shrink-0"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-1.5 rounded-xl border border-red-100 bg-red-50 text-red-500 font-nunito text-[12px] font-medium shrink-0"
          >
            Delete
          </button>
        )}
      </div>

      {/* Deletion warning for tags in use */}
      {confirmDelete && tag.places_count > 0 && (
        <p className="font-nunito text-[11px] text-red-500">
          ⚠ Used by {tag.places_count} place{tag.places_count !== 1 ? 's' : ''} — this will fail unless you remove it from all places first.
        </p>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TagManager({ grouped: initial, categories, labels: initialLabels }: Props) {
  const [grouped, setGrouped] = useState<Record<string, TagRecord[]>>(initial)
  const [showCreate, setShowCreate] = useState(false)
  const [labels, setLabels] = useState<LabelRecord[]>(initialLabels)
  const [newLabelName, setNewLabelName] = useState('')
  const [savingLabel, setSavingLabel] = useState(false)
  const [deletingLabelId, setDeletingLabelId] = useState<string | null>(null)

  async function handleCreateLabel() {
    if (!newLabelName.trim()) return
    setSavingLabel(true)
    const result = await createLabel({ name: newLabelName.trim() })
    setSavingLabel(false)
    if (result.error) { toast.error(result.error); return }
    if (result.label) {
      setLabels(prev => [...prev, result.label!].sort((a, b) => a.name.localeCompare(b.name)))
      setNewLabelName('')
      toast.success(`Label "${result.label.name}" created`)
    }
  }

  async function handleDeleteLabel(id: string, name: string) {
    setDeletingLabelId(id)
    const result = await deleteLabel(id)
    setDeletingLabelId(null)
    if (result.error) { toast.error(result.error); return }
    setLabels(prev => prev.filter(l => l.id !== id))
    toast.success(`"${name}" deleted`)
  }

  const total = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0)

  function handleCreated(tag: TagRecord) {
    setGrouped(prev => {
      const key = categories.includes(tag.category) ? tag.category : 'activity'
      return {
        ...prev,
        [key]: [...(prev[key] ?? []), tag].sort((a, b) => a.name.localeCompare(b.name)),
      }
    })
    setShowCreate(false)
  }

  function handleDeleted(id: string) {
    setGrouped(prev => {
      const next = { ...prev }
      for (const cat of Object.keys(next)) {
        next[cat] = next[cat].filter(t => t.id !== id)
      }
      return next
    })
  }

  function handleMerged(fromId: string, intoId: string) {
    setGrouped(prev => {
      const next = { ...prev }
      for (const cat of Object.keys(next)) {
        next[cat] = next[cat]
          .filter(t => t.id !== fromId)
          .map(t => t.id === intoId ? { ...t, places_count: t.places_count } : t)
      }
      return next
    })
  }

  return (
    <div>
      {/* Create button */}
      {!showCreate && (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full h-11 rounded-full border border-[#f08c21] text-[#f08c21] font-syne font-bold text-[13px] mb-6 hover:bg-[#f08c21]/5 transition-colors"
        >
          + Create tag
        </button>
      )}

      {showCreate && (
        <CreateForm
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Tag groups */}
      {categories.map(cat => {
        const tags = grouped[cat] ?? []
        if (tags.length === 0) return null
        return (
          <section key={cat} className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-syne font-bold text-[#131936] text-[13px] uppercase tracking-wider">
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
              <span className="font-nunito text-[11px] text-[#131936]/30">{tags.length}</span>
            </div>
            <div className="space-y-2">
              {tags.map(tag => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  categoryPeers={tags}
                  onDeleted={handleDeleted}
                  onMerged={handleMerged}
                />
              ))}
            </div>
          </section>
        )
      })}

      {total === 0 && (
        <div className="text-center py-16">
          <p className="text-[32px] mb-3">✦</p>
          <p className="font-syne font-bold text-[#131936]">No tags yet</p>
          <p className="font-nunito text-[#131936]/40 text-[13px] mt-1">
            Create your first tag above
          </p>
        </div>
      )}

      {/* ── Display Labels ─────────────────────────────────────────────────── */}
      <section className="mt-8 pt-6 border-t border-[#fcd99a]/50">
        <h2 className="font-syne font-bold text-[#131936] text-[15px] mb-1">
          Display Labels
        </h2>
        <p className="font-nunito text-[12px] text-[#131936]/40 mb-4">
          Proper nouns shown on cards. Not used for scoring.
        </p>

        {/* Existing labels */}
        <div className="space-y-2 mb-4">
          {labels.map(label => (
            <div
              key={label.id}
              className="flex items-center gap-3 bg-white rounded-2xl border border-[#fcd99a]/40 px-3 py-2.5"
            >
              <span className="flex-1 font-nunito font-semibold text-[#131936] text-[14px]">
                {label.name}
              </span>
              <span className="font-nunito text-[11px] text-[#131936]/30">
                {new Date(label.created_at).toLocaleDateString('en-AU', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
              <button
                onClick={() => void handleDeleteLabel(label.id, label.name)}
                disabled={deletingLabelId === label.id}
                className="px-2.5 py-1 rounded-xl border border-red-100 bg-red-50 text-red-500 font-nunito text-[12px] font-medium disabled:opacity-50 shrink-0"
              >
                {deletingLabelId === label.id ? '…' : 'Delete'}
              </button>
            </div>
          ))}
        </div>

        {/* New label form */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabelName}
            onChange={e => setNewLabelName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void handleCreateLabel()}
            placeholder="New label e.g. UNESCO Heritage"
            className="flex-1 rounded-xl border border-[#fcd99a] bg-white px-3 py-2 font-nunito text-[14px] text-[#131936] placeholder:text-[#131936]/30 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30"
          />
          <button
            onClick={() => void handleCreateLabel()}
            disabled={savingLabel || !newLabelName.trim()}
            className="px-4 h-10 rounded-xl bg-[#131936] text-white font-nunito font-semibold text-[13px] disabled:opacity-50 shrink-0"
          >
            {savingLabel ? '…' : 'Add'}
          </button>
        </div>
      </section>
    </div>
  )
}
