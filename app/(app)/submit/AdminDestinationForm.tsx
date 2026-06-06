'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { adminCreatePlace } from '@/app/actions/adminPlaces'
import type { UnsplashAttribution } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type Region = 'Asia' | 'Europe' | 'Americas' | 'Africa' | 'Oceania' | 'Global'

interface Category { id: string; name: string; slug: string; icon: string }
interface Label    { id: string; name: string }
interface Tag      { id: string; name: string; slug: string; category: string; place_type: string[] }

interface UnsplashResult {
  id: string
  image_url: string
  image_thumb_url: string
  attribution: { photographer_name: string; photographer_url: string; photo_url: string }
}

interface Prediction {
  place_id: string; description: string; main_text: string; secondary_text: string
  lat: number | null; lng: number | null; country: string; region_name: string
  feature_type: string | null; mapbox_category: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const REGIONS: Region[] = ['Asia', 'Europe', 'Americas', 'Africa', 'Oceania', 'Global']
const VIBES_OPTIONS = ['Adventure', 'Culture', 'Foodie', 'Romantic', 'Chill', 'Epic', 'Peaceful', 'Wellness']
const ACTIVITY_CATEGORIES = ['sightseeing', 'food & drink', 'adventure', 'culture', 'nature', 'shopping', 'nightlife', 'wellness']
const IMAGE_PAGE_SIZE = 9
const CARD_VIBE_OPTIONS = ['Adventure', 'Romantic', 'Foodie', 'Chill', 'Epic', 'Peaceful', 'Cultural', 'Wellness', 'Off-grid', 'Party']
const DIMENSION_ORDER = ['activity', 'landscape', 'vibe', 'setting', 'season', 'food-drink']
const DIMENSION_LABELS: Record<string, string> = {
  activity:     'Activity',
  landscape:    'Landscape',
  vibe:         'Vibe',
  setting:      'Setting',
  season:       'Season',
  'food-drink': 'Food & Drink',
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full rounded-2xl border border-[#fcd99a] bg-white px-4 py-3 font-nunito text-[14px] text-[#131936] placeholder:text-[#131936]/40 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30 transition'
const SECTION_HEADING = 'font-brice font-bold text-[#131936] text-[15px] mb-3'

function pillClass(active: boolean) {
  return `px-4 py-2 rounded-full border font-nunito text-[13px] font-medium transition-all ${active ? 'bg-[#f08c21] text-[#131936] border-[#f08c21]' : 'bg-white text-[#131936]/60 border-[#fcd99a]'}`
}

function catPillClass(state: 'none' | 'selected' | 'primary') {
  if (state === 'primary')  return 'px-4 py-2 rounded-full border font-nunito text-[13px] font-medium transition-all bg-[#f08c21] text-white border-[#f08c21]'
  if (state === 'selected') return 'px-4 py-2 rounded-full border font-nunito text-[13px] font-medium transition-all bg-[#f08c21]/10 text-[#131936] border-[#f08c21]'
  return 'px-4 py-2 rounded-full border font-nunito text-[13px] font-medium transition-all bg-white text-[#131936]/60 border-[#fcd99a]'
}

function labelPillClass(active: boolean) {
  return `px-4 py-2 rounded-full border font-nunito text-[13px] font-medium transition-all ${active ? 'bg-[#131936] text-white border-[#131936]' : 'bg-white text-[#131936]/60 border-[#fcd99a]'}`
}

// ── ActivityAdder ─────────────────────────────────────────────────────────────

function ActivityAdder({ placeId }: { placeId: string }) {
  const [name, setName]         = useState('')
  const [duration, setDuration] = useState('')
  const [category, setCategory] = useState('')
  const [rating, setRating]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [added, setAdded]       = useState<string[]>([])

  async function addActivity() {
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch('/api/admin/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place_id: placeId, name: name.trim(), duration: duration.trim() || null, category: category || null, rating: rating ? parseFloat(rating) : null }),
    })
    setSaving(false)
    if (res.ok) { setAdded(prev => [...prev, name.trim()]); setName(''); setDuration(''); setCategory(''); setRating(''); toast.success('Activity added ✦') }
    else toast.error('Failed to add activity.')
  }

  return (
    <div className="space-y-3">
      {added.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {added.map(a => <span key={a} className="px-3 py-1 rounded-full bg-[#fcd99a]/50 border border-[#fcd99a] font-nunito text-[12px] text-[#131936]">✓ {a}</span>)}
        </div>
      )}
      <input id="activity-name" name="activity-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Activity name e.g. Visit Senso-ji Temple" className={INPUT_CLASS} />
      <div className="grid grid-cols-2 gap-3">
        <input id="activity-duration" name="activity-duration" type="text" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duration e.g. 2-3 hours" className={INPUT_CLASS} />
        <input id="activity-rating" name="activity-rating" type="number" min="0" max="5" step="0.1" value={rating} onChange={e => setRating(e.target.value)} placeholder="Rating 0-5" className={INPUT_CLASS} />
      </div>
      <div className="flex flex-wrap gap-2">
        {ACTIVITY_CATEGORIES.map(c => <button key={c} type="button" onClick={() => setCategory(prev => prev === c ? '' : c)} className={pillClass(category === c)}>{c}</button>)}
      </div>
      <button type="button" onClick={() => void addActivity()} disabled={saving || !name.trim()} className="w-full h-11 rounded-full bg-[#f08c21] text-[#131936] font-brice font-bold text-[14px] disabled:opacity-50">
        {saving ? 'Adding…' : '+ Add activity'}
      </button>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  userId: string
  onBack: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminDestinationForm({ userId: _userId, onBack }: Props) {
  const [form, setForm] = useState({
    name: '', country: '', region: 'Europe' as Region,
    state_province: '', description: '', vibes: [] as string[],
  })
  const [hingeFields, setHingeFields] = useState({
    must_do: '', hidden_gem: '', not_for_you: '', best_time: '', vibe_tags: [] as string[],
  })

  const [suggestions, setSuggestions]         = useState<Prediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [geocoding, setGeocoding]             = useState(false)
  const [locationLocked, setLocationLocked]   = useState(false)
  const [resolvedLat, setResolvedLat]         = useState<number | null>(null)
  const [resolvedLng, setResolvedLng]         = useState<number | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualLat, setManualLat]             = useState('')
  const [manualLng, setManualLng]             = useState('')

  const [allCategories, setAllCategories]           = useState<Category[]>([])
  const [allLabels, setAllLabels]                   = useState<Label[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [primaryCategoryId, setPrimaryCategoryId]   = useState<string | null>(null)
  const [selectedLabelIds, setSelectedLabelIds]     = useState<Set<string>>(new Set())
  const [allTags, setAllTags]           = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagSearch, setTagSearch]       = useState('')
  const [showAllTags, setShowAllTags]   = useState(false)

  const [imagePage, setImagePage]                   = useState(0)
  const [allImageResults, setAllImageResults]       = useState<UnsplashResult[]>([])
  const [imageQuery, setImageQuery]                 = useState('')
  const [imageSearchLoading, setImageSearchLoading] = useState(false)
  const [selectedImage, setSelectedImage]           = useState<UnsplashResult | null>(null)
  const [imageTab, setImageTab]                 = useState<'unsplash' | 'upload' | 'url'>('unsplash')
  const [uploadFile, setUploadFile]             = useState<File | null>(null)
  const [uploadPreview, setUploadPreview]       = useState<string | null>(null)
  const [uploadConsent, setUploadConsent]       = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [uploading, setUploading]               = useState(false)
  const adminFileInputRef                       = useRef<HTMLInputElement>(null)
  const [manualImageUrl, setManualImageUrl]     = useState('')
  const [manualImageValid, setManualImageValid] = useState(false)

  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [savedPlaceId, setSavedPlaceId]   = useState<string | null>(null)
  const [savedPlaceName, setSavedPlaceName] = useState('')
  const nameDebounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void Promise.all([
      supabase.from('tags').select('id, name, slug, category, place_type').order('category').order('name'),
      supabase.from('categories').select('id, name, slug, icon').order('sort_order'),
      supabase.from('place_labels').select('id, name').order('name'),
    ]).then(([tagsRes, catsRes, labelsRes]) => {
      setAllTags((tagsRes.data ?? []) as Tag[])
      setAllCategories((catsRes.data ?? []) as Category[])
      setAllLabels((labelsRes.data ?? []) as Label[])
    })
  }, [])

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggleVibe(vibe: string) {
    setForm(prev => ({ ...prev, vibes: prev.vibes.includes(vibe) ? prev.vibes.filter(v => v !== vibe) : [...prev.vibes, vibe] }))
  }

