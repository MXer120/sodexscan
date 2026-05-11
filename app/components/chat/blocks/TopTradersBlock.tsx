"use client";

import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Trophy, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/app/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  const s = n < 0 ? "-" : "+";
  if (abs >= 1_000_000) return `${s}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${s}$${(abs / 1_000).toFixed(1)}K`;
  return `${s}$${abs.toFixed(0)}`;
}

function fmtVol(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function shortAddr(a: string) {
  return a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

const PERIOD_CONFIG = {
  ALL:  { lbWindow: "ALL_TIME", tradeDays: 0,  sparkDays: 90, label: "All time" },
  "1W": { lbWindow: "WEEKLY",   tradeDays: 7,  sparkDays: 7,  label: "1 week"   },
  "1M": { lbWindow: "ALL_TIME", tradeDays: 30, sparkDays: 30, label: "1 month"  },
} as const;

type Period = keyof typeof PERIOD_CONFIG;
type SortMode = "pnl" | "volume";

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted/50", className)} />;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TopTradersBlockProps { period?: Period }

interface SparkPt { v: number }

interface LiveTrader {
  rank:    number;
  address: string;
  wallet:  string;
  pnlRaw:  number;
  pnl:     string;
  volRaw:  number;
  volume:  string;
}

interface TraderExtra {
  spark:        SparkPt[];
  sparkReady:   boolean;
  winRate:      number | null;
  tradesPerDay: number | null;
  statsReady:   boolean;
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ spark, ready }: { spark: SparkPt[]; ready: boolean }) {
  if (!ready) return <Sk className="w-full h-full rounded" />;
  if (!spark.length) return <div className="w-full h-full flex items-center justify-center"><span className="text-[10px] text-muted-foreground">—</span></div>;
  const avg = spark.reduce((s, p) => s + p.v, 0) / spark.length;
  const pos = spark[spark.length - 1].v >= avg;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={spark}>
        <Line type="monotone" dataKey="v" dot={false} strokeWidth={1.5}
          stroke={pos ? "#10b981" : "#ef4444"} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Async value cell ──────────────────────────────────────────────────────────

function AsyncVal({ ready, skW = "w-10", children }: {
  ready: boolean; skW?: string; children: React.ReactNode;
}) {
  if (!ready) return <Sk className={cn("h-3.5 inline-block", skW)} />;
  return <>{children}</>;
}

// ── PnL/Volume mode switch ────────────────────────────────────────────────────

function ModeSwitch({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  return (
    <div className="flex items-center gap-0 rounded-md border bg-muted/40 p-0.5 text-xs font-medium">
      <button
        onClick={() => onChange("pnl")}
        className={cn(
          "px-2.5 py-1 rounded transition-colors",
          value === "pnl"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        PnL
      </button>
      <button
        onClick={() => onChange("volume")}
        className={cn(
          "px-2.5 py-1 rounded transition-colors",
          value === "volume"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Volume
      </button>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TopTradersBlock({ props = {} }: { props?: TopTradersBlockProps }) {
  const initPeriod: Period =
    props.period && props.period in PERIOD_CONFIG ? props.period : "ALL";

  const [period,      setPeriod]      = useState<Period>(initPeriod);
  const [mode,        setMode]        = useState<SortMode>("pnl");
  const [liveTraders, setLiveTraders] = useState<LiveTrader[] | null>(null);
  const [loadingLive, setLoadingLive] = useState(true);
  const [extras,      setExtras]      = useState<Record<string, TraderExtra>>({});
  const [expanded,    setExpanded]    = useState<string | null>(null);

  const cfg = PERIOD_CONFIG[period];

  // Phase 2: sparkline + algo-computed win rate + trades/day
  const loadExtras = useCallback(async (address: string, tradeDays: number, sparkDays: number) => {
    setExtras(prev => ({
      ...prev,
      [address]: { spark: [], sparkReady: false, winRate: null, tradesPerDay: null, statsReady: false },
    }));

    const [pnlRes, tradesRes] = await Promise.all([
      fetch(`/api/wallet/pnl?address=${encodeURIComponent(address)}&days=${sparkDays}`)
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/wallet/trades?address=${encodeURIComponent(address)}${tradeDays ? `&days=${tradeDays}` : ""}`)
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    // Sparkline from daily PnL
    const pnlArr = Array.isArray(pnlRes) ? pnlRes : Array.isArray(pnlRes?.data) ? pnlRes.data : [];
    const spark: SparkPt[] = [...pnlArr]
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        String(a.date ?? a.time ?? "").localeCompare(String(b.date ?? b.time ?? "")))
      .slice(-20)
      .map((d: Record<string, unknown>) => ({ v: Number(d.pnl ?? d.daily_pnl ?? d.realizedPnl ?? 0) }));
    setExtras(prev => ({ ...prev, [address]: { ...prev[address], spark, sparkReady: true } }));

    // Algo-only: win rate + trades/day from raw trade history
    const tradesArr: Record<string, unknown>[] =
      Array.isArray(tradesRes?.trades) ? tradesRes.trades
      : Array.isArray(tradesRes) ? tradesRes : [];

    let winRate: number | null = null;
    let tradesPerDay: number | null = null;

    if (tradesArr.length > 0) {
      const wins = tradesArr.filter(t => Number(t.realized_pnl ?? t.pnl ?? 0) > 0).length;
      winRate = wins / tradesArr.length;

      const times = tradesArr.map(t => Number(t.time ?? t.timestamp ?? 0)).filter(ts => ts > 0);
      if (times.length >= 2) {
        const span = Math.max(...times) - Math.min(...times);
        const ms   = span > 1e12 ? span : span * 1000;
        const days = ms / (1000 * 60 * 60 * 24);
        if (days > 0.1) tradesPerDay = tradesArr.length / days;
      }
    }

    setExtras(prev => ({ ...prev, [address]: { ...prev[address], winRate, tradesPerDay, statsReady: true } }));
  }, []);

  // Phase 1: leaderboard — sorted by current mode, re-runs on period change
  useEffect(() => {
    setLiveTraders(null);
    setLoadingLive(true);
    setExtras({});
    setExpanded(null);

    fetch(`/api/sodex-leaderboard?page=1&page_size=5&sort_by=${mode}&sort_order=desc&window_type=${cfg.lbWindow}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.data?.items?.length) { setLoadingLive(false); return; }
        const mapped: LiveTrader[] = json.data.items.slice(0, 5).map((item: {
          wallet_address: string; pnl_usd: string; volume_usd: string; rank: number;
        }, idx: number) => ({
          rank:    item.rank ?? idx + 1,
          address: item.wallet_address ?? "",
          wallet:  shortAddr(item.wallet_address ?? ""),
          pnlRaw:  parseFloat(item.pnl_usd ?? "0") || 0,
          pnl:     fmtUsd(parseFloat(item.pnl_usd ?? "0") || 0),
          volRaw:  parseFloat(item.volume_usd ?? "0") || 0,
          volume:  fmtVol(parseFloat(item.volume_usd ?? "0") || 0),
        }));
        setLiveTraders(mapped);
        setLoadingLive(false);
        for (const t of mapped) {
          if (t.address) loadExtras(t.address, cfg.tradeDays, cfg.sparkDays);
        }
      })
      .catch(() => setLoadingLive(false));
  }, [period, mode, cfg.lbWindow, cfg.tradeDays, cfg.sparkDays, loadExtras]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border bg-card overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-amber-500" />
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Top Wallets</p>
            <p className="text-sm font-semibold">Sodex Leaderboard · {cfg.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Period buttons */}
          <div className="flex items-center gap-0.5">
            {(["ALL", "1W", "1M"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors",
                  period === p ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {p}
              </button>
            ))}
          </div>
          {liveTraders && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
            </span>
          )}
        </div>
      </div>

      {/* Mode switch + column headers */}
      <div className="flex items-center justify-between gap-2 px-5 py-2 border-b bg-muted/20">
        <ModeSwitch value={mode} onChange={setMode} />

        {/* Column labels aligned to data columns */}
        {mode === "pnl" ? (
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground uppercase tracking-wide">
            <span className="w-14 text-center">Chart</span>
            <span className="w-[4.5rem] text-right">PnL</span>
            <span className="w-10 text-right">Win rate</span>
            <span className="w-3.5" />
          </div>
        ) : (
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground uppercase tracking-wide">
            <span className="w-[4.5rem] text-right">Volume</span>
            <span className="w-14 text-right">Trades/day</span>
            <span className="w-3.5" />
          </div>
        )}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {loadingLive ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Sk className="size-7 shrink-0" />
              <div className="flex-1 min-w-0"><Sk className="h-3.5 w-28" /></div>
              {mode === "pnl" ? (
                <>
                  <Sk className="w-14 h-6 shrink-0" />
                  <Sk className="w-[4.5rem] h-3.5 shrink-0" />
                  <Sk className="w-10 h-3.5 shrink-0" />
                </>
              ) : (
                <>
                  <Sk className="w-[4.5rem] h-3.5 shrink-0" />
                  <Sk className="w-14 h-3.5 shrink-0" />
                </>
              )}
              <Sk className="w-3.5 h-3.5 shrink-0" />
            </div>
          ))
        ) : !liveTraders?.length ? (
          <div className="px-5 py-8 text-center text-xs text-muted-foreground">No data available</div>
        ) : (
          liveTraders.map(trader => {
            const ex    = extras[trader.address];
            const isExp = expanded === trader.address;

            return (
              <div key={trader.address}>
                <button
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => setExpanded(isExp ? null : trader.address)}
                >
                  {/* Rank */}
                  <span className="text-sm w-7 shrink-0 text-center">{rankBadge(trader.rank)}</span>

                  {/* Wallet */}
                  <span className="flex-1 min-w-0 text-sm font-medium font-mono truncate">{trader.wallet}</span>

                  {/* PnL mode: chart · PnL · Win rate */}
                  {mode === "pnl" && (
                    <>
                      <div className="w-14 h-6 shrink-0">
                        <Sparkline spark={ex?.spark ?? []} ready={ex?.sparkReady ?? false} />
                      </div>
                      <span className={cn("w-[4.5rem] shrink-0 text-right text-sm font-semibold",
                        trader.pnlRaw >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {trader.pnl}
                      </span>
                      <span className="w-10 shrink-0 text-right text-sm font-medium">
                        <AsyncVal ready={ex?.statsReady ?? false} skW="w-7">
                          {ex?.winRate != null
                            ? <span className={ex.winRate >= 0.5 ? "text-emerald-500" : "text-red-500"}>
                                {(ex.winRate * 100).toFixed(0)}%
                              </span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </AsyncVal>
                      </span>
                    </>
                  )}

                  {/* Volume mode: Volume · Trades/day */}
                  {mode === "volume" && (
                    <>
                      <span className="w-[4.5rem] shrink-0 text-right text-sm font-semibold text-foreground">
                        {trader.volume}
                      </span>
                      <span className="w-14 shrink-0 text-right text-sm font-medium text-muted-foreground">
                        <AsyncVal ready={ex?.statsReady ?? false} skW="w-8">
                          {ex?.tradesPerDay != null
                            ? <span className="text-foreground">{ex.tradesPerDay.toFixed(1)}</span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </AsyncVal>
                      </span>
                    </>
                  )}

                  {/* Expand chevron */}
                  <div className="w-3.5 shrink-0 text-muted-foreground flex justify-center">
                    {isExp ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </div>
                </button>

                {/* Expanded */}
                {isExp && (
                  <div className="px-5 pb-4 bg-muted/20">
                    <button
                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      onClick={() => window.open(`/tracker?wallet=${trader.address}`, "_blank")}
                    >
                      <ExternalLink className="size-3.5" />View full profile in Scanner
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {liveTraders && <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
          <a href="/mainnet" className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
            {liveTraders ? `Live · ${cfg.label} · Full leaderboard` : "View full leaderboard"}
            <ExternalLink className="size-3 shrink-0" />
          </a>
        </div>
        <a href="/mainnet"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0 border rounded px-2 py-0.5 hover:bg-muted/50">
          <ExternalLink className="size-3" />Full view
        </a>
      </div>
    </div>
  );
}
