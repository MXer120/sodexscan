'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState({
    leaderboard: { count: 0, lastSync: null, status: 'unknown' }
    // Disabled due to 404 errors - these tables don't exist or are inaccessible:
    // accounts, positions, history, withdrawals, balances, pnl
  })
  const [refreshing, setRefreshing] = useState(false)
  const [lastFullSync, setLastFullSync] = useState(null)

  useEffect(() => {
    loadSyncStatus()
    const interval = setInterval(loadSyncStatus, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [])

  const loadSyncStatus = async () => {
    try {
      // Only query leaderboard - other tables return 404
      const leaderboard = await supabase.from('leaderboard').select('count', { count: 'exact', head: true })
      const leaderboardLast = await supabase.from('leaderboard').select('updated_at').order('updated_at', { ascending: false }).limit(1).single()

      /* DISABLED - These tables return 404 errors:
      const [accounts, positions, history, withdrawals, balances, pnl] = await Promise.all([
        supabase.from('account_mapping').select('count', { count: 'exact', head: true }),
        supabase.from('open_positions').select('count', { count: 'exact', head: true }),
        supabase.from('position_history').select('count', { count: 'exact', head: true }),
        supabase.from('withdrawals').select('count', { count: 'exact', head: true }),
        supabase.from('spot_balances').select('count', { count: 'exact', head: true }),
        supabase.from('pnl_history').select('count', { count: 'exact', head: true })
      ])
      */

      const now = Date.now()
      const getStatus = (lastSync) => {
        if (!lastSync) return 'unknown'
        const age = now - new Date(lastSync).getTime()
        if (age < 20 * 60 * 1000) return 'ok' // < 20min = ok
        if (age < 60 * 60 * 1000) return 'warning' // < 1hr = warning
        return 'error' // > 1hr = error
      }

      setSyncStatus({
        leaderboard: {
          count: leaderboard.count || 0,
          lastSync: leaderboardLast.data?.updated_at || null,
          status: getStatus(leaderboardLast.data?.updated_at)
        }
      })

      // Set last full sync to leaderboard's last sync
      if (leaderboardLast.data?.updated_at) {
        setLastFullSync(new Date(leaderboardLast.data.updated_at))
      }
    } catch (err) {
      console.error('Failed to load sync status:', err)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' })
      })
      const data = await res.json()
      console.log('Sync result:', data)
      await loadSyncStatus()
    } catch (err) {
      console.error('Refresh failed:', err)
    }
    setRefreshing(false)
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = Date.now()
    const diff = now - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleString()
  }

  const getStatusColor = (status) => {
    if (status === 'ok') return '#4ade80'
    if (status === 'warning') return '#fbbf24'
    if (status === 'error') return '#f87171'
    return '#6b7280'
  }

  const getStatusIcon = (status) => {
    if (status === 'ok') return '✓'
    if (status === 'warning') return '⚠'
    if (status === 'error') return '✕'
    return '?'
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        title="Debug Panel"
      >
        {isOpen ? '×' : '⚙'}
      </button>

      {/* Debug panel */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          width: '380px',
          maxHeight: '600px',
          background: '#1a1a1a',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 9998,
          color: '#fff',
          overflow: 'hidden',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Sync Status</span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 12px',
                color: 'white',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              {refreshing ? 'Syncing...' : '↻ Refresh'}
            </button>
          </div>

          {/* Last full sync */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>Last Full Sync</div>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
              {lastFullSync ? formatTime(lastFullSync.toISOString()) : 'Unknown'}
            </div>
          </div>

          {/* Sync items */}
          <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
            {Object.entries(syncStatus).map(([key, status]) => (
              <div key={key} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '8px',
                border: `1px solid ${getStatusColor(status.status)}33`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'capitalize' }}>
                    {key}
                  </span>
                  <span style={{
                    color: getStatusColor(status.status),
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}>
                    {getStatusIcon(status.status)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999' }}>
                  <span>Count: <span style={{ color: '#fff' }}>{status.count.toLocaleString()}</span></span>
                  <span>Last: <span style={{ color: '#fff' }}>{formatTime(status.lastSync)}</span></span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.2)',
            fontSize: '10px',
            color: '#666',
            textAlign: 'center'
          }}>
            Auto-updates every 30s
          </div>
        </div>
      )}
    </>
  )
}
