'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { submitPlace } from '@/app/actions/submissions'

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_CLASS =
  'w-full rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3 text-white-soft placeholder:text-muted text-sm focus:outline-none focus:border-violet-accent/60 transition-colors'

const LABEL_CLASS = 'block text-xs text-muted font-semibold uppercase tracking-wider mb-1.5'

const PLACE_TYPES = [
  { value: 'city',       label: 'City',          icon: '🏙' },
  { value: 'nature',     label: 'Nature',         icon: '🌿' },
  { value: 'experience', label: 'Experience',     icon: '✨' },
  { value: 'food',       label: 'Food & Drink',   icon: '🍜' },
] as const

const REGIONS = ['Asia', 'Europe', 'Americas', 'Africa', 'Oceania'] as const

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubmitForm({ userId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitted, setSubmitted] = useState(false)

  const [name, setName] = useState('')
  const [type, setType] = useState<string>('')
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState<string>('')
  const [description, setDescription] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Photo must be under 10 MB.')
      return
    }

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      let image_url: string | null = null

      // Upload photo if provided
      if (photoFile) {
        const supabase = createClient()
        const ext = photoFile.name.split('.').pop() ?? 'jpg'
        const filename = `${Date.now()}.${ext}`
        const path = `${userId}/${filename}`

        const { error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(path, photoFile, { upsert: false })

        if (uploadError) {
          toast.error('Photo upload failed. Submitting without it.')
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('submissions')
            .getPublicUrl(path)
          image_url = publicUrl
        }
      }

      // Parse tags: split by comma, trim, drop empty
      const tags = tagsRaw
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      const result = await submitPlace({
        name,
        type,
        country,
        region,
        description,
        tags,
        image_url,
      })

      if (result.error) {
        toast.error('Could not submit. Please try again.')
        return
      }

      setSubmitted(true)
      router.refresh()
    })
  }

  // ── Success state ───────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="rounded-2xl border border-violet-accent/25 bg-violet-accent/5 p-8 text-center">
        <p className="text-2xl mb-3">✦</p>
        <p className="font-syne font-bold text-white-soft text-lg mb-2">Submitted</p>
        <p className="text-muted text-sm mb-6">
          We'll review it and let you know. Great submissions make it into the database.
        </p>
        <button
          onClick={() => {
            setSubmitted(false)
            setName('')
            setType('')
            setCountry('')
            setRegion('')
            setDescription('')
            setTagsRaw('')
            setPhotoFile(null)
            setPhotoPreview(null)
          }}
          className="text-sm font-semibold text-lavender hover:text-white-soft transition-colors"
        >
          Submit another
        </button>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Name */}
      <div>
        <label htmlFor="name" className={LABEL_CLASS}>
          Name <span className="text-pink-accent normal-case font-normal tracking-normal">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Faroe Islands, Omakase at Sukiyabashi Jiro…"
          className={INPUT_CLASS}
        />
      </div>

      {/* Type */}
      <div>
        <span className={LABEL_CLASS}>Type</span>
        <div className="grid grid-cols-4 gap-2">
          {PLACE_TYPES.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(prev => prev === opt.value ? '' : opt.value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-colors ${
                type === opt.value
                  ? 'border-violet-accent/50 bg-violet-accent/15 text-lavender'
                  : 'border-white/10 bg-white/[0.03] text-muted hover:border-white/25 hover:text-white-soft'
              }`}
            >
              <span className="text-lg" aria-hidden>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Country + Region */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="country" className={LABEL_CLASS}>
            Country <span className="text-pink-accent normal-case font-normal tracking-normal">*</span>
          </label>
          <input
            id="country"
            type="text"
            required
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="e.g. Japan"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="region" className={LABEL_CLASS}>Region</label>
          <select
            id="region"
            value={region}
            onChange={e => setRegion(e.target.value)}
            className={`${INPUT_CLASS} appearance-none`}
          >
            <option value="" disabled>Select…</option>
            {REGIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description / Why it belongs */}
      <div>
        <label htmlFor="description" className={LABEL_CLASS}>
          Why it belongs on Someday{' '}
          <span className="text-pink-accent normal-case font-normal tracking-normal">*</span>
        </label>
        <textarea
          id="description"
          required
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What makes this place worth a spot in the catalogue? What's the experience like, who's it for, why would someone dream of going here?"
          className={`${INPUT_CLASS} resize-none`}
        />
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className={LABEL_CLASS}>Tags</label>
        <input
          id="tags"
          type="text"
          value={tagsRaw}
          onChange={e => setTagsRaw(e.target.value)}
          placeholder="e.g. hiking, remote, off-grid, winter (comma separated)"
          className={INPUT_CLASS}
        />
        {tagsRaw.trim() && (
          <div className="flex gap-1.5 flex-wrap mt-2">
            {tagsRaw.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
              <span
                key={tag}
                className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-lavender"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Photo */}
      <div>
        <span className={LABEL_CLASS}>Photo</span>

        {photoPreview ? (
          <div className="relative rounded-xl overflow-hidden border border-white/10">
            <div className="relative h-44 w-full">
              <Image
                src={photoPreview}
                alt="Preview"
                fill
                className="object-cover"
              />
            </div>
            <button
              type="button"
              onClick={removePhoto}
              className="absolute top-2 right-2 rounded-full bg-black/60 text-white-soft hover:bg-black/80 w-7 h-7 flex items-center justify-center text-sm transition-colors"
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:border-violet-accent/40 hover:bg-white/[0.04] py-8 text-center transition-colors group"
          >
            <p className="text-2xl mb-2" aria-hidden>📷</p>
            <p className="text-sm font-semibold text-muted group-hover:text-white-soft transition-colors">
              Add a photo
            </p>
            <p className="text-xs text-muted mt-0.5">Optional · up to 10 MB</p>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted leading-relaxed">
        This is a curation submission, not a post. Your suggestion goes to our review queue — it
        won't be visible to other users unless we add it to the database.
      </p>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-violet-accent hover:bg-violet-accent/90 disabled:opacity-50 py-3 font-syne font-semibold text-white-soft text-sm transition-colors"
      >
        {isPending ? 'Submitting…' : 'Submit for review'}
      </button>

    </form>
  )
}
