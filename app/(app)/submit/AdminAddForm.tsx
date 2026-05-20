'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { adminCreatePlace } from '@/app/actions/adminPlaces'

// ── Types ─────────────────────────────────────────────────────────────────────

type PlaceType = 'city' | 'nature' | 'experience' | 'food'
type Region    = 'Asia' | 'Europe' | 'Americas' | 'Africa' | 'Oceania' | 'Global'
type Intensity = 'low' | 'medium' | 'high'

interface UnsplashResult {
  id: string
  image_url: string
  image_thumb_url: string
  attribution: {
    photographer_name: string
    photographer_url: string
    photo_url: string
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PLACE_TYPES: { value: PlaceType; label: string; icon: string }[] = [
  { value: 'city',       label: 'City',       icon: '🏙' },
  { value: 'nature',     label: 'Nature',      icon: '🌿' },
  { value: 'experience', label: 'Experience',  icon: '✨' },
  { value: 'food',       label: 'Food',        icon: '🍜' },
]

const REGIONS: Region[] = ['Asia', 'Europe', 'Americas', 'Africa', 'Oceania', 'Global']

const INTENSITIES: Intensity[] = ['low', 'medium', 'high']

const VIBES_OPTIONS = [
  'Adventure', 'Culture', 'Foodie', 'Romantic',
  'Chill', 'Epic', 'Peaceful', 'Wellness',
]

// ── Style helpers ─────────────────────────────────────────────────────────────

const INPUT_CLASS =
  'w-full rounded-2xl border border-[#fcd99a] bg-white px-4 py-3 font-nunito text-[14px] text-[#131936] placeholder:text-[#131936]/40 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30 transition'

const SECTION_HEADING = 'font-syne font-bold text-[#131936] text-[15px] mb-3'

function pillClass(active: boolean) {
  return `px-4 py-2 rounded-full border font-nunito text-[13px] font-medium transition-all ${
    active
      ? 'bg-[#f08c21] text-[#131936] border-[#f08c21]'
      : 'bg-white text-[#131936]/60 border-[#fcd99a]'
  }`
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  userId: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminAddForm({ userId: _userId }: Props) {
  const [form, setForm] = useState({
    name:        '',
    type:        'city' as PlaceType,
    country:     '',
    region:      'Europe' as Region,
    description: '',
    intensity:   'medium' as Intensity,
    popularity:  50,
    tags:        '',
    vibes:       [] as string[],
    lat:         '',
    lng:         '',
  })

  const [imageQuery, setImageQuery]               = useState('')
  const [imageResults, setImageResults]           = useState<UnsplashResult[]>([])
  const [imageSearchLoading, setImageSearchLoading] = useState(false)
  const [selectedImage, setSelectedImage]         = useState<UnsplashResult | null>(null)
  const [saving, setSaving]                       = useState(false)
  const [error, setError]                         = useState<string | null>(null)

  // Auto-populate image query when name changes
  useEffect(() => {
    if (!form.name.trim()) return
    const t = setTimeout(() => setImageQuery(form.name.trim()), 600)
    return () => clearTimeout(t)
  }, [form.name])

  // ── Handlers ────────────────────────────────────────────────────────────────

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggleVibe(vibe: string) {
    setForm(prev => ({
      ...prev,
      vibes: prev.vibes.includes(vibe)
        ? prev.vibes.filter(v => v !== vibe)
        : [...prev.vibes, vibe],
    }))
  }

  async function searchImages() {
    if (!imageQuery.trim()) return
    setImageSearchLoading(true)
    setImageResults([])
    try {
      const res = await fetch(`/api/unsplash/search?q=${encodeURIComponent(imageQuery.trim())}`)
      const data = await res.json()
      setImageResults(data.results ?? [])
    } catch {
      toast.error('Image search failed.')
    } finally {
      setImageSearchLoading(false)
    }
  }

  function selectImage(img: UnsplashResult) {
    setSelectedImage(prev => prev?.id === img.id ? null : img)
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.country.trim()) {
      setError('Name and country are required.')
      return
    }
    setSaving(true)
    setError(null)

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)

    const result = await adminCreatePlace({
      name:                 form.name.trim(),
      country:              form.country.trim(),
      region:               form.region,
      type:                 form.type,
      description:          form.description.trim(),
      tags,
      vibes:                form.vibes,
      intensity:            form.intensity,
      popularity:           form.popularity,
      lat:                  form.lat ? parseFloat(form.lat) : null,
      lng:                  form.lng ? parseFloat(form.lng) : null,
      image_url:            selectedImage?.image_url ?? null,
      image_thumb_url:      selectedImage?.image_thumb_url ?? null,
      unsplash_photo_id:    selectedImage?.id ?? null,
      unsplash_attribution: selectedImage?.attribution ?? null,
    })

    setSaving(false)

    if (result.error) {
      setError(result.error)
      toast.error(result.error)
    } else {
      toast.success(`${form.name} added to the database ✦`)
      setForm({
        name: '', type: 'city', country: '', region: 'Europe',
        description: '', intensity: 'medium', popularity: 50,
        tags: '', vibes: [], lat: '', lng: '',
      })
      setSelectedImage(null)
      setImageResults([])
      setImageQuery('')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* ── Section 1: Basic info ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className={SECTION_HEADING}>Basic info</p>

        {/* Name */}
        <div>
          <label htmlFor="admin-name" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">
            Name <span className="text-[#f08c21]">*</span>
          </label>
          <input
            id="admin-name"
            name="admin-name"
            type="text"
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="e.g. Hoi An, Vietnam"
            className={INPUT_CLASS}
          />
        </div>

        {/* Type */}
        <div>
          <p className="font-nunito text-[12px] text-[#131936]/50 mb-2">Type</p>
          <div className="flex flex-wrap gap-2">
            {PLACE_TYPES.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setField('type', opt.value)}
                className={pillClass(form.type === opt.value)}
              >
                <span className="mr-1">{opt.icon}</span>{opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Country */}
        <div>
          <label htmlFor="admin-country" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">
            Country <span className="text-[#f08c21]">*</span>
          </label>
          <input
            id="admin-country"
            name="admin-country"
            type="text"
            value={form.country}
            onChange={e => setField('country', e.target.value)}
            placeholder="e.g. Vietnam"
            className={INPUT_CLASS}
          />
        </div>

        {/* Region */}
        <div>
          <p className="font-nunito text-[12px] text-[#131936]/50 mb-2">Region</p>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setField('region', r)}
                className={pillClass(form.region === r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="admin-description" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">
            Description
          </label>
          <textarea
            id="admin-description"
            name="admin-description"
            rows={4}
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            placeholder="What makes this place special…"
            className={`${INPUT_CLASS} resize-none`}
          />
        </div>
      </div>

      {/* ── Section 2: Details ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className={SECTION_HEADING}>Details</p>

        {/* Intensity */}
        <div>
          <p className="font-nunito text-[12px] text-[#131936]/50 mb-2">Intensity</p>
          <div className="flex gap-2">
            {INTENSITIES.map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setField('intensity', i)}
                className={`${pillClass(form.intensity === i)} capitalize`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Popularity */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-nunito text-[12px] text-[#131936]/50">Popularity</p>
            <span className="font-nunito font-semibold text-[#f08c21] text-[13px]">
              {form.popularity}/100
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={form.popularity}
            onChange={e => setField('popularity', Number(e.target.value))}
            className="w-full accent-[#f08c21]"
          />
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="admin-tags" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">
            Tags <span className="font-normal">(comma-separated)</span>
          </label>
          <input
            id="admin-tags"
            name="admin-tags"
            type="text"
            value={form.tags}
            onChange={e => setField('tags', e.target.value)}
            placeholder="e.g. hiking, remote, winter, festive"
            className={INPUT_CLASS}
          />
          {form.tags.trim() && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} className="rounded-full bg-[#fcd99a]/50 border border-[#fcd99a] px-2.5 py-0.5 font-nunito text-[11px] text-[#131936]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Vibes */}
        <div>
          <p className="font-nunito text-[12px] text-[#131936]/50 mb-2">Vibes</p>
          <div className="flex flex-wrap gap-2">
            {VIBES_OPTIONS.map(vibe => (
              <button
                key={vibe}
                type="button"
                onClick={() => toggleVibe(vibe)}
                className={pillClass(form.vibes.includes(vibe))}
              >
                {vibe}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 3: Location ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className={SECTION_HEADING}>Location</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="admin-lat" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">
              Latitude
            </label>
            <input
              id="admin-lat"
              name="admin-lat"
              type="number"
              step="any"
              value={form.lat}
              onChange={e => setField('lat', e.target.value)}
              placeholder="e.g. 35.6762"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="admin-lng" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">
              Longitude
            </label>
            <input
              id="admin-lng"
              name="admin-lng"
              type="number"
              step="any"
              value={form.lng}
              onChange={e => setField('lng', e.target.value)}
              placeholder="e.g. 139.6503"
              className={INPUT_CLASS}
            />
          </div>
        </div>
        <p className="font-nunito text-[11px] text-[#131936]/40">
          Find coordinates at maps.google.com — right-click any location
        </p>
      </div>

      {/* ── Section 4: Image ────────────────────────────────────────────────── */}
      <div>
        <p className={SECTION_HEADING}>Image</p>

        {/* Search bar */}
        <div className="flex gap-2 mb-3">
          <input
            id="unsplash-search"
            name="unsplash-search"
            value={imageQuery}
            onChange={e => setImageQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void searchImages()}
            placeholder="Search Unsplash…"
            className="flex-1 rounded-full border border-[#fcd99a] bg-white px-4 py-2.5 font-nunito text-[14px] text-[#131936] placeholder:text-[#131936]/40 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30"
          />
          <button
            type="button"
            onClick={() => void searchImages()}
            disabled={imageSearchLoading}
            className="px-4 py-2.5 rounded-full bg-[#f08c21] text-[#131936] font-nunito font-semibold text-[13px] shrink-0 disabled:opacity-50"
          >
            {imageSearchLoading ? '…' : 'Search'}
          </button>
        </div>

        {/* Image grid */}
        {imageResults.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {imageResults.map(img => (
              <button
                key={img.id}
                type="button"
                onClick={() => selectImage(img)}
                className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                  selectedImage?.id === img.id
                    ? 'border-[#f08c21] scale-[0.97]'
                    : 'border-transparent'
                }`}
              >
                <Image
                  src={img.image_thumb_url}
                  alt={img.attribution.photographer_name}
                  fill
                  sizes="33vw"
                  className="object-cover"
                />
                {selectedImage?.id === img.id && (
                  <div className="absolute inset-0 bg-[#f08c21]/20 flex items-center justify-center">
                    <span className="text-white text-[20px]">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Selected image preview */}
        {selectedImage && (
          <div className="rounded-2xl overflow-hidden border border-[#fcd99a] mb-2">
            <div className="relative h-40">
              <Image
                src={selectedImage.image_url}
                alt="Selected"
                fill
                sizes="480px"
                className="object-cover"
              />
            </div>
            <p className="font-nunito text-[#131936]/40 text-[10px] px-3 py-1.5">
              Photo by{' '}
              <a
                href={selectedImage.attribution.photographer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#f08c21]"
              >
                {selectedImage.attribution.photographer_name}
              </a>
              {' '}on Unsplash
            </p>
          </div>
        )}
      </div>

      {/* ── Error + Save ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3">
          <p className="font-nunito text-[13px] text-red-600">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={saving}
        className="w-full h-14 rounded-full bg-[#131936] text-white font-syne font-bold text-[16px] disabled:opacity-50 transition-opacity"
      >
        {saving ? 'Adding to database…' : 'Add to Someday Database ✦'}
      </button>

    </div>
  )
}
