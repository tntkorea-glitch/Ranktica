import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { claudeComplete } from '@/lib/anthropic'
import { checkUsageLimit, incrementUsage } from '@/lib/usage'
import type { PlanType } from '@/lib/plans'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { allowed } = await checkUsageLimit(session.id, 'ai_credit_count', session.plan as PlanType)
  if (!allowed) return NextResponse.json({ error: 'AI 크레딧 한도를 초과했습니다.' }, { status: 429 })

  const { keyword, topicType } = await req.json()
  if (!keyword) return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })

  try {
    const prompt = `당신은 네이버 블로그 SEO 전문가입니다.

"${keyword}" 키워드로 ${topicType || '정보성'} 블로그 글의 제목 5개를 생성해주세요.

제목 규칙:
1. 핵심 키워드 "${keyword}"를 제목 앞 10자 이내에 배치
2. 25~35자 길이 (공백 포함)
3. 클릭을 유도하는 구체적이고 감성적인 표현
4. 검색 의도를 반영한 롱테일 키워드 활용
5. 과장/허위 표현 금지

제목만 줄바꿈으로 구분하여 5개 출력하세요. 번호나 설명 없이 제목만.`

    const raw = await claudeComplete(prompt, { temperature: 0.8, maxTokens: 500 })
    const titles = raw.split('\n').map(t => t.trim()).filter(t => t.length > 0).slice(0, 5)
    await incrementUsage(session.id, 'ai_credit_count')

    return NextResponse.json({ titles })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '제목 생성에 실패했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
