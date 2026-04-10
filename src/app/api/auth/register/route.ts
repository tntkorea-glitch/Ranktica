import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/users'
import { createToken, getTokenCookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, referralCode } = await req.json()
    if (!email || !password || !name) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 })
    }

    const user = await createUser(email, password, name, referralCode)
    if (!user) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 })
    }

    const sessionUser = { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan }
    const token = await createToken(sessionUser)
    const res = NextResponse.json({
      user: { ...sessionUser, referralCode: user.referral_code, planExpiry: user.plan_expiry, createdAt: user.created_at },
    })
    res.cookies.set(getTokenCookieOptions(token))
    return res
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
