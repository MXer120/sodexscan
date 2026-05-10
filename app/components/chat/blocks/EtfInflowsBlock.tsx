"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, ReferenceLine, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Info, Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EtfBlockProps {
  tickers?:  string[];               // which ETFs to include (default: all 4)
  selected?: string;                 // pre-selected ETF in single mode
  tf?:       "1W" | "1M" | "3M";   // initial timeframe
  view?:     "bar" | "cumulative";  // daily bars or cumulative line
  overlay?:  boolean;               // overlay all tickers on one chart
}

const TIMEFRAMES = ["1W", "1M", "3M"] as const;
type TF = typeof TIMEFRAMES[number];
const SLICE: Record<TF, number> = { "1W": 5, "1M": 21, "3M": 63 };

const ALL_TICKERS = ["IBIT", "FBTC", "ARKB", "GBTC"] as const;

const STATIC: Record<string, { name: string; issuer: string; color: string }> = {
  IBIT: { name: "iShares Bitcoin Trust",        issuer: "BlackRock",  color: "#6366f1" },
  FBTC: { name: "Fidelity Wise Origin Bitcoin",  issuer: "Fidelity",  color: "#10b981" },
  ARKB: { name: "ARK 21Shares Bitcoin ETF",      issuer: "ARK Invest", color: "#f59e0b" },
  GBTC: { name: "Grayscale Bitcoin Trust",       issuer: "Grayscale", color: "#ef4444" },
};