  function toggleHingeVibe(vibe: string) {
    setHingeFields(prev => ({ ...prev, vibe_tags: prev.vibe_tags.includes(vibe) ? prev.vibe_tags.filter(v => v !== vibe) : [...prev.vibe_tags, vibe] }))
  }

  function toggleCategory(id: string) {
    if (!selectedCategoryIds.has(id)) {
      setSelectedCategoryIds(prev => new Set([...prev, id]))
      if (!primaryCategoryId) setPrimaryCategoryId(id)
    } else if (primaryCategoryId !== id) {
      setPrimaryCategoryId(id)
    } else {
      setSelectedCategoryIds(prev => { const n = new Set(prev); n.delete(id); return n })
      const remaining = [...selectedCategoryIds].filter(c => c !== id)
      setPrimaryCategoryId(remaining[0] ?? null)
    }
  }

  function toggleLabel(id: string) {
    setSelectedLabelIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function handleNameChange(value: string) {
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current)
    if (!value.trim() || value.length < 3) { setSuggestions([]); setShowSuggestions(false); return }
    nameDebounceRef.current = setTimeout(async () => {
      setGeocoding(true)
      try {
        const res = await fetch(`/api/geocode?mode=autocomplete&input=${encodeURIComponent(value)}&placeType=destination`)
        const data = await res.json() as { predictions?: Prediction[] }
        setSuggestions(data.predictions ?? [])
        setShowSuggestions((data.predictions ?? []).length > 0)
        setShowManualEntry((data.predictions ?? []).length === 0 && value.length > 4)
      } catch { /* ignore */ } finally { setGeocoding(false) }
    }, 350)
  }

