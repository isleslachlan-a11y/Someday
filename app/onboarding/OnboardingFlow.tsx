'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { completeOnboarding } from '@/app/actions/onboarding'

// ─── Types ────────────────────────────────────────────────────────────────────

type Place = {
  id: string
  name: string
  country: string
  type: string
  image_keyword: string | null
}

type OnboardingData = {
  travelStyle: string[]
  groupPreference: string
  budgetRange: string
  comfortZone: string
  travelFrequency: string
  pastTripName: string
  pastTripYear: string
  selectedPlaceIds: string[]
}

const DEFAULT_DATA: OnboardingData = {
  travelStyle: [],
  groupPreference: '',
  budgetRange: '',
  comfortZone: '',
  travelFrequency: '',
  pastTripName: '',
  pastTripYear: '',
  selectedPlaceIds: [],
}

const STORAGE_KEY = 'someday_onboarding_v1'

// ─── Option sets ──────────────────────────────────────────────────────────────

const TRAVEL_STYLE_OPTIONS = [
  'Adventure Seeker',
  'Culture Lover',
  'Food Obsessed',
  'Beach Bum',
  'City Explorer',
  'Off the Beaten Track',
  'Wellness Focused',
  'Party Starter',
]

const GROUP_OPTIONS = [
  { label: 'Solo', value: 'solo' },
  { label: 'Partner', value: 'partner' },
  { label: 'Friends', value: 'friends' },
  { label: 'Family', value: 'family' },
  { label: 'Mix of everything', value: 'mixed' },
]

const BUDGET_OPTIONS = [
  { label: 'Backpacker', sub: 'hostels & street food', value: 'budget' },
  { label: 'Mid-range', sub: 'comfort without excess', value: 'mid' },
  { label: 'Luxury', sub: 'the good stuff', value: 'luxury' },
]

const COMFORT_OPTIONS = [
  { label: 'I play it safe', value: 'low' },
  { label: 'I push myself sometimes', value: 'medium' },
  { label: 'I live for it', value: 'high' },
]

const FREQUENCY_OPTIONS = [
  { label: 'Once a year or less', value: 'rarely' },
  { label: '2–3 times a year', value: 'sometimes' },
  { label: 'Every chance I get', value: 'often' },
]

