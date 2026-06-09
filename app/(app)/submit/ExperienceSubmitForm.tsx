'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { submitExperience } from '@/app/actions/submissions'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Prediction {
  place_id: string
  description: string
  main_text: string
  secondary_text: string
  lat: number | null
  lng: number | null
  country: string
  region_name: string
  feature_type: string | null
  mapbox_category: string | null
}

interface ParentOption {
  id: string
  name: string
  country: string
  region: string | null
}

// ── Cards ─────────────────────────────────────────────────────────────────────

const CARDS = [
  {
    id: 'place',
    step: 1,
    prompt: 'What\'s the experience?',
    subprompt: 'Search for the specific thing to do, see, or eat.',
    type: 'place_search' as const,
  },
  {
    id: 'parent',
    step: 2,
    prompt: 'Which destination is this part of?',
    subprompt: 'Link it to a city or region already on Someday.',
    type: 'parent_search' as const,
  },
  {
    id: 'must_do',
    step: 3,
    prompt: 'What do you do here?',
    subprompt: 'One sentence. Make it vivid.',
    type: 'text' as const,
    placeholder: 'e.g. Spend an hour hunting for knitwear in the basement market stalls',
    maxLength: 120,
  },
  {
    id: 'logistics',
    step: 4,
    prompt: 'Practicalities:',
    subprompt: 'How long does it take? Do you need to book ahead?',
    type: 'logistics' as const,
  },
  {
    id: 'cost',
    step: 5,
    prompt: 'What does it cost?',
    subprompt: 'Optional — free, paid, ballpark price.',
    type: 'text' as const,
    placeholder: 'e.g. Free, $20 entry, $50–80 per person',
    maxLength: 80,
  },
  {
    id: 'not_for_you',
    step: 6,
    prompt: 'Not for you if…',
    subprompt: 'Optional — who should skip this?',
    type: 'text' as const,
    placeholder: 'e.g. Not for you if you hate crowds or long queues',
    maxLength: 120,
  },
  {
    id: 'photo',
    step: 7,
    prompt: 'Got a photo?',
    subprompt: 'Optional — helps us review faster.',
    type: 'photo' as const,
  },
  {
    id: 'review',
    step: 8,
    prompt: 'Why does this belong on Someday?',
    subprompt: 'Make someone add it to their list. Two sentences is enough.',
    type: 'text' as const,
    placeholder: "It's the best street food market in Southeast Asia and nobody outside Bangkok knows it yet…",
    maxLength: 280,
  },
] as const

