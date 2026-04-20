import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through: Next internals, static assets, API routes, the maintenance page itself
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname === '/maintenance' ||
    /\.(?:ico|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let isOwner = false
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isOwner = profile?.role === 'owner'
  }

  if (!isOwner) {
    const url = request.nextUrl.clone()
    url.pathname = '/maintenance'
    const reqHeaders = new Headers(request.headers)
    reqHeaders.set('x-maintenance', '1')
    return NextResponse.rewrite(url, { request: { headers: reqHeaders } })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
