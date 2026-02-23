'use client'

import { useModGuard } from '../hooks/useModGuard'
import TicketsPage from '../components/tickets/TicketsPage'

export default function Tickets() {
  const { isAllowed, loading } = useModGuard()
  if (loading) return <div style={{ minHeight: '100vh', paddingTop: '100px', textAlign: 'center', color: '#888' }}>Loading...</div>
  if (!isAllowed) return null
  return <TicketsPage />
}
