import { SocialRow } from './SocialRow'

export function WaitlistFooter() {
  return (
    <footer className="bg-[#131936] py-16 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-10">

        {/* Left: wordmark + tagline */}
        <div>
          <p className="font-display font-bold text-white text-xl tracking-tight">Someday</p>
          <p className="font-nunito text-sm text-white/60 mt-1">Your list of someday trips.</p>
        </div>

        {/* Right: social (uses SOCIAL_LINKS from config via SocialRow) + copyright */}
        <div className="flex flex-col items-start sm:items-end gap-4">
          <div>
            <p className="font-nunito text-sm text-white/60 mb-3">Follow along</p>
            <SocialRow compact dark />
          </div>
          {/* TODO: confirm year; update to 2026 if launching in 2026 */}
          <p className="font-nunito text-xs text-white/40">
            © 2025 Someday. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  )
}
