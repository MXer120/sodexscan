"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ComposedChart, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, ReferenceLine, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Info, Loader2, LayoutGrid } from "lucide-react";
import { cn } from "@/app/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EtfBlockProps {
  tickers?:           string[];
  selected?:          string;
  tf?:                "1W" | "1M" | "3M";
  view?:              "bar" | "cumulative";
  overlay?:           boolean;
  showCumulativeLine?: boolean; // overlay cumulative line on top of daily bars
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

const COMBINED = "combined";
const INFLOW_COLOR  = "#10b981"; // green for positive flows
const OUTFLOW_COLOR = "#ef4444"; // red for negative flows
const MAX_VISIBLE_TABS = 4;

interface EtfEntry { date: string; flow: number }
interface EtfLive  { aum: string | null; entries: EtfEntry[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseHistory(raw: Array<{ date: string; net_inflow: number }>): EtfEntry[] {
  return [...raw]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(item => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      flow: item.net_inflow / 1e6,
    }));
}

function parseCombined(raw: Array<{ date: string; total_net_inflow: number; total_net_assets?: number }>): { entries: EtfEntry[]; aum: string | null } {
  const sorted = [...raw].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const entries = sorted.map(item => ({
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    flow: item.total_net_inflow / 1e6,
  }));
  const latest = sorted[sorted.length - 1];
  const aum = latest?.total_net_assets ? fmtMil(latest.total_net_assets) : null;
  return { entries, aum };
}

// Period-relative cumulative: running sum starting at 0 for the slice
function withPeriodCum(slice: EtfEntry[]): Array<EtfEntry & { periodCum: number }> {
  let running = 0;
  return slice.map(e => { running = +(running + e.flow).toFixed(2); return { ...e, periodCum: running }; });
}

