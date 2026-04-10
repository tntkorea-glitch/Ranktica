'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { ok, error: err } = await login(email, password)
    setLoading(false)
    if (ok) {
      router.push('/keyword')
    } else {
      setError(err || '로그인에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <TrendingUp className="w-8 h-8 text-accent" />
          <span className="text-2xl font-bold">Ranktica</span>
        </Link>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-xl font-bold text-center mb-2">로그인</h2>

          {error && <p className="text-sm text-danger text-center bg-danger/10 p-2 rounded">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="이메일을 입력하세요"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white py-2.5 rounded-lg font-medium hover:bg-accent/90 transition disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>

          {/* Social Login */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">소셜 로그인</span></div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <a href="/api/auth/oauth/kakao" className="flex items-center justify-center py-2 bg-[#FEE500] rounded-lg text-sm font-medium text-[#3C1E1E] hover:opacity-90">카카오</a>
            <a href="/api/auth/oauth/naver" className="flex items-center justify-center py-2 bg-[#03C75A] rounded-lg text-sm font-medium text-white hover:opacity-90">네이버</a>
            <a href="/api/auth/oauth/google" className="flex items-center justify-center py-2 bg-white border border-border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">구글</a>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            계정이 없으신가요?{' '}
            <Link href="/register" className="text-accent font-medium hover:underline">회원가입</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
