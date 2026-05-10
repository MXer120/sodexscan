"use client";

import { useState, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  MoreHorizontal,
  BarChart3,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  Grid3X3,
  RefreshCw,
  Check,
  CalendarDays,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  ComposedChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  TooltipProps,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/app/components/ui/dropdown-menu";
import { Skeleton } from "@/app/components/ui/skeleton";
import { useUserProfile } from "@/app/hooks/useProfile";
import { useWalletData } from "@/app/hooks/useWalletData";
import { cn } from "@/app/lib/utils";

type ChartType = "bar" | "line" | "area";
type Timeframe = "1W" | "1M" | "3M" | "1Y" | "ALL";
type ViewMode = "chart" | "calendar";

const TIMEFRAMES: Timeframe[] = ["1W", "1M", "3M", "1Y", "ALL"];
const TIMEFRAME_DAYS: Record<Timeframe, number | null> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "1Y": 365,
  ALL: null,
};

function fmt$(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface PnlPoint {
  ts_ms: number;
  label: string;
  daily: number;
  cumulative: number;
}

function buildPnlSeries(items: { ts_ms: number; pnl: string }[]): PnlPoint[] {
  const sorted = [...items].sort((a, b) => a.ts_ms - b.ts_ms);
  return sorted.map((item, i) => {
    const cum = parseFloat(item.pnl || "0");
    const prev = i === 0 ? 0 : parseFloat(sorted[i - 1].pnl || "0");
    return {
      ts_ms: item.ts_ms,
      label: fmtDate(item.ts_ms),
      daily: cum - prev,
      cumulative: cum,
    };
  });
}

function filterByTimeframe(data: PnlPoint[], tf: Timeframe): PnlPoint[] {
  const days = TIMEFRAME_DAYS[tf];
  if (days === null) return data;
  const cutoff = Date.now() - days * 86400000;
  return data.filter((d) => d.ts_ms >= cutoff);
}

function filterByRange(data: PnlPoint[], from: string, to: string): PnlPoint[] {
  const f = new Date(from).getTime();
  const t = new Date(to).getTime() + 86400000;
  return data.filter((d) => d.ts_ms >= f && d.ts_ms <= t);
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const daily = payload.find((p) => p.dataKey === "daily");
  const cum = payload.find((p) => p.dataKey === "cumulative");
  const dailyVal = Number(daily?.value ?? 0);
  const cumVal = Number(cum?.value ?? 0);
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[150px]">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className={`size-2 rounded-full ${dailyVal >= 0 ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className="text-xs text-muted-foreground">Daily PnL</span>
          </div>
          <span className={`text-sm font-semibold ${dailyVal >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {dailyVal >= 0 ? "+" : ""}{fmt$(dailyVal)}
          </span>
        </div>
        {cum && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-indigo-500" />
              <span className="text-xs text-muted-foreground">Cumulative</span>
            </div>
            <span className={`text-sm font-semibold ${cumVal >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {cumVal >= 0 ? "+" : ""}{fmt$(cumVal)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarGrid({ data }: { data: PnlPoint[] }) {
  const lastDate = data.length ? new Date(data[data.length - 1].ts_ms) : new Date();
  const [viewYear, setViewYear] = useState(lastDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(lastDate.getMonth());

  const byDate = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((d) => {
      const iso = new Date(d.ts_ms).toISOString().slice(0, 10);
      map[iso] = d.daily;
    });
    return map;
  }, [data]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthName = new Date(viewYear, viewMonth).toLocaleString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <div className="px-5 pb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">{monthName}</span>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="inline-flex items-center justify-center size-7 rounded hover:bg-muted">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={nextMonth} className="inline-flex items-center justify-center size-7 rounded hover:bg-muted">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const pnl = byDate[iso];
          const has = pnl !== undefined;
          return (
            <div key={iso} className={cn(
              "rounded-md p-1 text-center min-h-[44px] flex flex-col items-center justify-center gap-0.5",
              has && pnl >= 0 && "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800",
              has && pnl < 0 && "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800",
              !has && "bg-muted/30"
            )}>
              <span className="text-[11px] font-medium text-muted-foreground">{day}</span>
              {has && (
                <span className={`text-[10px] font-semibold leading-none ${pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {pnl >= 0 ? "+" : ""}{Math.abs(pnl) >= 1000 ? `${(pnl / 1000).toFixed(1)}k` : pnl.toFixed(0)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FinancialFlowChart() {
  const { theme } = useTheme();
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [showGrid, setShowGrid] = useState(true);
  const [showCumulative, setShowCumulative] = useState(false);
  const [smoothCurve, setSmoothCurve] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [useCustomRange, setUseCustomRange] = useState(false);

  const isDark = theme === "dark";
  const axisColor = isDark ? "#71717a" : "#a1a1aa";
  const gridColor = isDark ? "#27272a" : "#e5e7eb";

  const { data: profileData, isLoading: profileLoading } = useUserProfile();
  const walletAddress = profileData?.profile?.own_wallet ?? null;
  const { data: walletData, isLoading: walletLoading } = useWalletData(walletAddress);
  const isLoading = profileLoading || !profileData || (!!walletAddress && walletLoading);

  const allPnl = useMemo((): PnlPoint[] => {
    const items: { ts_ms: number; pnl: string }[] = walletData?.data?.daily_pnl?.data?.items || [];
    if (!items.length) return [];
    return buildPnlSeries(items);
  }, [walletData]);

  const chartData = useMemo(() => {
    if (!allPnl.length) return [];
    if (useCustomRange && customFrom && customTo) return filterByRange(allPnl, customFrom, customTo);
    return filterByTimeframe(allPnl, timeframe);
  }, [allPnl, timeframe, useCustomRange, customFrom, customTo]);

  const totalPnl = chartData.reduce((s, d) => s + d.daily, 0);
  const winDays = chartData.filter((d) => d.daily >= 0).length;

  const tickInterval = chartData.length > 30 ? Math.floor(chartData.length / 12) : chartData.length > 14 ? 4 : 1;

  const resetToDefault = () => {
    setChartType("bar");
    setTimeframe("1M");
    setViewMode("chart");
    setShowGrid(true);
    setShowCumulative(false);
    setSmoothCurve(false);
    setCustomFrom("");
    setCustomTo("");
    setUseCustomRange(false);
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 px-5 py-4 border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <TrendingUp className="size-5 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">PnL Overview</span>
            {!isLoading && chartData.length > 0 && (
              <>
                <span className={`text-sm font-semibold ml-1 ${totalPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {totalPnl >= 0 ? "+" : ""}{fmt$(totalPnl)}
                </span>
                <span className="text-xs text-muted-foreground">· {winDays}/{chartData.length}d profitable</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setViewMode(viewMode === "calendar" ? "chart" : "calendar")}
              className={cn("inline-flex items-center justify-center size-8 rounded-md hover:bg-muted", viewMode === "calendar" && "bg-muted")}
            >
              <CalendarDays className="size-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center size-8 rounded-md hover:bg-muted">
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">Chart Type</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setChartType("bar")}>
                  <BarChart3 className="size-4 mr-2" />Bar Chart{chartType === "bar" && <Check className="size-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChartType("line")}>
                  <LineChartIcon className="size-4 mr-2" />Line Chart{chartType === "line" && <Check className="size-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChartType("area")}>
                  <AreaChartIcon className="size-4 mr-2" />Area Chart{chartType === "area" && <Check className="size-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">Display</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked={showGrid} onCheckedChange={setShowGrid}>
                  <Grid3X3 className="size-4 mr-2" />Show Grid
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={showCumulative} onCheckedChange={setShowCumulative}>
                  <TrendingUp className="size-4 mr-2" />Show Cumulative
                </DropdownMenuCheckboxItem>
                {(chartType === "line" || chartType === "area") && (
                  <DropdownMenuCheckboxItem checked={smoothCurve} onCheckedChange={setSmoothCurve}>
                    <AreaChartIcon className="size-4 mr-2" />Smooth Curve
                  </DropdownMenuCheckboxItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">Custom Range</DropdownMenuLabel>
                <div className="flex flex-col gap-1.5 px-2 py-1.5">
                  <input type="date" value={customFrom}
                    onChange={(e) => { setCustomFrom(e.target.value); setUseCustomRange(true); }}
                    className="h-7 px-2 text-xs rounded border border-border bg-background w-full" />
                  <input type="date" value={customTo}
                    onChange={(e) => { setCustomTo(e.target.value); setUseCustomRange(true); }}
                    className="h-7 px-2 text-xs rounded border border-border bg-background w-full" />
                  {useCustomRange && (
                    <button onClick={() => { setCustomFrom(""); setCustomTo(""); setUseCustomRange(false); }}
                      className="text-xs text-muted-foreground hover:text-foreground text-left">Clear range</button>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={resetToDefault}>
                  <RefreshCw className="size-4 mr-2" />Reset to Default
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Timeframe chips */}
        {!useCustomRange && (
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => (
              <button key={tf} onClick={() => { setTimeframe(tf); setViewMode("chart"); }}
                className={cn(
                  "h-7 px-3 rounded-md text-xs font-medium transition-colors",
                  timeframe === tf && viewMode === "chart"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                {tf}
              </button>
            ))}
          </div>
        )}
        {useCustomRange && customFrom && customTo && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{customFrom} → {customTo}</span>
            <button onClick={() => { setCustomFrom(""); setCustomTo(""); setUseCustomRange(false); }}
              className="text-xs text-muted-foreground hover:text-foreground underline">Clear</button>
          </div>
        )}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="h-[280px] px-5 py-4 flex flex-col gap-2 justify-end">
          <div className="flex items-end gap-1 h-48">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 rounded" style={{ height: `${20 + Math.random() * 80}%` }} />
            ))}
          </div>
        </div>
      ) : !walletAddress ? (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          No wallet connected. <a href="/profile" className="ml-1 text-primary underline">Set wallet in Profile →</a>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          No PnL data available for this period.
        </div>
      ) : viewMode === "calendar" ? (
        <div className="py-4"><CalendarGrid data={chartData} /></div>
      ) : (
        <div className="h-[250px] sm:h-[280px] px-2 pb-4 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <ComposedChart data={chartData} barGap={2}>
                {showGrid && <CartesianGrid strokeDasharray="0" stroke={gridColor} vertical={false} />}
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 11 }} dy={8} interval={tickInterval} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={fmt$} width={52} />
                <ReferenceLine y={0} stroke={gridColor} strokeWidth={1} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? "#27272a" : "#f4f4f5", radius: 4 }} />
                <Bar dataKey="daily" radius={[3, 3, 0, 0]} maxBarSize={18}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.daily >= 0 ? "#2d9f75" : "#ef4444"} />
                  ))}
                </Bar>
                {showCumulative && (
                  <Line type="monotone" dataKey="cumulative" stroke={isDark ? "#6366f1" : "#162664"} strokeWidth={2} dot={false} />
                )}
              </ComposedChart>
            ) : chartType === "line" ? (
              <LineChart data={chartData}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />}
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 11 }} dy={8} interval={tickInterval} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={fmt$} width={52} />
                <ReferenceLine y={0} stroke={gridColor} strokeWidth={1} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#d4d4d8" }} />
                <Line type={smoothCurve ? "monotone" : "linear"} dataKey="daily" stroke="#2d9f75" strokeWidth={2} dot={false}
                  activeDot={{ r: 5, fill: "#2d9f75", stroke: "white", strokeWidth: 2 }} />
                {showCumulative && (
                  <Line type={smoothCurve ? "monotone" : "linear"} dataKey="cumulative" stroke={isDark ? "#6366f1" : "#162664"} strokeWidth={2} dot={false} />
                )}
              </LineChart>
            ) : (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pnlAreaPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2d9f75" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2d9f75" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="pnlAreaCum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isDark ? "#6366f1" : "#162664"} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={isDark ? "#6366f1" : "#162664"} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                {showGrid && <CartesianGrid strokeDasharray="0" stroke={gridColor} vertical={false} />}
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 11 }} dy={8} interval={tickInterval} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={fmt$} width={52} />
                <ReferenceLine y={0} stroke={gridColor} strokeWidth={1} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#d4d4d8" }} />
                <Area type={smoothCurve ? "monotone" : "linear"} dataKey="daily" stroke="#2d9f75" strokeWidth={2} fill="url(#pnlAreaPos)" />
                {showCumulative && (
                  <Area type={smoothCurve ? "monotone" : "linear"} dataKey="cumulative" stroke={isDark ? "#6366f1" : "#162664"} strokeWidth={2} fill="url(#pnlAreaCum)" />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      {viewMode === "chart" && !isLoading && chartData.length > 0 && (
        <div className="flex items-center gap-4 px-5 pb-3">
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Profit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Loss</span>
          </div>
          {showCumulative && (
            <div className="flex items-center gap-1.5">
              <div className={`size-3 rounded-full ${isDark ? "bg-indigo-500" : "bg-[#162664]"}`} />
              <span className="text-xs text-muted-foreground">Cumulative</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
