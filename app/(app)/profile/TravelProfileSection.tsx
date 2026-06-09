'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { updateTravelProfile } from '@/app/actions/onboarding'

// ─── Label maps ───────────────────────────────────────────────────────────────

const COMFORT_LABEL: Record<string, string> = {
  low:    'Low key',
  medium: 'Moderate',
  high:   'High intensity',
}

const BUDGET_LABEL: Record<string, string> = {
  budget:  'Budget',
  mid:     'Mid-range',
  luxury:  'Luxury',
}

const GROUP_LABEL: Record<string, string> = {
  solo:    'Solo',
  partner: 'Partner',
  friends: 'Friends',
  family:  'Family',
  mixed:   'Mixed',
}

const FREQ_LABEL: Record<string, string> = {
  rarely:    'Rarely',
  sometimes: 'Sometimes',
  often:     'Often',
}

// ─── Onboarding answer options (mirrors OnboardingFlow) ──────────────────────

const TRAVEL_STYLES = [
  'Adventure', 'Culture', 'Foodie', 'Beach', 'City break', 'Nature',
  'Luxury', 'Budget', 'Solo', 'Family', 'Party', 'Wellness',
]

const GROUP_OPTIONS = ['solo', 'partner', 'friends', 'family', 'mixed'] as const
const BUDGET_OPTIONS = ['budget', 'mid', 'luxury'] as const
const COMFORT_OPTIONS = ['low', 'medium', 'high'] as const

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserContext {
  travel_style: string[] | null
  comfort_zone: string | null
  budget_range: string | null
  travel_frequency: string | null
  group_preference: string | null
}

