const fs = require('fs')

// Load CSV
const csv = fs.readFileSync('public/data/adresses.csv', 'utf-8')
const csvLines = csv.trim().split('\n').slice(1) // Skip header

// Load JSON
const json = JSON.parse(fs.readFileSync('src/data/wallet_points.json', 'utf-8'))

// Extract first 5 CSV addresses
const csvAddrs = csvLines.slice(0, 5).map(line => {
  const match = line.match(/"([^"]+)"/)
  return match ? match[1] : null
}).filter(Boolean)

// Get first 5 JSON addresses
const jsonAddrs = Object.keys(json).slice(0, 5)

console.log('=== CSV Addresses (first 5) ===')
csvAddrs.forEach(addr => console.log(addr))

console.log('\n=== JSON Addresses (first 5) ===')
jsonAddrs.forEach(addr => console.log(addr))

console.log('\n=== Cross-check ===')
csvAddrs.forEach(csvAddr => {
  const exactMatch = json[csvAddr] !== undefined
  const caseInsensitiveKey = Object.keys(json).find(k => k.toLowerCase() === csvAddr.toLowerCase())
  console.log(`CSV: ${csvAddr}`)
  console.log(`  Exact match: ${exactMatch}`)
  console.log(`  Case-insensitive match: ${caseInsensitiveKey !== undefined}`)
  if (caseInsensitiveKey) {
    console.log(`  JSON key: ${caseInsensitiveKey}`)
    console.log(`  Points: ${json[caseInsensitiveKey].points}`)
  }
  console.log('')
})

// Summary stats
const csvTotal = csvLines.length
const jsonTotal = Object.keys(json).length
console.log(`\n=== Summary ===`)
console.log(`Total CSV addresses: ${csvTotal}`)
console.log(`Total JSON addresses: ${jsonTotal}`)

// Check for case mismatches in all data
let caseMismatches = 0
csvLines.forEach(line => {
  const match = line.match(/"([^"]+)"/)
  if (!match) return
  const addr = match[1]
  if (!json[addr]) {
    const caseInsensitiveMatch = Object.keys(json).find(k => k.toLowerCase() === addr.toLowerCase())
    if (caseInsensitiveMatch) {
      caseMismatches++
    }
  }
})
console.log(`Case mismatches found: ${caseMismatches}`)
