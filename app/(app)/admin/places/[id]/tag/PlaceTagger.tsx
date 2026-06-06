'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { savePlaceTags } from '@/app/actions/adminTagging'

interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  sort_order: number
}

interface TagRecord {
  id: string
  name: string
  slug: string
  category: string
}

interface Label {
  id: string
  name: string
  slug: string
}

interface Props {
  placeId: string
  placeName: string
  placeType: string
  categories: Category[]
  tags: TagRecord[]
  labels: Label[]
  initialCategories: { category_id: string; is_primary: boolean }[]
  initialTagIds: string[]
  initialLabelIds: string[]
  nextUntaggedId: string | null
  nextUntaggedName: string | null
}

const DIMENSION_ORDER = ['activity', 'landscape', 'vibe', 'setting', 'season', 'food-drink']
const DIMENSION_LABELS: Record<string, string> = {
  activity:     'Activity',
  landscape:    'Landscape',
  vibe:         'Vibe',
  setting:      'Setting',
  season:       'Season',
  'food-drink': 'Food & Drink',
}

export default function PlaceTagger({
  placeId,
  categories,
  tags,
  labels,
  initialCategories,
  initialTagIds,
  initialLabelIds,
  nextUntaggedId,
  nextUntaggedName,
}: Props) {
  const router = useRouter()

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    () => new Set(initialCategories.map(c => c.category_id))
  )
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string | null>(
    () => initialCategories.find(c => c.is_primary)?.category_id ?? null
  )
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    () => new Set(initialTagIds)
  )
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(
    () => new Set(initialLabelIds)
  )
  const [saving, setSaving] = useState(false)

  // ── Category: 3-state cycle ────────────────────────────────────────────────
  // none → selected (auto-primary if no primary) → primary → none

  function toggleCategory(id: string) {
    if (!selectedCategoryIds.has(id)) {
      setSelectedCategoryIds(prev => new Set([...prev, id]))
      if (!primaryCategoryId) setPrimaryCategoryId(id)
    } else if (primaryCategoryId !== id) {
      setPrimaryCategoryId(id)
    } else {
      setSelectedCategoryIds(prev => { const n = new Set(prev); n.delete(id); return n })
      // If we removed the primary, promote another selected one
      const remaining = [...selectedCategoryIds].filter(c => c !== id)
      setPrimaryCategoryId(remaining[0] ?? null)
    }
  }

  function toggleTag(id: string) {
    setSelectedTagIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleLabel(id: string) {
    setSelectedLabelIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  async function handleSave(thenNavigate?: string) {
    setSaving(true)
    const result = await savePlaceTags(
      placeId,
      [...selectedCategoryIds],
      primaryCategoryId,
      [...selectedTagIds],
      [...selectedLabelIds]
    )
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Tags saved')
    if (thenNavigate) {
      router.push(thenNavigate)
    } else {
      router.refresh()
    }
  }

  // ── Group tags by their category dimension ─────────────────────────────────

  const tagGroups = tags.reduce<Record<string, TagRecord[]>>((acc, tag) => {
    const key = tag.category || 'activity'
    if (!acc[key]) acc[key] = []
    acc[key].push(tag)
    return acc
  }, {})

  return (
    <div className="space-y-8">

      {/* ── Hint ──────────────────────────────────────────────────────────────── */}
      <p className="font-nunito text-[#131936]/40 text-[12px]">
        Tap once to select, again to set as primary ★, once more to remove.
      </p>

      {/* ── Categories ────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-brice font-bold text-[#131936] text-[15px] mb-3">
          Categories
          {selectedCategoryIds.size > 0 && (
            <span className="ml-2 font-nunito font-normal text-[12px] text-[#f08c21]">
              {selectedCategoryIds.size} selected
            </span>
          )}
        </h2>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => {
            const isSelected = selectedCategoryIds.has(cat.id)
            const isPrimary = primaryCategoryId === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full border font-nunito text-[13px] font-medium transition-all flex items-center gap-1.5 ${
                  isPrimary
                    ? 'bg-[#f08c21] border-[#f08c21] text-white'
                    : isSelected
                    ? 'bg-[#131936] border-[#131936] text-white'
                    : 'bg-white border-[#fcd99a] text-[#131936]/60'
                }`}
              >
                {cat.icon && <span>{cat.icon}</span>}
                {cat.name}
                {isPrimary && <span className="text-[10px]">★</span>}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Tags ──────────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-brice font-bold text-[#131936] text-[15px] mb-3">
          Tags
          {selectedTagIds.size > 0 && (
            <span className="ml-2 font-nunito font-normal text-[12px] text-[#f08c21]">
              {selectedTagIds.size} selected
            </span>
          )}
        </h2>
        <div className="space-y-4">
          {DIMENSION_ORDER.map(key => {
            const dimTags = tagGroups[key] ?? []
            if (dimTags.length === 0) return null
            return (
              <div key={key}>
                <p className="font-nunito text-[#131936]/40 text-[11px] uppercase tracking-wider mb-2">
                  {DIMENSION_LABELS[key] ?? key}
                </p>
                <div className="flex flex-wrap gap-2">
                  {dimTags.map(tag => {
                    const isSelected = selectedTagIds.has(tag.id)
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-full border font-nunito text-[12px] transition-all ${
                          isSelected
                            ? 'bg-[#131936] border-[#131936] text-white'
                            : 'bg-white border-[#fcd99a] text-[#131936]/60'
                        }`}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {tags.length === 0 && (
            <p className="font-nunito text-[#131936]/30 text-[13px]">
              No tags in library yet —{' '}
              <Link href="/admin/tags" className="text-[#f08c21] underline">add tags first</Link>
            </p>
          )}
        </div>
      </section>

      {/* ── Labels ────────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-brice font-bold text-[#131936] text-[15px] mb-3">
          Labels
          {selectedLabelIds.size > 0 && (
            <span className="ml-2 font-nunito font-normal text-[12px] text-[#f08c21]">
              {selectedLabelIds.size} selected
            </span>
          )}
        </h2>
        <div className="flex flex-wrap gap-2">
          {labels.map(label => {
            const isSelected = selectedLabelIds.has(label.id)
            return (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id)}
                className={`px-3 py-1.5 rounded-full border font-nunito text-[12px] transition-all ${
                  isSelected
                    ? 'bg-[#7B4FE8] border-[#7B4FE8] text-white'
                    : 'bg-white border-[#fcd99a] text-[#131936]/60'
                }`}
              >
                {label.name}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Sticky save bar ───────────────────────────────────────────────────── */}
      <div className="fixed bottom-16 left-0 right-0 z-20 bg-[#fff9f0]/95 backdrop-blur border-t border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center gap-3">
          {nextUntaggedId ? (
            <button
              onClick={() => void handleSave(`/admin/places/${nextUntaggedId}/tag`)}
              disabled={saving}
              className="px-4 h-11 rounded-full border border-[#fcd99a] bg-white font-nunito text-[13px] text-[#131936] font-medium whitespace-nowrap disabled:opacity-40 shrink-0"
            >
              Save & next →
            </button>
          ) : (
            <Link
              href="/admin/places"
              className="px-4 h-11 rounded-full border border-[#fcd99a] bg-white font-nunito text-[13px] text-[#131936] font-medium flex items-center whitespace-nowrap shrink-0"
            >
              ← All places
            </Link>
          )}
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 h-11 rounded-full bg-[#f08c21] font-nunito font-bold text-[14px] text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save tags'}
          </button>
        </div>
        {nextUntaggedId && nextUntaggedName && (
          <p className="max-w-[480px] mx-auto px-4 pb-2 font-nunito text-[11px] text-[#131936]/40 truncate">
            Next: {nextUntaggedName}
          </p>
        )}
      </div>
    </div>
  )
}
