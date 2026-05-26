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
    prompt: 'Where should everyone go someday?',
    subprompt: 'Search for a real place — city, nature spot, experience, or restaurant.',
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
    id: 'vibes',
    step: 3,
    prompt: "You'd love it here if you're into…",
    subprompt: 'Pick up to 5 that feel right.',
    type: 'vibes' as const,
  },
  {
    id: 'must_do',
    step: 4,
    prompt: 'The one thing everyone must do here:',
    subprompt: 'One sentence. Make it specific.',
    type: 'text' as const,
    placeholder: 'e.g. Wake up at 4am and hike to the crater rim for sunrise',
    maxLength: 120,
  },
  {
    id: 'hidden_gem',
    step: 5,
    prompt: 'Best kept secret:',
    subprompt: 'Something the guidebooks miss.',
    type: 'text' as const,
    placeholder: 'e.g. The tiny noodle shop down the alley behind the night market',
    maxLength: 120,
  },
  {
    id: 'not_for_you',
    step: 6,
    prompt: "Don't come here if you hate…",
    subprompt: 'Honesty makes a better catalogue.',
    type: 'text' as const,
    placeholder: 'e.g. Crowds, hot weather, or walking uphill for 3 hours',
    maxLength: 100,
  },
  {
    id: 'best_time',
    step: 7,
    prompt: 'Best time to visit:',
    subprompt: 'Month, season, or reason.',
    type: 'text' as const,
    placeholder: 'e.g. October — the crowds thin out and the light is golden',
    maxLength: 100,
  },
  {
    id: 'photo',
    step: 8,
    prompt: 'Got a photo?',
    subprompt: 'Optional — helps us review it faster.',
    type: 'photo' as const,
  },
  {
    id: 'review',
    step: 9,
    prompt: 'One last thing — why does this place deserve to be on Someday?',
    subprompt: 'This becomes the description. Make someone want to go.',
    type: 'text' as const,
    placeholder: "e.g. There's nowhere else on earth where you can watch the sun rise over 2,000 ancient temples from a hot air balloon…",
    maxLength: 280,
  },
] as const

type CardId = (typeof CARDS)[number]['id']

// ── Constants ─────────────────────────────────────────────────────────────────

const VIBE_OPTIONS = [
  { label: 'Adventure', emoji: '🧗' },
  { label: 'Culture',   emoji: '🏛' },
  { label: 'Foodie',    emoji: '🍜' },
  { label: 'Romantic',  emoji: '🌅' },
  { label: 'Chill',     emoji: '🌊' },
  { label: 'Epic',      emoji: '⚡' },
  { label: 'Peaceful',  emoji: '🌿' },
  { label: 'Wellness',  emoji: '🧘' },
]

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
  const [placeType, setPlaceType]         = useState('')
  const [vibes, setVibes]                 = useState<string[]>([])
  const [mustDo, setMustDo]               = useState('')
  const [hiddenGem, setHiddenGem]         = useState('')
  const [notForYou, setNotForYou]         = useState('')
  const [bestTime, setBestTime]           = useState('')
  const [description, setDescription]     = useState('')
  const [photoFile, setPhotoFile]         = useState<File | null>(null)
  const [photoPreview, setPhotoPreview]   = useState<string | null>(null)

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
      case 'place':       return locationLocked || placeName.trim().length > 2
      case 'type':        return placeType !== ''
      case 'vibes':       return vibes.length > 0
      case 'must_do':     return mustDo.trim().length > 10
      case 'hidden_gem':  return hiddenGem.trim().length > 5
      case 'not_for_you': return notForYou.trim().length > 5
      case 'best_time':   return bestTime.trim().length > 3
      case 'photo':       return true
      case 'review':      return description.trim().length > 20
      default:            return true
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
        lat?: number | null
        lng?: number | null
      }
      if (data.error) { toast.error('Could not load place details.'); return }
      setPlaceName(data.name ?? s.main_text)
      setPlaceCountry(data.country ?? '')
      setPlaceRegion(data.region ?? '')
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
      name:        placeName,
      type:        placeType,
      country:     placeCountry,
      region:      placeRegion,
      description,
      tags:        [],
      image_url:   photo_url,
      must_do:     mustDo || null,
      hidden_gem:  hiddenGem || null,
      not_for_you: notForYou || null,
      best_time:   bestTime || null,
      vibe_tags:   vibes,
      photo_url,
      lat:         resolvedLat,
      lng:         resolvedLng,
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
    setPlaceType('')
    setVibes([])
    setMustDo('')
    setHiddenGem('')
    setNotForYou('')
    setBestTime('')
    setDescription('')
    setPhotoFile(null)
    setPhotoPreview(null)
    setLocationLocked(false)
    setResolvedLat(null)
    setResolvedLng(null)
    setSuggestions([])
  }

  // ── Card input renderer ──────────────────────────────────────────────────

  function renderCardInput(card: (typeof CARDS)[number]) {
    switch (card.id) {

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
                    {[placeCountry, placeRegion].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocationLocked(false)
                    setPlaceName('')
                    setPlaceCountry('')
                    setPlaceRegion('')
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

      case 'vibes':
        return (
          <div className="space-y-2">
            {VIBE_OPTIONS.map(vibe => {
              const active = vibes.includes(vibe.label)
              const atLimit = vibes.length >= 5
              return (
                <button
                  key={vibe.label}
                  type="button"
                  onClick={() => {
                    if (active) {
                      setVibes(prev => prev.filter(v => v !== vibe.label))
                    } else if (!atLimit) {
                      setVibes(prev => [...prev, vibe.label])
                    }
                  }}
                  disabled={!active && atLimit}
                  className={`w-full flex items-center gap-4 rounded-2xl border-2
                    px-5 py-4 transition-all text-left active:scale-[0.98]
                    disabled:opacity-30 ${
                    active
                      ? 'border-[#f08c21] bg-[#f08c21]/5'
                      : 'border-[#fcd99a]/50 bg-white'
                  }`}
                >
                  <span className="text-[24px] shrink-0">{vibe.emoji}</span>
                  <span className={`font-syne font-bold text-[16px] ${
                    active ? 'text-[#f08c21]' : 'text-[#131936]'
                  }`}>
                    {vibe.label}
                  </span>
                  {active && (
                    <span className="ml-auto text-[#f08c21] text-[18px]">✦</span>
                  )}
                </button>
              )
            })}
            {vibes.length === 5 && (
              <p className="font-nunito text-[#131936]/40 text-[12px] text-center pt-1">
                Max 5 selected
              </p>
            )}
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
              }}
              className="hidden"
            />
          </div>
        )

      default: {
        // Text cards: must_do, hidden_gem, not_for_you, best_time, review
        type TextCardId = 'must_do' | 'hidden_gem' | 'not_for_you' | 'best_time' | 'review'
        const textCard = card as { id: TextCardId; type: 'text'; placeholder: string; maxLength: number }
        const valueMap: Record<TextCardId, string> = {
          must_do:     mustDo,
          hidden_gem:  hiddenGem,
          not_for_you: notForYou,
          best_time:   bestTime,
          review:      description,
        }
        const setterMap: Record<TextCardId, (v: string) => void> = {
          must_do:     setMustDo,
          hidden_gem:  setHiddenGem,
          not_for_you: setNotForYou,
          best_time:   setBestTime,
          review:      setDescription,
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
                must_do:     10,
                hidden_gem:  5,
                not_for_you: 5,
                best_time:   3,
                review:      20,
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
    return <SuccessCard placeName={placeName} onReset={resetForm} />
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
  onReset,
}: {
  placeName: string
  onReset: () => void
}) {
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
    </div>
  )
}
