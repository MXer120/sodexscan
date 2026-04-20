import { supabaseAdmin } from '../../lib/supabaseServer'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required.' }, { status: 400 })
    }

    const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({ email, password })
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (profile?.role !== 'owner') {
      return NextResponse.json({ error: 'Access restricted to site owners.' }, { status: 403 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set('mnt-verified', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24h
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
