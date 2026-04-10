'use client'

import { useState, useEffect } from 'react'
import { Search, TrendingUp, ArrowUp, ArrowDown, Minus, Sparkles, PenTool } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface TrendingKeyword {
  keyword: string
  rank: number
  volume: number
  prevRank: number | null
  change: string
}

interface KeywordStats {
  keyword: string
  monthlySearchVolume: number
  competition: string
  competitionValue: number
  trend: string
  monthlyTrend: { month: string; score: number }[]
  relatedKeywords: { keyword: string; volume: number; competition: string }[]
}

function ChangeIcon({ change }: { change: string }) {
  if (change === 'up') return <ArrowUp className="w-3 h-3 text-success" />
  if (change === 'down') return <ArrowDown className="w-3 h-3 text-danger" />
  if (change === 'new') return <Sparkles className="w-3 h-3 text-warning" />
  return <Minus className="w-3 h-3 text-gray-400" />
}

function CompBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    high: 'bg-danger/10 text-danger',
    medium: 'bg-warning/10 text-warning',
    low: 'bg-success/10 text-success',
  }
  const labels: Record<string, string> = { high: '높음', medium: '보통', low: '낮음' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || colors.medium}`}>
      {labels[level] || level}
    </span>
  )
}

export default function KeywordPage() {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [stats, setStats] = useState<KeywordStats | null>(null)
  const [trending, setTrending] = useState<TrendingKeyword[]>([])
  const [platform, setPlatform] = useState('naver')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/keyword/trending?platform=${platform}`)
      .then(r => r.json())
      .then(d => setTrending(d.keywords || []))
      .catch(() => {})
  }, [platform])

  const handleSearch = async (kw?: string) => {
    const keyword = kw || query
    if (!keyword.trim()) return
    setSearching(true)
    setError('')
    setStats(null)
    try {
      const res = await fetch('/api/keyword/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setStats(data)
      setQuery(keyword.trim())
    } catch {
      setError('키워드 분석에 실패했습니다.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <>
      <Header title="키워드 분석" />
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Search */}
        <div className="bg-white rounded-xl border border-border p-6">
          <form onSubmit={e => { e.preventDefault(); handleSearch() }} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="분석할 키워드를 입력하세요"
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-accent text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-accent/90 transition disabled:opacity-50"
            >
              {searching ? '분석중...' : '분석'}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>

        {/* Search Results */}
        {stats && (
          <div className="space-y-4">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-border p-4">
                <p className="text-xs text-gray-400">월간 검색량</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.monthlySearchVolume.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-4">
                <p className="text-xs text-gray-400">경쟁도</p>
                <div className="mt-1"><CompBadge level={stats.competition} /></div>
              </div>
              <div className="bg-white rounded-xl border border-border p-4">
                <p className="text-xs text-gray-400">트렌드</p>
                <p className="text-lg font-bold mt-1 flex items-center gap-1">
                  <ChangeIcon change={stats.trend} />
                  {stats.trend === 'up' ? '상승' : stats.trend === 'down' ? '하락' : '유지'}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-border p-4">
                <Link href={`/write?keyword=${encodeURIComponent(stats.keyword)}`} className="flex flex-col items-center justify-center h-full text-accent hover:text-accent/80">
                  <PenTool className="w-5 h-5 mb-1" />
                  <span className="text-sm font-medium">AI 글쓰기</span>
                </Link>
              </div>
            </div>

            {/* Trend Chart */}
            {stats.monthlyTrend.length > 0 && (
              <div className="bg-white rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold mb-3">12개월 검색량 트렌드</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.monthlyTrend}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Related Keywords */}
            {stats.relatedKeywords.length > 0 && (
              <div className="bg-white rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold mb-3">관련 키워드</h3>
                <div className="space-y-2">
                  {stats.relatedKeywords.map((rk, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <button onClick={() => { setQuery(rk.keyword); handleSearch(rk.keyword) }} className="text-sm text-accent hover:underline">{rk.keyword}</button>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{rk.volume.toLocaleString()}</span>
                        <CompBadge level={rk.competition} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trending Keywords */}
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              실시간 인기 검색어
            </h3>
            <div className="flex gap-1">
              {['naver', 'google'].map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${platform === p ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {p === 'naver' ? '네이버' : '구글'}
                </button>
              ))}
            </div>
          </div>

          {trending.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">트렌딩 키워드를 불러오는 중...</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-x-6">
              {trending.slice(0, 20).map((kw, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 text-center text-sm font-bold ${i < 3 ? 'text-accent' : 'text-gray-400'}`}>{kw.rank}</span>
                    <button onClick={() => { setQuery(kw.keyword); handleSearch(kw.keyword) }} className="text-sm hover:text-accent transition">{kw.keyword}</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChangeIcon change={kw.change} />
                    <span className="text-xs text-gray-400 w-12 text-right">{kw.volume > 0 ? kw.volume.toLocaleString() : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
