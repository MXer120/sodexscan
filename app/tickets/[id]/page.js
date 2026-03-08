'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { useModGuard } from '../../hooks/useModGuard'
import { SkeletonPage } from '../../components/Skeleton'
import TicketDetailPage from '../../components/tickets/TicketDetailPage'

function TicketDetailInner() {
  const params = useParams()
  const { isAllowed, loading } = useModGuard()
  if (loading) return <SkeletonPage />
  if (!isAllowed) return null
  return <TicketDetailPage ticketId={params.id} />
}

export default function TicketDetail() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <TicketDetailInner />
    </Suspense>
  )
}
