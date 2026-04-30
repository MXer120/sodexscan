'use client'

import { Suspense, useEffect, useState } from 'react'
import LarpDetector from '../components/larp/LarpDetector'

function LarpDetectorInner() {
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const w = params.get('wallet')
    if (w && /^0x[a-fA-F0-9]{40}$/.test(w)) setWallet(w)
  }, [])

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">LARP Detector</h1>
        <p className="text-sm text-muted-foreground">
          Verify SoDEX trade screenshots — upload a PnL card, paste a wallet, ref code, or share link.
        </p>
      </div>
      <LarpDetector wallet={wallet} />
    </div>
  )
}

export default function LarpDetectorPage() {
  return (
    <Suspense fallback={<div className="p-4 sm:p-6"><div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading…</div></div>}>
      <LarpDetectorInner />
    </Suspense>
  )
}
