import Image from 'next/image'

interface Props {
  avatarUrl: string | null
  username: string
  size?: number
  className?: string
}

export default function Avatar({ avatarUrl, username, size = 40, className = '' }: Props) {
  const initials = username.slice(0, 2).toUpperCase()

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={username}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-violet-accent/20 border border-violet-accent/30 flex items-center justify-center font-syne font-bold text-lavender select-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
      aria-label={username}
    >
      {initials}
    </div>
  )
}
