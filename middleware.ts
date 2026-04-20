import { NextResponse, type NextRequest } from 'next/server'

const BYPASS = ['/_next', '/api/', '/maintenance']
const STATIC = /\.(?:ico|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf)$/

function rewriteToMaintenance(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/maintenance'
  const reqHeaders = new Headers(request.headers)
  reqHeaders.set('x-maintenance', '1')
  return NextResponse.rewrite(url, { request: { headers: reqHeaders } })
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (BYPASS.some(p => pathname.startsWith(p)) || STATIC.test(pathname)) {
    return NextResponse.next()
  }

  // httpOnly cookie set by /api/maintenance-verify after owner login (24h TTL)
  const verified = request.cookies.get('mnt-verified')?.value
  if (verified === '1') return NextResponse.next()

  return rewriteToMaintenance(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
