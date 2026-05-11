"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { Trophy, ExternalLink, ChevronUp, ChevronDown } from "lucide-react";
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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted/50", className)} />;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SparkPt { v: number }

interface LiveTrader {
  rank: number;
  address: string;
  wallet: string;
  pnlRaw: number;
  pnl: string;
  volRaw: number;
  volume: string;
  tradeCount: number;
  change: "up" | "down" | "same";
}

interface TraderExtra {
  spark:       SparkPt[];
  sparkReady:  boolean;
  winRate:     number | null;   // 0–1
  tradesPerDay: number | null;
  statsReady:  boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TopTradersBlock() {
  const [liveTraders,  setLiveTraders]  = useState<LiveTrader[] | null>(null);
  const [loadingLive,  setLoadingLive]  = useState(true);
  const [extras,       setExtras]       = useState<Record<string, TraderExtra>>({});
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [period,       setPeriod]       = useState<"1W" | "1M">("1W");
  const [sortBy,       setSortBy]       = useState<"pnl" | "volume" | "trades">("pnl");

  // ── Phase 1: load leaderboard ─────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/sodex-leaderboard?page=1&page_size=5&sort_by=pnl&sort_order=desc&window_type=WEEKLY_7D")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.data?.items?.length) { setLoadingLive(false); return; }
        const mapped: LiveTrader[] = json.data.items.slice(0, 5).map((item: {
          wallet_address: string; pnl_usd: string; volume_usd: string; rank: number
        }, idx: number) => {
          const pnlRaw = parseFloat(item.pnl_usd ?? "0") || 0;
          const volRaw = parseFloat(item.volume_usd ?? "0") || 0;
          const addr   = item.wallet_address ?? "";
          return {
            rank:       item.rank ?? idx + 1,
            address:    addr,
            wallet:     shortAddr(addr),
            pnlRaw,
            pnl:        fmtUsd(pnlRaw),
            volRaw,
            volume:     fmtVol(volRaw),
            tradeCount: 0,
            change:     "same" as const,
          };
        });
        setLiveTraders(mapped);
        setLoadingLive(false);

        // Phase 2: load extras for each wallet in parallel
        for (const t of mapped) {
          if (!t.address) continue;
          loadExtras(t.address);
        }
      })
      .catch(() => setLoadingLive(false));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase 2: PnL sparkline + win rate / trades per day ────────────────────
  async function loadExtras(address: string) {
    // Initialise with skeletons
    setExtras(prev => ({
      ...prev,
      [address]: { spark: [], sparkReady: false, winRate: null, tradesPerDay: null, statsReady: false },
    }));

    // Fetch PnL daily (for sparklines) and trades (for stats) in parallel
    const [pnlRes, tradesRes] = await Promise.all([
      fetch(`/api/wallet/pnl?address=${encodeURIComponent(address)}&days=30`)
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/wallet/trades?address=${encodeURIComponent(address)}`)
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    // Sparkline from daily PnL
    const pnlArr = Array.isArray(pnlRes) ? pnlRes
                  : Array.isArray(pnlRes?.data) ? pnlRes.data : [];
    const sortedPnl = [...pnlArr].sort((a: Record<string,unknown>, b: Record<string,unknown>) =>
      String(a.date ?? a.time ?? "").localeCompare(String(b.date ?? b.time ?? "")));
    const spark: SparkPt[] = sortedPnl.slice(-20).map((d: Record<string,unknown>) => ({
      v: Number(d.pnl ?? d.daily_pnl ?? d.realizedPnl ?? 0),
    }));

    setExtras(prev => ({
      ...prev,
      [address]: { ...prev[address], spark, sparkReady: true },
    }));

    // Win rate + trades/day from trades
    const tradesArr: Record<string,unknown>[] =
      Array.isArray(tradesRes) ? tradesRes
      : Array.isArray(tradesRes?.data) ? tradesRes.data : [];

    let winRate:      number | null = null;
    let tradesPerDay: number | null = null;

    if (tradesArr.length > 0) {
      const wins = tradesArr.filter(t => Number(t.realized_pnl ?? t.pnl ?? 0) > 0).length;
      winRate = wins / tradesArr.length;

      const times = tradesArr
        .map(t => Number(t.time ?? t.timestamp ?? 0))
        .filter(ts => ts > 0);
      if (times.length >= 2) {
        const minMs = Math.min(...times);
        const maxMs = Math.max(...times);
        // times can be ms or seconds — normalise
        const span = maxMs > 1e12 ? (maxMs - minMs) : (maxMs - minMs) * 1000;
        const days = span / (1000 * 60 * 60 * 24);
        if (days > 0.1) tradesPerDay = tradesArr.length / days;
      }
    }

    setExtras(prev => ({
      ...prev,
      [address]: { ...prev[address], winRate, tradesPerDay, statsReady: true },
    }));
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = liveTraders ? [...liveTraders].sort((a, b) => {
    if (sortBy === "pnl")    return b.pnlRaw - a.pnlRaw;
    if (sortBy === "volume") return b.volRaw  - a.volRaw;
    return b.tradeCount - a.tradeCount;
  }) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-amber-500" />
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Top Wallets</p>
            <p className="text-sm font-semibold">Sodex Leaderboard</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {(["1W", "1M"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors",
                period === p ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {p}
            </button>
          ))}
          {sorted && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium ml-2">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
            </span>
          )}
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-1 px-5 py-2.5 border-b bg-muted/30 flex-wrap">
        <span className="text-[11px] text-muted-foreground mr-1">Sort:</span>
        {(["pnl", "volume", "trades"] as const).map(k => (
          <button key={k} onClick={() => setSortBy(k)}
            className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors",
              sortBy === k ? "bg-background border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {k === "pnl" ? "PnL" : k === "volume" ? "Volume" : "Trades"}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {loadingLive ? (
          // Skeleton rows
          [...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-3">
              <Sk className="size-7 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Sk className="h-3.5 w-28" />
                <Sk className="h-2.5 w-20" />
              </div>
              <Sk className="w-16 h-8 shrink-0" />
              <Sk className="h-4 w-16 shrink-0" />
            </div>
          ))
        ) : !sorted?.length ? (
          <div className="px-5 py-8 text-center text-xs text-muted-foreground">No data available</div>
        ) : (
          sorted.map(trader => {
            const ex = extras[trader.address];
            const isExp = expanded === trader.address;
            const sparkData = ex?.sparkReady && ex.spark.length > 0 ? ex.spark : null;
            const sparkPositive = sparkData
              ? sparkData[sparkData.length - 1].v >= sparkData.reduce((s, p) => s + p.v, 0) / sparkData.length
              : true;

            return (
              <div key={trader.address}>
                <button
                  className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => setExpanded(isExp ? null : trader.address)}
                >
                  {/* Rank */}
                  <span className="text-sm w-7 shrink-0 text-center">{rankBadge(trader.rank)}</span>

                  {/* Wallet */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium font-mono truncate">{trader.wallet}</span>
                      {trader.change === "up"   && <ChevronUp   className="size-3 text-emerald-500 shrink-0" />}
                      {trader.change === "down" && <ChevronDown className="size-3 text-red-500 shrink-0" />}
                    </div>
                    {/* Win rate inline when loaded */}
                    {ex?.statsReady && ex.winRate !== null && (
                      <p className="text-[10px] text-muted-foreground">
                        {(ex.winRate * 100).toFixed(0)}% win rate
                        {ex.tradesPerDay ? ` · ${ex.tradesPerDay.toFixed(1)}/day` : ""}
                      </p>
                    )}
                    {ex && !ex.statsReady && (
                      <Sk className="h-2 w-20 mt-1" />
                    )}
                  </div>

                  {/* Sparkline */}
                  <div className="w-16 h-8 shrink-0">
                    {sparkData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData}>
                          <Tooltip content={() => null} />
                          <Line type="monotone" dataKey="v" dot={false} strokeWidth={1.5}
                            stroke={sparkPositive ? "#10b981" : "#ef4444"} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <Sk className="w-full h-full" />
                    )}
                  </div>

                  {/* PnL */}
                  <span className={cn("text-sm font-semibold shrink-0 text-right w-20",
                    trader.pnlRaw >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {trader.pnl}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExp && (
                  <div className="px-5 pb-4 bg-muted/20">
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {/* Volume */}
                      <div className="p-2.5 rounded-lg border bg-card">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Volume</p>
                        <p className="text-sm font-semibold">{trader.volume}</p>
                      </div>
                      {/* Win Rate */}
                      <div className="p-2.5 rounded-lg border bg-card">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Win Rate</p>
                        {ex?.statsReady
                          ? <p className="text-sm font-semibold">
                              {ex.winRate !== null ? `${(ex.winRate * 100).toFixed(1)}%` : "—"}
                            </p>
                          : <Sk className="h-5 w-12 mt-0.5" />
                        }
                      </div>
                      {/* Trades/Day */}
                      <div className="p-2.5 rounded-lg border bg-card">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Trades/Day</p>
                        {ex?.statsReady
                          ? <p className="text-sm font-semibold">
                              {ex.tradesPerDay !== null ? ex.tradesPerDay.toFixed(1) : "—"}
                            </p>
                          : <Sk className="h-5 w-12 mt-0.5" />
                        }
                      </div>
                    </div>
                    <button
                      className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      onClick={() => window.open(`/tracker?wallet=${trader.address}`, "_blank")}
                    >
                      <ExternalLink className="size-3.5" />View in Scanner
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
          {sorted
            ? <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            : null
          }
          <a href="/mainnet" className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
            {sorted ? "Live 7D · View full leaderboard" : "View full leaderboard"}
            <ExternalLink className="size-3 shrink-0" />
          </a>
        </div>
        <a href="/mainnet" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0 border rounded px-2 py-0.5 hover:bg-muted/50">
          <ExternalLink className="size-3" />Full view
        </a>
      </div>
    </div>
  );
}
