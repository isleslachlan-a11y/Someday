import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditProfileForm from './EditProfileForm'
import EditBackButton from './EditBackButton'
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
    <main className="min-h-screen bg-[#fff9f0]">

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 grid grid-cols-3 items-center">
          <EditBackButton />
          <div className="flex justify-center">
            <span className="font-brice font-bold text-[#131936] text-[20px] tracking-widest uppercase whitespace-nowrap">
              EDIT PROFILE
            </span>
          </div>
          <div />
        </div>
      </header>

      <div className="max-w-[480px] mx-auto px-4 pt-6 pb-24">
        <div className="rounded-2xl border border-[#fcd99a]/40 bg-white p-6">
          <EditProfileForm profile={profile} />
        </div>
      </div>

    </main>
  )
}