interface EtfEntry  { date: string; flow: number; cumulative: number }
interface EtfLive   { aum: string | null; ytdFlow: string | null; entries: EtfEntry[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseHistory(raw: Array<{ date: string; net_inflow: number; cum_inflow: number }>): EtfEntry[] {
  return [...raw]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(item => ({
      date:       new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      flow:       item.net_inflow / 1e6,
      cumulative: item.cum_inflow / 1e6,
    }));
}

function fmtMil(n: number, sign = false): string {
  const abs = Math.abs(n);
  const s = sign ? (n >= 0 ? "+" : "-") : n < 0 ? "-" : "";
  if (abs >= 1000) return `${s}$${(abs / 1000).toFixed(1)}B`;
  return `${s}$${abs.toFixed(0)}M`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EtfInflowsBlock({ props = {} }: { props?: EtfBlockProps }) {
  // Resolve initial config from AI props
  const initTickers: string[] = useMemo(() => {
    const t = props.tickers?.filter(x => x in STATIC);
    return t && t.length > 0 ? t : [...ALL_TICKERS];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [selected,  setSelected]  = useState<string>(props.selected ?? initTickers[0] ?? "IBIT");
  const [tf,        setTf]        = useState<TF>((props.tf as TF) ?? "1M");
  const [view,      setView]      = useState<"bar" | "cumulative">(props.view ?? "bar");
  const [overlay,   setOverlay]   = useState<boolean>(props.overlay ?? false);
  // In overlay mode, track which tickers are enabled (all on by default)
  const [enabled,   setEnabled]   = useState<Set<string>>(new Set(initTickers));

  const [liveData,  setLiveData]  = useState<Record<string, EtfLive | null>>({});
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all(
      initTickers.flatMap(t => [
        fetch(`/api/sosovalue?module=etf&key=${t.toLowerCase()}_history`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/sosovalue?module=etf&key=${t.toLowerCase()}_snapshot`).then(r => r.ok ? r.json() : null).catch(() => null),
      ])
    ).then(results => {
      if (!alive) return;
      const next: Record<string, EtfLive | null> = {};
      initTickers.forEach((t, i) => {
        const hist = results[i * 2];
        const snap = results[i * 2 + 1];
        const entries = Array.isArray(hist?.data) && hist.data.length > 0
          ? parseHistory(hist.data) : null;
        if (!entries) { next[t] = null; return; }
        const s = snap?.data;
        next[t] = {
          entries,
          aum:     s?.net_assets != null ? fmtMil(s.net_assets)       : null,
          ytdFlow: s?.cum_inflow  != null ? fmtMil(s.cum_inflow, true) : null,
        };
      });
      setLiveData(next);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Single-ETF data ──
  const single     = liveData[selected];
  const singleSlice = (single?.entries ?? []).slice(-SLICE[tf]);
  const totalFlow  = singleSlice.reduce((s, d) => s + d.flow, 0);
  const positive   = totalFlow >= 0;
  const tickInterval = singleSlice.length > 14 ? Math.floor(singleSlice.length / 7) : 1;

  // ── Overlay data — merge all enabled tickers on shared date backbone ──
  const overlayData = useMemo(() => {
    const activeTickers = initTickers.filter(t => enabled.has(t) && liveData[t]?.entries);
    if (!activeTickers.length) return [];
    const backbone = (liveData[activeTickers[0]]?.entries ?? []).slice(-SLICE[tf]);
    return backbone.map((entry, idx) => {
      const point: Record<string, string | number | null> = { date: entry.date };
      for (const t of activeTickers) {
        const e = (liveData[t]?.entries ?? []).slice(-SLICE[tf]);
        point[t] = e[idx]?.cumulative ?? null;
      }
      return point;
    });
  }, [liveData, enabled, tf, initTickers]);

  const activeTickers = initTickers.filter(t => enabled.has(t));
  const anyData       = !loading && (overlay ? overlayData.length > 0 : single != null && singleSlice.length > 0);
  const isLive        = anyData;

  const toggleTicker = (t: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(t) && next.size > 1) next.delete(t); else next.add(t);
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border bg-card overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">
              Bitcoin ETF Flows{overlay ? " — Overlay" : ""}
            </p>
            {overlay
              ? <p className="text-sm font-semibold">{activeTickers.join(" · ")}</p>
              : <>
                  <p className="text-sm font-semibold">{STATIC[selected]?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {STATIC[selected]?.issuer}{single?.aum ? ` · AUM ${single.aum}` : ""}
                  </p>
                </>
            }
          </div>
          {!overlay && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Cumulative Net Flow</p>
              {loading
                ? <Loader2 className="size-4 animate-spin text-muted-foreground ml-auto" />
                : single?.ytdFlow
                  ? <p className={cn("text-lg font-bold", single.ytdFlow.startsWith("+") ? "text-emerald-500" : "text-red-500")}>{single.ytdFlow}</p>
                  : <p className="text-lg font-bold text-muted-foreground">—</p>
              }
            </div>
          )}
        </div>

        {/* Ticker tabs — selection in single mode, toggles in overlay */}
        <div className="flex items-center gap-1 flex-wrap">
          {initTickers.map(ticker => {
            const isActive = overlay ? enabled.has(ticker) : selected === ticker;
            return (
              <button key={ticker}
                onClick={() => overlay ? toggleTicker(ticker) : setSelected(ticker)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                  isActive ? "text-white border-transparent" : "text-muted-foreground bg-muted border-transparent hover:border-border"
                )}
                style={isActive ? { background: STATIC[ticker].color } : {}}
              >
                {ticker}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(t => (
            <button key={t} onClick={() => setTf(t)}
              className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors",
                tf === t ? "bg-background border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {!overlay && (
            <>
              <button onClick={() => setView("bar")}
                className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors",
                  view === "bar" ? "bg-background border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                Daily
              </button>
              <button onClick={() => setView("cumulative")}
                className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors",
                  view === "cumulative" ? "bg-background border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                Cumulative
              </button>
              <div className="w-px h-3.5 bg-border mx-1" />
            </>
          )}
          <button onClick={() => setOverlay(v => !v)}
            className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors border",
              overlay ? "bg-background border-border shadow-sm text-foreground" : "text-muted-foreground border-transparent hover:text-foreground")}>
            Overlay
          </button>
        </div>
      </div>

      {/* Summary row (single mode) */}
      {!overlay && (
        <div className="flex items-center gap-2 px-5 py-3">
          {positive ? <TrendingUp className="size-4 text-emerald-500" /> : <TrendingDown className="size-4 text-red-500" />}
          <span className="text-xs text-muted-foreground">{tf} net flow:</span>
          <span className={cn("text-sm font-semibold", positive ? "text-emerald-500" : "text-red-500")}>
            {loading ? "—" : anyData ? fmtMil(totalFlow, true) : "—"}
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="h-[220px] px-3 pb-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !anyData ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground">No data — set SOSOVALUE_API_KEY to enable live feeds</p>
          </div>
        ) : overlay ? (
          // ── Overlay: all tickers cumulative on one line chart ──
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overlayData}>
              <CartesianGrid strokeDasharray="0" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "#71717a" }}
                interval={overlayData.length > 14 ? Math.floor(overlayData.length / 7) : 1} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }}
                tickFormatter={v => `$${Math.abs(v / 1000).toFixed(0)}B`} width={40} />
              <ReferenceLine y={0} stroke="#3f3f46" strokeWidth={1} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                    <p className="font-medium mb-1">{label}</p>
                    {payload.map(p => (
                      <p key={p.dataKey as string} style={{ color: p.color }}>
                        {p.dataKey}: {fmtMil(Number(p.value ?? 0), true)}
                      </p>
                    ))}
                  </div>
                );
              }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              {activeTickers.map(t => (
                <Line key={t} type="monotone" dataKey={t} name={t}
                  stroke={STATIC[t].color} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : view === "bar" ? (
          // ── Single ETF: daily bar chart ──
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={singleSlice} barGap={2}>
              <CartesianGrid strokeDasharray="0" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "#71717a" }} interval={tickInterval} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }}
                tickFormatter={v => `$${Math.abs(v / 1000).toFixed(0)}B`} width={40} />
              <ReferenceLine y={0} stroke="#3f3f46" strokeWidth={1} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const val = Number(payload[0]?.value ?? 0);
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs">
                    <p className="font-medium mb-1">{label}</p>
                    <p className={val >= 0 ? "text-emerald-500" : "text-red-500"}>
                      Net Flow: {fmtMil(val, true)}
                    </p>
                  </div>
                );
              }} />
              <Bar dataKey="flow" radius={[2, 2, 0, 0]} maxBarSize={14}>
                {singleSlice.map((entry, i) => (
                  <Cell key={i} fill={entry.flow >= 0 ? STATIC[selected]?.color ?? "#6366f1" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          // ── Single ETF: cumulative line chart ──
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={singleSlice}>
              <CartesianGrid strokeDasharray="0" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "#71717a" }} interval={tickInterval} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }}
                tickFormatter={v => `$${(v / 1000).toFixed(1)}B`} width={44} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const val = Number(payload[0]?.value ?? 0);
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs">
                    <p className="font-medium mb-1">{label}</p>
                    <p style={{ color: STATIC[selected]?.color }}>Cumulative: {fmtMil(val, true)}</p>
                  </div>
                );
              }} />
              <Line type="monotone" dataKey="cumulative"
                stroke={STATIC[selected]?.color ?? "#6366f1"} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 border-t bg-muted/20">
        {isLive
          ? <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          : <Info className="size-3 text-muted-foreground shrink-0" />
        }
        <p className="text-[11px] text-muted-foreground">
          {isLive ? "Live via SoSoValue · refreshed every 3 min" : "Set SOSOVALUE_API_KEY in .env.local to enable live ETF feeds"}
        </p>
      </div>
    </div>
  );
}
