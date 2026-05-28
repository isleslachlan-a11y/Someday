'use client'

import { useState, useMemo, useRef } from 'react'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import {
  createCollection,
  updateCollection,
  updateCollectionPlaces,
  toggleCollectionActive,
  reorderCollections,
} from '@/app/actions/adminCollections'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Collection {
  id: string
  slug: string
  name: string
  type: string
  description: string | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  place_count: number
}

export interface PlaceItem {
  id: string
  name: string
  country: string
  type: string
  image_thumb_url: string | null
}

interface FormState {
  name: string
  slug: string
  type: 'region' | 'theme' | 'editorial' | 'country'
  description: string
  is_featured: boolean
  is_active: boolean
}

const DEFAULT_FORM: FormState = {
  name: '',
  slug: '',
  type: 'region',
  description: '',
  is_featured: false,
  is_active: true,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const TYPE_COLORS: Record<string, string> = {
  region:    'bg-[#131936]/10 text-[#131936]/70',
  theme:     'bg-[#7B4FE8]/15 text-[#7B4FE8]',
  editorial: 'bg-[#f08c21]/15 text-[#f08c21]',
  country:   'bg-[#16a34a]/15 text-[#16a34a]',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  collections: Collection[]
  places: PlaceItem[]
  collectionPlacesMap: Record<string, string[]>
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CollectionsManager({ collections: initial, places, collectionPlacesMap }: Props) {
  type View = 'list' | 'create' | 'edit'

  const [view, setView]                         = useState<View>('list')
  const [localCollections, setLocalCollections] = useState<Collection[]>(initial)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [formState, setFormState]               = useState<FormState>(DEFAULT_FORM)
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([])
  const [placeSearch, setPlaceSearch]           = useState('')
  const [saving, setSaving]                     = useState(false)
  const slugLocked                              = useRef(false)

  // ── Place lookup map ────────────────────────────────────────────────────────
  const placesById = useMemo(
    () => Object.fromEntries(places.map(p => [p.id, p])),
    [places]
  )

  // ── Filtered places for picker (exclude already selected) ──────────────────
  const filteredPlaces = useMemo(() => {
    const q = placeSearch.toLowerCase()
    return places.filter(p =>
      !selectedPlaceIds.includes(p.id) &&
      (!q || p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q))
    )
  }, [places, placeSearch, selectedPlaceIds])

  // ── View transitions ────────────────────────────────────────────────────────

  function startCreate() {
    slugLocked.current = false
    setEditingCollection(null)
    setFormState(DEFAULT_FORM)
    setSelectedPlaceIds([])
    setPlaceSearch('')
    setView('create')
  }

  function startEdit(col: Collection) {
    slugLocked.current = true
    setEditingCollection(col)
    setFormState({
      name:        col.name,
      slug:        col.slug,
      type:        col.type as FormState['type'],
      description: col.description ?? '',
      is_featured: col.is_featured,
      is_active:   col.is_active,
    })
    setSelectedPlaceIds(collectionPlacesMap[col.id] ?? [])
    setPlaceSearch('')
    setView('edit')
  }

  function goToList() {
    setView('list')
    setEditingCollection(null)
  }

  // ── Form field helpers ──────────────────────────────────────────────────────

  function setName(name: string) {
    setFormState(prev => ({
      ...prev,
      name,
      slug: slugLocked.current ? prev.slug : slugify(name),
    }))
  }

  function setSlug(slug: string) {
    slugLocked.current = true
    setFormState(prev => ({ ...prev, slug }))
  }

  // ── Place picker ────────────────────────────────────────────────────────────

  function addPlace(placeId: string) {
    setSelectedPlaceIds(prev => (prev.includes(placeId) ? prev : [...prev, placeId]))
  }

  function removePlace(placeId: string) {
    setSelectedPlaceIds(prev => prev.filter(id => id !== placeId))
  }

  function handlePlaceDragEnd(result: DropResult) {
    if (!result.destination) return
    const next = [...selectedPlaceIds]
    const [moved] = next.splice(result.source.index, 1)
    next.splice(result.destination.index, 0, moved)
    setSelectedPlaceIds(next)
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!formState.name.trim()) { toast.error('Name is required'); return }
    if (!formState.slug.trim()) { toast.error('Slug is required'); return }

    setSaving(true)
    try {
      if (editingCollection) {
        const res = await updateCollection({
          id:          editingCollection.id,
          name:        formState.name,
          slug:        formState.slug,
          type:        formState.type,
          description: formState.description || undefined,
          is_featured: formState.is_featured,
          is_active:   formState.is_active,
        })
        if (res.error) { toast.error(res.error); return }

        const placesRes = await updateCollectionPlaces({
          collectionId: editingCollection.id,
          placeIds:     selectedPlaceIds,
        })
        if (placesRes.error) { toast.error(placesRes.error); return }

        setLocalCollections(prev => prev.map(c =>
          c.id === editingCollection.id
            ? { ...c, ...formState, place_count: selectedPlaceIds.length }
            : c
        ))
        toast.success('Collection updated')
      } else {
        const res = await createCollection({
          name:        formState.name,
          slug:        formState.slug,
          type:        formState.type,
          description: formState.description || undefined,
          is_featured: formState.is_featured,
          is_active:   formState.is_active,
          placeIds:    selectedPlaceIds,
        })
        if (res.error) { toast.error(res.error); return }

        setLocalCollections(prev => [...prev, {
          id:          res.id!,
          slug:        formState.slug,
          name:        formState.name,
          type:        formState.type,
          description: formState.description || null,
          is_featured: formState.is_featured,
          is_active:   formState.is_active,
          sort_order:  prev.length,
          place_count: selectedPlaceIds.length,
        }])
        toast.success('Collection created')
      }

      goToList()
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle active ───────────────────────────────────────────────────────────

  async function handleToggleActive(col: Collection) {
    const next = !col.is_active
    setLocalCollections(prev => prev.map(c => c.id === col.id ? { ...c, is_active: next } : c))
    const res = await toggleCollectionActive({ id: col.id, is_active: next })
    if (res.error) {
      toast.error(res.error)
      setLocalCollections(prev => prev.map(c => c.id === col.id ? { ...c, is_active: col.is_active } : c))
    }
  }

  // ── Reorder collections list ────────────────────────────────────────────────

  async function handleCollectionDragEnd(result: DropResult) {
    if (!result.destination) return
    const next = [...localCollections]
    const [moved] = next.splice(result.source.index, 1)
    next.splice(result.destination.index, 0, moved)
    setLocalCollections(next)
    const res = await reorderCollections({ orderedIds: next.map(c => c.id) })
    if (res.error) {
      toast.error('Failed to save order')
      setLocalCollections(localCollections)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div>
        <button
          onClick={startCreate}
          className="w-full mb-4 h-11 rounded-2xl bg-[#f08c21] text-white font-syne font-bold text-[15px]"
        >
          + New Collection
        </button>

        {localCollections.length === 0 && (
          <p className="text-center font-nunito text-[#131936]/40 text-[13px] py-12">
            No collections yet. Create one above.
          </p>
        )}

        <DragDropContext onDragEnd={handleCollectionDragEnd}>
          <Droppable droppableId="collections">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {localCollections.map((col, index) => (
                  <Draggable key={col.id} draggableId={col.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex items-center gap-2 bg-white rounded-2xl border border-[#fcd99a]/40 px-3 py-3"
                      >
                        {/* Drag handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="text-[#131936]/25 cursor-grab active:cursor-grabbing shrink-0 px-1 text-[18px] leading-none select-none"
                        >
                          ⠿
                        </div>

                        {/* Name + badges */}
                        <div className="flex-1 min-w-0">
                          <p className="font-syne font-bold text-[#131936] text-[14px] truncate">{col.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full font-nunito text-[10px] font-medium capitalize ${TYPE_COLORS[col.type] ?? TYPE_COLORS.editorial}`}>
                              {col.type}
                            </span>
                            <span className="font-nunito text-[11px] text-[#131936]/50">
                              {col.place_count} {col.place_count === 1 ? 'place' : 'places'}
                            </span>
                          </div>
                        </div>

                        {/* Active toggle */}
                        <button
                          onClick={() => handleToggleActive(col)}
                          className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${col.is_active ? 'bg-[#f08c21]' : 'bg-[#131936]/20'}`}
                          aria-label={col.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${col.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => startEdit(col)}
                          className="font-nunito text-[12px] text-[#f08c21] shrink-0 px-1 py-1 min-w-[44px] text-right"
                        >
                          Edit
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
      </div>
    )
  }

  // ── Create / Edit form view ─────────────────────────────────────────────────

  return (
    <div>
      {/* Form fields */}
      <div className="space-y-4 mb-6">

        {/* Name */}
        <div>
          <label className="font-nunito text-[12px] text-[#131936]/60 block mb-1">Name *</label>
          <input
            type="text"
            value={formState.name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Southeast Asia"
            className="w-full rounded-2xl border border-[#fcd99a] bg-white px-4 py-3 font-nunito text-[14px] text-[#131936] placeholder:text-[#131936]/30 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="font-nunito text-[12px] text-[#131936]/60 block mb-1">Slug *</label>
          <input
            type="text"
            value={formState.slug}
            onChange={e => setSlug(e.target.value)}
            placeholder="e.g. southeast-asia"
            className="w-full rounded-2xl border border-[#fcd99a] bg-white px-4 py-3 font-nunito text-[13px] text-[#131936]/70 placeholder:text-[#131936]/30 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30"
          />
        </div>

        {/* Type */}
        <div>
          <label className="font-nunito text-[12px] text-[#131936]/60 block mb-1">Type *</label>
          <div className="flex gap-2 flex-wrap">
            {(['region', 'theme', 'editorial', 'country'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFormState(prev => ({ ...prev, type: t }))}
                className={`px-3 py-1.5 rounded-full border font-nunito text-[12px] font-medium capitalize transition-all ${
                  formState.type === t
                    ? 'bg-[#f08c21] border-[#f08c21] text-white'
                    : 'bg-white border-[#fcd99a] text-[#131936]/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="font-nunito text-[12px] text-[#131936]/60 block mb-1">Description</label>
          <textarea
            value={formState.description}
            onChange={e => setFormState(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description…"
            rows={3}
            className="w-full rounded-2xl border border-[#fcd99a] bg-white px-4 py-3 font-nunito text-[14px] text-[#131936] placeholder:text-[#131936]/30 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30 resize-none"
          />
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formState.is_featured}
              onChange={e => setFormState(prev => ({ ...prev, is_featured: e.target.checked }))}
              className="accent-[#f08c21] w-4 h-4 rounded"
            />
            <span className="font-nunito text-[13px] text-[#131936]">Featured</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formState.is_active}
              onChange={e => setFormState(prev => ({ ...prev, is_active: e.target.checked }))}
              className="accent-[#f08c21] w-4 h-4 rounded"
            />
            <span className="font-nunito text-[13px] text-[#131936]">Active</span>
          </label>
        </div>
      </div>

      {/* ── Place picker ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="font-syne font-bold text-[#131936] text-[15px] mb-3">
          Places
          <span className="font-nunito font-normal text-[12px] text-[#131936]/50 ml-2">
            {selectedPlaceIds.length} selected
          </span>
        </p>

        {/* Selected places with drag reorder */}
        {selectedPlaceIds.length > 0 && (
          <div className="mb-3">
            <DragDropContext onDragEnd={handlePlaceDragEnd}>
              <Droppable droppableId="selected-places">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                    {selectedPlaceIds.map((placeId, index) => {
                      const place = placesById[placeId]
                      if (!place) return null
                      return (
                        <Draggable key={placeId} draggableId={placeId} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="flex items-center gap-2 bg-[#fcd99a]/20 rounded-xl px-3 py-2 border border-[#fcd99a]/40"
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="text-[#131936]/25 cursor-grab active:cursor-grabbing shrink-0 text-[16px] leading-none select-none"
                              >
                                ⠿
                              </div>
                              {place.image_thumb_url && (
                                <Image
                                  src={place.image_thumb_url}
                                  alt={place.name}
                                  width={32}
                                  height={32}
                                  className="rounded-lg object-cover shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-nunito text-[13px] text-[#131936] font-medium truncate">{place.name}</p>
                                <p className="font-nunito text-[11px] text-[#131936]/50 truncate">{place.country}</p>
                              </div>
                              <button
                                onClick={() => removePlace(placeId)}
                                className="text-[#131936]/30 hover:text-[#f08c21] transition-colors shrink-0 w-6 h-6 flex items-center justify-center font-bold"
                                aria-label={`Remove ${place.name}`}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </Draggable>
                      )
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}

        {/* Search / add places */}
        <input
          type="text"
          value={placeSearch}
          onChange={e => setPlaceSearch(e.target.value)}
          placeholder="Search places to add…"
          className="w-full rounded-full border border-[#fcd99a] bg-white px-4 py-2.5 font-nunito text-[13px] text-[#131936] placeholder:text-[#131936]/40 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30 mb-2"
        />

        <div className="space-y-1 max-h-56 overflow-y-auto">
          {filteredPlaces.slice(0, 40).map(place => (
            <button
              key={place.id}
              onClick={() => addPlace(place.id)}
              className="w-full flex items-center gap-2 bg-white rounded-xl border border-[#fcd99a]/40 px-3 py-2 hover:border-[#f08c21]/50 transition-colors text-left"
            >
              {place.image_thumb_url && (
                <Image
                  src={place.image_thumb_url}
                  alt={place.name}
                  width={32}
                  height={32}
                  className="rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-nunito text-[13px] text-[#131936] font-medium truncate">{place.name}</p>
                <p className="font-nunito text-[11px] text-[#131936]/50 truncate">{place.country}</p>
              </div>
              <span className={`px-1.5 py-0.5 rounded font-nunito text-[9px] capitalize shrink-0 ${TYPE_COLORS[place.type] ?? 'bg-[#131936]/10 text-[#131936]/50'}`}>
                {place.type}
              </span>
            </button>
          ))}
          {filteredPlaces.length === 0 && placeSearch && (
            <p className="text-center font-nunito text-[#131936]/40 text-[12px] py-4">No places match</p>
          )}
        </div>
      </div>

      {/* ── Action buttons ────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={goToList}
          className="flex-1 h-11 rounded-2xl border border-[#fcd99a] font-nunito font-medium text-[14px] text-[#131936]/50 bg-white"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-[2] h-11 rounded-2xl bg-[#f08c21] text-white font-syne font-bold text-[14px] disabled:opacity-50"
        >
          {saving ? 'Saving…' : editingCollection ? 'Save Changes' : 'Save Collection'}
        </button>
      </div>
    </div>
  )
}
