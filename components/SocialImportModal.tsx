'use client'

import { useState, useTransition } from 'react'
import { X, Link, Loader2, CheckCircle, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { importPlaceFromUrl } from '@/app/(app)/discover/actions/importPlace'
import type { ExtractedPlace } from '@/lib/socialImport'

interface SocialImportModalProps {
  isOpen: boolean
  onClose: () => void
}

type ImportResult = {
  status: string
  placeId?: string
  placeName?: string
  place?: ExtractedPlace
  message?: string
}

export function SocialImportModal({ isOpen, onClose }: SocialImportModalProps) {
  const [url, setUrl] = useState('')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<ImportResult | null>(null)
  const router = useRouter()

  const detectedPlatform = url.includes('tiktok.com')
    ? 'TikTok'
    : url.includes('pinterest.com') || url.includes('pin.it')
    ? 'Pinterest'
    : null

  function handleImport() {
    if (!url.trim()) return
    startTransition(async () => {
      const res = await importPlaceFromUrl(url.trim())
      setResult(res)
    })
  }

  function handleClose() {
    setUrl('')
    setResult(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#131936]/40 z-40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet — bottom on mobile, centred on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#fff9f0] rounded-t-2xl
                      p-6 pb-10 max-w-[480px] mx-auto shadow-xl
                      md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-2xl md:pb-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-syne font-semibold text-[#131936] text-lg leading-tight">
              Import from TikTok or Pinterest
            </h2>
            <p className="font-nunito text-[#131936]/60 text-sm mt-0.5">
              Paste a post URL to save the location
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       bg-[#131936]/[0.08] hover:bg-[#131936]/[0.12] transition-colors"
          >
            <X size={16} className="text-[#131936]" />
          </button>
        </div>

        {/* Input + button */}
        {!result && (
          <div className="space-y-3">
            <div className="relative">
              <Link size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#131936]/40" />
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleImport()}
                placeholder="https://www.tiktok.com/..."
                disabled={isPending}
                className="w-full pl-9 pr-4 py-3 rounded-full border border-[#fcd99a]
                           bg-white font-nunito text-[#131936] text-sm
                           placeholder:text-[#131936]/40
                           focus:outline-none focus:ring-2 focus:ring-[#f89a14]/40
                           disabled:opacity-50"
              />
            </div>

            {detectedPlatform && (
              <p className="font-nunito text-sm text-[#131936]/70 pl-1">
                ✓ {detectedPlatform} link detected
              </p>
            )}

            <button
              onClick={handleImport}
              disabled={isPending || !url.trim() || !detectedPlatform}
              className="w-full py-3 rounded-full bg-[#f89a14] text-white
                         font-nunito font-semibold text-sm
                         hover:bg-[#e07010] transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Finding location...
                </>
              ) : 'Import place'}
            </button>
          </div>
        )}

        {/* Matched */}
        {result?.status === 'matched' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-[#fcd99a]/30 border border-[#fcd99a]">
              <CheckCircle size={20} className="text-[#f89a14] mt-0.5 shrink-0" />
              <div>
                <p className="font-syne font-semibold text-[#131936] text-sm">
                  {result.placeName}
                </p>
                <p className="font-nunito text-[#131936]/60 text-xs mt-0.5">
                  Already in Someday
                </p>
              </div>
            </div>
            <button
              onClick={() => { router.push(`/places/${result.placeId}`); handleClose() }}
              className="w-full py-3 rounded-full bg-[#f89a14] text-white
                         font-nunito font-semibold text-sm hover:bg-[#e07010] transition-colors"
            >
              View place
            </button>
          </div>
        )}

        {/* New or low-confidence */}
        {(result?.status === 'new' || result?.status === 'low_confidence') && result.place && (
          <div className="space-y-4">
            {result.status === 'low_confidence' && (
              <p className="font-nunito text-sm text-[#131936]/70 bg-[#fcd99a]/30
                            rounded-xl px-4 py-2.5 border border-[#fcd99a]">
                We&apos;re not 100% sure — does this look right?
              </p>
            )}
            <div className="p-4 rounded-xl border border-[#fcd99a] bg-white space-y-1.5">
              <p className="font-syne font-semibold text-[#131936]">
                {result.place.name}
              </p>
              {(result.place.city || result.place.country) && (
                <p className="font-nunito text-[#131936]/60 text-sm flex items-center gap-1">
                  <MapPin size={12} />
                  {[result.place.city, result.place.country].filter(Boolean).join(', ')}
                </p>
              )}
              {result.place.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.place.tags.slice(0, 4).map(tag => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full bg-[#fcd99a]/50
                                 font-nunito text-xs text-[#131936]/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-full border border-[#131936]/20
                           font-nunito font-medium text-sm text-[#131936]/70
                           hover:bg-[#131936]/5 transition-colors"
              >
                Not right
              </button>
              <button
                onClick={() => {
                  const p = result.place!
                  const params = new URLSearchParams({
                    import: 'true',
                    name: p.name,
                    ...(p.city ? { city: p.city } : {}),
                    ...(p.country ? { country: p.country } : {}),
                    ...(p.lat != null ? { lat: String(p.lat) } : {}),
                    ...(p.lng != null ? { lng: String(p.lng) } : {}),
                    source: p.sourceUrl,
                    platform: p.sourcePlatform,
                  })
                  router.push(`/places/new?${params.toString()}`)
                  handleClose()
                }}
                className="flex-1 py-3 rounded-full bg-[#f89a14] text-white
                           font-nunito font-semibold text-sm
                           hover:bg-[#e07010] transition-colors"
              >
                Save to Someday
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {result?.status === 'error' && (
          <div className="space-y-3">
            <p className="font-nunito text-sm text-red-600 bg-red-50 rounded-xl
                          px-4 py-3 border border-red-100">
              {result.message}
            </p>
            <button
              onClick={() => setResult(null)}
              className="w-full py-3 rounded-full border border-[#131936]/20
                         font-nunito font-medium text-sm text-[#131936]/70
                         hover:bg-[#131936]/5 transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </>
  )
}
