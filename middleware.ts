import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

type Role = 'customer' | 'workshop' | 'internal'

const ROLE_DASHBOARDS: Record<Role, string> = {
  customer: '/catalog',
  workshop: '/workshop/dashboard',
  internal: '/internal/dashboard',
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const role = user?.user_metadata?.role as Role | undefined

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith('/auth')) {
    if (user && role && ROLE_DASHBOARDS[role]) {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role], request.url))
    }
    return response
  }

  // Role-protected routes
  // Customer routes live at the root (route group (customer) adds no path prefix)
  if (
    pathname.startsWith('/customer') ||
    pathname.startsWith('/catalog') ||
    pathname.startsWith('/orders')
  ) {
    if (!user || role !== 'customer') {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  if (pathname.startsWith('/workshop')) {
    if (!user || role !== 'workshop') {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  if (pathname.startsWith('/internal')) {
    if (!user || role !== 'internal') {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
