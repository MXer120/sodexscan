'use client'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReferrals } from '../../../hooks/useReferrals'
import { useSessionContext } from '../../../lib/SessionContext'
import { supabase } from '../../../lib/supabaseClient'

const BASE_URL = 'https://sodex.com/join/'

export default function ReferralCodeWidget({ settings = {} }) {
  const showCode     = settings.showCode     !== false
  const showDiscord  = settings.showDiscord  !== false
  const showTelegram = settings.showTelegram !== false

  const { user } = useSessionContext()
  const { referrals, isLoading } = useReferrals()
  const [search, setSearch] = useState('')

  const { data: myCode } = useQuery({
    queryKey: ['my-referral-code', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single()
      return data?.referral_code ?? null
    },
    enabled: !!user?.id,
  })

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
      {myCode && (
        <div style={{
          marginBottom: 10, padding: '6px 10px',
          background: 'var(--color-overlay-subtle)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 6, fontSize: 12,
        }}>
          <span style={{ color: 'var(--color-text-muted)', marginRight: 6 }}>Your code:</span>
          <a href={`${BASE_URL}${myCode}`} target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
            {myCode}
          </a>
        </div>
      )}
      <input
        type="text"
        placeholder="Search codes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '6px 10px', marginBottom: 8,
          background: 'var(--color-overlay-subtle)', border: '1px solid var(--color-border-subtle)',
          borderRadius: 6, color: 'var(--color-text-main)', fontSize: 12, outline: 'none'
        }}
      />
      <table>
        <thead>
          <tr>
            {showCode     && <th>Code</th>}
            {showDiscord  && <th>Discord</th>}
            {showTelegram && <th>Telegram</th>}
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              {showCode && (
                <td>
                  <a href={`${BASE_URL}${r.ref_code}`} target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                    {r.ref_code}
                  </a>
                </td>
              )}
              {showDiscord && (
                <td style={{ color: r.dc_username ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}>
                  {r.dc_username || '-'}
                </td>
              )}
              {showTelegram && (
                <td style={{ color: r.tg_username ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}>
                  {r.tg_username || r.tg_displayname || '-'}
                </td>
              )}
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