type CardId = (typeof CARDS)[number]['id']

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  userId: string
  onBack: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExperienceSubmitForm({ userId, onBack }: Props) {
  const totalSteps = CARDS.length
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting]   = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  const [placeName, setPlaceName]       = useState('')
  const [placeCountry, setPlaceCountry] = useState('')
  const [placeRegion, setPlaceRegion]   = useState('')
  const [stateProv, setStateProv]       = useState('')
  const [mustDo, setMustDo]             = useState('')
  const [cost, setCost]                 = useState('')
  const [notForYou, setNotForYou]       = useState('')
  const [duration, setDuration]         = useState('')
  const [needsBooking, setNeedsBooking] = useState(false)
  const [description, setDescription]   = useState('')
  const [photoFile, setPhotoFile]       = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoConsent, setPhotoConsent] = useState(false)

  // Parent destination
  const [parentId, setParentId]           = useState<string | null>(null)
  const [parentName, setParentName]       = useState('')
  const [parentSearch, setParentSearch]   = useState('')
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([])
  const [parentSearching, setParentSearching] = useState(false)
  const [parentLocked, setParentLocked]   = useState(false)
  const parentDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Geocoding
  const [suggestions, setSuggestions]         = useState<Prediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching]             = useState(false)
  const [locationLocked, setLocationLocked]   = useState(false)
  const [resolvedLat, setResolvedLat]         = useState<number | null>(null)
  const [resolvedLng, setResolvedLng]         = useState<number | null>(null)
  const nameDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // ── Navigation ─────────────────────────────────────────────────────────────

  function goNext() { setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1)) }
  function goBack() { setCurrentStep(prev => Math.max(prev - 1, 0)) }

  function canAdvance(): boolean {
    const card = CARDS[currentStep]
    switch (card.id) {
      case 'place':     return locationLocked || placeName.trim().length > 2
      case 'parent':    return true
      case 'must_do':   return mustDo.trim().length > 10
      case 'logistics': return true
      case 'cost':      return true
      case 'not_for_you': return true
      case 'photo':     return true
      case 'review':    return description.trim().length > 20
      default:          return true
    }
  }

  // ── Geocoding ───────────────────────────────────────────────────────────────

  function handleNameChange(value: string) {
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current)
    if (!value.trim() || value.length < 3) { setSuggestions([]); setShowSuggestions(false); return }
    nameDebounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/geocode?mode=autocomplete&input=${encodeURIComponent(value)}&placeType=experience`
        )
        const data = await res.json() as { predictions?: Prediction[] }
        setSuggestions(data.predictions ?? [])
        setShowSuggestions(true)
      } catch { /* ignore */ } finally { setSearching(false) }
    }, 350)
  }

  async function selectSuggestion(s: Prediction) {
    setShowSuggestions(false); setSuggestions([]); setSearching(true)
    try {
      const params = new URLSearchParams({
        mode: 'details', place_id: s.place_id,
        lat: String(s.lat ?? ''), lng: String(s.lng ?? ''),
        country: s.country ?? '', region_name: s.region_name ?? '',
        name: s.main_text, feature_type: s.feature_type ?? '',
      })
      const res = await fetch(`/api/geocode?${params}`)
      const data = await res.json() as {
        error?: string; name?: string; country?: string; region?: string
        state_province?: string | null; lat?: number | null; lng?: number | null
      }
      if (data.error) { toast.error('Could not load place details.'); return }
      setPlaceName(data.name ?? s.main_text)
      setPlaceCountry(data.country ?? '')
      setPlaceRegion(data.region ?? '')
      setStateProv(data.state_province ?? '')
      setResolvedLat(data.lat ?? s.lat ?? null)
      setResolvedLng(data.lng ?? s.lng ?? null)
      setLocationLocked(true)
      setTimeout(() => goNext(), 400)
    } catch { toast.error('Geocoding failed.') } finally { setSearching(false) }
  }

  // ── Parent search ───────────────────────────────────────────────────────────

  function handleParentSearch(value: string) {
    setParentSearch(value)
    setParentLocked(false)
    if (parentDebounceRef.current) clearTimeout(parentDebounceRef.current)
    if (!value.trim() || value.length < 2) { setParentOptions([]); return }
    parentDebounceRef.current = setTimeout(async () => {
      setParentSearching(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('places')
          .select('id, name, country, region')
          .eq('type', 'destination')
          .ilike('name', `%${value}%`)
          .order('popularity', { ascending: false })
          .limit(6)
        setParentOptions((data ?? []) as ParentOption[])
      } catch { /* ignore */ } finally { setParentSearching(false) }
    }, 300)
  }

  function selectParent(opt: ParentOption) {
    setParentId(opt.id)
    setParentName(opt.name)
    setParentSearch(opt.name)
    setParentLocked(true)
    setParentOptions([])
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true)
    if (photoFile && !photoConsent) {
      toast.error('Please confirm you have the right to share this photo.')
      setSubmitting(false); return
    }

    let photo_url: string | null = null
    if (photoFile) {
      setUploadingPhoto(true)
      const supabase = createClient()
      const ext = photoFile.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('submissions').upload(path, photoFile, { upsert: false })
      if (uploadError) {
        toast.error('Photo upload failed — submitting without it.')
        console.error('[submit] Storage upload error:', uploadError.message)
      } else {
        const { data: { publicUrl } } = supabase.storage.from('submissions').getPublicUrl(path)
        photo_url = publicUrl
      }
      setUploadingPhoto(false)
    }

    const result = await submitExperience({
      name:            placeName,
      type:            'experience',
      submission_kind: 'experience',
      country:         placeCountry,
      region:          placeRegion,
      state_province:  stateProv || null,
      description,
      tags:            [],
      image_url:       photo_url,
      must_do:         mustDo || null,
      hidden_gem:      null,
      not_for_you:     notForYou || null,
      cost:            cost || null,
      best_time:       null,
      vibe_tags:       [],
      photo_url,
      lat:             resolvedLat,
      lng:             resolvedLng,
      categoryId:      null,
      tagIds:          [],
      parent_place_id: parentId,
      extra_metadata:  duration ? { duration, needs_booking: needsBooking } : { needs_booking: needsBooking },
    })

    setSubmitting(false)
    if (result.error) { toast.error('Could not submit. Please try again.'); return }
    setSubmitted(true)
  }

  // ── Reset ───────────────────────────────────────────────────────────────────

  function resetForm() {
    setCurrentStep(0); setSubmitted(false)
    setPlaceName(''); setPlaceCountry(''); setPlaceRegion(''); setStateProv('')
    setMustDo(''); setCost(''); setNotForYou(''); setDuration(''); setNeedsBooking(false); setDescription('')
    setPhotoFile(null); setPhotoPreview(null); setPhotoConsent(false)
    setLocationLocked(false); setResolvedLat(null); setResolvedLng(null)
    setSuggestions([]); setParentId(null); setParentName(''); setParentSearch('')
    setParentOptions([]); setParentLocked(false)
  }

  // ── Card renderer ───────────────────────────────────────────────────────────

  function renderCardInput(card: (typeof CARDS)[number]) {
    switch (card.id as CardId) {

      case 'place':
        return (
          <div className="relative">
            <div className="relative">
              <input
                id="exp-place-name"
                name="exp-place-name"
                type="text"
                value={placeName}
                onChange={e => { setPlaceName(e.target.value); setLocationLocked(false); handleNameChange(e.target.value) }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Start typing…"
                autoComplete="off"
                className="w-full rounded-2xl border-2 border-[#fcd99a] bg-white px-5 py-4 font-display font-bold text-[#131936] text-[20px] placeholder:text-[#131936]/20 placeholder:font-nunito placeholder:font-normal placeholder:text-[16px] focus:outline-none focus:border-[#f89a14] transition-colors"
              />
              {searching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 rounded-full border-2 border-[#f89a14] border-t-transparent animate-spin" />
                </div>
              )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white rounded-2xl border border-[#fcd99a] shadow-xl overflow-hidden">
                {suggestions.map(s => (
                  <button key={s.place_id} type="button" onMouseDown={() => void selectSuggestion(s)}
                    className="w-full text-left px-5 py-4 hover:bg-[#fcd99a]/20 transition-colors border-b border-[#fcd99a]/30 last:border-0">
                    <p className="font-display font-bold text-[#131936] text-[16px]">{s.main_text}</p>
                    <p className="font-nunito text-[#131936]/50 text-[13px] mt-0.5">{s.secondary_text}</p>
                  </button>
                ))}
              </div>
            )}
            {locationLocked && (
              <div className="mt-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#16a34a]/10 flex items-center justify-center text-[12px] shrink-0">✓</span>
                <div className="flex-1 min-w-0">
                  <p className="font-nunito font-semibold text-[#131936] text-[14px] truncate">{placeName}</p>
                  <p className="font-nunito text-[#131936]/50 text-[12px]">{stateProv ? `${stateProv}, ${placeCountry}` : placeCountry}</p>
                </div>
                <button type="button" onClick={() => { setLocationLocked(false); setPlaceName(''); setPlaceCountry(''); setPlaceRegion(''); setStateProv(''); setResolvedLat(null); setResolvedLng(null) }}
                  className="font-nunito text-[12px] text-[#131936]/30 hover:text-[#131936] transition-colors shrink-0">× Change</button>
              </div>
            )}
          </div>
        )

      case 'parent':
        return (
          <div className="relative">
            <div className="relative">
              <input
                id="exp-parent-search"
                name="exp-parent-search"
                type="text"
                value={parentSearch}
                onChange={e => handleParentSearch(e.target.value)}
                onBlur={() => setTimeout(() => setParentOptions([]), 150)}
                placeholder="e.g. Tokyo, Bali, Iceland…"
                autoComplete="off"
                className="w-full rounded-2xl border-2 border-[#fcd99a] bg-white px-5 py-4 font-display font-bold text-[#131936] text-[18px] placeholder:text-[#131936]/20 placeholder:font-nunito placeholder:font-normal placeholder:text-[15px] focus:outline-none focus:border-[#f89a14] transition-colors"
              />
              {parentSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 rounded-full border-2 border-[#f89a14] border-t-transparent animate-spin" />
                </div>
              )}
            </div>
            {parentOptions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white rounded-2xl border border-[#fcd99a] shadow-xl overflow-hidden">
                {parentOptions.map(opt => (
                  <button key={opt.id} type="button" onMouseDown={() => selectParent(opt)}
                    className="w-full text-left px-5 py-4 hover:bg-[#fcd99a]/20 transition-colors border-b border-[#fcd99a]/30 last:border-0">
                    <p className="font-display font-bold text-[#131936] text-[16px]">{opt.name}</p>
                    <p className="font-nunito text-[#131936]/50 text-[13px] mt-0.5">{opt.country}</p>
                  </button>
                ))}
              </div>
            )}
            {parentLocked && (
              <div className="mt-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#f89a14]/10 flex items-center justify-center text-[12px] shrink-0">🗺</span>
                <p className="font-nunito font-semibold text-[#131936] text-[14px] flex-1">{parentName}</p>
                <button type="button" onClick={() => { setParentId(null); setParentName(''); setParentSearch(''); setParentLocked(false) }}
                  className="font-nunito text-[12px] text-[#131936]/30 hover:text-[#131936] transition-colors shrink-0">× Change</button>
              </div>
            )}
            {!parentLocked && (
              <p className="font-nunito text-[12px] text-[#131936]/40 mt-2">
                Optional — skip if you&apos;re not sure.
              </p>
            )}
          </div>
        )

      case 'logistics':
        return (
          <div className="space-y-4">
            <div>
              <label className="font-nunito text-[12px] text-[#131936]/50 uppercase tracking-wider mb-2 block">
                How long does it take?
              </label>
              <input
                id="exp-duration"
                name="exp-duration"
                type="text"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="e.g. 2–3 hours, half a day, full day"
                maxLength={60}
                className="w-full rounded-2xl border-2 border-[#fcd99a] bg-white px-5 py-4 font-nunito text-[#131936] text-[15px] placeholder:text-[#131936]/30 focus:outline-none focus:border-[#f89a14] transition-colors"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer bg-white rounded-2xl border-2 border-[#fcd99a] px-5 py-4">
              <input
                type="checkbox"
                checked={needsBooking}
                onChange={e => setNeedsBooking(e.target.checked)}
                className="w-5 h-5 accent-[#f89a14] shrink-0 cursor-pointer"
              />
              <span className="font-nunito text-[#131936] text-[15px]">
                You need to book ahead
              </span>
            </label>
          </div>
        )

      case 'photo':
        return (
          <div>
            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#fcd99a]">
                <div className="relative h-56 w-full">
                  <Image src={photoPreview} alt="Preview" fill className="object-cover" />
                </div>
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center text-[16px] hover:bg-black/80 transition-colors">×</button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-[#fcd99a] bg-white py-16 flex flex-col items-center gap-3 hover:border-[#f89a14]/60 transition-colors group">
                <span className="text-[40px]">📷</span>
                <p className="font-display font-bold text-[#131936]/40 text-[15px] group-hover:text-[#131936] transition-colors">Add a photo</p>
                <p className="font-nunito text-[#131936]/30 text-[12px]">Optional · up to 10 MB</p>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 10 * 1024 * 1024) { toast.error('Photo must be under 10 MB.'); return }
                setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); setPhotoConsent(false)
              }}
              className="hidden" />
            {photoFile && (
              <label className="flex items-start gap-3 mt-4 cursor-pointer">
                <input type="checkbox" checked={photoConsent} onChange={e => setPhotoConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#f89a14] shrink-0 cursor-pointer" />
                <span className="font-nunito text-[#131936]/60 text-[13px] leading-relaxed">
                  This is my own photo or I have the right to share it. I grant Someday a licence to display it in the app.
                </span>
              </label>
            )}
          </div>
        )

      default: {
        type TextCardId = 'must_do' | 'review' | 'cost' | 'not_for_you'
        const textCard = card as { id: TextCardId; type: 'text'; placeholder: string; maxLength: number }
        const valueMap: Record<TextCardId, string> = { must_do: mustDo, review: description, cost, not_for_you: notForYou }
        const setterMap: Record<TextCardId, (v: string) => void> = { must_do: setMustDo, review: setDescription, cost: setCost, not_for_you: setNotForYou }
        const value = valueMap[textCard.id]
        const setter = setterMap[textCard.id]
        const isLong = textCard.id === 'review'
        return (
          <div className="relative">
            {isLong ? (
              <textarea id={`exp-${textCard.id}`} name={`exp-${textCard.id}`} rows={5}
                value={value} onChange={e => setter(e.target.value)}
                placeholder={textCard.placeholder} maxLength={textCard.maxLength}
                className="w-full rounded-2xl border-2 border-[#fcd99a] bg-white px-5 py-4 font-nunito text-[#131936] text-[16px] leading-relaxed placeholder:text-[#131936]/20 focus:outline-none focus:border-[#f89a14] transition-colors resize-none" />
            ) : (
              <input id={`exp-${textCard.id}`} name={`exp-${textCard.id}`} type="text"
                value={value} onChange={e => setter(e.target.value)}
                placeholder={textCard.placeholder} maxLength={textCard.maxLength}
                className="w-full rounded-2xl border-2 border-[#fcd99a] bg-white px-5 py-4 font-display font-bold text-[#131936] text-[18px] placeholder:text-[#131936]/20 placeholder:font-nunito placeholder:font-normal placeholder:text-[15px] focus:outline-none focus:border-[#f89a14] transition-colors" />
            )}
            <p className="absolute bottom-3 right-4 font-nunito text-[11px] text-[#131936]/30">{value.length}/{textCard.maxLength}</p>
            {(() => {
              const minimums: Record<string, number> = { must_do: 10, review: 20, cost: 0, not_for_you: 0 }
              const remaining = (minimums[textCard.id] ?? 0) - value.length
              if (remaining <= 0 || value.length === 0) return null
              return <p className="font-nunito text-[12px] text-[#131936]/40 mt-1.5">{remaining} more character{remaining !== 1 ? 's' : ''} to continue</p>
            })()}
          </div>
        )
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="text-[56px] mb-4">✨</div>
        <h2 className="font-display font-bold text-[#131936] text-[26px] mb-3">{placeName} is in the queue.</h2>
        <p className="font-nunito text-[#131936]/50 text-[15px] leading-relaxed max-w-xs mb-8">
          We review every submission personally. Great ones make it into the Someday database.
        </p>
        <button onClick={resetForm}
          className="px-8 py-3 rounded-full bg-[#f89a14] text-[#131936] font-display font-bold text-[15px]">
          Submit another
        </button>
      </div>
    )
  }

  const card = CARDS[currentStep]

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      <div className="w-full h-1 bg-[#fcd99a]/30">
        <div className="h-full bg-[#f89a14] transition-all duration-500 ease-out" style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }} />
      </div>

      <div className="flex items-center justify-between px-1 py-3">
        <button onClick={currentStep === 0 ? onBack : goBack}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-opacity">
          <ChevronLeft size={22} className="text-[#131936]" />
        </button>
        <span className="font-nunito text-[#131936]/40 text-[13px]">{currentStep + 1} of {totalSteps}</span>
        {(card.id === 'photo' || card.id === 'parent' || card.id === 'logistics' || card.id === 'cost' || card.id === 'not_for_you') ? (
          <button onClick={goNext} className="font-nunito text-[#131936]/40 text-[13px] hover:text-[#131936] transition-colors px-2">Skip</button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      <div className="flex-1 flex flex-col pt-4 pb-6">
        <div className="mb-8">
          <h2 className="font-display font-bold text-[#131936] text-[26px] leading-tight mb-2">{card.prompt}</h2>
          <p className="font-nunito text-[#131936]/50 text-[14px] leading-relaxed">{card.subprompt}</p>
        </div>
        <div className="flex-1">{renderCardInput(card)}</div>
      </div>

      <div className="pb-8 pt-3 border-t border-[#fcd99a]/30">
        {card.id === 'review' ? (
          <button onClick={() => void handleSubmit()} disabled={!canAdvance() || submitting}
            className="w-full h-14 rounded-full bg-[#131936] text-white font-display font-bold text-[16px] disabled:opacity-40 transition-opacity active:scale-[0.98]">
            {uploadingPhoto ? 'Uploading photo…' : submitting ? 'Submitting…' : 'Submit for review ✦'}
          </button>
        ) : (
          <button onClick={goNext} disabled={!canAdvance()}
            className="w-full h-14 rounded-full bg-[#f89a14] text-[#131936] font-display font-bold text-[16px] disabled:opacity-40 transition-opacity active:scale-[0.98]">
            Continue →
          </button>
        )}
      </div>
    </div>
  )
}
