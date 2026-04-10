import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const db = await getDb()

  const totalUsers = await db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM users')
  const planDist = await db.all<{ plan: string; cnt: number }>('SELECT plan, COUNT(*) as cnt FROM users GROUP BY plan')
  const todayUsage = await db.get<{ kw: number; ai: number }>(
    `SELECT COALESCE(SUM(keyword_count),0) as kw, COALESCE(SUM(ai_credit_count),0) as ai FROM usage_limits WHERE date = date('now')`
  )
  const totalContents = await db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM ai_contents')

  return NextResponse.json({
    totalUsers: totalUsers?.cnt || 0,
    planDistribution: planDist,
    todayKeywordSearches: todayUsage?.kw || 0,
    todayAiCredits: todayUsage?.ai || 0,
    totalContents: totalContents?.cnt || 0,
  })
}
