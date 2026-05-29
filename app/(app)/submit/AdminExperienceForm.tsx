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
interface ParentOption { id: string; name: string; country: string; region: string | null }

interface UnsplashResult {
  id: string; image_url: string; image_thumb_url: string
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
const IMAGE_PAGE_SIZE = 9
const CARD_VIBE_OPTIONS = ['Adventure', 'Romantic', 'Foodie', 'Chill', 'Epic', 'Peaceful', 'Cultural', 'Wellness', 'Off-grid', 'Party']
const TAG_CATEGORY_LABELS: Record<string, string> = {
  vibe: 'Vibe', activity: 'Activity', season: 'Season', budget: 'Budget',
  travel_style: 'Travel Style', landscape: 'Landscape', food_drink: 'Food & Drink', general: 'General',
}

const INPUT_CLASS = 'w-full rounded-2xl border border-[#fcd99a] bg-white px-4 py-3 font-nunito text-[14px] text-[#131936] placeholder:text-[#131936]/40 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30 transition'
const SECTION_HEADING = 'font-syne font-bold text-[#131936] text-[15px] mb-3'

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

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  userId: string
  onBack: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminExperienceForm({ userId: _userId, onBack }: Props) {
  const [form, setForm] = useState({
    name: '', country: '', region: 'Europe' as Region,
    state_province: '', description: '', vibes: [] as string[],
  })
  const [hingeFields, setHingeFields] = useState({
    must_do: '', not_for_you: '', vibe_tags: [] as string[],
  })
  const [duration, setDuration]         = useState('')
  const [needsBooking, setNeedsBooking] = useState(false)

  // Parent destination
  const [parentId, setParentId]           = useState<string | null>(null)
  const [parentName, setParentName]       = useState('')
  const [parentSearch, setParentSearch]   = useState('')
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([])
  const [parentSearching, setParentSearching] = useState(false)
  const [parentLocked, setParentLocked]   = useState(false)
  const parentDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const [suggestions, setSuggestions]         = useState<Prediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [geocoding, setGeocoding]             = useState(false)
  const [locationLocked, setLocationLocked]   = useState(false)
  const [resolvedLat, setResolvedLat]         = useState<number | null>(null)
  const [resolvedLng, setResolvedLng]         = useState<number | null>(null)
  const nameDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const [allCategories, setAllCategories]           = useState<Category[]>([])
  const [allLabels, setAllLabels]                   = useState<Label[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [primaryCategoryId, setPrimaryCategoryId]   = useState<string | null>(null)
  const [selectedLabelIds, setSelectedLabelIds]     = useState<Set<string>>(new Set())
  const [allTags, setAllTags]           = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagSearch, setTagSearch]       = useState('')

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

  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [savedPlaceId, setSavedPlaceId] = useState<string | null>(null)
  const [savedPlaceName, setSavedPlaceName] = useState('')

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

  function toggleCategory(id: string) {
    if (!selectedCategoryIds.has(id)) {
      setSelectedCategoryIds(prev => new Set([...prev, id]))
      if (!primaryCategoryId) setPrimaryCategoryId(id)
    } else if (primaryCategoryId !== id) {
      setPrimaryCategoryId(id)
    } else {
      setSelectedCategoryIds(prev => { const n = new Set(prev); n.delete(id); return n })
      setPrimaryCategoryId([...selectedCategoryIds].filter(c => c !== id)[0] ?? null)
    }
  }

  function toggleLabel(id: string) {
    setSelectedLabelIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Parent search ───────────────────────────────────────────────────────────

  function handleParentSearch(value: string) {
    setParentSearch(value); setParentLocked(false)
    if (parentDebounceRef.current) clearTimeout(parentDebounceRef.current)
    if (!value.trim() || value.length < 2) { setParentOptions([]); return }
    parentDebounceRef.current = setTimeout(async () => {
      setParentSearching(true)
      try {
        const supabase = createClient()
        const { data } = await supabase.from('places').select('id, name, country, region').eq('type', 'destination').ilike('name', `%${value}%`).order('popularity', { ascending: false }).limit(6)
        setParentOptions((data ?? []) as ParentOption[])
      } catch { /* ignore */ } finally { setParentSearching(false) }
    }, 300)
  }

  function selectParent(opt: ParentOption) {
    setParentId(opt.id); setParentName(opt.name); setParentSearch(opt.name); setParentLocked(true); setParentOptions([])
    if (!form.country) setField('country', opt.country)
    if (opt.region && form.region === 'Europe') setField('region', (opt.region ?? 'Global') as Region)
  }

  // ── Geocoding ───────────────────────────────────────────────────────────────

  function handleNameChange(value: string) {
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current)
    if (!value.trim() || value.length < 3) { setSuggestions([]); setShowSuggestions(false); return }
    nameDebounceRef.current = setTimeout(async () => {
      setGeocoding(true)
      try {
        const res = await fetch(`/api/geocode?mode=autocomplete&input=${encodeURIComponent(value)}&placeType=experience`)
        const data = await res.json() as { predictions?: Prediction[] }
        setSuggestions(data.predictions ?? [])
        setShowSuggestions((data.predictions ?? []).length > 0)
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
      const data = await res.json() as { error?: string; name?: string; country?: string; region?: string; state_province?: string | null; lat?: number | null; lng?: number | null }
      if (data.error) { toast.error('Could not load place details.'); return }
      setForm(prev => ({ ...prev, name: data.name ?? s.main_text, country: data.country ?? '', region: (data.region ?? 'Global') as Region, state_province: data.state_province ?? '' }))
      setResolvedLat(data.lat ?? null); setResolvedLng(data.lng ?? null); setLocationLocked(true)
      setImageQuery(data.name ?? s.main_text)
    } catch { toast.error('Geocoding failed.') } finally { setGeocoding(false) }
  }

  // ── Image search ─────────────────────────────────────────────────────────────

  async function searchImages() {
    if (!imageQuery.trim()) return
    setImageSearchLoading(true); setAllImageResults([]); setImagePage(0); setSelectedImage(null)
    try {
      const res = await fetch(`/api/unsplash/search?q=${encodeURIComponent(imageQuery.trim())}`)
      const data = await res.json() as { results?: UnsplashResult[] }
      if ((data.results ?? []).length > 0) { setAllImageResults(data.results ?? []); return }
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
      if (error) { toast.error('Upload failed.'); return }
      const { data: { publicUrl } } = supabase.storage.from('place-images').getPublicUrl(path)
      setUploadedImageUrl(publicUrl); toast.success('Photo uploaded ✦')
    } finally { setUploading(false) }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Name is required.'); return }
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
      name:            form.name.trim(),
      country:         form.country.trim() || 'Global',
      region:          form.region,
      state_province:  form.state_province.trim() || null,
      type:            'experience',
      description:     form.description.trim(),
      tag_ids:         selectedTags,
      vibes:           form.vibes,
      intensity:       'medium',
      popularity:      1,
      lat:             resolvedLat,
      lng:             resolvedLng,
      image_url:       finalImageUrl,
      image_thumb_url: finalImageThumbUrl,
      unsplash_photo_id:    finalUnsplashId,
      unsplash_attribution: finalAttribution,
      must_do:         hingeFields.must_do.trim() || null,
      hidden_gem:      null,
      not_for_you:     hingeFields.not_for_you.trim() || null,
      best_time:       null,
      vibe_tags:       hingeFields.vibe_tags,
      parent_place_id: parentId,
      duration:        duration.trim() || null,
      needs_booking:   needsBooking,
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
      setHingeFields({ must_do: '', not_for_you: '', vibe_tags: [] })
      setDuration(''); setNeedsBooking(false)
      setParentId(null); setParentName(''); setParentSearch(''); setParentLocked(false)
      setSelectedTags([]); setSelectedCategoryIds(new Set()); setPrimaryCategoryId(null); setSelectedLabelIds(new Set())
      setSelectedImage(null); setAllImageResults([]); setImageQuery(''); setImageTab('unsplash')
      setUploadFile(null); setUploadPreview(null); setUploadedImageUrl(null); setUploadConsent(false)
      setManualImageUrl(''); setManualImageValid(false)
      setLocationLocked(false); setResolvedLat(null); setResolvedLng(null)
    }
  }

  const visibleImages = allImageResults.slice(0, (imagePage + 1) * IMAGE_PAGE_SIZE)
  const hasMore = allImageResults.length > visibleImages.length
  const visibleTags = allTags.filter(t => !tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase()))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      <button onClick={onBack} className="flex items-center gap-1 font-nunito text-[#131936]/50 text-[13px] -mb-4">
        <ChevronLeft size={14} /> Back
      </button>

      <div className="flex items-center gap-2">
        <span className="text-[20px]">✨</span>
        <p className="font-syne font-bold text-[#131936] text-[17px]">Add an Experience</p>
      </div>

      {/* ── Section 1: Basic info ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className={SECTION_HEADING}>Basic info</p>

        {/* Name */}
        <div className="relative">
          <label htmlFor="admin-exp-name" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">
            Experience name <span className="text-[#f08c21]">*</span>
          </label>
          <div className="relative">
            <input id="admin-exp-name" name="admin-exp-name" type="text" value={form.name}
              onChange={e => { setField('name', e.target.value); setLocationLocked(false); handleNameChange(e.target.value) }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="e.g. Tsukiji Outer Market, Tokyo" autoComplete="off" className={INPUT_CLASS} />
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
          {locationLocked && <p className="font-nunito text-[11px] text-[#16a34a] mt-1">✓ Location resolved</p>}
          {!locationLocked && (
            <p className="font-nunito text-[11px] text-[#131936]/30 mt-1.5">
              Location optional —{' '}
              <button type="button" onClick={() => { setLocationLocked(true); setResolvedLat(null); setResolvedLng(null) }} className="text-[#f08c21]">skip geocoding</button>
            </p>
          )}
        </div>

        {/* Parent destination */}
        <div className="relative">
          <label className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">Parent destination</label>
          <div className="relative">
            <input id="admin-exp-parent" name="admin-exp-parent" type="text" value={parentSearch}
              onChange={e => handleParentSearch(e.target.value)}
              onBlur={() => setTimeout(() => setParentOptions([]), 150)}
              placeholder="Search destinations in the database…" autoComplete="off" className={INPUT_CLASS} />
            {parentSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 rounded-full border-2 border-[#f08c21] border-t-transparent animate-spin" /></div>}
          </div>
          {parentOptions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-2xl border border-[#fcd99a] shadow-lg overflow-hidden">
              {parentOptions.map(opt => (
                <button key={opt.id} type="button" onMouseDown={() => selectParent(opt)}
                  className="w-full text-left px-4 py-3 hover:bg-[#fcd99a]/20 transition-colors border-b border-[#fcd99a]/30 last:border-0">
                  <p className="font-nunito font-semibold text-[14px] text-[#131936]">{opt.name}</p>
                  <p className="font-nunito text-[12px] text-[#131936]/50">{opt.country}</p>
                </button>
              ))}
            </div>
          )}
          {parentLocked && (
            <div className="mt-2 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#fcd99a]/50 border border-[#fcd99a] font-nunito text-[13px] text-[#131936]">🗺 {parentName}</span>
              <button type="button" onClick={() => { setParentId(null); setParentName(''); setParentSearch(''); setParentLocked(false) }}
                className="font-nunito text-[12px] text-[#131936]/30 hover:text-[#131936]">× Remove</button>
            </div>
          )}
          {!parentLocked && <p className="font-nunito text-[11px] text-[#131936]/30 mt-1">Optional — links this experience to a destination.</p>}
        </div>

        {/* Country */}
        <div>
          <label className="font-nunito text-[12px] text-[#131936]/50 mb-2 block">Country / location</label>
          {locationLocked ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 rounded-full bg-[#fcd99a]/50 border border-[#fcd99a] font-nunito text-[13px] text-[#131936]">
                🌍 {form.state_province ? `${form.state_province}, ${form.country}` : form.country || 'not set'}
              </span>
              <button type="button" onClick={() => { setLocationLocked(false); setResolvedLat(null); setResolvedLng(null) }}
                className="font-nunito text-[12px] text-[#131936]/40 hover:text-[#131936]">× Edit</button>
            </div>
          ) : (
            <>
              <input id="admin-exp-country" name="admin-exp-country" type="text" value={form.country} onChange={e => setField('country', e.target.value)} placeholder="e.g. Japan" className={INPUT_CLASS} />
              <div className="flex flex-wrap gap-2 mt-3">
                {REGIONS.map(r => <button key={r} type="button" onClick={() => setField('region', r)} className={pillClass(form.region === r)}>{r}</button>)}
              </div>
            </>
          )}
        </div>

        {/* Logistics */}
        <div className="space-y-3">
          <div>
            <label htmlFor="admin-exp-duration" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">Duration</label>
            <input id="admin-exp-duration" name="admin-exp-duration" type="text" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 2–3 hours, half a day" maxLength={60} className={INPUT_CLASS} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer bg-white rounded-2xl border border-[#fcd99a] px-4 py-3">
            <input type="checkbox" checked={needsBooking} onChange={e => setNeedsBooking(e.target.checked)} className="w-5 h-5 accent-[#f08c21] shrink-0 cursor-pointer" />
            <span className="font-nunito text-[#131936] text-[14px]">Needs advance booking</span>
          </label>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="admin-exp-description" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">Description</label>
          <textarea id="admin-exp-description" name="admin-exp-description" rows={4} value={form.description} onChange={e => setField('description', e.target.value)} placeholder="What is this experience…" className={`${INPUT_CLASS} resize-none`} />
        </div>
      </div>

      {/* ── Section 2: Card content ───────────────────────────────────────── */}
      <div className="space-y-4">
        <p className={SECTION_HEADING}>Card content</p>
        <div>
          <label htmlFor="admin-exp-must-do" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">What do you do here?</label>
          <input id="admin-exp-must-do" name="admin-exp-must-do" type="text" value={hingeFields.must_do} onChange={e => setHingeFields(prev => ({ ...prev, must_do: e.target.value }))} placeholder="One sentence — specific and vivid" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="admin-exp-not-for-you" className="font-nunito text-[12px] text-[#131936]/50 mb-1 block">Not for you if…</label>
          <input id="admin-exp-not-for-you" name="admin-exp-not-for-you" type="text" value={hingeFields.not_for_you} onChange={e => setHingeFields(prev => ({ ...prev, not_for_you: e.target.value }))} placeholder="Who this isn't for" className={INPUT_CLASS} />
        </div>
        <div>
          <p className="font-nunito text-[12px] text-[#131936]/50 mb-2">Card vibe tags</p>
          <div className="flex flex-wrap gap-2">
            {CARD_VIBE_OPTIONS.map(vibe => <button key={vibe} type="button" onClick={() => setHingeFields(prev => ({ ...prev, vibe_tags: prev.vibe_tags.includes(vibe) ? prev.vibe_tags.filter(v => v !== vibe) : [...prev.vibe_tags, vibe] }))} className={pillClass(hingeFields.vibe_tags.includes(vibe))}>{vibe}</button>)}
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
                return <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)} className={catPillClass(state)}>{cat.icon && <span className="mr-1">{cat.icon}</span>}{cat.name}{state === 'primary' && <span className="ml-1 text-[10px]">★</span>}</button>
              })}
            </div>
          </div>
        )}
        <div>
          <p className="font-nunito text-[12px] text-[#131936]/50 mb-2">Tags</p>
          <input id="exp-tag-search" name="exp-tag-search" type="text" value={tagSearch} onChange={e => setTagSearch(e.target.value)} placeholder="Filter tags…"
            className="w-full rounded-full border border-[#fcd99a] bg-white px-4 py-2 font-nunito text-[13px] text-[#131936] placeholder:text-[#131936]/40 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30 mb-3" />
          <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
            {Array.from(new Set(visibleTags.map(t => t.category))).map(dim => (
              <div key={dim}>
                <p className="font-nunito text-[10px] font-bold uppercase tracking-wider text-[#131936]/40 mb-1.5">{TAG_CATEGORY_LABELS[dim] ?? dim}</p>
                <div className="flex flex-wrap gap-2">
                  {visibleTags.filter(t => t.category === dim).map(tag => {
                    const active = selectedTags.includes(tag.id)
                    return <button key={tag.id} type="button" onClick={() => setSelectedTags(prev => active ? prev.filter(id => id !== tag.id) : [...prev, tag.id])} className={pillClass(active)}>{tag.name}</button>
                  })}
                </div>
              </div>
            ))}
          </div>
          {selectedTags.length > 0 && <p className="font-nunito text-[11px] text-[#131936]/50 mt-2">{selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected — <button type="button" onClick={() => setSelectedTags([])} className="text-[#f08c21]">clear all</button></p>}
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
              <input id="exp-unsplash-search" name="exp-unsplash-search" value={imageQuery} onChange={e => setImageQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && void searchImages()} placeholder="Search Unsplash…"
                className="flex-1 rounded-full border border-[#fcd99a] bg-white px-4 py-2.5 font-nunito text-[14px] text-[#131936] placeholder:text-[#131936]/40 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30" />
              <button type="button" onClick={() => void searchImages()} disabled={imageSearchLoading} className="px-4 py-2.5 rounded-full bg-[#f08c21] text-[#131936] font-nunito font-semibold text-[13px] shrink-0 disabled:opacity-50">{imageSearchLoading ? '…' : 'Search'}</button>
            </div>
            {visibleImages.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {visibleImages.map(img => (
                    <button key={img.id} type="button" onClick={() => setSelectedImage(prev => prev?.id === img.id ? null : img)}
                      className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${selectedImage?.id === img.id ? 'border-[#f08c21] scale-[0.97]' : 'border-transparent'}`}>
                      <Image src={img.image_thumb_url} alt={img.attribution.photographer_name} fill sizes="33vw" className="object-cover" />
                      {selectedImage?.id === img.id && <div className="absolute inset-0 bg-[#f08c21]/20 flex items-center justify-center"><span className="text-white text-[20px]">✓</span></div>}
                    </button>
                  ))}
                </div>
                {hasMore && <button type="button" onClick={() => setImagePage(p => p + 1)} className="w-full py-2 font-nunito text-[13px] text-[#f08c21]">Show more images ({allImageResults.length - visibleImages.length} more)</button>}
              </>
            )}
            {selectedImage && (
              <div className="rounded-2xl overflow-hidden border border-[#fcd99a] mb-2 mt-3">
                <div className="relative h-40"><Image src={selectedImage.image_url} alt="Selected" fill sizes="480px" className="object-cover" /></div>
                <p className="font-nunito text-[#131936]/40 text-[10px] px-3 py-1.5">Photo by <a href={selectedImage.attribution.photographer_url} target="_blank" rel="noopener noreferrer" className="text-[#f08c21]">{selectedImage.attribution.photographer_name}</a> on Unsplash</p>
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
                <p className="font-syne font-bold text-[#131936]/50 text-[14px]">Upload a photo</p>
                <p className="font-nunito text-[#131936]/30 text-[12px]">JPG, PNG or WebP · up to 10 MB</p>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-[#fcd99a]">
                <div className="relative h-48"><Image src={uploadPreview} alt="Upload preview" fill className="object-cover" /></div>
                <button type="button" onClick={() => { setUploadFile(null); setUploadPreview(null); setUploadedImageUrl(null); setUploadConsent(false) }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-[14px]">×</button>
              </div>
            )}
            {uploadFile && <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={uploadConsent} onChange={e => setUploadConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#f08c21] shrink-0 cursor-pointer" /><span className="font-nunito text-[#131936]/60 text-[13px] leading-relaxed">This photo is licensed for use. I confirm Someday may display it in the app.</span></label>}
            {uploadFile && uploadConsent && !uploadedImageUrl && <button type="button" onClick={() => void handleAdminUpload()} disabled={uploading} className="w-full h-11 rounded-full bg-[#131936] text-white font-syne font-bold text-[14px] disabled:opacity-50">{uploading ? 'Uploading…' : 'Use this photo'}</button>}
            {uploadedImageUrl && <p className="font-nunito text-[12px] text-[#16a34a]">✓ Photo uploaded</p>}
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
            <input type="url" value={manualImageUrl} onChange={e => { setManualImageUrl(e.target.value); setManualImageValid(false) }} placeholder="https://example.com/photo.jpg" className={INPUT_CLASS} />
            {manualImageUrl && !manualImageValid && <button type="button" onClick={() => setManualImageValid(true)} className="font-nunito text-[13px] text-[#f08c21]">Preview image →</button>}
            {manualImageValid && manualImageUrl && <div className="rounded-2xl overflow-hidden border border-[#fcd99a]"><div className="relative h-40"><Image src={manualImageUrl} alt="Preview" fill className="object-cover" onError={() => { toast.error('Could not load image.'); setManualImageValid(false) }} /></div></div>}
          </div>
        )}
      </div>

      {/* ── Error + Save ─────────────────────────────────────────────────────── */}
      {error && <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3"><p className="font-nunito text-[13px] text-red-600">{error}</p></div>}

      <button type="button" onClick={() => void handleSubmit()} disabled={saving}
        className="w-full h-14 rounded-full bg-[#131936] text-white font-syne font-bold text-[16px] disabled:opacity-50 transition-opacity">
        {saving ? 'Adding to database…' : 'Add Experience to Someday ✦'}
      </button>

      {savedPlaceId && (
        <div className="mt-4 p-4 rounded-2xl border border-[#fcd99a]/50 bg-[#fcd99a]/10">
          <p className="font-nunito text-[13px] text-[#131936]/60">✓ <strong>{savedPlaceName}</strong> added — <a href={`/places/${savedPlaceId}`} className="text-[#f08c21]">view it →</a></p>
        </div>
      )}
    </div>
  )
}
