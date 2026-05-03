'use client'
import React, { useState, useRef } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import CopyableAddress from '../../ui/CopyableAddress'

export default function ReverseSearchWidget({ config, editMode = true }) {
  const showHelpers = config?.showHelpers !== false
  const [inputChars, setInputChars] = useState(Array(8).fill(''))
  const inputRefs = useRef([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCharChange = (index, value) => {
    if (value === ' ') {
      const newChars = [...inputChars]
      newChars[index] = ''
      setInputChars(newChars)
      if (index < 7) inputRefs.current[index + 1]?.focus()
      return
    }
    if (value.length > 1) value = value.slice(-1)
    const newChars = [...inputChars]
    newChars[index] = value
    setInputChars(newChars)
    if (value && index < 7) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !inputChars[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleSearch = async () => {
    const startBlock = inputChars.slice(0, 4)
    const filledStart = startBlock.filter(c => c && c.trim()).length
    if (filledStart < 2) { setError('Enter at least 2 start characters.'); return }
    setLoading(true); setError(''); setResults([])
    try {
      const toPattern = (block) => block.map(c => (c && c.trim()) ? c : '_').join('')
      const pattern = `0x${toPattern(startBlock)}%${toPattern(inputChars.slice(4, 8))}`
      const { data: wallets, error: searchError } = await supabase
        .from('publicdns')
        .select('wallet_address, dc_username, tg_username, ref_code')
        .ilike('wallet_address', pattern)
        .limit(50)
      if (searchError) throw searchError
      if (!wallets || wallets.length === 0) { setError('No matches found.'); setLoading(false); return }
      const combined = wallets.map(row => ({
        wallet: row.wallet_address, referralCode: row.ref_code, telegram: row.tg_username, discord: row.dc_username
      }))
      setResults(combined)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: 32, height: 40, borderRadius: 6,
    border: '1px solid var(--color-border-subtle)', background: 'var(--color-overlay-subtle)',
    color: 'var(--color-text-main)', fontSize: 16, textAlign: 'center', fontFamily: 'monospace', outline: 'none'
  }

  return (
    <div style={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {editMode && <span style={{ fontFamily: 'monospace', fontSize: 14, color: 'var(--color-text-secondary)', marginRight: 4 }}>0x</span>}
        {[0,1,2,3].map(i => (
          <input key={i} ref={el => { inputRefs.current[i] = el }} type="text" maxLength={1}
            style={inputStyle} value={inputChars[i]}
            onChange={e => handleCharChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} />
        ))}
        {showHelpers && <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'bold', margin: '0 4px' }}>..</span>}
        {[4,5,6,7].map(i => (
          <input key={i} ref={el => { inputRefs.current[i] = el }} type="text" maxLength={1}
            style={inputStyle} value={inputChars[i]}
            onChange={e => handleCharChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <button onClick={handleSearch} disabled={loading} style={{
          maxWidth: 200, width: '100%', padding: '6px 12px', background: 'var(--color-primary)', color: '#000',
          border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer'
        }}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      {error && <div style={{ color: 'var(--color-error)', fontSize: 11, marginBottom: 8 }}>{error}</div>}
      {results.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Address</th>
              <th>Ref</th>
              <th>TG</th>
              <th>DC</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td><CopyableAddress address={r.wallet} /></td>
                <td>{r.referralCode || '-'}</td>
                <td>{r.telegram || '-'}</td>
                <td>{r.discord || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
