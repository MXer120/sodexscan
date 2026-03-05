#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const API = 'https://mainnet-data.sodex.dev/api/v1/leaderboard'

async function fetchPage(page, pageSize) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API}?window_type=ALL_TIME&page=${page}&page_size=${pageSize}`)
      if (!res.ok) { await new Promise(r => setTimeout(r, 1000)); continue }
      const json = await res.json()
      if (json.code === 0 && json.data?.items) return json.data
      await new Promise(r => setTimeout(r, 1000))
    } catch { await new Promise(r => setTimeout(r, 2000)) }
  }
  return null
}

async function fetchOfficialWallets() {
  console.log('Fetching official leaderboard (ALL_TIME)...')
  const PAGE_SIZE = 50
  const wallets = new Set()

  // Get total from first page
  const first = await fetchPage(1, PAGE_SIZE)
  if (!first) { console.error('Failed to fetch first page'); return wallets }
  const total = first.total
  const totalPages = Math.ceil(total / PAGE_SIZE)
  console.log(`  Total: ${total} entries, ${totalPages} pages (size ${PAGE_SIZE})`)
  for (const item of first.items) wallets.add(item.wallet_address.toLowerCase())

  // Fetch remaining in parallel batches of 10
  const BATCH = 10
  for (let start = 2; start <= totalPages; start += BATCH) {
    const pages = []
    for (let p = start; p < start + BATCH && p <= totalPages; p++) pages.push(p)
    const results = await Promise.all(pages.map(p => fetchPage(p, PAGE_SIZE)))
    for (const r of results) {
      if (r?.items) for (const item of r.items) wallets.add(item.wallet_address.toLowerCase())
    }
    if ((start - 1) % 200 === 0) console.log(`  Page ${start}/${totalPages} (${wallets.size} wallets)`)
  }

  console.log(`  Official wallets: ${wallets.size}`)
  return wallets
}

async function fetchOurWallets() {
  console.log('Fetching leaderboard table...')
  const all = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('wallet_address, cumulative_volume, is_sodex_owned')
      .range(from, from + 999)
    if (error) { console.error('DB error:', error); break }
    if (!data?.length) break
    all.push(...data)
    from += 1000
    if (from % 10000 === 0) console.log(`  ${all.length} rows...`)
    if (data.length < 1000) break
  }
  console.log(`  Our wallets: ${all.length}`)
  return all
}

async function main() {
  const [officialWallets, ourWallets] = await Promise.all([
    fetchOfficialWallets(),
    fetchOurWallets()
  ])

  const activeWallets = ourWallets.filter(w => (w.cumulative_volume || 0) > 0)
  console.log(`\nActive (volume > 0): ${activeWallets.length}`)

  const sodexWallets = []
  let needMarkSodex = 0, needUnmarkSodex = 0, correctReal = 0, correctSodex = 0

  for (const row of activeWallets) {
    const addr = row.wallet_address.toLowerCase()
    const isSodex = row.is_sodex_owned === true
    const inOfficial = officialWallets.has(addr)
    if (inOfficial) { isSodex ? needUnmarkSodex++ : correctReal++ }
    else { sodexWallets.push(addr); isSodex ? correctSodex++ : needMarkSodex++ }
  }

  console.log('\n--- DIFF ---')
  console.log(`Real (in official):  ${activeWallets.length - sodexWallets.length} (${needUnmarkSodex} wrongly marked)`)
  console.log(`Sodex (not in off):  ${sodexWallets.length} (${needMarkSodex} need marking)`)
  console.log(`Correct real: ${correctReal}, Correct sodex: ${correctSodex}`)

  const lines = [
    '-- Auto-generated: sync is_sodex_owned with official leaderboard',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Official: ${officialWallets.size}, Active ours: ${activeWallets.length}, Sodex: ${sodexWallets.length}`,
    '',
    '-- Step 1: Reset all',
    'UPDATE leaderboard SET is_sodex_owned = false WHERE is_sodex_owned = true;',
    'UPDATE leaderboard_weekly SET is_sodex_owned = false WHERE is_sodex_owned = true;',
    ''
  ]

  if (sodexWallets.length > 0) {
    lines.push(`-- Step 2: Mark ${sodexWallets.length} sodex-owned wallets`)
    for (let i = 0; i < sodexWallets.length; i += 500) {
      const batch = sodexWallets.slice(i, i + 500)
      const inList = batch.map(w => `'${w}'`).join(',')
      lines.push(`UPDATE leaderboard SET is_sodex_owned = true WHERE lower(wallet_address) IN (${inList});`)
      lines.push(`UPDATE leaderboard_weekly SET is_sodex_owned = true WHERE lower(wallet_address) IN (${inList});`)
    }
  }

  const path = resolve(__dirname, '..', 'supabase', 'migrations', '20260305000002_sync_sodex_owned.sql')
  writeFileSync(path, lines.join('\n') + '\n')
  console.log(`\nMigration: supabase/migrations/20260305000002_sync_sodex_owned.sql`)
}

main().catch(err => { console.error(err); process.exit(1) })
