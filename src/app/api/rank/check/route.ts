import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { claudeComplete } from '@/lib/anthropic'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { trackId } = await req.json()
  if (!trackId) return NextResponse.json({ error: 'trackId가 필요합니다.' }, { status: 400 })

  const db = await getDb()
  const track = await db.get<{ id: string; blog_url: string; post_url: string; keyword: string }>(
    'SELECT id, blog_url, post_url, keyword FROM blog_rank_tracks WHERE id = ? AND user_id = ? AND is_active = 1',
    [trackId, session.id]
  )
  if (!track) return NextResponse.json({ error: '추적 항목을 찾을 수 없습니다.' }, { status: 404 })

  try {
    const prompt = `네이버에서 "${track.keyword}" 키워드로 검색했을 때, 다음 블로그 게시글의 예상 순위를 알려주세요.

블로그: ${track.blog_url}
게시글: ${track.post_url}
키워드: ${track.keyword}

아래 JSON 형식으로만 응답하세요:
{
  "rank": 15,
  "totalResults": "약 50,000건",
  "analysis": "순위 분석 요약 (1-2문장)",
  "tips": "순위 개선을 위한 짧은 팁 (1문장)"
}

rank는 1~100 사이 정수 (순위권 밖이면 null).
한국 네이버 검색 결과를 기반으로 현실적으로 추정해주세요.`

    const raw = await claudeComplete(prompt, {
      system: '한국 네이버 검색 순위 분석 전문가입니다. JSON만 응답하세요.',
      temperature: 0.7,
      maxTokens: 500,
    })

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: '순위 확인에 실패했습니다.' }, { status: 500 })

    const result = JSON.parse(match[0])

    // Save to history
    await db.run(
      'INSERT INTO blog_rank_history (track_id, rank) VALUES (?, ?)',
      [trackId, result.rank]
    )

    return NextResponse.json(result)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '순위 확인에 실패했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
