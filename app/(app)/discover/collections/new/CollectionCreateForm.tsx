'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronLeft, X, GripVertical, Search } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import toast from 'react-hot-toast'
import { createCollection } from '@/app/actions/adminCollections'
import type { Place } from '@/lib/types'

type PlaceOption = Pick<Place, 'id' | 'name' | 'country' | 'type' | 'image_thumb_url'>

interface Props {
  places: PlaceOption[]
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function CollectionCreateForm({ places }: Props) {
  const router = useRouter()
  const [name, setName]               = useState('')
  const [slug, setSlug]               = useState('')
  const [slugManual, setSlugManual]   = useState(false)
  const [type, setType]               = useState<'editorial' | 'curated'>('editorial')
  const [description, setDescription] = useState('')
  const [isFeatured, setIsFeatured]   = useState(false)
  const [isActive, setIsActive]       = useState(true)
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState<PlaceOption[]>([])
  const [submitting, setSubmitting]   = useState(false)

  useEffect(() => {
    if (!slugManual) setSlug(slugify(name))
  }, [name, slugManual])

  const searchResults = search.trim().length > 1
    ? places
        .filter(p =>
          !selected.some(s => s.id === p.id) &&
          (p.name.toLowerCase().includes(search.toLowerCase()) ||
           p.country.toLowerCase().includes(search.toLowerCase()))
        )
        .slice(0, 8)
    : []

  function addPlace(p: PlaceOption) {
    setSelected(prev => [...prev, p])
    setSearch('')
  }

  function removePlace(id: string) {
    setSelected(prev => prev.filter(p => p.id !== id))
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const reordered = Array.from(selected)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    setSelected(reordered)
  }

  async function handleSubmit() {
    if (!name.trim() || !slug.trim()) {
      toast.error('Name and slug are required.')
      return
    }
    setSubmitting(true)
    const result = await createCollection({
      name:        name.trim(),
      slug:        slug.trim(),
      type,
      description: description.trim() || undefined,
      is_featured: isFeatured,
      is_active:   isActive,
      placeIds:    selected.map(p => p.id),
    })
    setSubmitting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Collection created ✦')
    router.push('/discover')
  }

  return (
    <div className="max-w-[480px] mx-auto px-4 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#fff9f0] border-b border-[#fcd99a]/50 h-14 flex items-center gap-3 -mx-4 px-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#fcd99a]/40"
          aria-label="Go back"
        >
          <ChevronLeft size={18} className="text-[#131936]" />
        </button>
        <span className="font-brice font-bold text-[#131936] text-[17px] flex-1">New Collection</span>
        <button
          onClick={() => void handleSubmit()}
          disabled={submitting || !name.trim()}
          className="px-4 py-2 rounded-full bg-[#f08c21] text-white font-brice font-bold text-[13px] disabled:opacity-40"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Name */}
      <div className="mt-6">
        <label className="font-brice font-bold text-[#131936] text-[12px] uppercase tracking-widest">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Hidden Gems of Asia"
          className="mt-2 w-full rounded-2xl bg-white border border-[#fcd99a] px-4 py-3 font-nunito text-[#131936] text-[15px] outline-none focus:border-[#f08c21]"
        />
      </div>

      {/* Slug */}
      <div className="mt-4">
        <label className="font-brice font-bold text-[#131936] text-[12px] uppercase tracking-widest">
          Slug
        </label>
        <input
          type="text"
          value={slug}
          onChange={e => { setSlug(e.target.value); setSlugManual(true) }}
          placeholder="hidden-gems-of-asia"
          className="mt-2 w-full rounded-2xl bg-white border border-[#fcd99a] px-4 py-3 font-nunito text-[#131936] text-[15px] outline-none focus:border-[#f08c21]"
        />
      </div>

      {/* Type */}
      <div className="mt-4">
        <label className="font-brice font-bold text-[#131936] text-[12px] uppercase tracking-widest">
          Type
        </label>
        <div className="mt-2 flex gap-2">
          {(['editorial', 'curated'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-3 rounded-2xl font-nunito font-semibold text-[14px] border transition-colors ${
                type === t
                  ? 'bg-[#f08c21] text-white border-[#f08c21]'
                  : 'bg-white text-[#131936]/60 border-[#fcd99a]'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="mt-4">
        <label className="font-brice font-bold text-[#131936] text-[12px] uppercase tracking-widest">
          Description <span className="font-nunito font-normal normal-case tracking-normal text-[#131936]/40">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Short description shown under the collection heading…"
          rows={3}
          className="mt-2 w-full rounded-2xl bg-white border border-[#fcd99a] px-4 py-3 font-nunito text-[#131936] text-[14px] outline-none focus:border-[#f08c21] resize-none"
        />
      </div>

      {/* Toggles */}
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => setIsFeatured(v => !v)}
          className={`flex-1 py-3 rounded-2xl font-nunito font-semibold text-[13px] border transition-colors ${
            isFeatured ? 'bg-[#131936] text-white border-[#131936]' : 'bg-white text-[#131936]/60 border-[#fcd99a]'
          }`}
        >
          {isFeatured ? '★ Featured' : '☆ Not featured'}
        </button>
        <button
          type="button"
          onClick={() => setIsActive(v => !v)}
          className={`flex-1 py-3 rounded-2xl font-nunito font-semibold text-[13px] border transition-colors ${
            isActive ? 'bg-[#16a34a] text-white border-[#16a34a]' : 'bg-white text-[#131936]/60 border-[#fcd99a]'
          }`}
        >
          {isActive ? '● Active' : '○ Inactive'}
        </button>
      </div>

      {/* Place picker */}
      <div className="mt-6">
        <label className="font-brice font-bold text-[#131936] text-[12px] uppercase tracking-widest">
          Places ({selected.length})
        </label>

        {/* Search */}
        <div className="mt-2 relative">
          <div className="flex items-center gap-2 bg-white border border-[#fcd99a] rounded-full px-4 h-11 focus-within:border-[#f08c21]">
            <Search size={14} className="text-[#f08c21] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search places to add…"
              className="flex-1 bg-transparent font-nunito text-[#131936] text-[14px] outline-none"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white rounded-2xl border border-[#fcd99a] shadow-lg overflow-hidden">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addPlace(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#fff9f0] border-b border-[#fcd99a]/30 last:border-0"
                >
                  {p.image_thumb_url && (
                    <Image
                      src={p.image_thumb_url}
                      alt={p.name}
                      width={32}
                      height={32}
                      className="rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-nunito font-semibold text-[#131936] text-[13px]">{p.name}</p>
                    <p className="font-nunito text-[#131936]/50 text-[11px]">{p.country}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected places — draggable */}
        {selected.length > 0 && (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="places">
              {provided => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="mt-3 space-y-2"
                >
                  {selected.map((p, index) => (
                    <Draggable key={p.id} draggableId={p.id} index={index}>
                      {(drag, snapshot) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className={`flex items-center gap-3 bg-white rounded-2xl border px-4 py-3 ${
                            snapshot.isDragging ? 'border-[#f08c21] shadow-md' : 'border-[#fcd99a]/50'
                          }`}
                        >
                          <div {...drag.dragHandleProps} className="text-[#131936]/30 shrink-0">
                            <GripVertical size={16} />
                          </div>
                          {p.image_thumb_url && (
                            <Image
                              src={p.image_thumb_url}
                              alt={p.name}
                              width={36}
                              height={36}
                              className="rounded-lg object-cover shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-nunito font-semibold text-[#131936] text-[13px] truncate">{p.name}</p>
                            <p className="font-nunito text-[#131936]/50 text-[11px]">{p.country}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePlace(p.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#131936]/10 shrink-0"
                            aria-label={`Remove ${p.name}`}
                          >
                            <X size={12} className="text-[#131936]" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {selected.length === 0 && (
          <p className="mt-4 text-center font-nunito text-[#131936]/40 text-[13px]">
            Search above to add places
          </p>
        )}
      </div>
    </div>
  )
}
