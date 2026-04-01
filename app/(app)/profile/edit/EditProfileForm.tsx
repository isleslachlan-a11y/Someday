'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/app/actions/profile'
import type { UserProfile } from '@/lib/types'

interface Props {
  profile: UserProfile
}

export default function EditProfileForm({ profile }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [username, setUsername] = useState(profile.username ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB.')
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      let uploadedUrl: string | undefined

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const supabase = createClient()
        const ext = avatarFile.name.split('.').pop() ?? 'jpg'
        const path = `${profile.id}/avatar.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })

        if (uploadError) {
          toast.error('Avatar upload failed: ' + uploadError.message)
          return
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(path)

        uploadedUrl = publicUrl
        setAvatarUrl(publicUrl)
      }

      const result = await updateProfile({
        username,
        bio,
        ...(uploadedUrl ? { avatar_url: uploadedUrl } : {}),
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Profile updated!')
      router.push('/profile')
      router.refresh()
    })
  }

  const displayAvatar = avatarPreview ?? avatarUrl

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Avatar */}
      <div>
        <label className="block text-sm font-semibold text-white-soft/80 mb-3">
          Avatar
        </label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-violet-accent"
            aria-label="Change avatar"
          >
            {displayAvatar ? (
              <Image
                src={displayAvatar}
                alt={username}
                width={72}
                height={72}
                className="rounded-full object-cover"
              />
            ) : (
              <div
                className="rounded-full bg-violet-accent/20 border border-violet-accent/30 flex items-center justify-center font-syne font-bold text-lavender"
                style={{ width: 72, height: 72, fontSize: 25 }}
              >
                {username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-full">
              <span className="text-xs text-white font-semibold">Change</span>
            </div>
          </button>

          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-lavender hover:text-white-soft transition-colors"
            >
              Upload photo
            </button>
            <p className="text-xs text-muted mt-0.5">JPEG, PNG or WebP · max 5 MB</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload avatar"
        />
      </div>

      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-sm font-semibold text-white-soft/80 mb-2">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          maxLength={20}
          required
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white-soft placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-accent transition"
        />
        <p className="text-xs text-muted mt-1">3–20 characters: letters, numbers, underscores.</p>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-semibold text-white-soft/80 mb-2">
          Bio
          <span className="ml-2 font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={3}
          maxLength={200}
          placeholder="Tell people about your travel style…"
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white-soft placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-accent transition resize-none"
        />
        <p className="text-xs text-muted mt-1 text-right">{bio.length}/200</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-xl bg-violet-accent hover:bg-violet-accent/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 font-syne font-semibold text-white-soft text-sm transition-colors"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="rounded-xl border border-white/15 hover:border-white/25 px-4 py-2.5 text-sm font-semibold text-white-soft/70 transition-colors"
        >
          Cancel
        </button>
      </div>

    </form>
  )
}
