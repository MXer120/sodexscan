'use client'

import { useQuery } from '@tanstack/react-query'

async function fetchGrowthData() {
  const res = await fetch('https://mainnet-data.sodex.dev/api/v1/mirror/users/daily_new', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })
  const json = await res.json()

  if (json.code === '0' && json.data) {
    const daily = json.data.daily || []
    const sorted = [...daily].sort((a: any, b: any) => a.date - b.date)
    let cumulative = 0
    const processed = sorted.map((d: any) => {
      cumulative += d.count
      return { date: d.date * 1000, newUsers: d.count, totalUsers: cumulative, isActual: true }
    })
    const apiTotal = json.data.total || cumulative
    const offset = Math.max(0, apiTotal - cumulative)
    if (offset > 0) processed.forEach((p: any) => { p.totalUsers += offset })
    return { data: processed, totalUsers: apiTotal }
  }
  throw new Error('Failed to fetch user growth data')
}

export function useUserGrowthData() {
  return useQuery({
    queryKey: ['user-growth-data'],
    queryFn: fetchGrowthData,
    staleTime: 5 * 60_000,
  })
}
