'use client'
import React, { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { supabase } from '../../lib/supabaseClient'

const DISCLAIMER = 'We never hold your keys or execute trades for you. You choose if and when to trade. Simulated rankings use hypothetical past performance — not indicative of future results. Not financial advice.'

export default function FollowModal({ leaderWallet, initialInverse = false, onClose, onSuccess }) {
  const [mode, setMode] = useState('ratio')
  const [copyRatio, setCopyRatio] = useState(0.1)
  const [fixedUsd, setFixedUsd] = useState('')
  const [maxNotional, setMaxNotional] = useState('')
  const [inverse, setInverse] = useState(initialInverse)
  const [stopLossPct, setStopLossPct] = useState('')
  const [maxPositions, setMaxPositions] = useState('')
  const [channels, setChannels] = useState({ telegram: true, discord: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please log in first')

      const { error: err } = await supabase.from('leader_subscriptions').upsert({
        user_id: user.id,
        leader_wallet: leaderWallet.toLowerCase(),
        copy_ratio: mode === 'ratio' ? copyRatio : 0.1,
        max_notional: maxNotional ? parseFloat(maxNotional) : null,
        channels,
        enabled: true,
        inverse,
        mode,
        fixed_usd: mode === 'fixed' && fixedUsd ? parseFloat(fixedUsd) : null,
        stop_loss_pct: stopLossPct ? parseFloat(stopLossPct) : null,
        max_positions: maxPositions ? parseInt(maxPositions, 10) : null,
      }, { onConflict: 'user_id,leader_wallet' })

      if (err) throw err
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="bg-card border border-border rounded-xl p-7 w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col gap-5 text-card-foreground">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-base font-semibold text-foreground">
            {inverse ? 'Follow (Inverse Mode)' : 'Follow for Signals'}
          </h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="px-4 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          {DISCLAIMER}
        </div>

        {/* Wallet */}
        <div className="text-xs text-muted-foreground">
          Wallet: <code className="text-[11px]">{leaderWallet.slice(0, 10)}…{leaderWallet.slice(-8)}</code>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Inverse mode toggle */}
          <div
            className={cn(
              'px-4 py-3 rounded-lg border',
              inverse ? 'border-red-500/30 bg-red-500/10' : 'border-border bg-muted/40',
            )}
          >
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={inverse}
                onChange={e => setInverse(e.target.checked)}
                className="mt-0.5 flex-shrink-0"
                style={{ accentColor: '#ef4444', width: 15, height: 15 }}
              />
              <span>
                <span className={cn('text-sm font-semibold', inverse ? 'text-red-500' : 'text-foreground')}>
                  Inverse mode — receive signal for OPPOSITE side
                </span>
                <br />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  If the trader opens a Long, you receive a Short signal. Useful for betting against consistently poor traders.
                </span>
              </span>
            </label>
          </div>

          {/* Mode selector */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Position sizing mode</span>
            <div className="flex gap-2">
              {[
                { value: 'ratio', label: 'Proportional (ratio)' },
                { value: 'fixed', label: 'Fixed USD per trade' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 cursor-pointer px-3 py-2 rounded-md text-xs border font-medium transition-colors',
                    mode === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted',
                  )}
                >
                  <input
                    type="radio" name="mode" value={opt.value}
                    checked={mode === opt.value}
                    onChange={() => setMode(opt.value)}
                    className="hidden"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Ratio slider */}
          {mode === 'ratio' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">
                Copy ratio — simulated position size relative to leader ({(copyRatio * 100).toFixed(0)}%)
              </span>
              <input
                type="range" min="0.01" max="1" step="0.01"
                value={copyRatio}
                onChange={e => setCopyRatio(parseFloat(e.target.value))}
                style={{ accentColor: 'var(--primary)' }}
              />
              <span className="text-xs text-muted-foreground text-right">{(copyRatio * 100).toFixed(0)}%</span>
            </label>
          )}

          {/* Fixed USD */}
          {mode === 'fixed' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Fixed USD amount per trade</span>
              <Input
                type="number" min="1" step="1" placeholder="e.g. 100"
                value={fixedUsd}
                onChange={e => setFixedUsd(e.target.value)}
              />
            </label>
          )}

          {/* Max notional */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Max notional per trade (USD, optional)</span>
            <Input
              type="number" min="1" step="1" placeholder="e.g. 500"
              value={maxNotional}
              onChange={e => setMaxNotional(e.target.value)}
            />
          </label>

          {/* Stop-loss */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Auto-stop if follower loss exceeds X% (optional)</span>
            <Input
              type="number" min="0.5" max="100" step="0.5" placeholder="e.g. 10"
              value={stopLossPct}
              onChange={e => setStopLossPct(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">Leave blank to disable. Signals will be paused once cumulative loss hits this threshold.</span>
          </label>

          {/* Max positions */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Max open positions (optional)</span>
            <Input
              type="number" min="1" step="1" placeholder="e.g. 5"
              value={maxPositions}
              onChange={e => setMaxPositions(e.target.value)}
            />
          </label>

          {/* Channels */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Signal delivery channels</span>
            <div className="flex gap-4">
              {Object.keys(channels).map(ch => (
                <label key={ch} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels[ch]}
                    onChange={e => setChannels(prev => ({ ...prev, [ch]: e.target.checked }))}
                  />
                  {ch.charAt(0).toUpperCase() + ch.slice(1)}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground m-0">Configure channel addresses in your Profile → Alerts settings.</p>
          </div>

          {error && <div className="text-xs text-red-500">{error}</div>}

          <Button
            type="submit"
            disabled={saving}
            variant={inverse ? 'destructive' : 'default'}
            className="w-full"
          >
            {saving ? 'Saving…' : inverse ? 'Follow (Inverse)' : 'Follow for signals'}
          </Button>
        </form>
      </div>
    </div>
  )
}