interface Props {
  context: UserContext | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TravelProfileSection({ context }: Props) {
  const [showEdit, setShowEdit] = useState(false)

  const hasAnyData =
    context &&
    (
      (context.travel_style?.length ?? 0) > 0 ||
      context.comfort_zone ||
      context.budget_range ||
      context.group_preference
    )

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-syne font-bold text-[#131936]">Travel Profile</h2>
        <button
          onClick={() => setShowEdit(true)}
          className="text-xs font-semibold text-[#f89a14] hover:text-[#131936] transition-colors"
        >
          {hasAnyData ? 'Edit' : 'Set up'}
        </button>
      </div>

      {!hasAnyData ? (
        <div className="rounded-2xl border border-dashed border-[#fcd99a]/50 p-5 text-center">
          <p className="text-[#131936]/50 text-sm">
            Tell us how you travel.{' '}
            <button
              onClick={() => setShowEdit(true)}
              className="text-[#f89a14] hover:text-[#131936] transition-colors"
            >
              Set up your travel profile →
            </button>
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#fcd99a]/40 bg-white p-4 space-y-3">
          {/* Travel style tags */}
          {context!.travel_style && context!.travel_style.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {context!.travel_style.map(tag => (
                <span
                  key={tag}
                  className="rounded-full bg-[#f89a14]/10 border border-[#f89a14]/25 px-3 py-1 text-xs font-semibold text-[#f89a14]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Attribute chips */}
          <div className="flex gap-2 flex-wrap">
            {context!.group_preference && (
              <Chip label={GROUP_LABEL[context!.group_preference] ?? context!.group_preference} />
            )}
            {context!.budget_range && (
              <Chip label={BUDGET_LABEL[context!.budget_range] ?? context!.budget_range} />
            )}
            {context!.comfort_zone && (
              <Chip label={COMFORT_LABEL[context!.comfort_zone] ?? context!.comfort_zone} />
            )}
          </div>
        </div>
      )}

      {showEdit && (
        <EditModal
          initial={context ?? {
            travel_style: [],
            comfort_zone: null,
            budget_range: null,
            travel_frequency: null,
            group_preference: null,
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </section>
  )
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-white border border-[#fcd99a]/40 px-3 py-1 text-xs font-semibold text-[#131936]/50">
      {label}
    </span>
  )
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditModal({
  initial,
  onClose,
}: {
  initial: UserContext
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [travelStyle, setTravelStyle] = useState<string[]>(initial.travel_style ?? [])
  const [group, setGroup] = useState(initial.group_preference ?? '')
  const [budget, setBudget] = useState(initial.budget_range ?? '')
  const [comfort, setComfort] = useState(initial.comfort_zone ?? '')

  function toggleStyle(tag: string) {
    setTravelStyle(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : prev.length < 5
        ? [...prev, tag]
        : prev
    )
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateTravelProfile({
        travel_style: travelStyle,
        group_preference: group || null,
        budget_range: budget || null,
        comfort_zone: comfort || null,
      })

      if (result.error) {
        toast.error('Could not save changes.')
        return
      }

      toast.success('Travel profile updated.')
      onClose()
      router.refresh()
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} aria-hidden />

      {/* Modal sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[#fff9f0] border-t border-[#fcd99a]/40 animate-slide-up max-h-[88dvh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#131936]/20" />
        </div>

        <div className="px-5 pb-10">
          <h2 className="font-syne font-bold text-xl text-[#131936] mb-6">Travel Profile</h2>

          {/* Travel style */}
          <div className="mb-6">
            <p className="text-xs text-[#131936]/50 font-semibold uppercase tracking-wider mb-3">
              Travel style{' '}
              <span className="normal-case font-normal tracking-normal text-[#131936]/30">
                (up to 5)
              </span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {TRAVEL_STYLES.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleStyle(tag)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    travelStyle.includes(tag)
                      ? 'border-[#f89a14]/50 bg-[#f89a14]/10 text-[#f89a14]'
                      : 'border-[#fcd99a]/40 bg-white text-[#131936]/50 hover:border-[#fcd99a]/60 hover:text-[#131936]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Group preference */}
          <div className="mb-6">
            <p className="text-xs text-[#131936]/50 font-semibold uppercase tracking-wider mb-3">
              I usually travel
            </p>
            <div className="flex gap-2 flex-wrap">
              {GROUP_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setGroup(g => g === opt ? '' : opt)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    group === opt
                      ? 'border-[#f89a14]/50 bg-[#f89a14]/10 text-[#f89a14]'
                      : 'border-[#fcd99a]/40 bg-white text-[#131936]/50 hover:border-[#fcd99a]/60 hover:text-[#131936]'
                  }`}
                >
                  {GROUP_LABEL[opt]}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className="mb-6">
            <p className="text-xs text-[#131936]/50 font-semibold uppercase tracking-wider mb-3">Budget</p>
            <div className="flex gap-2 flex-wrap">
              {BUDGET_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setBudget(b => b === opt ? '' : opt)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    budget === opt
                      ? 'border-[#f89a14]/50 bg-[#f89a14]/10 text-[#f89a14]'
                      : 'border-[#fcd99a]/40 bg-white text-[#131936]/50 hover:border-[#fcd99a]/60 hover:text-[#131936]'
                  }`}
                >
                  {BUDGET_LABEL[opt]}
                </button>
              ))}
            </div>
          </div>

          {/* Comfort zone */}
          <div className="mb-8">
            <p className="text-xs text-[#131936]/50 font-semibold uppercase tracking-wider mb-3">
              Comfort zone
            </p>
            <div className="flex gap-2 flex-wrap">
              {COMFORT_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setComfort(c => c === opt ? '' : opt)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    comfort === opt
                      ? 'border-[#f89a14]/50 bg-[#f89a14]/10 text-[#f89a14]'
                      : 'border-[#fcd99a]/40 bg-white text-[#131936]/50 hover:border-[#fcd99a]/60 hover:text-[#131936]'
                  }`}
                >
                  {COMFORT_LABEL[opt]}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#fcd99a]/40 py-3 text-sm font-semibold text-[#131936]/50 hover:text-[#131936] hover:border-[#fcd99a]/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 rounded-xl bg-[#f89a14] hover:bg-[#f89a14]/90 disabled:opacity-50 py-3 text-sm font-syne font-semibold text-[#131936] transition-colors"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
