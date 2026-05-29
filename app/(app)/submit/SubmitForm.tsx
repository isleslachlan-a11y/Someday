'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { submitPlace } from '@/app/actions/submissions'

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

// ── Cards ─────────────────────────────────────────────────────────────────────

const CARDS = [
  {
    id: 'place',
    step: 1,
    prompt: 'Where is it?',
    subprompt: 'Search for the place or experience.',
    type: 'place_search' as const,
  },
  {
    id: 'type',
    step: 2,
    prompt: 'What kind of place is it?',
    subprompt: 'Pick the one that fits best.',
    type: 'type_select' as const,
  },
  {
    id: 'must_do',
    step: 3,
    prompt: 'The one thing everyone must do here:',
    subprompt: 'One sentence. Make it specific.',
    type: 'text' as const,
    placeholder: 'e.g. Wake up at 4am and hike to the crater rim for sunrise',
    maxLength: 120,
  },
  {
    id: 'best_time',
    step: 4,
    prompt: 'Best time to visit:',
    subprompt: 'Month, season, or reason.',
    type: 'text' as const,
    placeholder: 'e.g. October — the crowds thin out and the light is golden',
    maxLength: 100,
  },
  {
    id: 'photo',
    step: 5,
    prompt: 'Got a photo?',
    subprompt: 'Optional — helps us review faster.',
    type: 'photo' as const,
  },
  {
    id: 'review',
    step: 6,
    prompt: 'Why does this place deserve to be on Someday?',
    subprompt: 'Make someone want to go. Two sentences is enough.',
    type: 'text' as const,
    placeholder: "There's nowhere else where you can watch the sun rise over 2,000 temples from a hot air balloon…",
    maxLength: 280,
  },
] as const

type CardId = (typeof CARDS)[number]['id']

// ── Constants ─────────────────────────────────────────────────────────────────