const TYPE_ICONS: Record<string, string> = {
  destination: '🗺',
  experience:  '✨',
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const PILL_BASE = 'rounded-2xl border px-4 py-4 text-left font-nunito font-semibold text-[14px] transition-all active:scale-95'
const PILL_ON   = 'border-[#f08c21] bg-[#f08c21]/10 text-[#131936]'
const PILL_OFF  = 'border-[#fcd99a] bg-white text-[#131936]/70 hover:border-[#f08c21]/60 hover:bg-[#fcd99a]/20'
const PILL_DIS  = 'border-[#fcd99a]/30 bg-[#fcd99a]/10 text-[#131936]/30 cursor-not-allowed opacity-40'

const INPUT_CLS = 'w-full rounded-xl bg-white border border-[#fcd99a] px-4 py-3 font-nunito text-[14px] text-[#131936] placeholder:text-[#131936]/30 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30 transition'

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingFlow({ places }: { places: Place[] }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [animKey, setAnimKey] = useState(0)
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Restore from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (typeof parsed.step === 'number' && parsed.step >= 1 && parsed.step <= 8) {
          setStep(parsed.step)
        }
        if (parsed.data && typeof parsed.data === 'object') {
          setData(prev => ({ ...prev, ...parsed.data }))
        }
      }
    } catch {
      // ignore malformed localStorage
    }
    setHydrated(true)
  }, [])

  // Persist to localStorage whenever step or data changes (skip step 9)
  useEffect(() => {
    if (!hydrated) return
    try {
      if (step < 9) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }))
      }
    } catch {
      // ignore storage quota errors
    }
  }, [step, data, hydrated])

  function navigate(newStep: number, dir: 'forward' | 'back') {
    setDirection(dir)
    setAnimKey(k => k + 1)
    setStep(newStep)
  }

  function advance() {
    if (step === 8) {
      navigate(9, 'forward')
      save(data)
    } else {
      navigate(step + 1, 'forward')
    }
  }

  function goBack() {
    if (step > 1 && step < 9) navigate(step - 1, 'back')
  }

  function update(patch: Partial<OnboardingData>) {
    setData(d => ({ ...d, ...patch }))
  }

  async function save(snapshot: OnboardingData) {
    if (saving) return
    setSaving(true)
    setSaveFailed(false)

    const result = await completeOnboarding({
      travelStyle: snapshot.travelStyle,
      groupPreference: snapshot.groupPreference,
      budgetRange: snapshot.budgetRange,
      comfortZone: snapshot.comfortZone,
      travelFrequency: snapshot.travelFrequency,
      pastTripName: snapshot.pastTripName || undefined,
      pastTripYear: snapshot.pastTripYear ? parseInt(snapshot.pastTripYear, 10) : undefined,
      selectedPlaceIds: snapshot.selectedPlaceIds,
    })

    if (result.error) {
      toast.error('Something went wrong. Please try again.')
      setSaving(false)
      setSaveFailed(true)
      return
    }

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch { /* ignore */ }

    router.push('/home')
    router.refresh()
  }

  // Progress bar spans steps 2–8 (7 steps = full bar)
  const showProgress = step >= 2 && step <= 8
  const progress = showProgress ? ((step - 1) / 7) * 100 : 0
  const animClass = direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'

  if (!hydrated) return null

  return (
    <div className="min-h-screen bg-[#fff9f0] flex flex-col px-6 py-10">
      <div className="w-full max-w-[480px] mx-auto flex flex-col flex-1">

        {/* Progress bar */}
        {showProgress && (
          <div className="mb-10 shrink-0">
            <div className="h-1 w-full bg-[#fcd99a]/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#f08c21] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Step content — key change triggers remount + CSS animation */}
        <div key={animKey} className={animClass}>
          {step === 1 && (
            <StepWelcome onNext={advance} />
          )}
          {step === 2 && (
            <StepTravelStyle
              selected={data.travelStyle}
              onChange={v => update({ travelStyle: v })}
              onNext={advance}
              onBack={goBack}
            />
          )}
          {step === 3 && (
            <StepSingleSelect
              question="Who do you usually travel with?"
              options={GROUP_OPTIONS}
              value={data.groupPreference}
              onChange={v => update({ groupPreference: v })}
              onNext={advance}
              onBack={goBack}
            />
          )}
          {step === 4 && (
            <StepBudget
              value={data.budgetRange}
              onChange={v => update({ budgetRange: v })}
              onNext={advance}
              onBack={goBack}
            />
          )}
          {step === 5 && (
            <StepSingleSelect
              question="How do you feel about stepping outside your comfort zone?"
              options={COMFORT_OPTIONS}
              value={data.comfortZone}
              onChange={v => update({ comfortZone: v })}
              onNext={advance}
              onBack={goBack}
            />
          )}
          {step === 6 && (
            <StepSingleSelect
              question="How often do you travel?"
              options={FREQUENCY_OPTIONS}
              value={data.travelFrequency}
              onChange={v => update({ travelFrequency: v })}
              onNext={advance}
              onBack={goBack}
            />
          )}
          {step === 7 && (
            <StepPastTrip
              name={data.pastTripName}
              year={data.pastTripYear}
              onChangeName={v => update({ pastTripName: v })}
              onChangeYear={v => update({ pastTripYear: v })}
              onNext={advance}
              onBack={goBack}
            />
          )}
          {step === 8 && (
            <StepBucketSeed
              places={places}
              selected={data.selectedPlaceIds}
              onChange={v => update({ selectedPlaceIds: v })}
              onNext={advance}
              onBack={goBack}
            />
          )}
          {step === 9 && (
            <StepDone
              saving={saving}
              saveFailed={saveFailed}
              onRetry={() => save(data)}
            />
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="text-5xl mb-8 text-[#f08c21] select-none">✦</div>
      <h1 className="font-brice text-4xl font-bold text-[#131936] mb-4 leading-tight">
        Welcome to Someday.
      </h1>
      <p className="font-nunito text-[#131936]/60 text-lg mb-14 leading-relaxed">
        Let&apos;s build your travel profile.
      </p>
      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 rounded-2xl bg-[#f08c21] hover:bg-[#d97a1b] active:scale-95 px-10 py-4 font-brice font-bold text-white text-lg transition-all"
      >
        Let&apos;s go <span aria-hidden>→</span>
      </button>
    </div>
  )
}

// ─── Step 2: Travel style (multi-select, max 3) ───────────────────────────────

function StepTravelStyle({
  selected,
  onChange,
  onNext,
  onBack,
}: {
  selected: string[]
  onChange: (v: string[]) => void
  onNext: () => void
  onBack: () => void
}) {
  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option))
    } else if (selected.length < 3) {
      onChange([...selected, option])
    }
  }

  return (
    <div>
      <BackBtn onClick={onBack} />
      <h2 className="font-brice text-2xl font-bold text-[#131936] mt-5 mb-2">
        What kind of traveller are you?
      </h2>
      <p className="font-nunito text-[#131936]/40 text-sm mb-8">Pick up to 3.</p>

      <div className="grid grid-cols-2 gap-3 mb-10">
        {TRAVEL_STYLE_OPTIONS.map(option => {
          const isSelected = selected.includes(option)
          const isDisabled = !isSelected && selected.length >= 3
          return (
            <button
              key={option}
              onClick={() => toggle(option)}
              disabled={isDisabled}
              className={`${PILL_BASE} ${isSelected ? PILL_ON : isDisabled ? PILL_DIS : PILL_OFF}`}
            >
              {option}
            </button>
          )
        })}
      </div>

      <NextBtn onClick={onNext} disabled={selected.length === 0} />
    </div>
  )
}

