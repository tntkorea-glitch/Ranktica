import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getKeywordStats } from '@/lib/naver-api'
import { checkUsageLimit, incrementUsage } from '@/lib/usage'
import { getDb } from '@/lib/db'
import type { PlanType } from '@/lib/plans'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { keyword } = await req.json()
  if (!keyword?.trim()) return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })

  const { allowed } = await checkUsageLimit(session.id, 'keyword_count', session.plan as PlanType)
  if (!allowed) return NextResponse.json({ error: '일일 키워드 분석 한도를 초과했습니다. 멤버십을 업그레이드해주세요.' }, { status: 429 })

  try {
    const stats = await getKeywordStats(keyword.trim())
    await incrementUsage(session.id, 'keyword_count')

    // Save to search history
    const db = await getDb()
    await db.run(
      'INSERT INTO keywords_search_history (user_id, keyword, platform, search_volume, competition) VALUES (?, ?, ?, ?, ?)',
      [session.id, keyword.trim(), 'naver', stats.monthlySearchVolume, stats.competition]
    )

    return NextResponse.json(stats)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '키워드 분석에 실패했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
