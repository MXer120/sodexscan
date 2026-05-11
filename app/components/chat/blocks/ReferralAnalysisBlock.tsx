"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { Users, ArrowRight, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/app/lib/utils";

function Sk({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("animate-pulse rounded bg-muted/50", className)} style={style} />;
}

function shortAddr(a: string) {
  return a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function fmtUsd(n: number, sign = false): string {
  const abs = Math.abs(n);
  const s = sign ? (n >= 0 ? "+" : "-") : n < 0 ? "-" : "";
  if (abs >= 1000) return `${s}$${(abs / 1000).toFixed(1)}K`;
  return `${s}$${abs.toFixed(0)}`;
}

interface PnlEntry { date: string; pnl: number; cumPnl: number }

export interface ReferralBlockProps {
  address?: string;
  code?: string;
}

export function ReferralAnalysisBlock({ props = {} }: { props?: ReferralBlockProps }) {
  const [searchInput,  setSearchInput]  = useState("");
  const [resolvedAddr, setResolvedAddr] = useState<string | null>(props.address ?? null);
  const [resolvedCode, setResolvedCode] = useState<string | null>(props.code ?? null);
  const [resolving,    setResolving]    = useState(false);
  const [resolveErr,   setResolveErr]   = useState<string | null>(null);
  const [pnlData,      setPnlData]      = useState<PnlEntry[]>([]);
  const [loadingPnl,   setLoadingPnl]   = useState(false);
  const [metric,       setMetric]       = useState<"daily" | "cumulative">("daily");

  // Fetch PnL when address changes
  useEffect(() => {
    if (!resolvedAddr) return;
    setLoadingPnl(true);
    fetch(`/api/wallet/pnl?address=${encodeURIComponent(resolvedAddr)}&days=30`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(data => {
        const raw = Array.isArray(data) ? data : data?.data ?? [];
        let cum = 0;
        const entries: PnlEntry[] = [...raw]
          .sort((a: Record<string,unknown>, b: Record<string,unknown>) =>
            String(a.date ?? a.time ?? "").localeCompare(String(b.date ?? b.time ?? "")))
          .map((item: Record<string,unknown>) => {
            const pnl = Number(item.pnl ?? item.daily_pnl ?? item.realizedPnl ?? 0);
            cum = +(cum + pnl).toFixed(2);
            return {
              date: new Date(String(item.date ?? item.time ?? "")).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              pnl,
              cumPnl: cum,
            };
          });
        setPnlData(entries);
        setLoadingPnl(false);
      });
  }, [resolvedAddr]);

  async function handleSearch() {
    const code = searchInput.trim().toUpperCase();
    if (!code) return;
    setResolving(true);
    setResolveErr(null);
    try {
      const res = await fetch(`/api/referral/resolve?code=${encodeURIComponent(code)}`);
      const json = await res.json();
      if (json?.wallet) {
        setResolvedAddr(json.wallet);
        setResolvedCode(json.code ?? code);
        setPnlData([]);
      } else {
        setResolveErr("Code not found or has no linked wallet.");
      }
    } catch {
      setResolveErr("Failed to look up code.");
    }
    setResolving(false);
  }

  const totalPnl = pnlData.reduce((s, d) => s + d.pnl, 0);
  const positive = totalPnl >= 0;
  const chartData = metric === "daily" ? pnlData : pnlData;
  const tickInterval = pnlData.length > 14 ? Math.floor(pnlData.length / 7) : 2;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <Users className="size-4 text-indigo-400" />
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Referral Analysis</p>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 h-8 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono uppercase"
            placeholder="Enter referral code…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={resolving || !searchInput.trim()}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {resolving ? "…" : <><span>Look up</span><ArrowRight className="size-3.5" /></>}
          </button>
        </div>

        {resolveErr && (
          <p className="text-xs text-destructive mt-2">{resolveErr}</p>
        )}

        {/* Resolved wallet info */}
        {resolvedAddr && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {resolvedCode && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                {resolvedCode}
              </span>
            )}
            <span className="text-xs font-mono text-muted-foreground">{shortAddr(resolvedAddr)}</span>
            <a
              href={`/tracker?wallet=${resolvedAddr}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-primary hover:underline ml-auto"
            >
              Open in Scanner <ExternalLink className="size-3" />
            </a>
          </div>
        )}
      </div>

      {/* PnL section */}
      {resolvedAddr ? (
        <>
          {/* PnL summary */}
          <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              {positive
                ? <TrendingUp className="size-4 text-emerald-500" />
                : <TrendingDown className="size-4 text-red-500" />}
              <span className="text-xs text-muted-foreground">30D net PnL:</span>
              {loadingPnl
                ? <Sk className="h-4 w-16" />
                : <span className={cn("text-sm font-semibold", positive ? "text-emerald-500" : "text-red-500")}>
                    {fmtUsd(totalPnl, true)}
                  </span>
              }
            </div>
            <div className="flex items-center gap-1">
              {(["daily", "cumulative"] as const).map(m => (
                <button key={m} onClick={() => setMetric(m)}
                  className={cn("px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
                    metric === m ? "bg-background border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {m === "daily" ? "Daily" : "Cumulative"}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="h-[160px] px-3 py-3">
            {loadingPnl ? (
              <div className="h-full flex flex-col justify-end gap-1 pb-1">
                {[28, 45, 62, 38, 71, 52, 35, 58].map((h, i) => (
                  <Sk key={i} className="w-full shrink-0" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : pnlData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-muted-foreground">No PnL data for this wallet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false}
                    tick={{ fontSize: 9, fill: "#71717a" }} interval={tickInterval} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#71717a" }}
                    width={40} tickFormatter={v => fmtUsd(v)} />
                  <ReferenceLine y={0} stroke="#3f3f46" strokeWidth={1} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const val = Number(payload[0]?.value ?? 0);
                    return (
                      <div className="bg-popover border border-border rounded-lg p-2.5 shadow-lg text-xs">
                        <p className="font-medium mb-1">{label}</p>
                        <p className={val >= 0 ? "text-emerald-500" : "text-red-500"}>
                          {metric === "daily" ? "PnL" : "Cumulative"}: {fmtUsd(val, true)}
                        </p>
                      </div>
                    );
                  }} />
                  <Area type="monotone" dataKey={metric === "daily" ? "pnl" : "cumPnl"}
                    stroke="#6366f1" strokeWidth={2} fill="url(#pnlGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      ) : (
        <div className="px-5 py-8 text-center">
          <p className="text-xs text-muted-foreground">Enter a referral code above to look up the wallet and PnL history.</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-2.5 border-t bg-muted/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {resolvedAddr && pnlData.length > 0
            ? <><span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" /><p className="text-[11px] text-muted-foreground">Live · Sodex API</p></>
            : <p className="text-[11px] text-muted-foreground">Enter a code to load live data</p>
          }
        </div>
      </div>
    </div>
  );
}
