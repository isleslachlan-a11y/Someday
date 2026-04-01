import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditProfileForm from './EditProfileForm'
import type { UserProfile } from '@/lib/types'

export default async function EditProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = data as UserProfile | null

  if (!profile) redirect('/login')

  return (
    <main className="min-h-screen bg-indigo-deep px-4 py-8">
      <div className="max-w-lg mx-auto">

        <div className="mb-8">
          <h1 className="font-syne text-3xl font-bold text-white-soft">Edit profile</h1>
          <p className="text-muted text-sm mt-1">Update how others see you on Someday.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <EditProfileForm profile={profile} />
        </div>

      </div>
    </main>
  )
}
