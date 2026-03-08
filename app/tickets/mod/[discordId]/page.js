'use client'

import { useParams } from 'next/navigation'
import { useModGuard } from '../../../hooks/useModGuard'
import { SkeletonPage } from '../../../components/Skeleton'
import DiscordProfilePage from '../../../components/tickets/DiscordProfilePage'

export default function DiscordModProfile() {
  const params = useParams()
  const { isAllowed, loading } = useModGuard()
  if (loading) return <SkeletonPage />
  if (!isAllowed) return null
  return <DiscordProfilePage discordId={params.discordId} />
}
