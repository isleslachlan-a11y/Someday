import type { Category } from '@/lib/types'

// Full class strings — required so Tailwind does not purge them
const STYLES: Record<string, string> = {
  City:      'bg-violet-accent/20 text-lavender    border-violet-accent/30',
  Nature:    'bg-emerald-500/20  text-emerald-300  border-emerald-500/30',
  Beach:     'bg-sky-500/20      text-sky-300      border-sky-500/30',
  Cultural:  'bg-pink-accent/20  text-pink-accent  border-pink-accent/30',
  Adventure: 'bg-orange-500/20   text-orange-300   border-orange-500/30',
  Food:      'bg-amber-500/20    text-amber-300    border-amber-500/30',
  Other:     'bg-white/10        text-muted        border-white/10',
}

const ICONS: Record<string, string> = {
  City:      '🏙',
  Nature:    '🌿',
  Beach:     '🏖',
  Cultural:  '🏛',
  Adventure: '⛰',
  Food:      '🍜',
  Other:     '✦',
}

interface Props {
  category: string
  size?: 'sm' | 'md'
}

export default function CategoryBadge({ category, size = 'sm' }: Props) {
  const styles = STYLES[category] ?? STYLES.Other
  const icon = ICONS[category] ?? ICONS.Other
  const sizeClass = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClass} ${styles}`}
    >
      <span aria-hidden="true">{icon}</span>
      {category}
    </span>
  )
}
