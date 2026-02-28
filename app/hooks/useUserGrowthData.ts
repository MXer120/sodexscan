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
    return { data: processed, totalUsers: json.data.total || cumulative }
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
