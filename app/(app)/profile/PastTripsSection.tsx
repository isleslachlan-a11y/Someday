'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { addPastTrip, deletePastTrip } from '@/app/actions/onboarding'

interface PastTrip {
  id: string
  place_name: string
  country: string | null
  year: number | null
}

interface Props {
  trips: PastTrip[]
}

export default function PastTripsSection({ trips: initialTrips }: Props) {
  const [trips, setTrips] = useState(initialTrips)
  const [showAdd, setShowAdd] = useState(false)

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-syne font-bold text-white-soft">Past Trips</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs font-semibold text-lavender hover:text-white-soft transition-colors"
        >
          + Add
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center">
          <p className="text-muted text-sm">
            No past trips recorded.{' '}
            <button
              onClick={() => setShowAdd(true)}
              className="text-lavender hover:text-white-soft transition-colors"
            >
              Add one →
            </button>
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
          {trips.map(trip => (
            <TripRow
              key={trip.id}
              trip={trip}
              onDelete={id => setTrips(prev => prev.filter(t => t.id !== id))}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddTripModal
          onClose={() => setShowAdd(false)}
          onAdded={newTrip => {
            setTrips(prev => [newTrip, ...prev].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)))
            setShowAdd(false)
          }}
        />
      )}
    </section>
  )
}

// ─── Trip row ─────────────────────────────────────────────────────────────────

function TripRow({
  trip,
  onDelete,
}: {
  trip: PastTrip
  onDelete: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePastTrip(trip.id)
      if (result.error) {
        toast.error('Could not remove trip.')
        return
      }
      onDelete(trip.id)
    })
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-base select-none" aria-hidden>✈️</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white-soft truncate">{trip.place_name}</p>
        <p className="text-xs text-muted">
          {[trip.country, trip.year].filter(Boolean).join(' · ')}
        </p>
      </div>

      {confirmDelete ? (
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-pink-accent hover:text-pink-accent/80 font-semibold transition-colors"
          >
            {isPending ? '…' : 'Remove'}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-muted hover:text-white-soft transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-muted hover:text-white-soft text-lg transition-colors"
          aria-label="Remove trip"
        >
          ×
        </button>
      )}
    </div>
  )
}

// ─── Add trip modal ───────────────────────────────────────────────────────────

function AddTripModal({
  onClose,
  onAdded,
}: {
  onClose: () => void
  onAdded: (trip: PastTrip) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [placeName, setPlaceName] = useState('')
  const [country, setCountry] = useState('')
  const [year, setYear] = useState('')

  const INPUT_CLASS =
    'w-full rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3 text-white-soft placeholder:text-muted text-sm focus:outline-none focus:border-violet-accent/60 transition-colors'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!placeName.trim()) return

    const parsedYear = year ? parseInt(year, 10) : null
    if (year && (isNaN(parsedYear!) || parsedYear! < 1900 || parsedYear! > new Date().getFullYear())) {
      toast.error('Enter a valid year.')
      return
    }

    startTransition(async () => {
      const result = await addPastTrip({
        place_name: placeName,
        country: country || undefined,
        year: parsedYear,
      })

      if (result.error) {
        toast.error('Could not add trip.')
        return
      }

      onAdded({
        id: crypto.randomUUID(),
        place_name: placeName,
        country: country || null,
        year: parsedYear,
      })
      router.refresh()
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} aria-hidden />

      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[#13112a] border-t border-white/10 animate-slide-up">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-10">
          <h2 className="font-syne font-bold text-xl text-white-soft mb-5">Add Past Trip</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-muted font-semibold uppercase tracking-wider mb-1.5">
                Destination *
              </label>
              <input
                autoFocus
                value={placeName}
                onChange={e => setPlaceName(e.target.value)}
                placeholder="e.g. Kyoto, Japan"
                required
                className={INPUT_CLASS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted font-semibold uppercase tracking-wider mb-1.5">
                  Country
                </label>
                <input
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  placeholder="e.g. Japan"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs text-muted font-semibold uppercase tracking-wider mb-1.5">
                  Year
                </label>
                <input
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  placeholder={String(new Date().getFullYear())}
                  inputMode="numeric"
                  maxLength={4}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-muted hover:text-white-soft hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !placeName.trim()}
                className="flex-1 rounded-xl bg-violet-accent hover:bg-violet-accent/90 disabled:opacity-50 py-3 text-sm font-syne font-semibold text-white-soft transition-colors"
              >
                {isPending ? 'Adding…' : 'Add Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
