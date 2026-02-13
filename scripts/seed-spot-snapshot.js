import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SODEX_SPOT_WALLETS = new Set([
  '0xc50e42e7f49881127e8183755be3f281bb687f7b',
  '0x1f446dfa225d5c9e8a80cd227bf57444fc141332',
  '0x4b16ce4edb6bfea22aa087fb5cb3cfd654ca99f5'
])

async function main() {
  const weekNumber = parseInt(process.argv[2] || '1', 10)
  console.log(`Seeding spot snapshot for week ${weekNumber}...`)

  const filePath = resolve('public/data/spot_vol_data.json')
  const spotData = JSON.parse(readFileSync(filePath, 'utf-8'))

  const rows = []
  for (const [address, data] of Object.entries(spotData)) {
    if (SODEX_SPOT_WALLETS.has(address.toLowerCase())) continue
    rows.push({
      week_number: weekNumber,
      wallet_address: address.toLowerCase(),
      volume: data.vol || 0,
      user_id: data.userId || null,
      last_ts: data.last_ts ? String(data.last_ts) : null,
      snapshot_at: new Date().toISOString()
    })
  }

  console.log(`Found ${rows.length} wallets (excl. sodex)`)

  const batchSize = 500
  let upserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase
      .from('spot_volume_snapshots')
      .upsert(batch, { onConflict: 'week_number,wallet_address' })
    if (error) { console.error('Upsert error:', error); process.exit(1) }
    upserted += batch.length
    console.log(`Upserted ${upserted}/${rows.length}`)
  }

  console.log(`Done! Seeded ${upserted} rows for week ${weekNumber}`)
}

main().catch(console.error)
