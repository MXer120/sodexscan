'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { useModGuard } from '../../hooks/useModGuard'
import TicketDetailPage from '../../components/tickets/TicketDetailPage'

function TicketDetailInner() {
  const params = useParams()
  const { isAllowed, loading } = useModGuard()
  if (loading) return <div style={{ minHeight: '100vh', paddingTop: '100px', textAlign: 'center', color: '#888' }}>Loading...</div>
  if (!isAllowed) return null
  return <TicketDetailPage ticketId={params.id} />
}

export default function TicketDetail() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', paddingTop: '100px', textAlign: 'center', color: '#888' }}>Loading...</div>}>
      <TicketDetailInner />
    </Suspense>
  )
}
