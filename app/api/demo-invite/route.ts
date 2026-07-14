import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Lab-only demo access gate. A valid, unexpired invitation key unlocks the
// one-click demo account logins on the login page. Keys live in the
// `demo_invitations` table (service-role only) and are minted with
// supabase/scripts/generate-invite.mjs.
//
// GET  → is the current cookie (if any) still a valid key? { valid }
// POST → validate a submitted key; on success set an httpOnly cookie that
//        lasts until the key expires. { valid }

const COOKIE = 'pb_demo_invite'
const IS_PRODUCTION = process.env.NEXT_PUBLIC_APP_ENV === 'production'

// Returns the expiry Date if the key is live, otherwise null.
async function validateKey(key: string): Promise<Date | null> {
  if (!key) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('demo_invitations')
    .select('expires_at')
    .eq('key', key)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  return data ? new Date(data.expires_at) : null
}

export async function GET(request: NextRequest) {
  if (IS_PRODUCTION) return NextResponse.json({ valid: false })

  const key = request.cookies.get(COOKIE)?.value ?? ''
  const expiresAt = await validateKey(key)
  return NextResponse.json({ valid: !!expiresAt })
}

export async function POST(request: NextRequest) {
  if (IS_PRODUCTION) return NextResponse.json({ valid: false })

  let key = ''
  try {
    const body = await request.json()
    key = String(body?.key ?? '').trim()
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  const expiresAt = await validateKey(key)
  if (!expiresAt) {
    return NextResponse.json({ valid: false }, { status: 401 })
  }

  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  const res = NextResponse.json({ valid: true, expiresAt: expiresAt.toISOString() })
  res.cookies.set(COOKIE, key, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  })
  return res
}
