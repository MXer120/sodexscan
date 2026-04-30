'use client'
import { useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { supabase } from '../../lib/supabaseClient'

const STEPS = ['Mode', 'Amount', 'Channels', 'Confirm']

function StepIndicator({ step }) {
  return (
    <div className="flex gap-1 items-center mb-5 flex-wrap">
      {STEPS.map((label, i) => {
        const active = i === step
        const done = i < step
        return (
          <span key={label} className="flex items-center gap-1">
            <span
              className={cn(
                'inline-flex items-center text-[11px] px-2.5 py-1 rounded-full font-semibold border',
                active && 'bg-primary text-primary-foreground border-primary',
                done && 'bg-primary/20 text-primary border-primary',
                !active && !done && 'bg-muted text-muted-foreground border-border',
              )}
            >
              {i + 1} {label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="size-3 text-muted-foreground" />
            )}
          </span>
        )
      })}
    </div>
  )
}

function RadioCard({ selected, onClick, title, subtitle }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'px-4 py-3 rounded-lg cursor-pointer mb-2 border transition-colors',
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-muted/40 hover:bg-muted',
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'size-3.5 rounded-full flex-shrink-0 border-2 transition-colors',
            selected ? 'bg-primary border-primary' : 'border-border',
          )}
        />
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
      </div>
    </div>
  )
}

function CheckCard({ checked, onClick, label, subtitle, danger = false }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'px-4 py-3 rounded-lg cursor-pointer mb-2 border transition-colors',
        checked && danger && 'border-red-500 bg-red-500/10',
        checked && !danger && 'border-primary bg-primary/10',
        !checked && 'border-border bg-muted/40 hover:bg-muted',
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'size-3.5 rounded flex-shrink-0 border-2 flex items-center justify-center',
            checked && danger && 'border-red-500 bg-red-500',
            checked && !danger && 'border-primary bg-primary',
            !checked && 'border-border',
          )}
        >
          {checked && <Check className="size-2.5 text-white" />}
        </div>
        <div>
          <div className={cn('text-sm font-semibold', danger && checked ? 'text-red-500' : 'text-foreground')}>
            {label}
          </div>
          {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
      </div>
    </div>
  )
}

function OptionalInput({ label, value, onChange, placeholder, min, max = undefined, type = 'number' }) {
  return (
    <div className="mb-3">
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <Input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
        placeholder={placeholder}
        min={min}
        max={max}
      />
    </div>
  )
}

