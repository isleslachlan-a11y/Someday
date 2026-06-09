'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin/places',      label: 'Places',      icon: '🗺' },
  { href: '/admin/collections', label: 'Collections', icon: '🗂' },
  { href: '/admin/tags',        label: 'Tags',        icon: '🏷' },
  { href: '/admin/submissions', label: 'Submissions', icon: '📥' },
  { href: '/admin/analytics',   label: 'Analytics',   icon: '📊' },
] as const

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#fff9f0] border-t border-[#fcd99a]/50">
      <div className="flex items-center justify-around max-w-[480px] mx-auto px-1 h-16">
        {NAV_ITEMS.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 min-w-[52px] ${
                active ? 'text-[#f89a14]' : 'text-[#131936]/40'
              }`}
            >
              <span className="text-[18px] leading-none">{item.icon}</span>
              <span className={`font-nunito text-[10px] leading-tight ${active ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
