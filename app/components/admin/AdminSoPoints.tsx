'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

function Toggle({ label, checked, onChange }) {
  return (
    <label className="admin-toggle" style={{ gap: '0.5rem' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="admin-toggle-track">
        <span className="admin-toggle-thumb" />
      </span>
      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-main)' }}>{label}</span>
    </label>
  )
}

const DEFAULT_CONFIG = {
  include_spot: true,
  include_futures: true,
  spot_multiplier: 2.0,
  notes: '',
}

export default function AdminSoPoints() {
  const [allWeeks, setAllWeeks] = useState([])
  const [weekNum, setWeekNum] = useState(1)
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  async function loadAll() {
    const { data } = await supabase
      .from('sopoints_week_config')
      .select('week_num, include_spot, include_futures, spot_multiplier, notes, updated_at')
      .order('week_num', { ascending: false })
    setAllWeeks(data || [])
    return data || []
  }

  async function loadWeek(num) {
    setLoading(true)
    const { data } = await supabase
      .from('sopoints_week_config')
      .select('week_num, include_spot, include_futures, spot_multiplier, notes, updated_at')
      .eq('week_num', num)
      .single()
    setConfig(data ? {
      include_spot: data.include_spot,
      include_futures: data.include_futures,
      spot_multiplier: data.spot_multiplier ?? 2.0,
      notes: data.notes || '',
    } : DEFAULT_CONFIG)
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      const weeks = await loadAll()
      const maxWeek = weeks.length > 0 ? weeks[0].week_num : 1
      setWeekNum(maxWeek)
      await loadWeek(maxWeek)
    }
    init()
  }, [])

  function handleWeekChange(val) {
    const num = Math.max(1, parseInt(val) || 1)
    setWeekNum(num)
    loadWeek(num)
  }

  async function save() {
    setSaving(true)
    setStatus(null)
    const { error } = await supabase
      .from('sopoints_week_config')
      .upsert({
        week_num: weekNum,
        include_spot: config.include_spot,
        include_futures: config.include_futures,
        spot_multiplier: config.spot_multiplier || 2.0,
        notes: config.notes,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'week_num' })
    setSaving(false)
    if (error) { setError(error.message); return }
    setStatus('Saved')
    loadAll()
    setTimeout(() => setStatus(null), 2000)
  }

  return (
    <>
      <h2>SoPoints Week Config</h2>

      <div className="admin-number-row" style={{ marginBottom: '1.25rem' }}>
        <label style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Week</label>
        <input
          type="number"
          className="admin-input admin-number-input"
          min={1}
          value={weekNum}
          onChange={e => handleWeekChange(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="admin-loading">Loading week {weekNum}...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <Toggle
              label="Include Spot"
              checked={config.include_spot}
              onChange={val => setConfig(c => ({ ...c, include_spot: val }))}
            />
            <Toggle
              label="Include Futures"
              checked={config.include_futures}
              onChange={val => setConfig(c => ({ ...c, include_futures: val }))}
            />
          </div>

          <div className="admin-form-group" style={{ maxWidth: 200 }}>
            <label>Spot Multiplier</label>
            <input
              type="number"
              className="admin-input"
              step="0.1"
              min="0"
              value={config.spot_multiplier}
              onChange={e => setConfig(c => ({ ...c, spot_multiplier: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div className="admin-form-group">
            <label>Notes</label>
            <textarea
              className="admin-textarea"
              rows={3}
              value={config.notes}
              onChange={e => setConfig(c => ({ ...c, notes: e.target.value }))}
              placeholder="Optional notes for this week..."
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="admin-btn" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save Week ' + weekNum}
            </button>
            {status && <span className="admin-status-ok">{status}</span>}
            {error && <span className="admin-status-err">{error}</span>}
          </div>
        </div>
      )}

      {allWeeks.length > 0 && (
        <>
          <h2 style={{ marginTop: '1.5rem' }}>All Week Configs</h2>
          <div className="admin-week-list">
            {allWeeks.map(w => (
              <div
                key={w.week_num}
                className="admin-week-card"
                style={{ cursor: 'pointer' }}
                onClick={() => { setWeekNum(w.week_num); loadWeek(w.week_num) }}
              >
                <span className="week-label">Week {w.week_num}</span>
                <span className="week-detail">
                  Spot: {w.include_spot ? 'on' : 'off'} &middot;
                  Futures: {w.include_futures ? 'on' : 'off'} &middot;
                  Multiplier: {w.spot_multiplier}x
                </span>
                {w.notes && (
                  <span className="week-detail" style={{ fontStyle: 'italic' }}>
                    {w.notes.slice(0, 60)}{w.notes.length > 60 ? '...' : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
