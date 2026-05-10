"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { Trophy, TrendingUp, TrendingDown, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface SparkPoint { v: number }

function genSpark(n: number, seed: number, trend: "up" | "down" | "mixed"): SparkPoint[] {
  let v = 0;
  return Array.from({ length: n }, (_, i) => {
    const noise = Math.sin(i * seed) * 0.4;
    const drift = trend === "up" ? 0.15 : trend === "down" ? -0.15 : Math.sin(i * 0.8) * 0.1;
    v += drift + noise;
    return { v: +v.toFixed(2) };
  });
}

interface Trader {
  rank: number;
  wallet: string;
  tag: string;
  pnl: string;
  pnlRaw: number;
  volume: string;
  trades: number;
  strategy: string;
  stratColor: string;
  winRate: string;
  spark: SparkPoint[];
  change: "up" | "down" | "same";
}

const TRADERS: Trader[] = [
  {
    rank: 1, wallet: "0x7f3a...e92c", tag: "SoWhale",
    pnl: "+$284,100", pnlRaw: 284100, volume: "$12.4M", trades: 847, winRate: "68%",
    strategy: "Momentum", stratColor: "#6366f1",
    spark: genSpark(20, 1.3, "up"), change: "same",
  },
  {
    rank: 2, wallet: "0x2b81...441f", tag: "DeltaKing",
    pnl: "+$197,500", pnlRaw: 197500, volume: "$9.1M", trades: 512, winRate: "74%",
    strategy: "Swing", stratColor: "#10b981",
    spark: genSpark(20, 2.1, "up"), change: "up",
  },
  {
    rank: 3, wallet: "0xc44d...88b7", tag: "AlphaGrid",
    pnl: "+$143,200", pnlRaw: 143200, volume: "$6.8M", trades: 1204, winRate: "61%",
    strategy: "Scalp", stratColor: "#f59e0b",
    spark: genSpark(20, 3.7, "mixed"), change: "up",
  },
  {
    rank: 4, wallet: "0x91fe...32ac", tag: "RektBot",
    pnl: "+$98,700", pnlRaw: 98700, volume: "$4.2M", trades: 334, winRate: "55%",
    strategy: "Grid", stratColor: "#ec4899",
    spark: genSpark(20, 0.7, "mixed"), change: "down",
  },
  {
    rank: 5, wallet: "0x0038...b4e1", tag: "ZeroFear",
    pnl: "+$71,400", pnlRaw: 71400, volume: "$3.3M", trades: 228, winRate: "71%",
    strategy: "Swing", stratColor: "#10b981",
    spark: genSpark(20, 4.2, "up"), change: "down",
  },
];

