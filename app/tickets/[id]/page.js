'use client'

import { useParams } from 'next/navigation'
import { useModGuard } from '../../hooks/useModGuard'
import TicketDetailPage from '../../components/tickets/TicketDetailPage'

export default function TicketDetail() {
  const params = useParams()
  const { isAllowed, loading } = useModGuard()
  if (loading) return <div style={{ minHeight: '100vh', paddingTop: '100px', textAlign: 'center', color: '#888' }}>Loading...</div>
  if (!isAllowed) return null
  return <TicketDetailPage ticketId={params.id} />
}
