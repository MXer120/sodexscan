import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const BYPASS = [
  '/_next',
  '/api/',
  '/maintenance',
]
const STATIC = /\.(?:ico|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf)$/

function rewriteToMaintenance(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/maintenance'
  const reqHeaders = new Headers(request.headers)
  reqHeaders.set('x-maintenance', '1')
  return NextResponse.rewrite(url, { request: { headers: reqHeaders } })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (BYPASS.some(p => pathname.startsWith(p)) || STATIC.test(pathname)) {
    return NextResponse.next()
  }

  // supabaseResponse must be mutated inside setAll per official @supabase/ssr pattern
  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value, options)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return rewriteToMaintenance(request)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'owner') return rewriteToMaintenance(request)

  } catch (err) {
    // Fail closed — any error means show maintenance, never leak content
    console.error('[middleware] auth check failed, showing maintenance:', err)
    return rewriteToMaintenance(request)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
