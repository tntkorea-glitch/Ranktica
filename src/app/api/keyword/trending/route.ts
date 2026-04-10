import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getTrendingKeywords } from '@/lib/naver-api'

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get('platform') || 'naver'

  const db = await getDb()

  // Check if we have recent data (within 1 hour)
  const recent = await db.all<{ keyword: string; rank: number; volume: number; prev_rank: number | null; change_direction: string }>(
    `SELECT keyword, rank, volume, prev_rank, change_direction FROM trending_keywords
     WHERE platform = ? AND captured_at > datetime('now', '-1 hour')
     ORDER BY rank ASC LIMIT 20`,
    [platform]
  )

  if (recent.length > 0) {
    return NextResponse.json({
      keywords: recent.map(r => ({
        keyword: r.keyword,
        rank: r.rank,
        volume: r.volume,
        prevRank: r.prev_rank,
        change: r.change_direction,
      })),
      cached: true,
    })
  }

  // Fetch fresh data
  try {
    const keywords = await getTrendingKeywords(platform)

    // Store in DB
    for (const kw of keywords) {
      await db.run(
        'INSERT INTO trending_keywords (keyword, platform, rank, volume, prev_rank, change_direction) VALUES (?, ?, ?, ?, ?, ?)',
        [kw.keyword, platform, kw.rank, kw.volume, kw.prevRank ?? null, kw.change]
      )
    }

    return NextResponse.json({ keywords, cached: false })
  } catch {
    return NextResponse.json({ keywords: [], cached: false })
  }
}