  async function selectSuggestion(s: Prediction) {
    setShowSuggestions(false); setSuggestions([]); setGeocoding(true)
    try {
      const params = new URLSearchParams({
        mode: 'details', place_id: s.place_id, lat: String(s.lat ?? ''), lng: String(s.lng ?? ''),
        country: s.country ?? '', region_name: s.region_name ?? '', name: s.main_text, feature_type: s.feature_type ?? '',
      })
      const res = await fetch(`/api/geocode?${params}`)
      const data = await res.json() as {
        error?: string; name?: string; country?: string; region?: string
        state_province?: string | null; lat?: number | null; lng?: number | null
      }
      if (data.error) { toast.error('Could not load place details.'); return }
      setForm(prev => ({ ...prev, name: data.name ?? s.main_text, country: data.country ?? '', region: (data.region ?? 'Global') as Region, state_province: data.state_province ?? '' }))
      setResolvedLat(data.lat ?? null)
      setResolvedLng(data.lng ?? null)
      setLocationLocked(true)
      setImageQuery(data.name ?? s.main_text)
    } catch { toast.error('Geocoding failed.') } finally { setGeocoding(false) }
  }

  async function searchImages() {
    if (!imageQuery.trim()) return
    setImageSearchLoading(true); setAllImageResults([]); setImagePage(0); setSelectedImage(null)
    try {
      const res = await fetch(`/api/unsplash/search?q=${encodeURIComponent(imageQuery.trim())}`)
      const data = await res.json() as { results?: UnsplashResult[] }
      const results = data.results ?? []
      if (results.length >= 3) { setAllImageResults(results); return }
      if (form.country) {
        const fb = await fetch(`/api/unsplash/search?q=${encodeURIComponent(form.country)}&fallback=1`)
        const fbData = await fb.json() as { results?: UnsplashResult[] }
        if ((fbData.results ?? []).length > 0) { setAllImageResults(fbData.results ?? []); toast(`Showing results for ${form.country} instead.`, { icon: '🌍', style: { background: '#fff9f0', color: '#131936', border: '1px solid #fcd99a', fontFamily: 'Nunito, sans-serif', fontSize: '14px' } }); return }
      }
      setImageTab('upload')
      toast('No images found — try uploading a photo instead.', { icon: '📷', style: { background: '#fff9f0', color: '#131936', border: '1px solid #fcd99a', fontFamily: 'Nunito, sans-serif', fontSize: '14px' } })
    } catch { toast.error('Image search failed.') } finally { setImageSearchLoading(false) }
  }

