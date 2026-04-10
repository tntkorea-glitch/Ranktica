'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, PenTool, Home, Crown, User } from 'lucide-react'

const TABS = [
  { href: '/keyword', label: '키워드', icon: Search },
  { href: '/write', label: 'AI글쓰기', icon: PenTool },
  { href: '/keyword', label: '홈', icon: Home },
  { href: '/membership', label: '멤버십', icon: Crown },
  { href: '/mypage', label: '마이페이지', icon: User },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
      <div className="flex justify-around items-center h-16">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center gap-0.5 text-xs ${
                active ? 'text-accent' : 'text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
