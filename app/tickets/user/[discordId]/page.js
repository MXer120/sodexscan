'use client'

import { useParams } from 'next/navigation'
import { useModGuard } from '../../../hooks/useModGuard'
import DiscordProfilePage from '../../../components/tickets/DiscordProfilePage'

export default function DiscordUserProfile() {
  const params = useParams()
  const { isAllowed, loading } = useModGuard()
  if (loading) return <div style={{ minHeight: '100vh', paddingTop: '100px', textAlign: 'center', color: '#888' }}>Loading...</div>
  if (!isAllowed) return null
  return <DiscordProfilePage discordId={params.discordId} />
}
