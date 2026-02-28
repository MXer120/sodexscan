'use client'
import { useState, useMemo } from 'react'
import { useReferrals } from '../../../hooks/useReferrals'

const BASE_URL = 'https://sodex.com/join/'

export default function ReferralCodeWidget() {
  const { referrals, isLoading } = useReferrals()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return referrals.slice(0, 20)
    const term = search.toLowerCase()
    return referrals
      .filter(r => r.ref_code.toLowerCase().includes(term) ||
        r.dc_username?.toLowerCase().includes(term) ||
        r.tg_username?.toLowerCase().includes(term))
      .slice(0, 20)
  }, [referrals, search])

  if (isLoading) return <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Loading...</div>

  return (
    <div>
      <input
        type="text"
        placeholder="Search codes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '6px 10px', marginBottom: 8,
          background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border-subtle)',
          borderRadius: 6, color: 'var(--color-text-main)', fontSize: 12, outline: 'none'
        }}
      />
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Discord</th>
            <th>Telegram</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td>
                <a href={`${BASE_URL}${r.ref_code}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                  {r.ref_code}
                </a>
              </td>
              <td style={{ color: r.dc_username ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}>
                {r.dc_username || '-'}
              </td>
              <td style={{ color: r.tg_username ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}>
                {r.tg_username || r.tg_displayname || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8, textAlign: 'center' }}>
        {referrals.length} codes total
      </div>
    </div>
  )
}
