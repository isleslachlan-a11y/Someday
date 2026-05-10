import type { UnsplashAttribution as Attribution } from '@/lib/types'

interface Props {
  attribution: Attribution | null
  className?: string
}

/**
 * Displays required Unsplash photographer credit.
 * Must be shown wherever Unsplash images appear — required by API terms.
 */
export default function UnsplashAttribution({ attribution, className = '' }: Props) {
  if (!attribution) return null

  return (
    <span className={`text-[10px] font-nunito text-white/50 ${className}`}>
      Photo by{' '}
      <a
        href={attribution.photographer_url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-1 hover:text-white/70 transition-colors"
      >
        {attribution.photographer_name}
      </a>
      {' '}on{' '}
      <a
        href={attribution.photo_url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-1 hover:text-white/70 transition-colors"
      >
        Unsplash
      </a>
    </span>
  )
}
