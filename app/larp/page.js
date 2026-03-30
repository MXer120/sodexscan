'use client'

import { Suspense } from 'react'
import LarpPage from '../components/larp/LarpPage'
import { useModGuard } from '../hooks/useModGuard'

export default function Larp() {
  const { isAllowed, loading } = useModGuard()

  if (loading) return <div style={{ background: '#000', minHeight: '100vh' }} />
  if (!isAllowed) return null

  return (
    <Suspense fallback={<div style={{ background: '#000', minHeight: '100vh' }} />}>
      <LarpPage />
    </Suspense>
  )
}
