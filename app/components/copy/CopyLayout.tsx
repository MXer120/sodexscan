'use client'
import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { X } from 'lucide-react'
import CopyLeaderboard from './CopyLeaderboard'

export default function CopyLayout() {
  const [filter, setFilter] = useState(null) // { type: 'tab'|'watch'|'cohort'|'wallet', id?, name?, color? }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Copy Trading</h1>
          <p className="text-sm text-muted-foreground">
            Follow top traders &middot; Discover edges &middot; Track performance
          </p>
        </div>

        {/* Active filter badge */}
        {filter && (
          <div
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground"
          >
            <span>
              {filter.type === 'watch'  ? 'Watching'
              : filter.type === 'cohort' ? filter.name
              : filter.type === 'tab'    ? tabLabel(filter.id)
              : filter.type === 'wallet' ? `${filter.id.slice(0, 6)}…${filter.id.slice(-4)}`
              : 'Filtered'}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setFilter(null)}
              className="size-4 -mr-1"
              aria-label="Clear filter"
            >
              <X className="size-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Cohort info banner */}
      {filter?.type === 'cohort' && (
        <div
          className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm text-foreground flex items-center gap-2"
        >
          <span className="font-semibold">{filter.name}</span>
          <span className="text-muted-foreground">
            — cohort view. Add wallets to this group from any trader's detail panel.
          </span>
        </div>
      )}

      <CopyLeaderboard externalFilter={filter} onFilterChange={setFilter} />
    </div>
  )
}

function tabLabel(id) {
  const map = {
    top100: 'Top 100',
    inv100: 'Inverse 100',
    best: 'Hall of Fame',
    worst: 'Hall of Shame',
    mytrades: 'Subscriptions',
    watching: 'Watching',
    all: 'Sim',
  }
  return map[id] ?? id
}
