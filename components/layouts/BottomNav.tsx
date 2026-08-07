'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, Bell, User } from 'lucide-react'

const NAV = [
  { href: '/home',          icon: Home,     label: 'ホーム' },
  { href: '/jobs',          icon: Briefcase, label: '案件' },
  { href: '/notifications', icon: Bell,     label: '通知' },
  { href: '/profile',       icon: User,     label: 'プロフィール' },
]

const GOLD = 'oklch(0.73 0.12 78)'

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around px-2 safe-area-bottom"
      style={{
        background: 'oklch(0.07 0.004 255 / 0.96)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid oklch(0.73 0.12 78 / 0.15)',
      }}
    >
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/home' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all duration-150"
          >
            <Icon
              className="h-5 w-5"
              style={{ color: active ? GOLD : 'oklch(0.42 0.006 75)', filter: active ? `drop-shadow(0 0 6px ${GOLD}80)` : 'none' }}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: active ? GOLD : 'oklch(0.42 0.006 75)' }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
