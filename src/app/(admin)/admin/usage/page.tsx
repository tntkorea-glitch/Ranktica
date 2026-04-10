'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'

interface Stats {
  totalUsers: number
  todayKeywordSearches: number
  todayAiCredits: number
  totalContents: number
}

export default function UsagePage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/admin/usage').then(r => r.json()).then(setStats)
  }, [])

  if (!stats) return <><Header title="이용 통계" /><div className="p-6 text-center text-gray-400">로딩 중...</div></>

  return (
    <>
      <Header title="이용 통계" />
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-gray-400">전체 회원</p>
            <p className="text-2xl font-bold mt-1">{stats.totalUsers}</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-gray-400">오늘 키워드 검색</p>
            <p className="text-2xl font-bold mt-1">{stats.todayKeywordSearches}</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-gray-400">오늘 AI 크레딧</p>
            <p className="text-2xl font-bold mt-1">{stats.todayAiCredits}</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-gray-400">총 생성 콘텐츠</p>
            <p className="text-2xl font-bold mt-1">{stats.totalContents}</p>
          </div>
        </div>
      </div>
    </>
  )
}
