#!/usr/bin/env node
/**
 * Export historical weekly leaderboard data from Supabase to JSON files.
 * Computes deltas (same logic as get_weekly_leaderboard RPC).
 * Output: public/data/leaderboard/week-{N}.json
 *
 * Usage: node scripts/export-weekly-lb.mjs [--weeks 1,2,3] [--push]
 *   --weeks: comma-separated week numbers (default: all frozen weeks 1..current-1)
 *   --push:  git add + commit + push to data repo after export
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()
const OUT_DIR = resolve(ROOT, 'public/data/leaderboard')

// Load .env.local (local dev only — in CI, env vars are set by GitHub secrets)
function loadEnv() {
  const envPath = resolve(ROOT, '.env.local')
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf-8').replace(/\r/g, '').split('\n')
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !process.env[key]) process.env[key] = val
  }
}

loadEnv()

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fetchAllRows(weekNumber) {
  const rows = []
  let offset = 0
  const limit = 1000
  while (true) {
    const { data, error } = await supabase
      .from('leaderboard_weekly')
      .select('account_id, wallet_address, cumulative_pnl, cumulative_volume, unrealized_pnl, pnl_rank, volume_rank, sodex_total_volume, sodex_pnl, is_sodex_owned')
      .eq('week_number', weekNumber)
      .range(offset, offset + limit - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < limit) break
    offset += limit
  }
  return rows
}

function computeDeltas(currentRows, prevRows, weekNumber) {
  const prevMap = new Map()
  for (const r of prevRows) prevMap.set(r.account_id, r)

  const noPrev = prevRows.length === 0 || weekNumber === 1

  return currentRows
    .map(cw => {
      const pw = prevMap.get(cw.account_id)
      const weeklyPnl = noPrev
        ? parseFloat(cw.cumulative_pnl) || 0
        : (parseFloat(cw.cumulative_pnl) || 0) - (parseFloat(pw?.cumulative_pnl) || 0)
      const weeklyVolume = noPrev
        ? parseFloat(cw.cumulative_volume) || 0
        : (parseFloat(cw.cumulative_volume) || 0) - (parseFloat(pw?.cumulative_volume) || 0)
      const weeklySodexVol = noPrev
        ? parseFloat(cw.sodex_total_volume) || 0
        : (parseFloat(cw.sodex_total_volume) || 0) - (parseFloat(pw?.sodex_total_volume) || 0)
      const weeklySodexPnl = noPrev
        ? parseFloat(cw.sodex_pnl) || 0
        : (parseFloat(cw.sodex_pnl) || 0) - (parseFloat(pw?.sodex_pnl) || 0)
      const weeklySpotVol = Math.max(weeklySodexVol - weeklyVolume, 0)
      const weeklySpotPnl = weeklySodexPnl - weeklyPnl

      // Skip rows with no activity
      if (weeklyVolume <= 0 && weeklySodexVol <= 0) return null

      return {
        a: cw.account_id,
        w: cw.wallet_address,
        pnl: round(weeklyPnl),
        vol: round(weeklyVolume),
        upnl: round(parseFloat(cw.unrealized_pnl) || 0),
        pr: cw.pnl_rank,
        vr: cw.volume_rank,
        sv: round(weeklySodexVol),
        sp: round(weeklySodexPnl),
        spv: round(weeklySpotVol),
        spp: round(weeklySpotPnl),
        sox: cw.is_sodex_owned === true ? 1 : 0
      }
    })
    .filter(Boolean)
}

function round(n) {
  return Math.round(n * 100) / 100
}

async function exportWeek(weekNumber) {
  console.log(`Exporting week ${weekNumber}...`)
  const [currentRows, prevRows] = await Promise.all([
    fetchAllRows(weekNumber),
    weekNumber > 1 ? fetchAllRows(weekNumber - 1) : Promise.resolve([])
  ])

  console.log(`  Week ${weekNumber}: ${currentRows.length} rows, prev: ${prevRows.length} rows`)

  const rows = computeDeltas(currentRows, prevRows, weekNumber)
  console.log(`  ${rows.length} rows with activity`)

  const output = { week: weekNumber, exported_at: new Date().toISOString(), rows }

  mkdirSync(OUT_DIR, { recursive: true })
  const outPath = resolve(OUT_DIR, `week-${weekNumber}.json`)
  writeFileSync(outPath, JSON.stringify(output))
  const size = (JSON.stringify(output).length / 1024).toFixed(1)
  console.log(`  Saved ${outPath} (${size} KB)`)
  return rows.length
}

async function main() {
  const args = process.argv.slice(2)
  const weeksArg = args.find(a => a.startsWith('--weeks='))

  // Get current week from meta
  const { data: meta, error: metaErr } = await supabase
    .from('leaderboard_meta')
    .select('current_week_number')
    .eq('id', 1)
    .single()
  if (metaErr) throw metaErr

  const currentWeek = meta.current_week_number
  console.log(`Current week in meta: ${currentWeek}`)
  console.log(`Latest frozen week: ${currentWeek - 1}`)

  // Read existing manifest to know what's already exported
  const manifestPath = resolve(OUT_DIR, 'manifest.json')
  let existingWeeks = []
  if (existsSync(manifestPath)) {
    const m = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    existingWeeks = m.available_weeks || []
    console.log(`Already exported: weeks ${existingWeeks.join(', ')}`)
  }

  let weeks
  if (weeksArg) {
    // Manual override: only allow explicit --weeks flag
    weeks = weeksArg.replace('--weeks=', '').split(',').map(Number)
    console.log(`Manual export requested: weeks ${weeks.join(', ')}`)
  } else {
    // Auto mode: only export the LATEST frozen week, and only if not already exported
    const latestFrozen = currentWeek - 1
    if (latestFrozen < 1) {
      console.log('No frozen weeks to export.')
      return
    }
    if (existingWeeks.includes(latestFrozen)) {
      console.log(`Week ${latestFrozen} already exported. Nothing to do.`)
      return
    }
    weeks = [latestFrozen]
  }

  // Skip weeks that already have a JSON file (never overwrite historical data)
  const toExport = []
  for (const w of weeks) {
    const weekPath = resolve(OUT_DIR, `week-${w}.json`)
    if (existsSync(weekPath)) {
      console.log(`Skipping week ${w}: already exported (file exists)`)
    } else {
      toExport.push(w)
    }
  }

  if (toExport.length === 0) {
    console.log('All requested weeks already exported. Nothing to do.')
    return
  }

  console.log(`Exporting weeks: ${toExport.join(', ')}`)
  let totalNewRows = 0
  for (const w of toExport) {
    totalNewRows += await exportWeek(w)
  }

  // Update manifest (merge with existing)
  const allWeeks = [...new Set([...existingWeeks, ...toExport])].sort((a, b) => a - b)
  const manifest = {
    last_updated: new Date().toISOString(),
    current_week: currentWeek,
    available_weeks: allWeeks
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`\nManifest updated. Available weeks: ${allWeeks.join(', ')}`)
  console.log(`New rows exported: ${totalNewRows}`)
}

main().catch(err => {
  console.error('Export failed:', err)
  process.exit(1)
})
