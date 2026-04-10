'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, PenTool, Crown, User, Settings, TrendingUp, Stethoscope, FileSearch, BarChart3 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { href: '/keyword', label: '키워드 분석', icon: Search },
  { href: '/write', label: 'AI 글쓰기', icon: PenTool },
  { href: '/membership', label: '멤버십', icon: Crown },
  { href: '/mypage', label: '마이페이지', icon: User },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <aside className="hidden md:flex flex-col w-60 bg-sidebar-bg text-sidebar-text min-h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <Link href="/keyword" className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <TrendingUp className="w-7 h-7 text-accent-light" />
        <span className="text-lg font-bold text-white">Datica</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent text-white'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-active'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}

        {user?.role === 'admin' && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith('/admin')
                ? 'bg-accent text-white'
                : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-active'
            }`}
          >
            <Settings className="w-5 h-5" />
            관리자
          </Link>
        )}
      </nav>

      {/* User info */}
      {user && (
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-xs text-sidebar-text/60 truncate">{user.email}</p>
          <p className="text-sm text-white font-medium truncate">{user.name}</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-accent/20 text-accent-light text-xs rounded-full">
            {user.plan === 'premiumplus' ? 'Premium+' : user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
          </span>
        </div>
      )}
    </aside>
  )
}
