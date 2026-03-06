import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// One-time backfill: populate sodex_total_volume for historical weeks 1-4
// using spot volume snapshots from Elias's GitHub repo.
// sodex_total_volume = spot_cumulative_vol + futures_cumulative_vol
// This allows the RPC to compute: weekly_spot_volume = sodex_total_volume - cumulative_volume

const SNAPSHOTS = {
  // Commit SHAs closest to each week end (Sat 00:00 UTC)
  // W1 end: Feb 9 → Feb 8 15:03 UTC
  1: '8750d8d',
  // W2 end: Feb 16 → Feb 15 15:58 UTC
  2: '58bd1a6',
  // W3 end: Feb 23 → Feb 22 06:59 UTC
  3: '8505298',
  // W4 end: Mar 2 → Mar 1 10:09 UTC
  4: 'bf7d60c',
}

const BASE_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-spot-volume-data'

async function fetchSnapshot(commitSha) {
  const url = `${BASE_URL}/${commitSha}/spot_vol_data.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.json()
}

export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const results = {}
  const BATCH = 500

  for (const [weekNum, commitSha] of Object.entries(SNAPSHOTS)) {
    const week = parseInt(weekNum)
    try {
      // Fetch spot volume snapshot at week end
      const snapshot = await fetchSnapshot(commitSha)

      // Build map: account_id -> { wallet_address, spot_vol }
      const spotByAccountId = new Map()
      for (const [walletAddress, entry] of Object.entries(snapshot)) {
        if (entry.userId && entry.vol > 0) {
          spotByAccountId.set(String(entry.userId), {
            wallet_address: walletAddress,
            spot_vol: entry.vol,
          })
        }
      }

      // Fetch all leaderboard_weekly rows for this week to get futures vol
      const futuresMap = new Map()
      let offset = 0
      const PAGE = 1000
      while (true) {
        const { data, error } = await supabase
          .from('leaderboard_weekly')
          .select('account_id, cumulative_volume')
          .eq('week_number', week)
          .range(offset, offset + PAGE - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        for (const row of data) {
          futuresMap.set(String(row.account_id), parseFloat(row.cumulative_volume) || 0)
        }
        if (data.length < PAGE) break
        offset += PAGE
      }

      // Build upsert payload: all accounts with spot data
      const allAccountIds = new Set([...spotByAccountId.keys(), ...futuresMap.keys()])
      const payload = []
      for (const accountId of allAccountIds) {
        const spotEntry = spotByAccountId.get(accountId)
        const spotVol = spotEntry?.spot_vol || 0
        const futuresVol = futuresMap.get(accountId) || 0
        const sodexTotal = spotVol + futuresVol

        if (sodexTotal > 0) {
          payload.push({
            account_id: parseInt(accountId),
            wallet_address: spotEntry?.wallet_address || '',
            sodex_total_volume: sodexTotal,
          })
        }
      }

      // Batch upsert via RPC
      let totalTouched = 0
      for (let i = 0; i < payload.length; i += BATCH) {
        const batch = payload.slice(i, i + BATCH)
        const { data, error } = await supabase.rpc('backfill_weekly_spot_volume', {
          p_week: week,
          rows: batch,
        })
        if (error) throw error
        totalTouched += data || 0
      }

      results[`week_${week}`] = {
        commit: commitSha,
        spotEntries: spotByAccountId.size,
        futuresEntries: futuresMap.size,
        payloadSize: payload.length,
        touched: totalTouched,
      }
    } catch (err) {
      results[`week_${week}`] = { error: err.message }
    }
  }

  return NextResponse.json({ success: true, results })
}