  async function handleAdminUpload() {
    if (!uploadFile || !uploadConsent) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = uploadFile.name.split('.').pop() ?? 'jpg'
      const path = `places/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('place-images').upload(path, uploadFile, { upsert: false })
      if (error) { toast.error('Upload failed. Please try again.'); return }
      const { data: { publicUrl } } = supabase.storage.from('place-images').getPublicUrl(path)
      setUploadedImageUrl(publicUrl)
      toast.success('Photo uploaded ✦')
    } finally { setUploading(false) }
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.country.trim()) { setError('Name and country are required.'); return }
    setSaving(true); setError(null)

    let finalImageUrl: string | null = null
    let finalImageThumbUrl: string | null = null
    let finalUnsplashId: string | null = null
    let finalAttribution: UnsplashAttribution | null = null

    if (imageTab === 'unsplash' && selectedImage) {
      finalImageUrl = selectedImage.image_url; finalImageThumbUrl = selectedImage.image_thumb_url
      finalUnsplashId = selectedImage.id; finalAttribution = selectedImage.attribution
    } else if (imageTab === 'upload' && uploadedImageUrl) {
      finalImageUrl = uploadedImageUrl; finalImageThumbUrl = uploadedImageUrl
    } else if (imageTab === 'url' && manualImageUrl && manualImageValid) {
      finalImageUrl = manualImageUrl; finalImageThumbUrl = manualImageUrl
    }

    const result = await adminCreatePlace({
      name: form.name.trim(), country: form.country.trim(), region: form.region,
      state_province: form.state_province.trim() || null,
      type: 'destination',
      description: form.description.trim(),
      tag_ids: selectedTags, vibes: form.vibes, intensity: 'medium', popularity: 1,
      lat: resolvedLat, lng: resolvedLng,
      image_url: finalImageUrl, image_thumb_url: finalImageThumbUrl,
      unsplash_photo_id: finalUnsplashId, unsplash_attribution: finalAttribution,
      must_do: hingeFields.must_do.trim() || null, hidden_gem: hingeFields.hidden_gem.trim() || null,
      not_for_you: hingeFields.not_for_you.trim() || null, best_time: hingeFields.best_time.trim() || null,
      vibe_tags: hingeFields.vibe_tags,
    })

    setSaving(false)

    if (result.error) { setError(result.error); toast.error(result.error) }
    else {
      const placeId = result.placeId!
      const supabase = createClient()
      if (selectedCategoryIds.size > 0) {
        try { await supabase.from('experiences_categories').insert([...selectedCategoryIds].map(catId => ({ experience_id: placeId, category_id: catId, is_primary: catId === primaryCategoryId }))) } catch { /* non-fatal */ }
      }
      if (selectedTags.length > 0) {
        try { await supabase.from('experiences_tags').insert(selectedTags.map(tagId => ({ experience_id: placeId, tag_id: tagId }))) } catch { /* non-fatal */ }
      }
      if (selectedLabelIds.size > 0) {
        try { await supabase.from('experiences_labels').insert([...selectedLabelIds].map(labelId => ({ experience_id: placeId, label_id: labelId }))) } catch { /* non-fatal */ }
      }

      toast.success(`${form.name} added to the database ✦`)
      setSavedPlaceId(placeId); setSavedPlaceName(form.name)
      setForm({ name: '', country: '', region: 'Europe', state_province: '', description: '', vibes: [] })
      setHingeFields({ must_do: '', hidden_gem: '', not_for_you: '', best_time: '', vibe_tags: [] })
      setSelectedTags([]); setSelectedCategoryIds(new Set()); setPrimaryCategoryId(null); setSelectedLabelIds(new Set())
      setSelectedImage(null); setAllImageResults([]); setImageQuery(''); setImageTab('unsplash')
      setUploadFile(null); setUploadPreview(null); setUploadedImageUrl(null); setUploadConsent(false)
      setManualImageUrl(''); setManualImageValid(false)
      setLocationLocked(false); setResolvedLat(null); setResolvedLng(null)
      setShowManualEntry(false); setManualLat(''); setManualLng('')
    }
  }

  const visibleImages = allImageResults.slice(0, (imagePage + 1) * IMAGE_PAGE_SIZE)
  const hasMore = allImageResults.length > visibleImages.length
  const visibleTags = allTags.filter(t => !tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase()))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1 font-nunito text-[#131936]/50 text-[13px] -mb-4">
        <ChevronLeft size={14} /> Back
      </button>

      <div className="flex items-center gap-2">
        <span className="text-[20px]">🗺</span>
        <p className="font-brice font-bold text-[#131936] text-[17px]">Add a Destination</p>
      </div>

      {/* ── Section 1: Basic info ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className={SECTION_HEADING}>Basic info</p>

        <div className="relative">
          <label htmlFor="admin-dest-name" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">
            Place name <span className="text-[#f08c21]">*</span>
          </label>
          <div className="relative">
            <input
              id="admin-dest-name" name="admin-dest-name" type="text"
              value={form.name}
              onChange={e => { setField('name', e.target.value); setLocationLocked(false); handleNameChange(e.target.value) }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Start typing a destination name…" autoComplete="off" className={INPUT_CLASS}
            />
            {geocoding && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 rounded-full border-2 border-[#f08c21] border-t-transparent animate-spin" /></div>}
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-2xl border border-[#fcd99a] shadow-lg overflow-hidden">
              {suggestions.map(s => (
                <button key={s.place_id} type="button" onMouseDown={() => void selectSuggestion(s)}
                  className="w-full text-left px-4 py-3 hover:bg-[#fcd99a]/20 transition-colors border-b border-[#fcd99a]/30 last:border-0">
                  <p className="font-nunito font-semibold text-[14px] text-[#131936]">{s.main_text}</p>
                  <p className="font-nunito text-[12px] text-[#131936]/50">{s.secondary_text}</p>
                </button>
              ))}
            </div>
          )}
          {locationLocked && resolvedLat !== null && <p className="font-nunito text-[11px] text-[#16a34a] mt-1">✓ Location verified — coordinates auto-filled</p>}
          {showManualEntry && !showSuggestions && !locationLocked && (
            <div className="mt-3 p-4 rounded-2xl border border-[#fcd99a]/50 bg-[#fcd99a]/10">
              <p className="font-nunito text-[13px] text-[#131936]/60 mb-3">Can&apos;t find it? Enter coordinates manually.</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="font-nunito text-[11px] text-[#131936]/40 mb-1 block">Latitude</label>
                  <input type="number" step="any" value={manualLat} onChange={e => setManualLat(e.target.value)} placeholder="-27.4705" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="font-nunito text-[11px] text-[#131936]/40 mb-1 block">Longitude</label>
                  <input type="number" step="any" value={manualLng} onChange={e => setManualLng(e.target.value)} placeholder="153.0260" className={INPUT_CLASS} />
                </div>
              </div>
              <button type="button" onClick={() => {
                const lat = parseFloat(manualLat); const lng = parseFloat(manualLng)
                if (isNaN(lat) || isNaN(lng)) { toast.error('Please enter valid coordinates.'); return }
                if (lat < -90 || lat > 90 || lng < -180 || lng > 180) { toast.error('Coordinates out of range.'); return }
                setResolvedLat(lat); setResolvedLng(lng); setLocationLocked(true); setShowManualEntry(false); toast.success('Coordinates set ✦')
              }} className="w-full h-9 rounded-xl bg-[#131936] text-white font-nunito font-semibold text-[13px]">
                Use these coordinates
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="font-nunito text-[12px] text-[#131936]/50 mb-2 block">Country <span className="text-[#f08c21]">*</span></label>
          {locationLocked ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 rounded-full bg-[#fcd99a]/50 border border-[#fcd99a] font-nunito text-[13px] text-[#131936]">
                🌍 {form.state_province ? `${form.state_province}, ${form.country}` : form.country}
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#fcd99a]/50 border border-[#fcd99a] font-nunito text-[13px] text-[#131936]">{form.region}</span>
              <button type="button" onClick={() => { setLocationLocked(false); setResolvedLat(null); setResolvedLng(null); setShowManualEntry(false); setManualLat(''); setManualLng(''); setField('name', ''); setField('country', '') }}
                className="font-nunito text-[12px] text-[#131936]/40 hover:text-[#131936] transition-colors">× Clear</button>
            </div>
          ) : (
            <>
              <input id="admin-dest-country" name="admin-dest-country" type="text" value={form.country} onChange={e => setField('country', e.target.value)} placeholder="e.g. Japan" className={INPUT_CLASS} />
              <div className="flex flex-wrap gap-2 mt-3">
                {REGIONS.map(r => <button key={r} type="button" onClick={() => setField('region', r)} className={pillClass(form.region === r)}>{r}</button>)}
              </div>
            </>
          )}
        </div>

        <div>
          <label htmlFor="admin-dest-description" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">Description</label>
          <textarea id="admin-dest-description" name="admin-dest-description" rows={4} value={form.description} onChange={e => setField('description', e.target.value)} placeholder="What makes this destination special…" className={`${INPUT_CLASS} resize-none`} />
        </div>
      </div>

      {/* ── Section 2: Place card content ─────────────────────────────────── */}
      <div className="space-y-4">
        <p className={SECTION_HEADING}>Place card content</p>
        <div>
          <label htmlFor="admin-dest-must-do" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">Must do</label>
          <input id="admin-dest-must-do" name="admin-dest-must-do" type="text" value={hingeFields.must_do} onChange={e => setHingeFields(prev => ({ ...prev, must_do: e.target.value }))} placeholder="The one thing everyone must do here" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="admin-dest-hidden-gem" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">Hidden gem</label>
          <input id="admin-dest-hidden-gem" name="admin-dest-hidden-gem" type="text" value={hingeFields.hidden_gem} onChange={e => setHingeFields(prev => ({ ...prev, hidden_gem: e.target.value }))} placeholder="Something the guidebooks miss" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="admin-dest-not-for-you" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">Not for you if…</label>
          <input id="admin-dest-not-for-you" name="admin-dest-not-for-you" type="text" value={hingeFields.not_for_you} onChange={e => setHingeFields(prev => ({ ...prev, not_for_you: e.target.value }))} placeholder="Who this destination isn't for" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="admin-dest-best-time" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">Best time</label>
          <input id="admin-dest-best-time" name="admin-dest-best-time" type="text" value={hingeFields.best_time} onChange={e => setHingeFields(prev => ({ ...prev, best_time: e.target.value }))} placeholder="Month, season, or reason" className={INPUT_CLASS} />
        </div>
        <div>
          <p className="font-nunito text-[12px] text-[#131936]/50 mb-2">Card vibe tags</p>
          <div className="flex flex-wrap gap-2">
            {CARD_VIBE_OPTIONS.map(vibe => <button key={vibe} type="button" onClick={() => toggleHingeVibe(vibe)} className={pillClass(hingeFields.vibe_tags.includes(vibe))}>{vibe}</button>)}
          </div>
        </div>
      </div>

      {/* ── Section 3: Details ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className={SECTION_HEADING}>Details</p>
        {allCategories.length > 0 && (
          <div>
            <p className="font-nunito text-[12px] text-[#131936]/50 mb-2">Category <span className="ml-1 text-[#131936]/30 font-normal">— tap once to select, again for primary ★</span></p>
            <div className="flex flex-wrap gap-2">
              {allCategories.map(cat => {
                const state = !selectedCategoryIds.has(cat.id) ? 'none' : primaryCategoryId === cat.id ? 'primary' : 'selected'
                return (
                  <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)} className={catPillClass(state)}>
                    {cat.icon && <span className="mr-1">{cat.icon}</span>}{cat.name}{state === 'primary' && <span className="ml-1 text-[10px]">★</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-nunito text-[12px] text-[#131936]/50">Tags <span className="ml-1 text-[#131936]/30 font-normal">(describe the place)</span></p>
            <button type="button" onClick={() => setShowAllTags(prev => !prev)} className="font-nunito text-[11px] text-[#f08c21] hover:opacity-80 transition-opacity">
              {showAllTags ? `Show relevant only` : `Show all (${allTags.length})`}
            </button>
          </div>
          <input id="dest-tag-search" name="dest-tag-search" type="text" value={tagSearch} onChange={e => setTagSearch(e.target.value)} placeholder="Filter tags…"
            className="w-full rounded-full border border-[#fcd99a] bg-white px-4 py-2 font-nunito text-[13px] text-[#131936] placeholder:text-[#131936]/40 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30 mb-3" />
          <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
            {DIMENSION_ORDER.map(dim => {
              const dimTags = visibleTags.filter(t => t.category === dim)
              if (dimTags.length === 0) return null
              return (
                <div key={dim}>
                  <p className="font-nunito text-[10px] font-bold uppercase tracking-wider text-[#131936]/40 mb-1.5">
                    {DIMENSION_LABELS[dim] ?? dim}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dimTags.map(tag => {
                      const active = selectedTags.includes(tag.id)
                      return (
                        <button key={tag.id} type="button"
                          onClick={() => setSelectedTags(prev => active ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
                          className={pillClass(active)}>
                          {tag.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          {selectedTags.length > 0 && (
            <p className="font-nunito text-[11px] text-[#131936]/50 mt-2">
              {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected —{' '}
              <button type="button" onClick={() => setSelectedTags([])} className="text-[#f08c21]">clear all</button>
            </p>
          )}
        </div>
        {allLabels.length > 0 && (
          <div>
            <p className="font-nunito text-[12px] text-[#131936]/50 mb-2">Labels</p>
            <div className="flex flex-wrap gap-2">
              {allLabels.map(label => <button key={label.id} type="button" onClick={() => toggleLabel(label.id)} className={labelPillClass(selectedLabelIds.has(label.id))}>{label.name}</button>)}
            </div>
          </div>
        )}
        <div>
          <p className="font-nunito text-[12px] text-[#131936]/50 mb-2">Vibes</p>
          <div className="flex flex-wrap gap-2">
            {VIBES_OPTIONS.map(vibe => <button key={vibe} type="button" onClick={() => toggleVibe(vibe)} className={pillClass(form.vibes.includes(vibe))}>{vibe}</button>)}
          </div>
        </div>
      </div>

      {/* ── Section 4: Image ──────────────────────────────────────────────── */}
      <div>
        <p className={SECTION_HEADING}>Image</p>
        <div className="flex gap-1 p-1 bg-[#fcd99a]/20 rounded-2xl mb-4">
          {(['unsplash', 'upload', 'url'] as const).map(key => (
            <button key={key} type="button" onClick={() => setImageTab(key)}
              className={`flex-1 py-2 rounded-xl font-nunito text-[13px] font-medium transition-all ${imageTab === key ? 'bg-white text-[#131936] shadow-sm' : 'text-[#131936]/50 hover:text-[#131936]'}`}>
              {key === 'unsplash' ? '🔍 Unsplash' : key === 'upload' ? '📷 Upload' : '🔗 URL'}
            </button>
          ))}
        </div>

        {imageTab === 'unsplash' && (
          <>
            <div className="flex gap-2 mb-3">
              <input id="dest-unsplash-search" name="dest-unsplash-search" value={imageQuery} onChange={e => setImageQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && void searchImages()} placeholder="Search Unsplash…"
                className="flex-1 rounded-full border border-[#fcd99a] bg-white px-4 py-2.5 font-nunito text-[14px] text-[#131936] placeholder:text-[#131936]/40 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30" />
              <button type="button" onClick={() => void searchImages()} disabled={imageSearchLoading} className="px-4 py-2.5 rounded-full bg-[#f08c21] text-[#131936] font-nunito font-semibold text-[13px] shrink-0 disabled:opacity-50">
                {imageSearchLoading ? '…' : 'Search'}
              </button>
            </div>
            {visibleImages.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {visibleImages.map(img => (
                    <button key={img.id} type="button" onClick={() => setSelectedImage(prev => prev?.id === img.id ? null : img)}
                      className={`relative aspect-[2/3] rounded-xl overflow-hidden border-2 transition-all ${selectedImage?.id === img.id ? 'border-[#f08c21] scale-[0.97]' : 'border-transparent'}`}>
                      <Image src={img.image_thumb_url} alt={img.attribution.photographer_name} fill sizes="33vw" className="object-cover" />
                      {selectedImage?.id === img.id && <div className="absolute inset-0 bg-[#f08c21]/20 flex items-center justify-center"><span className="text-white text-[20px]">✓</span></div>}
                    </button>
                  ))}
                </div>
                {hasMore && <button type="button" onClick={() => setImagePage(p => p + 1)} className="w-full py-2 font-nunito text-[13px] text-[#f08c21] hover:opacity-80 transition-opacity">Show more images ({allImageResults.length - visibleImages.length} more)</button>}
              </>
            )}
            {selectedImage && (
              <div className="rounded-2xl overflow-hidden border border-[#fcd99a] mb-2 mt-3">
                <div className="relative aspect-[2/3]"><Image src={selectedImage.image_url} alt="Selected" fill sizes="480px" className="object-cover" /></div>
                <p className="font-nunito text-[#131936]/40 text-[10px] px-3 py-1.5">
                  Photo by <a href={selectedImage.attribution.photographer_url} target="_blank" rel="noopener noreferrer" className="text-[#f08c21]">{selectedImage.attribution.photographer_name}</a> on Unsplash
                </p>
              </div>
            )}
          </>
        )}

        {imageTab === 'upload' && (
          <div className="space-y-3">
            {!uploadPreview ? (
              <button type="button" onClick={() => adminFileInputRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-[#fcd99a] bg-white py-12 flex flex-col items-center gap-3 hover:border-[#f08c21]/60 transition-colors">
                <span className="text-[36px]">📷</span>
                <p className="font-brice font-bold text-[#131936]/50 text-[14px]">Upload a place photo</p>
                <p className="font-nunito text-[#131936]/30 text-[12px]">JPG, PNG or WebP · up to 10 MB</p>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-[#fcd99a]">
                <div className="relative aspect-[2/3]"><Image src={uploadPreview} alt="Upload preview" fill className="object-cover" /></div>
                <button type="button" onClick={() => { setUploadFile(null); setUploadPreview(null); setUploadedImageUrl(null); setUploadConsent(false) }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-[14px]">×</button>
              </div>
            )}
            {uploadFile && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={uploadConsent} onChange={e => setUploadConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#f08c21] shrink-0 cursor-pointer" />
                <span className="font-nunito text-[#131936]/60 text-[13px] leading-relaxed">This photo is licensed for use. I confirm Someday may display it in the app.</span>
              </label>
            )}
            {uploadFile && uploadConsent && !uploadedImageUrl && (
              <button type="button" onClick={() => void handleAdminUpload()} disabled={uploading} className="w-full h-11 rounded-full bg-[#131936] text-white font-brice font-bold text-[14px] disabled:opacity-50">
                {uploading ? 'Uploading…' : 'Use this photo'}
              </button>
            )}
            {uploadedImageUrl && <p className="font-nunito text-[12px] text-[#16a34a] flex items-center gap-1">✓ Photo uploaded — will be used as the place image</p>}
            <input ref={adminFileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 10 * 1024 * 1024) { toast.error('Photo must be under 10 MB.'); return }
                setUploadFile(file); setUploadPreview(URL.createObjectURL(file)); setUploadedImageUrl(null); setUploadConsent(false)
              }} className="hidden" />
          </div>
        )}

        {imageTab === 'url' && (
          <div className="space-y-3">
            <div>
              <label className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">Direct image URL</label>
              <input type="url" value={manualImageUrl} onChange={e => { setManualImageUrl(e.target.value); setManualImageValid(false) }} placeholder="https://example.com/photo.jpg" className={INPUT_CLASS} />
              <p className="font-nunito text-[11px] text-[#131936]/40 mt-1.5 leading-relaxed">Only use images you have permission to use. Do not paste images from Google or travel blogs.</p>
            </div>
            {manualImageUrl && !manualImageValid && <button type="button" onClick={() => setManualImageValid(true)} className="font-nunito text-[13px] text-[#f08c21]">Preview image →</button>}
            {manualImageValid && manualImageUrl && (
              <div className="rounded-2xl overflow-hidden border border-[#fcd99a]">
                <div className="relative aspect-[2/3]"><Image src={manualImageUrl} alt="Manual URL preview" fill className="object-cover" onError={() => { toast.error('Could not load image from that URL.'); setManualImageValid(false) }} /></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Error + Save ─────────────────────────────────────────────────────── */}
      {error && <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3"><p className="font-nunito text-[13px] text-red-600">{error}</p></div>}

      <button type="button" onClick={() => void handleSubmit()} disabled={saving}
        className="w-full h-14 rounded-full bg-[#131936] text-white font-brice font-bold text-[16px] disabled:opacity-50 transition-opacity">
        {saving ? 'Adding to database…' : 'Add Destination to Someday ✦'}
      </button>

      {savedPlaceId && (
        <div className="mt-6 pt-6 border-t border-[#fcd99a]/50">
          <p className={SECTION_HEADING}>Add activities to {savedPlaceName}</p>
          <ActivityAdder placeId={savedPlaceId} />
        </div>
      )}
    </div>
  )
}
