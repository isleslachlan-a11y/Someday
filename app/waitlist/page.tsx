import { createAdminClient } from '@/lib/supabase/admin'
import { WaitlistNav }          from './components/WaitlistNav'
import { HeroSection }           from './components/HeroSection'
import { DestinationsMarquee }   from './components/DestinationsMarquee'
import { AppTourSection }        from './components/AppTourSection'
import { VideoSection }          from './components/VideoSection'
import { VisionSection }         from './components/VisionSection'
import { WaitlistFormSection }   from './components/WaitlistFormSection'
import { FAQSection }            from './components/FAQSection'
import { WaitlistFooter }        from './components/WaitlistFooter'

export default async function WaitlistPage() {
  // Fetch signup count server-side so it's ready on first paint
  // Note: the table is waitlist_emails (not waitlist_signups)
  const admin = createAdminClient()
  const { count } = await admin
    .from('waitlist_emails')
    .select('*', { count: 'exact', head: true })

  const signupCount = count ?? 0

  return (
    <main className="bg-[#fff9f0] text-[#131936]">
      <WaitlistNav />
      <HeroSection count={signupCount} />
      <DestinationsMarquee />
      <AppTourSection />
      <VideoSection />
      <VisionSection />
      <WaitlistFormSection />
      <FAQSection />
      <WaitlistFooter />
    </main>
  )
}
