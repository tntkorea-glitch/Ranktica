import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { checkUsageLimit, incrementUsage } from '@/lib/usage'
import { claudeComplete } from '@/lib/anthropic'
import { getDb } from '@/lib/db'
import { generateId } from '@/lib/utils'
import type { PlanType } from '@/lib/plans'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { blogUrl } = await req.json()
  if (!blogUrl?.trim()) return NextResponse.json({ error: '블로그 URL을 입력해주세요.' }, { status: 400 })

  const { allowed } = await checkUsageLimit(session.id, 'blog_diagnosis_count', session.plan as PlanType)
  if (!allowed) return NextResponse.json({ error: '일일 블로그 진단 한도를 초과했습니다.' }, { status: 429 })

  try {
    const prompt = `다음 블로그 URL을 분석하고 진단해주세요: ${blogUrl.trim()}

블로그 URL 패턴을 분석하여 플랫폼(네이버 블로그, 티스토리, 워드프레스 등)을 파악하고,
URL 구조와 블로그 특성을 기반으로 전문적인 진단을 해주세요.

아래 JSON 형식으로만 응답하세요:
{
  "blogName": "블로그 이름 추정",
  "platform": "naver|tistory|wordpress|other",
  "overallScore": 75,
  "seoScore": 70,
  "contentScore": 80,
  "activityScore": 75,
  "summary": "블로그 전반적인 평가 요약 (2-3문장)",
  "strengths": ["강점1", "강점2", "강점3"],
  "weaknesses": ["약점1", "약점2", "약점3"],
  "recommendations": [
    {"category": "SEO", "title": "제목", "description": "구체적인 개선 방법", "priority": "high"},
    {"category": "콘텐츠", "title": "제목", "description": "구체적인 개선 방법", "priority": "medium"},
    {"category": "활동성", "title": "제목", "description": "구체적인 개선 방법", "priority": "low"}
  ]
}

점수는 0~100 사이.
priority는 "high", "medium", "low" 중 하나.
recommendations는 5~8개.
한국 블로그 시장 특성을 반영하여 현실적으로 진단해주세요.`

    const raw = await claudeComplete(prompt, {
      system: '한국 블로그 SEO 및 콘텐츠 전문 분석가입니다. JSON만 응답하세요.',
      temperature: 0.7,
      maxTokens: 3000,
    })

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: '분석에 실패했습니다. 다시 시도해주세요.' }, { status: 500 })

    const result = JSON.parse(match[0])
    await incrementUsage(session.id, 'blog_diagnosis_count')

    const db = await getDb()
    const id = generateId()
    await db.run(
      'INSERT INTO blog_diagnostics (id, user_id, blog_url, overall_score, seo_score, content_score, activity_score, recommendations) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, session.id, blogUrl.trim(), result.overallScore, result.seoScore, result.contentScore, result.activityScore, JSON.stringify(result)]
    )

    return NextResponse.json({ id, ...result })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '블로그 진단에 실패했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
