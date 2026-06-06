'use client'

import { useState } from 'react'
import { SocialRow } from './SocialRow'

export function WaitlistForm() {
  const [userName, setUserName]     = useState('')
  const [email, setEmail]           = useState('')
  const [emailError, setEmailError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [joined, setJoined]         = useState(false)

  const [suggestionOpen, setSuggestionOpen]           = useState(false)
  const [placeName, setPlaceName]                     = useState('')
  const [submissionType, setSubmissionType]           = useState<'destination' | 'experience' | null>(null)
  const [mustDo, setMustDo]                           = useState('')
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false)
  const [suggestionDone, setSuggestionDone]           = useState(false)

  function validateEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  }

  async function handleJoin() {
    setEmailError('')
    if (!userName.trim() || !email.trim()) return
    if (!validateEmail(email.trim())) {
      setEmailError('Enter a valid email address.')
      return
    }
    setSubmitting(true)
    await fetch('/api/waitlist/suggest', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: userName.trim(), email: email.trim() }),
    })
    setSubmitting(false)
    setJoined(true)
  }

  async function handleSuggest() {
    if (!placeName.trim()) return
    setSuggestionSubmitting(true)
    await fetch('/api/waitlist/suggest', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        email:          email.trim() || null,
        placeName:      placeName.trim(),
        submissionType: submissionType ?? null,
        mustDo:         mustDo.trim() || null,
      }),
    })
    setSuggestionSubmitting(false)
    setSuggestionDone(true)
  }

  const canJoin    = userName.trim().length > 0 && email.trim().length > 0
  const canSuggest = placeName.trim().length > 1

  if (!joined) {
    return (
      <>
        {/* Section A: Join */}
        <div className="space-y-3 mb-5">
          <input
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="Your first name"
            className="w-full rounded-2xl bg-white border border-[rgba(252,217,154,0.5)] px-5 py-4 font-nunito text-[#131936] text-[15px] placeholder:text-[rgba(19,25,54,0.35)] focus:outline-none focus:border-[#f08c21] transition-colors"
          />
          <div>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError('') }}
              placeholder="your@email.com"
              className={`w-full rounded-2xl bg-white border px-5 py-4 font-nunito text-[#131936] text-[15px] placeholder:text-[rgba(19,25,54,0.35)] focus:outline-none transition-colors ${emailError ? 'border-red-400 focus:border-red-400' : 'border-[rgba(252,217,154,0.5)] focus:border-[#f08c21]'}`}
            />
            {emailError && (
              <p className="font-nunito text-[12px] text-red-500 mt-1.5 px-1">{emailError}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleJoin()}
            disabled={submitting || !canJoin}
            className="w-full rounded-2xl bg-[#f08c21] text-white font-brice font-bold text-[16px] px-8 py-4 disabled:opacity-40 transition-opacity active:scale-[0.98]"
          >
            {submitting ? 'Joining…' : 'Join the waitlist ✦'}
          </button>
        </div>

        {/* Section B: Optional suggestion */}
        <div className="rounded-2xl border border-[rgba(252,217,154,0.5)] bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setSuggestionOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left min-h-[56px]"
          >
            <span className="font-nunito font-semibold text-[#131936] text-[14px]">
              Know somewhere worth adding?
            </span>
            <span
              className="text-[#f08c21] text-[16px] transition-transform duration-200 shrink-0"
              style={{ transform: suggestionOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              ↓
            </span>
          </button>

          {suggestionOpen && !suggestionDone && (
            <div className="px-5 pb-5 space-y-4 border-t border-[rgba(252,217,154,0.5)]">
              <p className="font-nunito text-[rgba(19,25,54,0.45)] text-[12px] pt-3">
                Optional — this doesn&apos;t affect your place on the waitlist.
              </p>
              <div>
                <label className="font-nunito text-[12px] text-[rgba(19,25,54,0.5)] mb-1.5 block">
                  What&apos;s the place or experience?
                </label>
                <input
                  type="text"
                  value={placeName}
                  onChange={e => setPlaceName(e.target.value)}
                  placeholder="e.g. Chefchaouen, Morocco"
                  className="w-full rounded-xl bg-[#fff9f0] border border-[rgba(252,217,154,0.5)] px-4 py-3 font-nunito text-[#131936] text-[14px] placeholder:text-[rgba(19,25,54,0.3)] focus:outline-none focus:border-[#f08c21] transition-colors"
                />
              </div>
              <div>
                <label className="font-nunito text-[12px] text-[rgba(19,25,54,0.5)] mb-2 block">
                  Is it a destination or a specific experience?
                </label>
                <div className="flex gap-2">
                  {(['destination', 'experience'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSubmissionType(t)}
                      className={`flex-1 py-2.5 rounded-xl font-nunito font-semibold text-[13px] border transition-all ${submissionType === t ? 'bg-[#f08c21] text-white border-[#f08c21]' : 'bg-white text-[rgba(19,25,54,0.55)] border-[rgba(252,217,154,0.5)] hover:border-[#f08c21]/60'}`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-nunito text-[12px] text-[rgba(19,25,54,0.5)] mb-1.5 block">
                  The one thing everyone should do there:
                </label>
                <textarea
                  value={mustDo}
                  onChange={e => setMustDo(e.target.value)}
                  placeholder="e.g. Hike to the blue gates at sunrise before the crowds arrive"
                  rows={3}
                  maxLength={200}
                  className="w-full rounded-xl bg-[#fff9f0] border border-[rgba(252,217,154,0.5)] px-4 py-3 font-nunito text-[#131936] text-[14px] placeholder:text-[rgba(19,25,54,0.3)] focus:outline-none focus:border-[#f08c21] transition-colors resize-none"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleSuggest()}
                disabled={!canSuggest || suggestionSubmitting}
                className="w-full py-3 rounded-xl bg-[#131936] text-white font-nunito font-semibold text-[14px] disabled:opacity-40 transition-opacity"
              >
                {suggestionSubmitting ? 'Submitting…' : 'Submit suggestion →'}
              </button>
            </div>
          )}

          {suggestionOpen && suggestionDone && (
            <div className="px-5 pb-5 pt-4 border-t border-[rgba(252,217,154,0.5)] text-center">
              <p className="font-brice font-bold text-[#f08c21] text-[14px] mb-1">✦ Noted.</p>
              <p className="font-nunito text-[rgba(19,25,54,0.5)] text-[13px]">
                We&apos;ll make sure {placeName} is in the catalogue.
              </p>
            </div>
          )}
        </div>
      </>
    )
  }

  // Section C: Success state
  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-[#f08c21]/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-[#f08c21] text-[28px] leading-none">✦</span>
        </div>
        <h2 className="font-brice font-bold text-[#131936] text-[22px] mb-2">
          You&apos;re on the list{userName ? `, ${userName.split(' ')[0]}` : ''}.
        </h2>
        <p className="font-nunito text-[rgba(19,25,54,0.55)] text-[14px]">
          We&apos;ll reach out as soon as early access opens.
        </p>
      </div>

      <div className="rounded-2xl border border-[rgba(252,217,154,0.5)] bg-white p-6 mb-5 text-center">
        <p className="font-brice font-bold text-[#131936] text-[15px] mb-1">Follow along while we build</p>
        <p className="font-nunito text-[rgba(19,25,54,0.5)] text-[13px] mb-5">
          Behind-the-scenes, new destinations, and early access news.
        </p>
        <SocialRow />
      </div>

      {!suggestionDone ? (
        <div className="rounded-2xl border border-[rgba(252,217,154,0.5)] bg-white p-5">
          <p className="font-brice font-bold text-[#131936] text-[15px] mb-1">
            Know somewhere worth adding?
          </p>
          <p className="font-nunito text-[rgba(19,25,54,0.5)] text-[12px] mb-4">
            Help us build the catalogue — optional.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={placeName}
              onChange={e => setPlaceName(e.target.value)}
              placeholder="e.g. Chefchaouen, Morocco"
              className="w-full rounded-xl bg-[#fff9f0] border border-[rgba(252,217,154,0.5)] px-4 py-3 font-nunito text-[#131936] text-[14px] placeholder:text-[rgba(19,25,54,0.3)] focus:outline-none focus:border-[#f08c21] transition-colors"
            />
            <div className="flex gap-2">
              {(['destination', 'experience'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSubmissionType(t)}
                  className={`flex-1 py-2.5 rounded-xl font-nunito font-semibold text-[13px] border transition-all ${submissionType === t ? 'bg-[#f08c21] text-white border-[#f08c21]' : 'bg-white text-[rgba(19,25,54,0.55)] border-[rgba(252,217,154,0.5)]'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <textarea
              value={mustDo}
              onChange={e => setMustDo(e.target.value)}
              placeholder="The one thing everyone should do there…"
              rows={2}
              maxLength={200}
              className="w-full rounded-xl bg-[#fff9f0] border border-[rgba(252,217,154,0.5)] px-4 py-3 font-nunito text-[#131936] text-[14px] placeholder:text-[rgba(19,25,54,0.3)] focus:outline-none focus:border-[#f08c21] transition-colors resize-none"
            />
            <button
              type="button"
              onClick={() => void handleSuggest()}
              disabled={!canSuggest || suggestionSubmitting}
              className="w-full py-3 rounded-xl bg-[#131936] text-white font-nunito font-semibold text-[14px] disabled:opacity-40 transition-opacity"
            >
              {suggestionSubmitting ? 'Submitting…' : 'Submit →'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[rgba(252,217,154,0.5)] bg-white p-5 text-center">
          <p className="font-brice font-bold text-[#f08c21] text-[16px] mb-1">✦ Noted.</p>
          <p className="font-nunito text-[rgba(19,25,54,0.5)] text-[13px]">
            We&apos;ll make sure {placeName} makes it into the catalogue.
          </p>
        </div>
      )}
    </div>
  )
}
