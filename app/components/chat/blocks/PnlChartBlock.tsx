"use client";

import { useState, useEffect } from "react";
import {
  ComposedChart, Bar, Cell, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Loader2, Info, ExternalLink } from "lucide-react";
import { cn } from "@/app/lib/utils";

export interface PnlBlockProps {
  address?: string;
  days?:    number;
  view?:    "daily" | "cumulative";
}

interface DayEntry { date: string; pnl: number; cumPnl: number }

function fmtUsd(n: number, sign = false): string {
  const abs = Math.abs(n);
  const s = sign ? (n >= 0 ? "+" : "-") : n < 0 ? "-" : "";
  if (abs >= 1000) return `${s}$${(abs / 1000).toFixed(1)}K`;
  return `${s}$${abs.toFixed(0)}`;
}

function fmtAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function PnlChartBlock({ props = {} }: { props?: PnlBlockProps }) {
  const { address, days: initDays = 30, view: initView = "daily" } = props;

  const [days, setDays]       = useState<7 | 30 | 90>(initDays === 7 ? 7 : initDays === 90 ? 90 : 30);
  const [view, setView]       = useState<"daily" | "cumulative">(initView);
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(!!address);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`/api/wallet/pnl?address=${encodeURIComponent(address)}&days=${days}`)
      .then(r => r.json())
      .then(data => {
        if (!alive) return;
        const raw = Array.isArray(data) ? data : data?.data ?? [];
        // Normalise: handle {date,pnl} or {date,daily_pnl} or {time,pnl} etc.
        const sorted = [...raw]
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
            String(a.date ?? a.time ?? "").localeCompare(String(b.date ?? b.time ?? "")))
          .map((item: Record<string, unknown>) => ({
            date: new Date(String(item.date ?? item.time ?? "")).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            pnl: Number(item.pnl ?? item.daily_pnl ?? item.realizedPnl ?? 0),
          }));
        let cum = 0;
        const withCum: DayEntry[] = sorted.map(d => {
          cum = +(cum + d.pnl).toFixed(2);
          return { ...d, cumPnl: cum };
        });
        setEntries(withCum);
        setLoading(false);
      })
      .catch(e => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [address, days]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPnl = entries.reduce((s, d) => s + d.pnl, 0);
  const positive = totalPnl >= 0;
  const tickInterval = entries.length > 21 ? Math.floor(entries.length / 7) : entries.length > 10 ? 2 : 1;

  if (!address) {
    return (
      <div className="rounded-xl border bg-card px-5 py-4 text-sm text-muted-foreground">
        No wallet address provided — the AI needs to pass an address to display PnL data.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">PnL History</p>
          <p className="text-sm font-semibold font-mono">{fmtAddr(address)}</p>
          <p className="text-xs text-muted-foreground">Last {days} days</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-0.5">{days}D Net PnL</p>
          {loading
            ? <Loader2 className="size-4 animate-spin text-muted-foreground ml-auto" />
            : <p className={cn("text-lg font-bold", positive ? "text-emerald-500" : "text-red-500")}>
                {fmtUsd(totalPnl, true)}
              </p>
          }
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          {([7, 30, 90] as const).map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors",
                days === d ? "bg-background border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {d}D
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setView("daily")}
            className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors",
              view === "daily" ? "bg-background border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            Daily
          </button>
          <button onClick={() => setView("cumulative")}
            className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors",
              view === "cumulative" ? "bg-background border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            Cumulative
          </button>
        </div>
      </div>

      {/* Summary row */}
      {!loading && entries.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-3">
          {positive ? <TrendingUp className="size-4 text-emerald-500" /> : <TrendingDown className="size-4 text-red-500" />}
          <span className="text-xs text-muted-foreground">{days}D net:</span>
          <span className={cn("text-sm font-semibold", positive ? "text-emerald-500" : "text-red-500")}>
            {fmtUsd(totalPnl, true)}
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="h-[200px] px-3 pb-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-destructive">Failed to load PnL data</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground">No PnL data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={entries}>
              <CartesianGrid strokeDasharray="0" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "#71717a" }} interval={tickInterval} dy={6} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "#71717a" }}
                tickFormatter={v => fmtUsd(v)} width={48} />
              <ReferenceLine y={0} stroke="#3f3f46" strokeWidth={1} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const val = Number(payload[0]?.value ?? 0);
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs">
                    <p className="font-medium mb-1">{label}</p>
                    <p className={val >= 0 ? "text-emerald-500" : "text-red-500"}>
                      {view === "daily" ? "PnL" : "Cumulative"}: {fmtUsd(val, true)}
                    </p>
                  </div>
                );
              }} />
              {view === "daily"
                ? <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                    {entries.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? "#10b981" : "#ef4444"} />)}
                  </Bar>
                : <Line type="monotone" dataKey="cumPnl" stroke="#6366f1" strokeWidth={2} dot={false} />
              }
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-t bg-muted/20">
        <div className="flex items-center gap-1.5">
          {entries.length > 0
            ? <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            : <Info className="size-3 text-muted-foreground shrink-0" />
          }
          <p className="text-[11px] text-muted-foreground">
            {entries.length > 0 ? "Live · Sodex API" : "No data available"}
          </p>
        </div>
        <a href={`/tracker?wallet=${address}`}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors border rounded px-2 py-0.5 hover:bg-muted/50">
          <ExternalLink className="size-3" />
          Open in Scanner
        </a>
      </div>
    </div>
  );
}
