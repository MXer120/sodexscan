export async function resolve_refcode({ code }) {
  const normalized = code.trim().toUpperCase()
  if (normalized.length < 3) return { error: 'Invalid code', code: 400, field: 'code' }

  const dummy = '0x' + Array.from({ length: 40 }, () =>
    '0123456789abcdef'[Math.floor(Math.random() * 16)]
  ).join('')

  try {
    const url = new URL('https://alpha-biz.sodex.dev/biz/referral/checkEligibility')
    url.searchParams.set('walletAddress', dummy)
    url.searchParams.set('referralCode', normalized)
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    const json = await res.json()
    const wallet = json?.data?.inviterWalletAddress || ''
    if (wallet && wallet.startsWith('0x') && wallet.length === 42) {
      return { wallet, code: normalized, source: 'sodex_api' }
    }
    return { wallet: null, code: normalized, source: 'sodex_api' }
  } catch {
    return { error: 'Sodex API unreachable', code: 502, wallet: null }
  }
}
