import { NextResponse } from 'next/server'

/**
 * GET /api/resolve-refcode?code=XXXXX
 * Resolves a Sodex referral code to a wallet address via the Sodex biz API.
 */
export async function GET(req) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code || code.length < 3) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  // Generate dummy wallet for the API call (required param, not used for auth)
  const dummy = '0x' + Array.from({ length: 40 }, () =>
    '0123456789abcdef'[Math.floor(Math.random() * 16)]
  ).join('')

  try {
    const url = new URL('https://alpha-biz.sodex.dev/biz/referral/checkEligibility')
    url.searchParams.set('walletAddress', dummy)
    url.searchParams.set('referralCode', code)

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    const json = await res.json()
    const wallet = json?.data?.inviterWalletAddress || ''

    if (wallet && wallet.startsWith('0x') && wallet.length === 42) {
      return NextResponse.json({ wallet, code, source: 'sodex_api' })
    }
    return NextResponse.json({ wallet: null, code, source: 'sodex_api' })
  } catch (err) {
    return NextResponse.json(
      { error: 'Sodex API unreachable', code },
      { status: 502 }
    )
  }
}
