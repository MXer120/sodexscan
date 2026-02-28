'use client'
import { useState, useEffect } from 'react'

const getNextSaturday = () => {
  const now = new Date()
  const day = now.getUTCDay()
  const daysUntilSat = day === 6 ? 7 : (6 - day)
  const next = new Date(now)
  next.setUTCDate(now.getUTCDate() + daysUntilSat)
  next.setUTCHours(0, 0, 0, 0)
  return next.getTime()
}

export default function SnapshotCountdownWidget() {
  const [timeLeft, setTimeLeft] = useState('')
  const [targetDate, setTargetDate] = useState(() => getNextSaturday())

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const distance = targetDate - now
      if (distance < 0) {
        setTargetDate(getNextSaturday())
        setTimeLeft('DISTRIBUTING...')
        return
      }
      const d = Math.floor(distance / (1000 * 60 * 60 * 24))
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((distance % (1000 * 60)) / 1000)
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`)
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Next Snapshot</div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
        {timeLeft || 'Calculating...'}
      </div>
    </div>
  )
}