// ─── Steps 3, 5, 6: Generic single-select ────────────────────────────────────

function StepSingleSelect({
  question,
  options,
  value,
  onChange,
  onNext,
  onBack,
}: {
  question: string
  options: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <BackBtn onClick={onBack} />
      <h2 className="font-brice text-2xl font-bold text-[#131936] mt-5 mb-8">
        {question}
      </h2>

      <div className="space-y-3 mb-10">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full ${PILL_BASE} px-5 ${value === opt.value ? PILL_ON : PILL_OFF}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <NextBtn onClick={onNext} disabled={!value} />
    </div>
  )
}

// ─── Step 4: Budget (single-select with subtitles) ────────────────────────────

function StepBudget({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string
  onChange: (v: string) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <BackBtn onClick={onBack} />
      <h2 className="font-brice text-2xl font-bold text-[#131936] mt-5 mb-8">
        What&apos;s your travel budget usually like?
      </h2>

      <div className="space-y-3 mb-10">
        {BUDGET_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full ${PILL_BASE} px-5 ${value === opt.value ? PILL_ON : PILL_OFF}`}
          >
            <span className="block font-brice font-semibold text-[14px]">
              {opt.label}
            </span>
            <span className="block font-nunito text-sm text-[#131936]/40 mt-0.5">{opt.sub}</span>
          </button>
        ))}
      </div>

      <NextBtn onClick={onNext} disabled={!value} />
    </div>
  )
}

// ─── Step 7: Past trip (freeform, skippable) ──────────────────────────────────

function StepPastTrip({
  name,
  year,
  onChangeName,
  onChangeYear,
  onNext,
  onBack,
}: {
  name: string
  year: string
  onChangeName: (v: string) => void
  onChangeYear: (v: string) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <BackBtn onClick={onBack} />
      <h2 className="font-brice text-2xl font-bold text-[#131936] mt-5 mb-2">
        Where&apos;s somewhere you&apos;ve already been that you loved?
      </h2>
      <p className="font-nunito text-[#131936]/40 text-sm mb-8">Optional — you can add more later.</p>

      <div className="space-y-4 mb-10">
        <div>
          <label className="block font-nunito text-sm text-[#131936]/50 mb-2">Place name</label>
          <input
            type="text"
            value={name}
            onChange={e => onChangeName(e.target.value)}
            placeholder="e.g. Kyoto, Japan"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="block font-nunito text-sm text-[#131936]/50 mb-2">Year (optional)</label>
          <input
            type="number"
            value={year}
            onChange={e => onChangeYear(e.target.value)}
            placeholder="e.g. 2022"
            min={1950}
            max={new Date().getFullYear()}
            className={INPUT_CLS}
          />
        </div>
      </div>

      <NextBtn onClick={onNext} disabled={false} label="Continue →" />
      <button
        onClick={onNext}
        className="w-full mt-3 py-2 text-center font-nunito text-sm text-[#131936]/40 hover:text-[#131936]/70 transition-colors"
      >
        I&apos;ll add this later
      </button>
    </div>
  )
}

// ─── Step 8: Bucket list seed ─────────────────────────────────────────────────

function StepBucketSeed({
  places,
  selected,
  onChange,
  onNext,
  onBack,
}: {
  places: Place[]
  selected: string[]
  onChange: (v: string[]) => void
  onNext: () => void
  onBack: () => void
}) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const canContinue = selected.length >= 3
  const remaining = Math.max(0, 3 - selected.length)

  return (
    <div>
      <BackBtn onClick={onBack} />
      <h2 className="font-brice text-2xl font-bold text-[#131936] mt-5 mb-2">
        Pick at least 3 places you&apos;d love to go someday.
      </h2>
      <p className="font-nunito text-[#131936]/40 text-sm mb-8">
        {remaining > 0
          ? `${remaining} more to go`
          : `${selected.length} selected — looking good!`}
      </p>

      {places.length === 0 ? (
        <div className="rounded-2xl border border-[#fcd99a] bg-[#fcd99a]/10 px-6 py-10 text-center mb-10">
          <p className="font-nunito text-[#131936]/40 text-sm">No places in the catalogue yet.</p>
          <p className="font-nunito text-[#131936]/30 text-xs mt-1">You can add destinations from your list later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-10">
          {places.map(place => {
            const isSelected = selected.includes(place.id)
            return (
              <button
                key={place.id}
                onClick={() => toggle(place.id)}
                className={`relative rounded-2xl border p-4 text-left transition-all active:scale-95 ${
                  isSelected ? PILL_ON : PILL_OFF
                }`}
              >
                {isSelected && (
                  <span className="absolute top-3 right-3 text-[#f08c21] text-xs font-bold">
                    ✓
                  </span>
                )}
                <span className="block text-xl mb-2 select-none" aria-hidden>
                  {TYPE_ICONS[place.type] ?? '✦'}
                </span>
                <span className="block font-brice font-semibold text-[#131936] text-sm leading-snug">
                  {place.name}
                </span>
                <span className="block font-nunito text-xs text-[#131936]/40 mt-1">{place.country}</span>
              </button>
            )
          })}
        </div>
      )}

      <NextBtn
        onClick={onNext}
        disabled={places.length > 0 && !canContinue}
        label="I'm ready →"
      />
    </div>
  )
}

// ─── Step 9: Done ─────────────────────────────────────────────────────────────

function StepDone({
  saving,
  saveFailed,
  onRetry,
}: {
  saving: boolean
  saveFailed: boolean
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="text-5xl mb-8 select-none">🌍</div>
      <h1 className="font-brice text-4xl font-bold text-[#131936] mb-4 leading-tight">
        Your Someday starts now.
      </h1>

      {saveFailed ? (
        <>
          <p className="font-nunito text-[#131936]/40 text-sm mb-8">Something went wrong saving your profile.</p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#f08c21] hover:bg-[#d97a1b] active:scale-95 px-8 py-4 font-brice font-bold text-white transition-all"
          >
            Try again
          </button>
        </>
      ) : (
        <>
          <p className="font-nunito text-[#131936]/60 text-lg mb-12">
            {saving ? 'Saving your profile…' : 'Heading in…'}
          </p>
          <div className="w-8 h-8 border-2 border-[#f08c21] border-t-transparent rounded-full animate-spin" />
        </>
      )}
    </div>
  )
}

// ─── Shared micro-components ──────────────────────────────────────────────────

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 font-nunito text-[#131936]/40 hover:text-[#131936]/70 transition-colors text-sm"
    >
      <span aria-hidden>←</span> Back
    </button>
  )
}

function NextBtn({
  onClick,
  disabled,
  label = 'Continue →',
}: {
  onClick: () => void
  disabled: boolean
  label?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-[#f08c21] hover:bg-[#d97a1b] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed px-6 py-4 font-brice font-bold text-white transition-all"
    >
      {label}
    </button>
  )
}
