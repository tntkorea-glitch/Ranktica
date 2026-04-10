import { NextRequest, NextResponse } from 'next/server'
import { OAUTH_PROVIDERS, isValidProvider, getRedirectUri } from '@/lib/oauth'
import { upsertOAuthUser } from '@/lib/users'
import { createToken, getTokenCookieOptions } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  if (!isValidProvider(provider)) {
    return NextResponse.redirect(new URL('/login?error=invalid_provider', req.nextUrl.origin))
  }

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const savedState = req.cookies.get('oauth_state')?.value

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', req.nextUrl.origin))
  }

  const config = OAUTH_PROVIDERS[provider]
  const clientId = config.clientId()
  const clientSecret = config.clientSecret()
  const redirectUri = getRedirectUri(req.nextUrl.origin, provider)

  try {
    // Exchange code for token
    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId || '',
        client_secret: clientSecret || '',
      }),
    })
    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return NextResponse.redirect(new URL('/login?error=token_failed', req.nextUrl.origin))
    }

    // Get user info
    const userRes = await fetch(config.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userData = await userRes.json()
    const { providerId, email, name } = config.parseUser(userData)

    const user = await upsertOAuthUser(provider, providerId, email, name)
    const sessionUser = { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan }
    const token = await createToken(sessionUser)

    const res = NextResponse.redirect(new URL('/keyword', req.nextUrl.origin))
    res.cookies.set(getTokenCookieOptions(token))
    res.cookies.delete('oauth_state')
    return res
  } catch {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', req.nextUrl.origin))
  }
}