function fmtMil(n: number, sign = false): string {
  const abs = Math.abs(n);
  const s = sign ? (n >= 0 ? "+" : "-") : n < 0 ? "-" : "";
  if (abs >= 1000) return `${s}$${(abs / 1000).toFixed(1)}B`;
  return `${s}$${abs.toFixed(0)}M`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EtfInflowsBlock({ props = {} }: { props?: EtfBlockProps }) {
  const hasAiConfig = Object.keys(props).some(k => (props as Record<string, unknown>)[k] !== undefined);

  const resolveInitTickers = (p: EtfBlockProps) => {
    const t = p.tickers?.filter(x => x in STATIC);
    return t && t.length > 0 ? t : [...ALL_TICKERS];
  };

  const [isFullMode,        setIsFullMode]        = useState(false);
  const [selected,          setSelected]          = useState<string>(props.selected ?? COMBINED);
  const [tf,                setTf]                = useState<TF>((props.tf as TF) ?? "1M");
  const [view,              setView]              = useState<"bar" | "cumulative">(props.view ?? "bar");
  const [overlay,           setOverlay]           = useState<boolean>(props.overlay ?? false);
  const [showCumLine,       setShowCumLine]       = useState<boolean>(props.showCumulativeLine ?? false);
  const [initTickers,       setInitTickers]       = useState<string[]>(() => resolveInitTickers(props));
  const [enabled,           setEnabled]           = useState<Set<string>>(new Set(resolveInitTickers(props)));

  // Reset to full defaults when toggling full mode
  useEffect(() => {
    if (isFullMode) {
      setSelected(COMBINED);
      setTf("1M");
      setView("bar");
      setOverlay(false);
      setShowCumLine(false);
      setInitTickers([...ALL_TICKERS]);
      setEnabled(new Set([...ALL_TICKERS]));
    } else if (hasAiConfig) {
      setSelected(props.selected ?? COMBINED);
      setTf((props.tf as TF) ?? "1M");
      setView(props.view ?? "bar");
      setOverlay(props.overlay ?? false);
      setShowCumLine(props.showCumulativeLine ?? false);
      const t = resolveInitTickers(props);
      setInitTickers(t);
      setEnabled(new Set(t));
    }
  }, [isFullMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const [liveData,     setLiveData]     = useState<Record<string, EtfLive | null>>({});
  const [combinedLive, setCombinedLive] = useState<EtfLive | null>(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    let alive = true;
    const allT = [...ALL_TICKERS];
    Promise.all([
      fetch(`/api/sosovalue?module=etf&key=btc_flows`).then(r => r.ok ? r.json() : null).catch(() => null),
      ...allT.flatMap(t => [
        fetch(`/api/sosovalue?module=etf&key=${t.toLowerCase()}_history`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/sosovalue?module=etf&key=${t.toLowerCase()}_snapshot`).then(r => r.ok ? r.json() : null).catch(() => null),
      ]),
    ]).then(results => {
      if (!alive) return;
      const combinedRes = results[0];
      if (Array.isArray(combinedRes?.data) && combinedRes.data.length > 0) {
        const { entries, aum } = parseCombined(combinedRes.data);
        setCombinedLive({ entries, aum });
      }
      const next: Record<string, EtfLive | null> = {};
      allT.forEach((t, i) => {
        const hist = results[1 + i * 2];
        const snap = results[1 + i * 2 + 1];
        const entries = Array.isArray(hist?.data) && hist.data.length > 0 ? parseHistory(hist.data) : null;
        if (!entries) { next[t] = null; return; }
        const s = snap?.data;
        next[t] = { entries, aum: s?.net_assets != null ? fmtMil(s.net_assets) : null };
      });
      setLiveData(next);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Active dataset ────────────────────────────────────────────────────────
  const isCombined = selected === COMBINED;
  const activeLive = isCombined ? combinedLive : liveData[selected];
  const rawSlice   = (activeLive?.entries ?? []).slice(-SLICE[tf]);
  const singleSlice = withPeriodCum(rawSlice);
  const totalFlow   = rawSlice.reduce((s, d) => s + d.flow, 0);
  const positive    = totalFlow >= 0;
  const tickInterval = rawSlice.length > 21 ? Math.floor(rawSlice.length / 7) : rawSlice.length > 10 ? 2 : 1;

  // ── Overlay data (period-relative cumulative per ticker) ──────────────────
  const overlayData = useMemo(() => {
    const active = initTickers.filter(t => enabled.has(t) && liveData[t]?.entries);
    if (!active.length) return [];
    const backbone = (liveData[active[0]]?.entries ?? []).slice(-SLICE[tf]);
    return backbone.map((entry, idx) => {
      const point: Record<string, string | number | null> = { date: entry.date };
      for (const t of active) {
        const sl = (liveData[t]?.entries ?? []).slice(-SLICE[tf]);
        point[t] = +sl.slice(0, idx + 1).reduce((s, e) => s + e.flow, 0).toFixed(2);
      }
      return point;
    });
  }, [liveData, enabled, tf, initTickers]);

  const activeTickers = initTickers.filter(t => enabled.has(t));
  const anyData = !loading && (overlay ? overlayData.length > 0 : activeLive != null && singleSlice.length > 0);
  const isLive  = anyData;

  const toggleTicker = (t: string) =>
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(t) && next.size > 1) next.delete(t); else next.add(t);
      return next;
    });

  // Ticker tab overflow
  const visibleTickers  = initTickers.slice(0, MAX_VISIBLE_TABS);
  const overflowTickers = initTickers.slice(MAX_VISIBLE_TABS);

  // ── Shared axis formatter ─────────────────────────────────────────────────
  const fmtAxis = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1000) return `${v < 0 ? "-" : ""}$${(abs / 1000).toFixed(0)}B`;
    return `${v < 0 ? "-" : ""}$${abs.toFixed(0)}M`;
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
            {isCombined && !overlay
              ? <>
                  <p className="text-sm font-semibold">All BTC ETFs — Market Total</p>
                  <p className="text-xs text-muted-foreground">All providers{combinedLive?.aum ? ` · Total AUM ${combinedLive.aum}` : ""}</p>
                </>
              : overlay
                ? <p className="text-sm font-semibold">{activeTickers.join(" · ")}</p>
                : <>
                    <p className="text-sm font-semibold">{STATIC[selected]?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {STATIC[selected]?.issuer}{activeLive?.aum ? ` · AUM ${activeLive.aum}` : ""}
                    </p>
                  </>
            }
          </div>
          {!overlay && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">{tf} Net Flow</p>
              {loading
                ? <Loader2 className="size-4 animate-spin text-muted-foreground ml-auto" />
                : anyData
                  ? <p className={cn("text-lg font-bold", positive ? "text-emerald-500" : "text-red-500")}>{fmtMil(totalFlow, true)}</p>
                  : <p className="text-lg font-bold text-muted-foreground">—</p>
              }
            </div>
          )}
        </div>

        {/* Tabs: All ETFs + individual + overflow */}
        <div className="flex items-center gap-1 flex-wrap">
          {!overlay && (
            <button
              onClick={() => setSelected(COMBINED)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                selected === COMBINED
                  ? "bg-foreground text-background border-transparent"
                  : "text-muted-foreground bg-muted border-transparent hover:border-border"
              )}
            >
              All ETFs
            </button>
          )}
          {visibleTickers.map(ticker => {
            const isActive = overlay ? enabled.has(ticker) : selected === ticker;
            return (
              <button key={ticker}
                onClick={() => overlay ? toggleTicker(ticker) : setSelected(ticker)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                  isActive ? "text-white border-transparent" : "text-muted-foreground bg-muted border-transparent hover:border-border"
                )}
                style={isActive ? { background: STATIC[ticker]?.color ?? "#6366f1" } : {}}
              >
                {ticker}
              </button>
            );
          })}
          {overflowTickers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-3 py-1 rounded-full text-xs font-medium border text-muted-foreground bg-muted hover:border-border transition-colors">
                  +{overflowTickers.length} ···
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {overflowTickers.map(ticker => {
                  const isActive = overlay ? enabled.has(ticker) : selected === ticker;
                  return (
                    <DropdownMenuItem key={ticker}
                      onSelect={() => overlay ? toggleTicker(ticker) : setSelected(ticker)}
                      className="gap-2 cursor-pointer"
                    >
                      <span className="size-2 rounded-full shrink-0" style={{ background: STATIC[ticker]?.color ?? "#6366f1" }} />
                      <span className="flex-1">{ticker}</span>
                      {STATIC[ticker] && <span className="text-xs text-muted-foreground">{STATIC[ticker].issuer}</span>}
                      {isActive && <span className="text-xs text-primary">✓</span>}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
        <div className="flex items-center gap-1 flex-wrap">
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
              {view === "bar" && (
                <button onClick={() => setShowCumLine(v => !v)}
                  className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors border",
                    showCumLine ? "bg-background border-border shadow-sm text-foreground" : "text-muted-foreground border-transparent hover:text-foreground")}
                  title="Overlay cumulative line on daily bars">
                  + Cum. line
                </button>
              )}
              <div className="w-px h-3.5 bg-border mx-0.5" />
            </>
          )}
          {!isCombined && (
            <button onClick={() => setOverlay(v => !v)}
              className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors border",
                overlay ? "bg-background border-border shadow-sm text-foreground" : "text-muted-foreground border-transparent hover:text-foreground")}>
              Overlay
            </button>
          )}
        </div>
      </div>

      {/* Summary row */}
      {!overlay && (
        <div className="flex items-center gap-2 px-5 py-3">
          {positive ? <TrendingUp className="size-4 text-emerald-500" /> : <TrendingDown className="size-4 text-red-500" />}
          <span className="text-xs text-muted-foreground">{tf} net flow:</span>
          <span className={cn("text-sm font-semibold", positive ? "text-emerald-500" : "text-red-500")}>
            {loading ? "—" : anyData ? fmtMil(totalFlow, true) : "—"}
          </span>
          {!loading && anyData && showCumLine && view === "bar" && (
            <>
              <span className="text-xs text-muted-foreground ml-2">cumulative:</span>
              <span className="text-sm font-semibold text-muted-foreground">
                {fmtMil(singleSlice[singleSlice.length - 1]?.periodCum ?? 0, true)}
              </span>
            </>
          )}
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
          /* Overlay: period-relative cumulative lines per ticker */
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overlayData}>
              <CartesianGrid strokeDasharray="0" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "#71717a" }}
                interval={overlayData.length > 14 ? Math.floor(overlayData.length / 7) : 1} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }}
                tickFormatter={fmtAxis} width={44} />
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
                  stroke={STATIC[t]?.color ?? "#6366f1"} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : view === "bar" ? (
          /* Daily bar chart, optionally with cumulative line overlay */
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={singleSlice} barGap={2}>
              <CartesianGrid strokeDasharray="0" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "#71717a" }} interval={tickInterval} dy={6} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={fmtAxis} width={40} />
              {showCumLine && (
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={fmtAxis} width={44} />
              )}
              <ReferenceLine yAxisId="left" y={0} stroke="#3f3f46" strokeWidth={1} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const flowVal  = Number(payload.find(p => p.dataKey === "flow")?.value ?? 0);
                const cumVal   = Number(payload.find(p => p.dataKey === "periodCum")?.value ?? 0);
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                    <p className="font-medium mb-1">{label}</p>
                    <p className={flowVal >= 0 ? "text-emerald-500" : "text-red-500"}>
                      Daily: {fmtMil(flowVal, true)}
                    </p>
                    {showCumLine && (
                      <p className="text-slate-400">Cumulative: {fmtMil(cumVal, true)}</p>
                    )}
                  </div>
                );
              }} />
              <Bar yAxisId="left" dataKey="flow" radius={[2, 2, 0, 0]}>
                {singleSlice.map((entry, i) => (
                  <Cell key={i} fill={entry.flow >= 0 ? INFLOW_COLOR : OUTFLOW_COLOR} />
                ))}
              </Bar>
              {showCumLine && (
                <Line yAxisId="right" type="monotone" dataKey="periodCum"
                  stroke="#94a3b8" strokeWidth={1.5} dot={false}
                  strokeDasharray="4 2" name="Cumulative" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          /* Cumulative line chart — period-relative */
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={singleSlice}>
              <CartesianGrid strokeDasharray="0" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "#71717a" }} interval={tickInterval} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }}
                tickFormatter={fmtAxis} width={44} />
              <ReferenceLine y={0} stroke="#3f3f46" strokeWidth={1} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const val = Number(payload[0]?.value ?? 0);
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs">
                    <p className="font-medium mb-1">{label}</p>
                    <p style={{ color: isCombined ? "#6366f1" : STATIC[selected]?.color }}>
                      Cumulative ({tf}): {fmtMil(val, true)}
                    </p>
                  </div>
                );
              }} />
              <Line type="monotone" dataKey="periodCum"
                stroke={isCombined ? "#6366f1" : (STATIC[selected]?.color ?? "#6366f1")}
                strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-t bg-muted/20">
        <div className="flex items-center gap-1.5 min-w-0">
          {isLive
            ? <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            : <Info className="size-3 text-muted-foreground shrink-0" />
          }
          <p className="text-[11px] text-muted-foreground truncate">
            {isLive ? "Live via SoSoValue · refreshed every 3 min" : "Set SOSOVALUE_API_KEY in .env.local to enable live feeds"}
          </p>
        </div>
        {hasAiConfig && (
          <button
            onClick={() => setIsFullMode(v => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0 border rounded px-2 py-0.5 hover:bg-muted/50"
            title={isFullMode ? "Switch back to AI-configured view" : "Open full controls"}
          >
            <LayoutGrid className="size-3" />
            {isFullMode ? "AI view" : "Full controls"}
          </button>
        )}
      </div>
    </div>
  );
}
