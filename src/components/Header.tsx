'use client'

import { useAuth } from '@/hooks/useAuth'
import { LogOut } from 'lucide-react'

export default function Header({ title }: { title?: string }) {
  const { user, logout } = useAuth()

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-white border-b border-border sticky top-0 z-30">
      <h1 className="text-lg font-semibold text-foreground">{title || '판다랭크'}</h1>
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:block">{user.name}님</span>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  )
}
