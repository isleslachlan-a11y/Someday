'use client'

import { useState, useEffect } from 'react'

// ── Social links — fill in handles ────────────────────────────────────────────

const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/',    // TODO: add handle
  tiktok:    'https://tiktok.com/@',      // TODO: add handle
  pinterest: 'https://pinterest.com/',    // TODO: add handle
  x:         'https://x.com/',            // TODO: add handle
}

// ── Social icons (inline SVG) ─────────────────────────────────────────────────

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.31 6.31 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.19 8.19 0 0 0 4.79 1.53V6.75a4.85 4.85 0 0 1-1.02-.06z" />
    </svg>
  )
}

function PinterestIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  )
}

function XIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function SocialRow({ compact = false }: { compact?: boolean }) {
  const iconSize = compact ? 18 : 22
  const btnClass = compact
    ? 'w-9 h-9 rounded-full border border-[rgba(252,217,154,0.5)] bg-white flex items-center justify-center text-[#131936]/50 hover:text-[#f08c21] hover:border-[#f08c21] transition-colors'
    : 'w-12 h-12 rounded-full border-2 border-[rgba(252,217,154,0.5)] bg-white flex items-center justify-center text-[#131936]/60 hover:text-[#f08c21] hover:border-[#f08c21] transition-colors'

  return (
    <div className={`flex items-center justify-center gap-${compact ? '3' : '4'}`}>
      <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" className={btnClass} aria-label="Instagram">
        <InstagramIcon size={iconSize} />
      </a>
      <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer" className={btnClass} aria-label="TikTok">
        <TikTokIcon size={iconSize} />
      </a>
      <a href={SOCIAL_LINKS.pinterest} target="_blank" rel="noopener noreferrer" className={btnClass} aria-label="Pinterest">
        <PinterestIcon size={iconSize} />
      </a>
      <a href={SOCIAL_LINKS.x} target="_blank" rel="noopener noreferrer" className={btnClass} aria-label="X (Twitter)">
        <XIcon size={iconSize} />
      </a>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WaitlistPage() {
  const [userName, setUserName]   = useState('')
  const [email, setEmail]         = useState('')
  const [emailError, setEmailError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [joined, setJoined]       = useState(false)
  const [placeCount, setPlaceCount] = useState<number | null>(null)

  // Suggestion form
  const [suggestionOpen, setSuggestionOpen]           = useState(false)
  const [placeName, setPlaceName]                     = useState('')
  const [submissionType, setSubmissionType]           = useState<'destination' | 'experience' | null>(null)
  const [mustDo, setMustDo]                           = useState('')
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false)
  const [suggestionDone, setSuggestionDone]           = useState(false)

  useEffect(() => {
    void fetch('/api/public/stats')
      .then(r => r.json())
      .then((d: { place_count: number }) => setPlaceCount(d.place_count))
      .catch(() => {})
  }, [])

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

  return (
    <div className="min-h-screen bg-[#fff9f0] flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-[480px]">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="text-[#f08c21] text-[48px] mb-5 select-none leading-none">✦</div>
          <h1 className="font-syne font-bold text-[#131936] text-[28px] leading-tight mb-3">
            The travel bucket list for people who actually go.
          </h1>
          <p className="font-nunito text-[rgba(19,25,54,0.55)] text-[15px] leading-relaxed">
            Someday is in early access. Join the list and we&apos;ll let you in as soon as spots open.
          </p>
        </div>

        {!joined ? (
          <>
            {/* ── Section A: Join ─────────────────────────────────────────── */}
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
                className="w-full rounded-2xl bg-[#f08c21] text-white font-syne font-bold text-[16px] px-8 py-4 disabled:opacity-40 transition-opacity active:scale-[0.98]"
              >
                {submitting ? 'Joining…' : 'Join the waitlist ✦'}
              </button>
            </div>

            {/* ── Section B: Optional suggestion ──────────────────────────── */}
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
                  <p className="font-syne font-bold text-[#f08c21] text-[14px] mb-1">✦ Noted.</p>
                  <p className="font-nunito text-[rgba(19,25,54,0.5)] text-[13px]">
                    We&apos;ll make sure {placeName} is in the catalogue.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── Section C: Success state ─────────────────────────────────── */
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-[#f08c21]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-[#f08c21] text-[28px] leading-none">✦</span>
              </div>
              <h2 className="font-syne font-bold text-[#131936] text-[22px] mb-2">
                You&apos;re on the list{userName ? `, ${userName.split(' ')[0]}` : ''}.
              </h2>
              <p className="font-nunito text-[rgba(19,25,54,0.55)] text-[14px]">
                We&apos;ll reach out as soon as early access opens.
              </p>
            </div>

            {/* Social follow — prominent in success state */}
            <div className="rounded-2xl border border-[rgba(252,217,154,0.5)] bg-white p-6 mb-5 text-center">
              <p className="font-syne font-bold text-[#131936] text-[15px] mb-1">Follow along while we build</p>
              <p className="font-nunito text-[rgba(19,25,54,0.5)] text-[13px] mb-5">
                Behind-the-scenes, new destinations, and early access news.
              </p>
              <SocialRow />
            </div>

            {/* Suggestion card */}
            {!suggestionDone ? (
              <div className="rounded-2xl border border-[rgba(252,217,154,0.5)] bg-white p-5">
                <p className="font-syne font-bold text-[#131936] text-[15px] mb-1">
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
                <p className="font-syne font-bold text-[#f08c21] text-[16px] mb-1">✦ Noted.</p>
                <p className="font-nunito text-[rgba(19,25,54,0.5)] text-[13px]">
                  We&apos;ll make sure {placeName} makes it into the catalogue.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Footer: stats + compact social ──────────────────────────────── */}
        <div className="mt-12 pt-8 border-t border-[rgba(252,217,154,0.5)] text-center space-y-5">
          {placeCount !== null && (
            <div>
              <p className="font-syne font-bold text-[#f08c21] text-[24px] leading-tight">
                {placeCount.toLocaleString()}
              </p>
              <p className="font-nunito text-[rgba(19,25,54,0.45)] text-[13px]">
                places in the catalogue — and growing
              </p>
            </div>
          )}
          <SocialRow compact />
          <p className="font-nunito text-[rgba(19,25,54,0.3)] text-[12px]">
            Built by travellers, for travellers.
          </p>
        </div>

      </div>
    </div>
  )
}
