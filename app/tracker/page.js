'use client'

import { Suspense } from 'react'
import TrackerPage from '../components/TrackerPage'

export default function Tracker() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading...</div>}>
      <TrackerPage />
    </Suspense>
  )
}
