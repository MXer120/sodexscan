'use client'
import { useState, useEffect, useCallback } from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'
import { supabase } from '../../lib/supabaseClient'

const TAG_COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#f97316', '#06b6d4', '#a855f7', '#ec4899']

const PRESET_TAGS = ['Whale', 'BTC Only', 'ETH Only', 'Scalper', 'Swing', 'Copy Worthy', 'Risky', 'Low Win Rate', 'High Win Rate', 'Watching']

export default function TagEditor({ wallet }) {
  const [tags, setTags] = useState([])
  const [cohorts, setCohorts] = useState([])
  const [newTag, setNewTag] = useState('')
  const [user, setUser] = useState(null)
  const [adding, setAdding] = useState(false)
  const [walletCohorts, setWalletCohorts] = useState(new Set())

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data?.user
      setUser(u ?? null)
      if (!u || !wallet) return

      const [tagsRes, cohortsRes, cwRes] = await Promise.all([
        supabase.from('wallet_tags').select('tag, color').eq('user_id', u.id).eq('wallet_address', wallet),
        supabase.from('wallet_cohorts').select('id, name, color').eq('user_id', u.id).order('created_at'),
        supabase.from('cohort_wallets').select('cohort_id, wallet_cohorts!inner(user_id)').eq('wallet_address', wallet),
      ])
      setTags(tagsRes.data ?? [])
      setCohorts(cohortsRes.data ?? [])
      const ownedCohortIds = ((cwRes.data ?? []) as any[])
        .filter(r => r.wallet_cohorts?.user_id === u.id)
        .map(r => r.cohort_id)
      setWalletCohorts(new Set(ownedCohortIds))
    })
  }, [wallet])

  const addTag = useCallback(async (tagText, color?) => {
    if (!user || !tagText.trim()) return
    const t = tagText.trim()
    if (tags.find(x => x.tag === t)) return
    const col = color ?? TAG_COLORS[tags.length % TAG_COLORS.length]
    await supabase.from('wallet_tags').upsert({ user_id: user.id, wallet_address: wallet, tag: t, color: col })
    setTags(prev => [...prev, { tag: t, color: col }])
    setNewTag('')
    setAdding(false)
  }, [user, wallet, tags])

  const removeTag = useCallback(async (tag) => {
    if (!user) return
    await supabase.from('wallet_tags').delete().eq('user_id', user.id).eq('wallet_address', wallet).eq('tag', tag)
    setTags(prev => prev.filter(t => t.tag !== tag))
  }, [user, wallet])

  const toggleCohort = useCallback(async (cohortId) => {
    if (!user) return
    const inCohort = walletCohorts.has(cohortId)
    if (inCohort) {
      await supabase.from('cohort_wallets').delete().eq('cohort_id', cohortId).eq('wallet_address', wallet)
      setWalletCohorts(prev => { const s = new Set(prev); s.delete(cohortId); return s })
    } else {
      await supabase.from('cohort_wallets').upsert({ cohort_id: cohortId, wallet_address: wallet })
      setWalletCohorts(prev => new Set([...prev, cohortId]))
    }
  }, [user, wallet, walletCohorts])

  if (!user) return null

  return (
    <div className="flex flex-col gap-3">
      {/* Tags row */}
      <div>
        <div className="text-xs text-muted-foreground mb-1.5 font-medium">Tags</div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {tags.map(t => (
            <span
              key={t.tag}
              onClick={() => removeTag(t.tag)}
              title="Click to remove"
              className="text-xs px-2 py-0.5 rounded-full font-semibold cursor-pointer inline-flex items-center gap-1 border"
              style={{
                background: `${t.color}22`,
                color: t.color,
                borderColor: `${t.color}44`,
              }}
            >
              {t.tag}
              <X className="size-2.5 opacity-70" />
            </span>
          ))}

          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="text-xs px-2 py-0.5 rounded-full cursor-pointer border border-dashed border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground transition-colors inline-flex items-center gap-1"
            >
              <Plus className="size-3" /> Add tag
            </button>
          )}
        </div>

        {adding && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-1 mb-2">
              {PRESET_TAGS.filter(p => !tags.find(t => t.tag === p)).map((p, i) => (
                <button
                  key={p}
                  onClick={() => addTag(p, TAG_COLORS[i % TAG_COLORS.length])}
                  className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer border bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input
                autoFocus
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addTag(newTag); if (e.key === 'Escape') setAdding(false) }}
                placeholder="Custom tag…"
                className="h-8 text-xs"
              />
              <Button size="sm" onClick={() => addTag(newTag)}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)} className="size-8 p-0">
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Cohorts */}
      {cohorts.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1.5 font-medium">Cohorts</div>
          <div className="flex flex-wrap gap-1.5">
            {cohorts.map(c => {
              const inCohort = walletCohorts.has(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCohort(c.id)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full cursor-pointer font-semibold border transition-colors',
                  )}
                  style={{
                    borderColor: `${c.color}66`,
                    background: inCohort ? `${c.color}22` : 'var(--muted)',
                    color: inCohort ? c.color : 'var(--muted-foreground)',
                  }}
                >
                  {inCohort ? '✓ ' : ''}{c.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
