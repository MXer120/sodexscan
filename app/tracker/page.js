'use client'

import { Suspense } from 'react'
import TrackerPage from '../components/TrackerPage'
import { SkeletonPage } from '../components/Skeleton'

export default function Tracker() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <TrackerPage />
    </Suspense>
  )
}