const PLACE_TYPES = [
  { value: 'city',       label: 'City',        icon: '🏙', desc: 'Urban destination' },
  { value: 'nature',     label: 'Nature',       icon: '🌿', desc: 'Landscape or park' },
  { value: 'experience', label: 'Experience',   icon: '✨', desc: 'Activity or event' },
  { value: 'food',       label: 'Food & Drink', icon: '🍜', desc: 'Restaurant or market' },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  userId: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubmitForm({ userId }: Props) {
  const totalSteps = CARDS.length
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection]     = useState<'forward' | 'back'>('forward')
  const [submitting, setSubmitting]   = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  // Answers
  const [placeName, setPlaceName]         = useState('')
  const [placeCountry, setPlaceCountry]   = useState('')
  const [placeRegion, setPlaceRegion]     = useState('')
  const [stateProv, setStateProv]         = useState('')
  const [placeType, setPlaceType]         = useState('')
  const [mustDo, setMustDo]               = useState('')
  const [bestTime, setBestTime]           = useState('')
  const [description, setDescription]     = useState('')
  const [photoFile, setPhotoFile]         = useState<File | null>(null)
  const [photoPreview, setPhotoPreview]   = useState<string | null>(null)
  const [photoConsent, setPhotoConsent]   = useState(false)

  // Geocoding
  const [suggestions, setSuggestions]         = useState<Prediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching]             = useState(false)
  const [locationLocked, setLocationLocked]   = useState(false)
  const [resolvedLat, setResolvedLat]         = useState<number | null>(null)
  const [resolvedLng, setResolvedLng]         = useState<number | null>(null)
  const nameDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // ── Navigation ───────────────────────────────────────────────────────────

  function goNext() {
    setDirection('forward')
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1))
  }

  function goBack() {
    setDirection('back')
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  function canAdvance(): boolean {
    const card = CARDS[currentStep]
    switch (card.id) {
      case 'place':     return locationLocked || placeName.trim().length > 2
      case 'type':      return placeType !== ''
      case 'must_do':   return mustDo.trim().length > 10
      case 'best_time': return bestTime.trim().length > 3
      case 'photo':     return true
      case 'review':    return description.trim().length > 20
      default:          return true
    }
  }

  // ── Geocoding ────────────────────────────────────────────────────────────

  function handleNameChange(value: string) {
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current)
    if (!value.trim() || value.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    nameDebounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/geocode?mode=autocomplete&input=${encodeURIComponent(value)}`
        )
        const data = await res.json() as { predictions?: Prediction[] }
        setSuggestions(data.predictions ?? [])
        setShowSuggestions(true)
      } catch { /* ignore */ }
      finally { setSearching(false) }
    }, 350)
  }

  async function selectSuggestion(s: Prediction) {
    setShowSuggestions(false)
    setSuggestions([])
    setSearching(true)
    try {
      const params = new URLSearchParams({
        mode:         'details',
        place_id:     s.place_id,
        lat:          String(s.lat ?? ''),
        lng:          String(s.lng ?? ''),
        country:      s.country ?? '',
        region_name:  s.region_name ?? '',
        name:         s.main_text,
        feature_type: s.feature_type ?? '',
      })
      const res = await fetch(`/api/geocode?${params}`)
      const data = await res.json() as {
        error?: string
        name?: string
        country?: string
        region?: string
        state_province?: string | null
        lat?: number | null
        lng?: number | null
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
    } catch { toast.error('Geocoding failed.') }
    finally { setSearching(false) }
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true)

    if (photoFile && !photoConsent) {
      toast.error('Please confirm you have the right to share this photo.')
      setSubmitting(false)
      return
    }

    let photo_url: string | null = null

    if (photoFile) {
      setUploadingPhoto(true)
      const supabase = createClient()
      const ext = photoFile.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(path, photoFile, { upsert: false })
      if (uploadError) {
        toast.error('Photo upload failed — submitting without it. You can describe it in your answers.')
        console.error('[submit] Storage upload error:', uploadError.message)
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('submissions').getPublicUrl(path)
        photo_url = publicUrl
      }
      setUploadingPhoto(false)
    }

    const result = await submitPlace({
      name:           placeName,
      type:           placeType,
      country:        placeCountry,
      region:         placeRegion,
      state_province: stateProv || null,
      description,
      tags:        [],
      image_url:   photo_url,
      must_do:     mustDo || null,
      hidden_gem:  null,
      not_for_you: null,
      best_time:   bestTime || null,
      vibe_tags:   [],
      photo_url,
      lat:         resolvedLat,
      lng:         resolvedLng,
      categoryId:  null,
      tagIds:      [],
    })

    setSubmitting(false)
    if (result.error) { toast.error('Could not submit. Please try again.'); return }
    setSubmitted(true)
  }

  // ── Reset ────────────────────────────────────────────────────────────────

  function resetForm() {
    setCurrentStep(0)
    setDirection('forward')
    setSubmitted(false)
    setPlaceName('')
    setPlaceCountry('')
    setPlaceRegion('')
    setStateProv('')
    setPlaceType('')
    setMustDo('')
    setBestTime('')
    setDescription('')
    setPhotoFile(null)
    setPhotoPreview(null)
    setPhotoConsent(false)
    setLocationLocked(false)
    setResolvedLat(null)
    setResolvedLng(null)
    setSuggestions([])
  }

  // ── Card input renderer ──────────────────────────────────────────────────

  function renderCardInput(card: (typeof CARDS)[number]) {
    switch (card.id as CardId) {

      case 'place':
        return (
          <div className="relative">
            <div className="relative">
              <input
                id="submit-place-name"
                name="submit-place-name"
                type="text"
                value={placeName}
                onChange={e => {
                  setPlaceName(e.target.value)
                  setLocationLocked(false)
                  handleNameChange(e.target.value)
                }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Start typing…"
                autoComplete="off"
                className="w-full rounded-2xl border-2 border-[#fcd99a] bg-white
                  px-5 py-4 font-syne font-bold text-[#131936] text-[20px]
                  placeholder:text-[#131936]/20 placeholder:font-nunito
                  placeholder:font-normal placeholder:text-[16px]
                  focus:outline-none focus:border-[#f08c21] transition-colors"
              />
              {searching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 rounded-full border-2 border-[#f08c21] border-t-transparent animate-spin" />
                </div>
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2
                bg-white rounded-2xl border border-[#fcd99a] shadow-xl overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s.place_id}
                    type="button"
                    onMouseDown={() => void selectSuggestion(s)}
                    className="w-full text-left px-5 py-4 hover:bg-[#fcd99a]/20
                      transition-colors border-b border-[#fcd99a]/30 last:border-0"
                  >
                    <p className="font-syne font-bold text-[#131936] text-[16px]">
                      {s.main_text}
                    </p>
                    <p className="font-nunito text-[#131936]/50 text-[13px] mt-0.5">
                      {s.secondary_text}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {!locationLocked && placeName.length > 0 && placeName.length < 3 && (
              <p className="font-nunito text-[12px] text-[#131936]/40 mt-2">
                Keep typing to search…
              </p>
            )}

            {locationLocked && (
              <div className="mt-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#16a34a]/10 flex items-center justify-center text-[12px] shrink-0">
                  ✓
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-nunito font-semibold text-[#131936] text-[14px] truncate">
                    {placeName}
                  </p>
                  <p className="font-nunito text-[#131936]/50 text-[12px]">
                    {stateProv ? `${stateProv}, ${placeCountry}` : placeCountry}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocationLocked(false)
                    setPlaceName('')
                    setPlaceCountry('')
                    setPlaceRegion('')
                    setStateProv('')
                    setResolvedLat(null)
                    setResolvedLng(null)
                  }}
                  className="font-nunito text-[12px] text-[#131936]/30 hover:text-[#131936] transition-colors shrink-0"
                >
                  × Change
                </button>
              </div>
            )}
          </div>
        )

      case 'type':
        return (
          <div className="grid grid-cols-2 gap-3">
            {PLACE_TYPES.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPlaceType(opt.value)}
                className={`relative flex flex-col items-start gap-2 rounded-2xl border-2
                  p-5 transition-all text-left active:scale-[0.97] ${
                  placeType === opt.value
                    ? 'border-[#f08c21] bg-[#f08c21]/5'
                    : 'border-[#fcd99a]/50 bg-white'
                }`}
              >
                <span className="text-[32px]">{opt.icon}</span>
                <div>
                  <p className={`font-syne font-bold text-[15px] ${
                    placeType === opt.value ? 'text-[#f08c21]' : 'text-[#131936]'
                  }`}>
                    {opt.label}
                  </p>
                  <p className="font-nunito text-[#131936]/40 text-[12px]">
                    {opt.desc}
                  </p>
                </div>
                {placeType === opt.value && (
                  <span className="absolute top-3 right-3 text-[#f08c21] text-[16px]">✦</span>
                )}
              </button>
            ))}
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
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null)
                    setPhotoPreview(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full
                    bg-black/60 text-white flex items-center justify-center
                    text-[16px] hover:bg-black/80 transition-colors"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed
                  border-[#fcd99a] bg-white py-16 flex flex-col items-center
                  gap-3 hover:border-[#f08c21]/60 transition-colors group"
              >
                <span className="text-[40px]">📷</span>
                <p className="font-syne font-bold text-[#131936]/40 text-[15px] group-hover:text-[#131936] transition-colors">
                  Add a photo
                </p>
                <p className="font-nunito text-[#131936]/30 text-[12px]">
                  Optional · up to 10 MB
                </p>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 10 * 1024 * 1024) {
                  toast.error('Photo must be under 10 MB.')
                  return
                }
                setPhotoFile(file)
                setPhotoPreview(URL.createObjectURL(file))
                setPhotoConsent(false)
              }}
              className="hidden"
            />

            {photoFile && (
              <label className="flex items-start gap-3 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={photoConsent}
                  onChange={e => setPhotoConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#f08c21] shrink-0 cursor-pointer"
                />
                <span className="font-nunito text-[#131936]/60 text-[13px] leading-relaxed">
                  This is my own photo or I have the right to share it. I grant
                  Someday a licence to display it in the app.
                </span>
              </label>
            )}
          </div>
        )

      default: {
        // Text cards: must_do, best_time, review
        type TextCardId = 'must_do' | 'best_time' | 'review'
        const textCard = card as { id: TextCardId; type: 'text'; placeholder: string; maxLength: number }
        const valueMap: Record<TextCardId, string> = {
          must_do:  mustDo,
          best_time: bestTime,
          review:   description,
        }
        const setterMap: Record<TextCardId, (v: string) => void> = {
          must_do:  setMustDo,
          best_time: setBestTime,
          review:   setDescription,
        }
        const value = valueMap[textCard.id]
        const setter = setterMap[textCard.id]
        const isLong = textCard.id === 'review'

        return (
          <div className="relative">
            {isLong ? (
              <textarea
                id={`submit-${textCard.id}`}
                name={`submit-${textCard.id}`}
                rows={5}
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder={textCard.placeholder}
                maxLength={textCard.maxLength}
                className="w-full rounded-2xl border-2 border-[#fcd99a] bg-white
                  px-5 py-4 font-nunito text-[#131936] text-[16px] leading-relaxed
                  placeholder:text-[#131936]/20 focus:outline-none
                  focus:border-[#f08c21] transition-colors resize-none"
              />
            ) : (
              <input
                id={`submit-${textCard.id}`}
                name={`submit-${textCard.id}`}
                type="text"
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder={textCard.placeholder}
                maxLength={textCard.maxLength}
                className="w-full rounded-2xl border-2 border-[#fcd99a] bg-white
                  px-5 py-4 font-syne font-bold text-[#131936] text-[18px]
                  placeholder:text-[#131936]/20 placeholder:font-nunito
                  placeholder:font-normal placeholder:text-[15px]
                  focus:outline-none focus:border-[#f08c21] transition-colors"
              />
            )}
            <p className="absolute bottom-3 right-4 font-nunito text-[11px] text-[#131936]/30">
              {value.length}/{textCard.maxLength}
            </p>
            {(() => {
              const minimums: Record<string, number> = {
                must_do:  10,
                best_time: 3,
                review:   20,
              }
              const min = minimums[textCard.id] ?? 0
              const remaining = min - value.length
              if (remaining <= 0 || value.length === 0) return null
              return (
                <p className="font-nunito text-[12px] text-[#131936]/40 mt-1.5">
                  {remaining} more character{remaining !== 1 ? 's' : ''} to continue
                </p>
              )
            })()}
          </div>
        )
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (submitted) {
    return <SuccessCard placeName={placeName} placeType={placeType} onReset={resetForm} />
  }

  const card = CARDS[currentStep]

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">

      {/* Progress bar */}
      <div className="w-full h-1 bg-[#fcd99a]/30">
        <div
          className="h-full bg-[#f08c21] transition-all duration-500 ease-out"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step counter + nav */}
      <div className="flex items-center justify-between px-1 py-3">
        <button
          onClick={goBack}
          disabled={currentStep === 0}
          className="w-10 h-10 flex items-center justify-center rounded-full disabled:opacity-0 transition-opacity"
        >
          <ChevronLeft size={22} className="text-[#131936]" />
        </button>
        <span className="font-nunito text-[#131936]/40 text-[13px]">
          {currentStep + 1} of {totalSteps}
        </span>
        {card.id === 'photo' ? (
          <button
            onClick={goNext}
            className="font-nunito text-[#131936]/40 text-[13px] hover:text-[#131936] transition-colors px-2"
          >
            Skip
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Card content */}
      <div className="flex-1 flex flex-col pt-4 pb-6">

        {/* Question */}
        <div className="mb-8">
          <h2 className="font-syne font-bold text-[#131936] text-[26px] leading-tight mb-2">
            {card.prompt}
          </h2>
          <p className="font-nunito text-[#131936]/50 text-[14px] leading-relaxed">
            {card.subprompt}
          </p>
        </div>

        {/* Input area */}
        <div className="flex-1">
          {renderCardInput(card)}
        </div>

      </div>

      {/* Bottom CTA */}
      <div className="pb-8 pt-3 border-t border-[#fcd99a]/30">
        {card.id === 'review' ? (
          <button
            onClick={() => void handleSubmit()}
            disabled={!canAdvance() || submitting}
            className="w-full h-14 rounded-full bg-[#131936] text-white
              font-syne font-bold text-[16px] disabled:opacity-40
              transition-opacity active:scale-[0.98]"
          >
            {uploadingPhoto
              ? 'Uploading photo…'
              : submitting
              ? 'Submitting…'
              : 'Submit for review ✦'
            }
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!canAdvance()}
            className="w-full h-14 rounded-full bg-[#f08c21] text-[#131936]
              font-syne font-bold text-[16px] disabled:opacity-40
              transition-opacity active:scale-[0.98]"
          >
            Continue →
          </button>
        )}
      </div>

    </div>
  )
}

// ── Success card ──────────────────────────────────────────────────────────────

function SuccessCard({
  placeName,
  placeType,
  onReset,
}: {
  placeName: string
  placeType: string
  onReset: () => void
}) {
  const isExperienceType = placeType === 'experience' || placeType === 'food'
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="text-[56px] mb-4">★</div>
      <h2 className="font-syne font-bold text-[#131936] text-[26px] mb-3">
        {placeName} is in the queue.
      </h2>
      <p className="font-nunito text-[#131936]/50 text-[15px] leading-relaxed max-w-xs mb-8">
        We review every submission personally. Great ones make it into the Someday database.
      </p>
      <button
        onClick={onReset}
        className="px-8 py-3 rounded-full bg-[#f08c21] text-[#131936] font-syne font-bold text-[15px]"
      >
        Submit another place
      </button>
      {isExperienceType && (
        <div className="mt-4 p-4 rounded-2xl border border-[#fcd99a] bg-white text-left max-w-xs">
          <p className="font-syne font-bold text-[#131936] text-[15px] mb-1">
            Know what to do there?
          </p>
          <p className="font-nunito text-[#131936]/50 text-[13px] mb-3">
            Add specific activities to help others plan their visit.
          </p>
          <p className="font-nunito text-[#131936]/40 text-[12px]">
            Activities are added by our team after your submission is reviewed.
            You can suggest them in your description above.
          </p>
        </div>
      )}
    </div>
  )
}