function NavButtons({ onBack = undefined, onNext, nextLabel = 'Continue', disabled = false }) {
  return (
    <div className="flex gap-2 mt-5">
      {onBack && (
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
      )}
      <Button onClick={onNext} disabled={disabled} className="flex-[2]">
        {nextLabel}
      </Button>
    </div>
  )
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function FollowWizard({ wallet, initialInverse, onClose }) {
  const [wizard, setWizard] = useState({
    step: 0,
    mode: 'ratio',
    ratio: 25,
    fixedUsd: 100,
    maxNotional: '',
    stopLossPct: '',
    maxPositions: '',
    inverse: !!initialInverse,
    channels: { telegram: false, discord: false },
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const set = (patch) => setWizard(w => ({ ...w, ...patch }))

  function Step1() {
    return (
      <div>
        <div className="text-sm font-semibold text-foreground mb-3">Choose copy mode</div>
        <RadioCard
          selected={wizard.mode === 'ratio'}
          onClick={() => set({ mode: 'ratio' })}
          title="Proportional (ratio)"
          subtitle="Scales with their trades automatically."
        />
        <RadioCard
          selected={wizard.mode === 'fixed'}
          onClick={() => set({ mode: 'fixed' })}
          title="Fixed USD per trade"
          subtitle="You control exact exposure."
        />
        <div className="mt-3">
          <CheckCard
            checked={wizard.inverse}
            onClick={() => set({ inverse: !wizard.inverse })}
            label="Inverse mode"
            subtitle="Receive signals for the OPPOSITE side of their trades."
            danger
          />
        </div>
        <NavButtons onNext={() => set({ step: 1 })} />
      </div>
    )
  }

  function Step2() {
    return (
      <div>
        <div className="text-sm font-semibold text-foreground mb-3">Set amount</div>
        {wizard.mode === 'ratio' ? (
          <div className="mb-4">
            <label className="text-xs text-muted-foreground block mb-1.5">
              Copy ratio: <strong className="text-foreground">{wizard.ratio}%</strong>
            </label>
            <input
              type="range" min={1} max={100} value={wizard.ratio}
              onChange={e => set({ ratio: parseInt(e.target.value) })}
              className="w-full"
              style={{ accentColor: 'var(--primary)' }}
            />
            <div className="text-xs text-muted-foreground mt-1">
              You copy {wizard.ratio}% of their trade size
            </div>
          </div>
        ) : (
          <OptionalInput
            label="USD per trade"
            value={wizard.fixedUsd}
            onChange={v => set({ fixedUsd: v })}
            placeholder="e.g. 100"
            min={1}
          />
        )}
        <div className="mt-1 mb-2 text-xs text-muted-foreground font-medium">Optional limits</div>
        <OptionalInput label="Max notional cap (USD)" value={wizard.maxNotional} onChange={v => set({ maxNotional: v })} placeholder="Leave blank for none" min={1} />
        <OptionalInput label="Stop signals if loss exceeds (%)" value={wizard.stopLossPct} onChange={v => set({ stopLossPct: v })} placeholder="Leave blank for none" min={1} max={100} />
        <OptionalInput label="Max open positions" value={wizard.maxPositions} onChange={v => set({ maxPositions: v })} placeholder="Leave blank for none" min={1} />
        <NavButtons onBack={() => set({ step: 0 })} onNext={() => set({ step: 2 })} disabled={wizard.mode === 'fixed' && !wizard.fixedUsd} />
      </div>
    )
  }

  function Step3() {
    const toggleChannel = (ch) => set({ channels: { ...wizard.channels, [ch]: !wizard.channels[ch] } })
    return (
      <div>
        <div className="text-sm font-semibold text-foreground mb-3">Notification channels</div>
        <CheckCard
          checked={wizard.channels.telegram}
          onClick={() => toggleChannel('telegram')}
          label="Telegram"
          subtitle="Receive trade signals via Telegram bot"
        />
        <CheckCard
          checked={wizard.channels.discord}
          onClick={() => toggleChannel('discord')}
          label="Discord"
          subtitle="Receive trade signals via Discord"
        />
        <div className="text-xs text-muted-foreground mt-3 px-3 py-2 rounded-md bg-muted/40 border">
          Configure channel addresses in Profile → Alerts
        </div>
        <NavButtons onBack={() => set({ step: 1 })} onNext={() => set({ step: 3 })} />
      </div>
    )
  }

  function Step4() {
    const handleConfirm = async () => {
      setSaving(true)
      setSaveError(null)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not signed in')

        const payload = {
          follower_id: user.id,
          leader_wallet: wallet,
          copy_mode: wizard.mode,
          copy_ratio: wizard.mode === 'ratio' ? wizard.ratio : null,
          fixed_usd: wizard.mode === 'fixed' ? wizard.fixedUsd : null,
          max_notional: wizard.maxNotional || null,
          stop_loss_pct: wizard.stopLossPct || null,
          max_positions: wizard.maxPositions || null,
          inverse: wizard.inverse,
          channels: wizard.channels,
          active: true,
          updated_at: new Date().toISOString(),
        }

        const { error } = await supabase
          .from('leader_subscriptions')
          .upsert(payload, { onConflict: 'follower_id,leader_wallet' })

        if (error) throw error
        setSuccess(true)
      } catch (e) {
        setSaveError(e.message ?? 'Failed to save')
      } finally {
        setSaving(false)
      }
    }

    if (success) {
      const channelList = Object.entries(wizard.channels).filter(([, v]) => v).map(([k]) => k).join(' & ') || 'no channels'
      return (
        <div className="text-center py-6">
          <div className="size-12 rounded-full bg-emerald-500/15 inline-flex items-center justify-center mb-3">
            <Check className="size-6 text-emerald-500" />
          </div>
          <div className="text-base font-bold text-foreground mb-1.5">Following!</div>
          <div className="text-xs text-muted-foreground">You'll receive signals via {channelList}.</div>
          <Button onClick={onClose} className="mt-5">Done</Button>
        </div>
      )
    }

    const channelList2 = Object.entries(wizard.channels).filter(([, v]) => v).map(([k]) => k).join(', ') || 'None'

    return (
      <div>
        <div className="text-sm font-semibold text-foreground mb-3">Confirm subscription</div>
        <div className="bg-muted/40 rounded-lg border px-4 py-3 mb-4">
          {[
            ['Trader', `${wallet?.slice(0, 6)}…${wallet?.slice(-4)}`],
            ['Mode', wizard.mode === 'ratio' ? `Proportional — ${wizard.ratio}%` : `Fixed $${wizard.fixedUsd} / trade`],
            ['Inverse', wizard.inverse ? 'Yes (opposite side)' : 'No'],
            ['Channels', channelList2],
            ...(wizard.maxNotional ? [['Max notional', `$${wizard.maxNotional}`]] : []),
            ...(wizard.stopLossPct ? [['Stop if loss >', `${wizard.stopLossPct}%`]] : []),
            ...(wizard.maxPositions ? [['Max positions', wizard.maxPositions]] : []),
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1 border-b border-border last:border-0 text-xs">
              <span className="text-muted-foreground">{k}</span>
              <span className="text-foreground font-medium">{v}</span>
            </div>
          ))}
        </div>
        {saveError && <div className="text-xs text-red-500 mb-2.5">{saveError}</div>}
        <NavButtons
          onBack={() => set({ step: 2 })}
          onNext={handleConfirm}
          nextLabel={saving ? 'Saving…' : 'Confirm & Follow'}
          disabled={saving}
        />
      </div>
    )
  }

  return (
    <div>
      <StepIndicator step={wizard.step} />
      {wizard.step === 0 && <Step1 />}
      {wizard.step === 1 && <Step2 />}
      {wizard.step === 2 && <Step3 />}
      {wizard.step === 3 && <Step4 />}
    </div>
  )
}
