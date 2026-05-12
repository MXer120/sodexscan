import { NextResponse, type NextRequest } from 'next/server'

// Maintenance gate disabled — site is open to all visitors.
// To re-enable: restore the mnt-verified cookie check here.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
