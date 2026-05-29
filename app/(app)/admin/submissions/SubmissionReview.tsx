'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  adminApproveSubmission,
  adminRejectSubmission,
  adminRevertSubmission,
} from '@/app/actions/adminSubmissions'
import type { Submission } from './page'

// ── Constants ─────────────────────────────────────────────────────────────────

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all'
type KindFilter   = 'all' | 'destination' | 'experience'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all',      label: 'All' },
]

const TYPE_ICON: Record<string, string> = {
  destination: '🗺',
  experience:  '✨',
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  submissions: Submission[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubmissionReview({ submissions: initial }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>(initial)
  const [filter, setFilter]           = useState<StatusFilter>('pending')
  const [kindFilter, setKindFilter]   = useState<KindFilter>('all')
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNote, setRejectNote]   = useState('')
  const [loadingId, setLoadingId]     = useState<string | null>(null)

  const filtered = submissions.filter(s => {
    const matchesStatus = filter === 'all' || s.status === filter
    const matchesKind   = kindFilter === 'all' || (s.submission_kind ?? s.type) === kindFilter
    return matchesStatus && matchesKind
  })

  const counts = {
    pending:  submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
    all:      submissions.length,
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleApprove(sub: Submission) {
    setLoadingId(sub.id)
    const result = await adminApproveSubmission(sub.id)
    setLoadingId(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      setSubmissions(prev => prev.map(s =>
        s.id === sub.id ? { ...s, status: 'approved' } : s
      ))
      setExpandedId(null)
      toast.success(`"${sub.name}" approved and added to database ✦`)
    }
  }

  async function handleReject(sub: Submission) {
    setLoadingId(sub.id)
    const result = await adminRejectSubmission(sub.id, rejectNote)
    setLoadingId(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      setSubmissions(prev => prev.map(s =>
        s.id === sub.id
          ? { ...s, status: 'rejected', reviewer_notes: rejectNote || null }
          : s
      ))
      setRejectingId(null)
      setRejectNote('')
      setExpandedId(null)
      toast.success(`"${sub.name}" rejected`)
    }
  }

  async function handleRevert(sub: Submission) {
    setLoadingId(sub.id)
    const result = await adminRevertSubmission(sub.id)
    setLoadingId(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      setSubmissions(prev => prev.map(s =>
        s.id === sub.id
          ? { ...s, status: 'pending', reviewer_notes: null, reviewed_at: null }
          : s
      ))
      toast.success('Reverted to pending')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>

      {/* Kind filter */}
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none">
        {(['all', 'destination', 'experience'] as KindFilter[]).map(k => (
          <button
            key={k}
            onClick={() => setKindFilter(k)}
            className={`shrink-0 px-3 py-1 rounded-full border font-nunito text-[12px] font-medium transition-all capitalize ${
              kindFilter === k
                ? 'bg-[#131936] border-[#131936] text-white'
                : 'bg-white border-[#fcd99a] text-[#131936]/60'
            }`}
          >
            {k === 'all' ? 'All types' : k === 'destination' ? '🗺 Destinations' : '✨ Experiences'}
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5
              rounded-full border font-nunito text-[12px] font-medium
              transition-all ${
              filter === f.value
                ? 'bg-[#f08c21] border-[#f08c21] text-white'
                : 'bg-white border-[#fcd99a] text-[#131936]/60'
            }`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              filter === f.value
                ? 'bg-white/20 text-white'
                : 'bg-[#fcd99a]/50 text-[#131936]'
            }`}>
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[32px] mb-3">✦</p>
          <p className="font-syne font-bold text-[#131936] text-[16px]">
            {filter === 'pending' ? 'All caught up' : 'Nothing here'}
          </p>
          <p className="font-nunito text-[#131936]/40 text-[13px] mt-1">
            {filter === 'pending'
              ? 'No submissions waiting for review'
              : `No ${filter} submissions`}
          </p>
        </div>
      )}

      {/* Submission cards */}
      <div className="space-y-3">
        {filtered.map(sub => {
          const isExpanded  = expandedId === sub.id
          const isRejecting = rejectingId === sub.id
          const isLoading   = loadingId === sub.id
          const date = new Date(sub.submitted_at).toLocaleDateString('en-AU', {
            day: 'numeric', month: 'short', year: 'numeric',
          })

          return (
            <div key={sub.id} className="bg-white rounded-2xl border border-[#fcd99a]/40 overflow-hidden">

              {/* Header row */}
              <button
                className="w-full text-left p-4 flex items-start gap-3"
                onClick={() => setExpandedId(isExpanded ? null : sub.id)}
              >
                {/* Photo or type icon */}
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#fcd99a]/30 flex items-center justify-center">
                  {sub.photo_url ?? sub.image_url ? (
                    <Image
                      src={(sub.photo_url ?? sub.image_url)!}
                      alt={sub.name}
                      width={56}
                      height={56}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-[22px]">{TYPE_ICON[sub.type ?? ''] ?? '✦'}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-syne font-bold text-[#131936] text-[15px] leading-tight">
                      {sub.name}
                    </p>
                    <StatusBadge status={sub.status} />
                  </div>
                  <p className="font-nunito text-[#131936]/50 text-[12px] mt-0.5">
                    {[sub.country, sub.region].filter(Boolean).join(' · ')}
                  </p>
                  <p className="font-nunito text-[#131936]/30 text-[11px] mt-1">
                    {sub.submitter_username ? `@${sub.submitter_username} · ` : ''}
                    {date}
                  </p>
                </div>

                {/* Chevron */}
                <div className="shrink-0 mt-1">
                  {isExpanded
                    ? <ChevronUp size={16} className="text-[#131936]/30" />
                    : <ChevronDown size={16} className="text-[#131936]/30" />
                  }
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-[#fcd99a]/30 px-4 pt-4 pb-5 space-y-4">

                  {/* Kind + parent info */}
                  {(sub.submission_kind || sub.parent_place_id || sub.extra_metadata) && (
                    <div className="flex flex-wrap gap-2">
                      {sub.submission_kind && (
                        <span className="px-2.5 py-1 rounded-full bg-[#fcd99a]/40 font-nunito text-[11px] text-[#131936] capitalize">
                          {TYPE_ICON[sub.submission_kind]} {sub.submission_kind}
                        </span>
                      )}
                      {!!sub.extra_metadata?.duration && (
                        <span className="px-2.5 py-1 rounded-full bg-[#fcd99a]/40 font-nunito text-[11px] text-[#131936]">
                          ⏱ {String(sub.extra_metadata.duration)}
                        </span>
                      )}
                      {!!sub.extra_metadata?.needs_booking && (
                        <span className="px-2.5 py-1 rounded-full bg-[#fcd99a]/40 font-nunito text-[11px] text-[#131936]">
                          📅 Needs booking
                        </span>
                      )}
                    </div>
                  )}

                  {/* Hinge answers */}
                  <div className="space-y-3">
                    {sub.description && (
                      <AnswerBlock q="Why it belongs on Someday" a={sub.description} />
                    )}
                    {sub.must_do && (
                      <AnswerBlock q="The one thing everyone must do here" a={sub.must_do} />
                    )}
                    {sub.hidden_gem && (
                      <AnswerBlock q="Best kept secret" a={sub.hidden_gem} />
                    )}
                    {sub.not_for_you && (
                      <AnswerBlock q="Don't come here if you hate…" a={sub.not_for_you} />
                    )}
                    {sub.best_time && (
                      <AnswerBlock q="Best time to visit" a={sub.best_time} />
                    )}
                  </div>

                  {/* Vibes */}
                  {sub.vibe_tags && sub.vibe_tags.length > 0 && (
                    <div>
                      <p className="font-nunito text-[10px] text-[#131936]/40 uppercase tracking-wider mb-2">
                        Vibes
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {sub.vibe_tags.map(v => (
                          <span key={v} className="px-2.5 py-1 rounded-full bg-[#fcd99a]/40 font-nunito text-[12px] text-[#131936]">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reviewer note (rejected) */}
                  {sub.status === 'rejected' && sub.reviewer_notes && (
                    <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
                      <p className="font-nunito text-[11px] text-red-400 uppercase tracking-wider mb-1">
                        Reviewer note
                      </p>
                      <p className="font-nunito text-[13px] text-red-600">
                        {sub.reviewer_notes}
                      </p>
                    </div>
                  )}

                  {/* Reject note input */}
                  {isRejecting && (
                    <textarea
                      id={`reject-note-${sub.id}`}
                      name={`reject-note-${sub.id}`}
                      rows={2}
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      placeholder="Optional note to the submitter…"
                      className="w-full rounded-xl border border-[#fcd99a] bg-white px-3 py-2.5 font-nunito text-[13px] text-[#131936] placeholder:text-[#131936]/30 focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30 resize-none"
                    />
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    {sub.status === 'pending' && (
                      <>
                        <button
                          onClick={() => void handleApprove(sub)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-full bg-[#131936] text-white font-syne font-bold text-[13px] disabled:opacity-50 transition-opacity"
                        >
                          <CheckCircle size={15} />
                          {isLoading ? 'Adding…' : 'Approve'}
                        </button>

                        {isRejecting ? (
                          <>
                            <button
                              onClick={() => void handleReject(sub)}
                              disabled={isLoading}
                              className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-full bg-red-500 text-white font-syne font-bold text-[13px] disabled:opacity-50"
                            >
                              <XCircle size={15} />
                              {isLoading ? 'Rejecting…' : 'Confirm reject'}
                            </button>
                            <button
                              onClick={() => { setRejectingId(null); setRejectNote('') }}
                              className="h-11 px-4 rounded-full border border-[#fcd99a] bg-white font-nunito text-[13px] text-[#131936]"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setRejectingId(sub.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-full border border-red-200 bg-red-50 text-red-500 font-syne font-bold text-[13px]"
                          >
                            <XCircle size={15} />
                            Reject
                          </button>
                        )}
                      </>
                    )}

                    {(sub.status === 'approved' || sub.status === 'rejected') && (
                      <button
                        onClick={() => void handleRevert(sub)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-4 h-10 rounded-full border border-[#fcd99a] bg-white font-nunito text-[12px] text-[#131936]/50 disabled:opacity-40 hover:text-[#131936] transition-colors"
                      >
                        <RotateCcw size={13} />
                        {isLoading ? 'Reverting…' : 'Revert to pending'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:  'bg-[#fcd99a]/40 text-[#131936]/60',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    rejected: 'bg-red-50 text-red-500 border border-red-200',
  }
  const labels: Record<string, string> = {
    pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full font-nunito text-[10px] font-semibold ${styles[status] ?? styles.pending}`}>
      {labels[status] ?? status}
    </span>
  )
}

function AnswerBlock({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl bg-[#fff9f0] border border-[#fcd99a]/40 px-3 py-3">
      <p className="font-nunito text-[10px] text-[#131936]/40 uppercase tracking-wider mb-1">
        {q}
      </p>
      <p className="font-nunito text-[14px] text-[#131936] leading-relaxed">
        {a}
      </p>
    </div>
  )
}