type SortKey = "pnl" | "volume" | "trades" | "winRate";

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export function TopTradersBlock() {
  const [sortBy, setSortBy] = useState<SortKey>("pnl");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [period, setPeriod] = useState<"1W" | "1M">("1W");
  const [liveTraders, setLiveTraders] = useState<Trader[] | null>(null);
  const [loadingLive, setLoadingLive] = useState(true);

  useEffect(() => {
    fetch('/api/sodex-leaderboard?page=1&page_size=5&sort_by=pnl&sort_order=desc&window_type=WEEKLY_7D')
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.data?.items?.length) return;
        const mapped: Trader[] = json.data.items.slice(0, 5).map((item: {
          wallet_address: string; pnl_usd: string; volume_usd: string; rank: number
        }, idx: number) => {
          const pnlRaw = parseFloat(item.pnl_usd ?? '0') || 0;
          const volRaw = parseFloat(item.volume_usd ?? '0') || 0;
          const addr = item.wallet_address ?? '';
          const short = addr.length > 10 ? `${addr.slice(0,6)}...${addr.slice(-4)}` : addr;
          return {
            rank: item.rank ?? idx + 1,
            wallet: short,
            tag: short,
            pnl: pnlRaw >= 0 ? `+$${(pnlRaw).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `-$${Math.abs(pnlRaw).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
            pnlRaw,
            volume: volRaw >= 1e9 ? `$${(volRaw/1e9).toFixed(1)}B` : volRaw >= 1e6 ? `$${(volRaw/1e6).toFixed(1)}M` : `$${(volRaw/1e3).toFixed(0)}K`,
            trades: 0,
            strategy: 'Live',
            stratColor: '#6366f1',
            winRate: '—',
            spark: genSpark(20, idx + 1, pnlRaw >= 0 ? 'up' : 'down'),
            change: 'same' as const,
          };
        });
        setLiveTraders(mapped);
      })
      .catch(() => {})
      .finally(() => setLoadingLive(false));
  }, []);

  const sorted = [...(liveTraders ?? TRADERS)].sort((a, b) => {
    if (sortBy === "pnl") return b.pnlRaw - a.pnlRaw;
    if (sortBy === "trades") return b.trades - a.trades;
    if (sortBy === "volume") return parseFloat(b.volume.replace(/[^0-9.]/g, "")) - parseFloat(a.volume.replace(/[^0-9.]/g, ""));
    if (sortBy === "winRate") return parseFloat(b.winRate) - parseFloat(a.winRate);
    return 0;
  });

  const SortBtn = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      onClick={() => setSortBy(k)}
      className={cn(
        "px-2.5 py-1 rounded text-xs font-medium transition-colors",
        sortBy === k ? "bg-background border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );

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
        <div className="flex items-center gap-2">
          {liveTraders && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
          {(["1W", "1M"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                period === p ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-1 px-5 py-2.5 border-b bg-muted/30 flex-wrap">
        <span className="text-[11px] text-muted-foreground mr-1">Sort:</span>
        <SortBtn label="PnL" k="pnl" />
        <SortBtn label="Volume" k="volume" />
        <SortBtn label="Trades" k="trades" />
        <SortBtn label="Win Rate" k="winRate" />
      </div>

      {/* Trader rows */}
      <div className="divide-y divide-border">
        {sorted.map((trader) => {
          const isExpanded = expanded === trader.rank;
          return (
            <div key={trader.rank}>
              <button
                className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
                onClick={() => setExpanded(isExpanded ? null : trader.rank)}
              >
                {/* Rank */}
                <span className="text-sm w-7 shrink-0 text-center">{rankBadge(trader.rank)}</span>

                {/* Tag + wallet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{trader.tag}</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white shrink-0"
                      style={{ background: trader.stratColor }}
                    >
                      {trader.strategy}
                    </span>
                    {trader.change === "up" && <ChevronUp className="size-3 text-emerald-500" />}
                    {trader.change === "down" && <ChevronDown className="size-3 text-red-500" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">{trader.wallet}</p>
                </div>

                {/* Sparkline */}
                <div className="w-16 h-8 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trader.spark}>
                      <Tooltip content={() => null} />
                      <Line
                        type="monotone" dataKey="v" dot={false} strokeWidth={1.5}
                        stroke={trader.spark[trader.spark.length - 1].v > trader.spark[0].v ? "#10b981" : "#ef4444"}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* PnL */}
                <span className={cn("text-sm font-semibold shrink-0 text-right w-24",
                  trader.pnlRaw >= 0 ? "text-emerald-500" : "text-red-500")}>
                  {trader.pnl}
                </span>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-4 grid grid-cols-3 gap-2 bg-muted/20">
                  {[
                    { label: "Volume", value: trader.volume },
                    { label: "Trades", value: trader.trades === 0 && liveTraders ? "—" : trader.trades.toLocaleString() },
                    ...(trader.winRate === "—" ? [] : [{ label: "Win Rate", value: trader.winRate }]),
                  ].map((s) => (
                    <div key={s.label} className="p-2.5 rounded-lg border bg-card">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                      <p className="text-sm font-semibold">{s.value}</p>
                    </div>
                  ))}
                  <button
                    className="col-span-3 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={() => window.open(`/tracker?wallet=${trader.wallet}`, "_blank")}
                  >
                    <ExternalLink className="size-3.5" />
                    View in Scanner
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 py-2.5 border-t">
        <a href="/mainnet" className="text-xs text-primary hover:underline flex items-center gap-1">
          {liveTraders ? "Live 7D data · View full leaderboard" : "View full leaderboard"} <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}
