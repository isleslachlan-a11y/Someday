'use client'
import { SOCIAL_LINKS } from '../config'

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

interface SocialRowProps {
  compact?: boolean
  dark?: boolean
}

export function SocialRow({ compact = false, dark = false }: SocialRowProps) {
  const iconSize = compact ? 18 : 22
  const gap = compact ? 'gap-3' : 'gap-4'
  const size = compact ? 'w-9 h-9' : 'w-12 h-12'
  const base = `${size} rounded-full flex items-center justify-center transition-colors`
  const light = 'border border-[rgba(252,217,154,0.5)] bg-white text-[#131936]/50 hover:text-[#f08c21] hover:border-[#f08c21]'
  const darkStyle = 'border border-white/20 bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
  const btnClass = `${base} ${dark ? darkStyle : light}`

  return (
    <div className={`flex items-center justify-center ${gap}`}>
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
