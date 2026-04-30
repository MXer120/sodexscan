'use client'

// Renders a 3-month PnL heatmap calendar for a trader
// Props: history = [{ date: Date, pnl: number }]
export default function TraderCalendar({ history, inverse = false }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-8 text-center">
        No closed position history available.
      </div>
    )
  }

  // Group by day
  const dayMap = {}
  for (const h of history) {
    const key = h.date.toISOString().slice(0, 10)
    dayMap[key] = (dayMap[key] ?? 0) + (inverse ? -h.pnl : h.pnl)
  }

  // Build 3-month grid ending today
  const today = new Date()
  const start = new Date(today)
  start.setMonth(start.getMonth() - 3)
  while (start.getDay() !== 1) start.setDate(start.getDate() - 1)

  const days = []
  const cur = new Date(start)
  while (cur <= today) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }

  const maxAbs = Math.max(1, ...Object.values(dayMap).map((n: any) => Math.abs(n as number)))

  const cellColor = (pnl) => {
    if (pnl == null) return 'var(--muted)'
    const intensity = Math.min(1, Math.abs(pnl) / maxAbs)
    if (pnl > 0) return `rgba(34,197,94,${0.15 + intensity * 0.75})`
    return `rgba(239,68,68,${0.15 + intensity * 0.75})`
  }

  const weeks = []
  let week = []
  for (const d of days) {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) weeks.push(week)

  const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

  return (
    <div className="overflow-x-auto">
      {inverse && (
        <div className="text-xs text-amber-500 mb-2">
          Showing inverse performance — green = profitable for the opposite side.
        </div>
      )}
      <div className="inline-block">
        {/* DOW header */}
        <div className="flex gap-[3px] mb-[3px]">
          <div className="w-9" />
          {DOW.map(d => (
            <div key={d} className="w-[18px] text-center text-[9px] text-muted-foreground">{d}</div>
          ))}
        </div>
        {weeks.map((wk, wi) => {
          const monthLabel = wk[0].toLocaleString('default', { month: 'short' })
          const showLabel = wi === 0 || wk[0].getDate() <= 7
          return (
            <div key={wi} className="flex gap-[3px] mb-[3px] items-center">
              <div className="w-9 text-[9px] text-muted-foreground text-right pr-1">
                {showLabel ? monthLabel : ''}
              </div>
              {wk.map((d, di) => {
                const key = d.toISOString().slice(0, 10)
                const pnl = dayMap[key]
                const isFuture = d > today
                return (
                  <div
                    key={di}
                    title={pnl != null ? `${key}: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}` : key}
                    className="w-[18px] h-[18px] rounded-[3px]"
                    style={{
                      background: isFuture ? 'transparent' : cellColor(pnl),
                      border: isFuture ? 'none' : '1px solid var(--border)',
                    }}
                  />
                )
              })}
            </div>
          )
        })}
        <div className="flex gap-2 mt-2.5 items-center text-[10px] text-muted-foreground">
          <span>Loss</span>
          {[1, 0.6, 0.3].map(v => (
            <div key={v} className="w-3.5 h-3.5 rounded-sm" style={{ background: `rgba(239,68,68,${v})` }} />
          ))}
          <div className="w-3.5 h-3.5 rounded-sm bg-muted" />
          {[0.3, 0.6, 1].map(v => (
            <div key={v} className="w-3.5 h-3.5 rounded-sm" style={{ background: `rgba(34,197,94,${v})` }} />
          ))}
          <span>Profit</span>
        </div>
      </div>
    </div>
  )
}
