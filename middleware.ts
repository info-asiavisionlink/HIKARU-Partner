import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/api/auth']

const WORKER_ROLES = ['employee', 'partner'] as const
type WorkerRole = typeof WORKER_ROLES[number]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function isWorkerRole(role: string | undefined): role is WorkerRole {
  return WORKER_ROLES.includes(role as WorkerRole)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next({ request })

  const role = request.cookies.get('hk_w_role')?.value
  const uid  = request.cookies.get('hk_w_uid')?.value

  if (isPublicPath(pathname)) {
    if (uid && isWorkerRole(role) && pathname === '/login') {
      return NextResponse.redirect(new URL('/home', request.url))
    }
    return response
  }

  if (pathname === '/') {
    if (uid && isWorkerRole(role)) return NextResponse.redirect(new URL('/home', request.url))
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!uid || !isWorkerRole(role)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
