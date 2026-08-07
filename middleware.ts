import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next({ request })

  const role = request.cookies.get('hk_p_role')?.value
  const uid  = request.cookies.get('hk_p_uid')?.value

  if (isPublicPath(pathname)) {
    if (uid && role === 'partner' && pathname === '/login') {
      return NextResponse.redirect(new URL('/home', request.url))
    }
    return response
  }

  if (pathname === '/') {
    if (uid && role === 'partner') return NextResponse.redirect(new URL('/home', request.url))
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!role || !uid || role !== 'partner') {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
