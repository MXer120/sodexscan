'use client'

import { Suspense } from 'react'
import LarpPage from '../components/larp/LarpPage'
import { useModGuard } from '../hooks/useModGuard'

export default function Larp() {
  const { isAllowed, loading } = useModGuard()

  if (loading) return <div className="p-4 sm:p-6"><div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading…</div></div>
  if (!isAllowed) return null

  return (
    <Suspense fallback={<div className="p-4 sm:p-6"><div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading…</div></div>}>
      <LarpPage />
    </Suspense>
  )
}
