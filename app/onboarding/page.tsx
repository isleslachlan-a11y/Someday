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

  // Fetch seed places for step 8 — spread across types for meaningful signal.
  // Falls back to popularity sort if the RPC is unavailable.
  const { data: rpcPlaces, error: rpcError } = await supabase.rpc('get_onboarding_places')

  let places: Place[]
  if (rpcError || !rpcPlaces || rpcPlaces.length === 0) {
    const { data: fallbackData } = await supabase
      .from('places')
      .select('id, name, country, type, image_keyword')
      .order('popularity', { ascending: false })
      .limit(12)
    places = (fallbackData ?? []) as Place[]
  } else {
    places = rpcPlaces as Place[]
  }

  return (
    <div className="min-h-screen bg-[#fff9f0]">
      <OnboardingFlow places={places} />
    </div>
  )
}
