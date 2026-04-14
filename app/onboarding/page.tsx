import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingFlow from './OnboardingFlow'

export const metadata: Metadata = {
  title: 'Welcome',
  description: 'Set up your Someday travel profile.',
}

type Place = {
  id: string
  name: string
  country: string
  type: string
  image_keyword: string | null
}

export default async function OnboardingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Already completed → skip to app
  const { data: context } = await supabase
    .from('user_context')
    .select('completed_onboarding')
    .eq('user_id', user.id)
    .maybeSingle()

  if (context?.completed_onboarding === true) redirect('/home')

  // Fetch seed places for step 8 — done server-side so no client fetch needed
  const { data: placesData } = await supabase
    .from('places')
    .select('id, name, country, type, image_keyword')
    .order('popularity', { ascending: false })
    .limit(12)

  const places = (placesData ?? []) as Place[]

  return (
    <div className="min-h-screen bg-indigo-deep">
      <OnboardingFlow places={places} />
    </div>
  )
}
