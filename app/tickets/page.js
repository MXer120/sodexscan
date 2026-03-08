'use client'

import { Suspense } from 'react'
import { useModGuard } from '../hooks/useModGuard'
import { SkeletonPage } from '../components/Skeleton'
import TicketsPage from '../components/tickets/TicketsPage'

function TicketsInner() {
  const { isAllowed, loading } = useModGuard()
  if (loading) return <SkeletonPage />
  if (!isAllowed) return null
  return <TicketsPage />
}

export default function Tickets() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <TicketsInner />
    </Suspense>
  )
}
