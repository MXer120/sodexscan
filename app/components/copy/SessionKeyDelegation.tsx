'use client'
/**
 * Stub UI: EIP-712 session-key delegation flow.
 * Visualizes the proposed user-consent UX — no real signing until Sodex confirms primitives.
 * See docs/research/sodex-session-keys.md for research status.
 */
import { useState } from 'react'
import { cn } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'

const STEPS = [
  { id: 'connect', label: 'Connect wallet', desc: 'Connect your Sodex wallet. We never store your key.' },
  { id: 'scope',   label: 'Set scope', desc: 'Choose symbol, max size, max price, and expiry (max 5 min).' },
  { id: 'sign',    label: 'Sign permit', desc: 'Sign one EIP-712 permit in your wallet. No withdrawal permission is ever included.' },
  { id: 'relay',   label: 'Relay & done', desc: 'We relay the permit to Sodex for this single trade. Permit is never stored.' },
]

export default function SessionKeyDelegation({ onComplete }) {
  const [step, setStep] = useState(0)
  const [scope, setScope] = useState({ symbol: 'BTC-USDT', side: 'long', maxSize: 100, expiry: 270 })

  return (
    <div className="max-w-md flex flex-col gap-5">
      <div className="px-4 py-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
        Research preview — delegation requires Sodex on-chain primitive confirmation. See{' '}
        <code className="text-[10px]">docs/research/sodex-session-keys.md</code>.
      </div>

      {/* Step progress */}
      <div className="flex gap-0">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={cn(
                'size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                i < step && 'bg-emerald-500 text-white',
                i === step && 'bg-primary text-primary-foreground border-2 border-primary',
                i > step && 'bg-muted text-muted-foreground',
              )}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span
              className={cn(
                'text-[10px] text-center',
                i === step ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="px-5 py-4 rounded-xl border border-border bg-muted/40">
        <div className="font-semibold mb-2 text-foreground">{STEPS[step].label}</div>
        <div className="text-sm text-muted-foreground mb-4">{STEPS[step].desc}</div>

        {step === 1 && (
          <div className="flex flex-col gap-2.5">
            <label className="text-xs text-muted-foreground flex flex-col gap-1">
              Symbol
              <Select value={scope.symbol} onValueChange={v => setScope(s => ({ ...s, symbol: v }))}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['BTC-USDT', 'ETH-USDT', 'SOL-USDT'].map(sym => (
                    <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="text-xs text-muted-foreground flex flex-col gap-1">
              Side
              <Select value={scope.side} onValueChange={v => setScope(s => ({ ...s, side: v }))}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="text-xs text-muted-foreground flex flex-col gap-1">
              Max notional (USD)
              <Input
                type="number"
                value={scope.maxSize}
                min={1}
                onChange={e => setScope(s => ({ ...s, maxSize: +e.target.value }))}
                className="h-8"
              />
            </label>
            <div className="text-xs text-muted-foreground">
              Permit expires in 4 min 30 s. No withdrawal permission included. One-use only.
            </div>
          </div>
        )}

        {step === 2 && (
          <pre className="font-mono text-xs bg-card border border-border rounded-md p-3 text-muted-foreground overflow-x-auto">
            {JSON.stringify({ domain: 'SodexPerps (chain TBD)', ...scope, noWithdraw: true, expiry: 'now+270s', nonce: '(auto)' }, null, 2)}
          </pre>
        )}
      </div>

      <div className="flex gap-2">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
            Back
          </Button>
        )}
        <Button
          onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : onComplete?.()}
          className="flex-[2]"
        >
          {step === STEPS.length - 1 ? 'Done (stub)' : step === 2 ? 'Sign with wallet (stub)' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
