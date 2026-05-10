"use client";

import * as React from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/app/components/ui/dropdown-menu";
import {
  Layers,
  Search,
  Filter,
  FileOutput,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useUserProfile } from "@/app/hooks/useProfile";
import { useWalletData, useWalletLiveData } from "@/app/hooks/useWalletData";

type Tab = "positions" | "withdrawals" | "transfers" | "orders";
const TABS: { id: Tab; label: string }[] = [
  { id: "positions", label: "Positions" },
  { id: "withdrawals", label: "Withdrawals" },
  { id: "transfers", label: "Transfers" },
  { id: "orders", label: "Orders" },
];

const PAGE_SIZE_OPTIONS = [8, 15, 25, 50];

function fmt$(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(decimals)}`;
}

function fmtTime(ts: number | string | null): string {
  if (!ts) return "—";
  const d = new Date(typeof ts === "number" ? ts : ts);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
}

function statusStyle(status: string) {
  const s = status.toLowerCase();
  if (s === "completed" || s === "filled" || s === "deposit")
    return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
  if (s === "pending" || s === "partial" || s === "internal")
    return "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800";
  return "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium", statusStyle(status))}>
      {status}
    </span>
  );
}

function badgeMuted(label: string) {
  return <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-muted-foreground">{label}</span>;
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPage, pageSize, onPageSize, total }: {
  page: number; totalPages: number; onPage: (p: number) => void;
  pageSize: number; onPageSize: (s: number) => void; total: number;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t">
      <div className="flex items-center gap-6">
        <Button variant="outline" size="icon-sm" onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) pageNum = i + 1;
            else if (page <= 3) pageNum = i + 1;
            else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = page - 2 + i;
            if (i === 3 && totalPages > 5 && page < totalPages - 2)
              return <span key="ellipsis" className="px-3 py-1 text-sm">...</span>;
            if (i === 4 && totalPages > 5) pageNum = totalPages;
            return (
              <Button key={pageNum} variant={page === pageNum ? "secondary" : "ghost"} size="icon-sm"
                onClick={() => onPage(pageNum)} className={cn(page === pageNum && "bg-muted")}>
                {pageNum}
              </Button>
            );
          })}
        </div>
        <Button variant="outline" size="icon-sm" onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages || totalPages === 0}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground">
          {total === 0 ? "No entries" : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 h-8 px-2.5 rounded-md border border-border bg-background hover:bg-muted shadow-sm text-sm font-medium">
            Show {pageSize}<ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PAGE_SIZE_OPTIONS.map((s) => (
              <DropdownMenuItem key={s} onClick={() => onPageSize(s)} className={cn(pageSize === s && "bg-muted")}>
                Show {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── Positions ─────────────────────────────────────────────────────────────────

function PositionsTable({ walletAddress, search }: { walletAddress: string; search: string }) {
  const { data, isLoading } = useWalletLiveData(walletAddress);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(8);
  const [sideFilter, setSideFilter] = React.useState("all");
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  const rawPositions: {
    symbol?: string;
    positionSide?: string;
    positionSize?: string;
    entryPrice?: string;
    markPrice?: string;
    leverage?: string;
    isolatedMargin?: string;
    unrealizedProfit?: string;
  }[] = data?.data?.account_details?.data?.positions || [];

  const open = rawPositions.filter((p) => parseFloat(p.positionSize || "0") !== 0);

  const filtered = React.useMemo(() => open.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = (p.symbol || "").toLowerCase().includes(q);
    const side = (p.positionSide || "").toUpperCase();
    const matchSide = sideFilter === "all" || side === sideFilter.toUpperCase();
    return matchSearch && matchSide;
  }), [open, search, sideFilter]);

  React.useEffect(() => setPage(1), [search, sideFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const toggleAll = () => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)));
  const toggle = (i: number) => { const s = new Set(selected); s.has(i) ? s.delete(i) : s.add(i); setSelected(s); };

  return (
    <>
      <div className="flex items-center gap-2 px-5 py-3 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger className={cn("inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md border text-sm font-medium border-border hover:bg-background bg-muted shadow-sm", sideFilter !== "all" && "border-primary")}>
            <Filter className="size-4" />Side{sideFilter !== "all" && <span className="size-1.5 rounded-full bg-primary" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[160px]">
            {["all", "LONG", "SHORT"].map((s) => (
              <DropdownMenuCheckboxItem key={s} checked={sideFilter === s} onCheckedChange={() => setSideFilter(s)}>
                {s === "all" ? "All Sides" : s}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isLoading ? <TableSkeleton cols={9} /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[44px]"><Checkbox checked={selected.size === rows.length && rows.length > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[110px]">Symbol</TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[90px]">Side</TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[80px] text-right">Size</TableHead>
                <TableHead className="hidden sm:table-cell text-muted-foreground font-medium min-w-[100px] text-right">Entry</TableHead>
                <TableHead className="hidden sm:table-cell text-muted-foreground font-medium min-w-[100px] text-right">Mark</TableHead>
                <TableHead className="hidden md:table-cell text-muted-foreground font-medium min-w-[70px] text-right">Lev.</TableHead>
                <TableHead className="hidden lg:table-cell text-muted-foreground font-medium min-w-[100px] text-right">Margin</TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[110px] text-right">uPnL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No open positions.</TableCell></TableRow>
              ) : rows.map((p, i) => {
                const side = (p.positionSide || "").toUpperCase();
                const isLong = side === "LONG";
                const pnl = parseFloat(p.unrealizedProfit || "0");
                return (
                  <TableRow key={i}>
                    <TableCell><Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} /></TableCell>
                    <TableCell className="font-semibold">{p.symbol}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold",
                        isLong
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800")}>
                        {isLong ? <ArrowUpCircle className="size-3" /> : <ArrowDownCircle className="size-3" />}
                        {side}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{parseFloat(p.positionSize || "0").toFixed(4)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-muted-foreground">${parseFloat(p.entryPrice || "0").toLocaleString()}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-muted-foreground">${parseFloat(p.markPrice || "0").toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">{badgeMuted(`${p.leverage ?? "—"}x`)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right text-muted-foreground">{fmt$(parseFloat(p.isolatedMargin || "0"))}</TableCell>
                    <TableCell className={cn("text-right font-semibold", pnl >= 0 ? "text-emerald-500" : "text-red-500")}>
                      {pnl >= 0 ? "+" : ""}{fmt$(pnl)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPage={setPage} pageSize={pageSize} onPageSize={setPageSize} total={filtered.length} />
    </>
  );
}

// ── Withdrawals ───────────────────────────────────────────────────────────────

function WithdrawalsTable({ walletAddress, search }: { walletAddress: string; search: string }) {
  const { data, isLoading } = useWalletData(walletAddress);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(8);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  const raw: { type?: string; amount?: string; coin?: string; stmp?: string | number; status?: string }[] =
    data?.data?.account_flow?.data?.accountFlows || [];

  // fund_transfers withdrawals
  const fundWithdrawals: { transferType?: string; coin?: string; amount?: string; decimals?: string; blockTimestamp?: string | number; txHash?: string }[] =
    (data?.data?.fund_transfers?.data?.fundTransfers || []).filter((t: { transferType?: string }) =>
      String(t.transferType || "").toLowerCase().includes("withdraw")
    );

  const withdrawals = React.useMemo(() => {
    const fromFlow = raw
      .filter((t) => (t.type || "").toLowerCase().includes("withdraw") || (t.type || "").toLowerCase().includes("out"))
      .map((t) => ({
        type: t.type || "Withdrawal",
        coin: t.coin || "—",
        amount: Math.abs(parseFloat(t.amount || "0")),
        timestamp: t.stmp,
        txHash: null as string | null,
        status: t.status || "Completed",
      }));
    const fromFund = fundWithdrawals.map((t) => ({
      type: String(t.transferType || "Withdrawal"),
      coin: String(t.coin || "—"),
      amount: Math.abs(parseFloat(String(t.amount || "0"))),
      timestamp: t.blockTimestamp,
      txHash: t.txHash || null,
      status: "Completed",
    }));
    return [...fromFlow, ...fromFund].sort((a, b) => {
      return (new Date(b.timestamp ?? 0).getTime() || 0) - (new Date(a.timestamp ?? 0).getTime() || 0);
    });
  }, [raw, fundWithdrawals]);

  const filtered = React.useMemo(() =>
    withdrawals.filter((w) => {
      const q = search.toLowerCase();
      return (w.coin || "").toLowerCase().includes(q) || (w.type || "").toLowerCase().includes(q);
    }), [withdrawals, search]);

  React.useEffect(() => setPage(1), [search, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const toggleAll = () => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)));
  const toggle = (i: number) => { const s = new Set(selected); s.has(i) ? s.delete(i) : s.add(i); setSelected(s); };

  return (
    <>
      {isLoading ? <TableSkeleton cols={7} /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[44px]"><Checkbox checked={selected.size === rows.length && rows.length > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[150px]">Date</TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[80px]">Asset</TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[110px] text-right">Amount</TableHead>
                <TableHead className="hidden sm:table-cell text-muted-foreground font-medium min-w-[120px]">Type</TableHead>
                <TableHead className="hidden lg:table-cell text-muted-foreground font-medium min-w-[180px]">Tx Hash</TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No withdrawals found.</TableCell></TableRow>
              ) : rows.map((w, i) => (
                <TableRow key={i}>
                  <TableCell><Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} /></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{fmtTime(w.timestamp ?? null)}</TableCell>
                  <TableCell className="font-semibold">{w.coin}</TableCell>
                  <TableCell className="text-right font-medium">{w.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {w.coin}</TableCell>
                  <TableCell className="hidden sm:table-cell">{badgeMuted(w.type)}</TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">{w.txHash || "—"}</TableCell>
                  <TableCell><StatusBadge status={w.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPage={setPage} pageSize={pageSize} onPageSize={setPageSize} total={filtered.length} />
    </>
  );
}

// ── Transfers ─────────────────────────────────────────────────────────────────

function TransfersTable({ walletAddress, search }: { walletAddress: string; search: string }) {
  const { data, isLoading } = useWalletData(walletAddress);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(8);
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  const transfers = React.useMemo(() => {
    const fundTransfers: { transferType?: string; coin?: string; amount?: string; blockTimestamp?: string | number; txHash?: string }[] =
      data?.data?.fund_transfers?.data?.fundTransfers || [];
    const accountFlows: { type?: string; coin?: string; amount?: string; stmp?: string | number }[] =
      data?.data?.account_flow?.data?.accountFlows || [];

    const fromFund = fundTransfers.map((t) => ({
      type: String(t.transferType || "Transfer"),
      coin: String(t.coin || "—"),
      amount: parseFloat(String(t.amount || "0")),
      timestamp: t.blockTimestamp,
      txHash: t.txHash || null,
    }));
    const fromFlow = accountFlows.map((t) => ({
      type: t.type || "Flow",
      coin: t.coin || "—",
      amount: parseFloat(t.amount || "0"),
      timestamp: t.stmp,
      txHash: null as string | null,
    }));

    return [...fromFund, ...fromFlow].sort((a, b) =>
      (new Date(b.timestamp ?? 0).getTime() || 0) - (new Date(a.timestamp ?? 0).getTime() || 0)
    );
  }, [data]);

  const filtered = React.useMemo(() => transfers.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = (t.coin || "").toLowerCase().includes(q) || (t.type || "").toLowerCase().includes(q);
    const matchType = typeFilter === "all" || (t.type || "").toLowerCase().includes(typeFilter.toLowerCase());
    return matchSearch && matchType;
  }), [transfers, search, typeFilter]);

  React.useEffect(() => setPage(1), [search, typeFilter, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const toggleAll = () => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)));
  const toggle = (i: number) => { const s = new Set(selected); s.has(i) ? s.delete(i) : s.add(i); setSelected(s); };

  const typeOptions = React.useMemo(() => {
    const types = [...new Set(transfers.map((t) => t.type))].filter(Boolean);
    return types;
  }, [transfers]);

  return (
    <>
      <div className="flex items-center gap-2 px-5 py-3 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger className={cn("inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md border text-sm font-medium border-border hover:bg-background bg-muted shadow-sm", typeFilter !== "all" && "border-primary")}>
            <Filter className="size-4" />Type{typeFilter !== "all" && <span className="size-1.5 rounded-full bg-primary" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuCheckboxItem checked={typeFilter === "all"} onCheckedChange={() => setTypeFilter("all")}>All Types</DropdownMenuCheckboxItem>
            {typeOptions.map((t) => (
              <DropdownMenuCheckboxItem key={t} checked={typeFilter === t} onCheckedChange={() => setTypeFilter(t)}>{t}</DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isLoading ? <TableSkeleton cols={6} /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[44px]"><Checkbox checked={selected.size === rows.length && rows.length > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[150px]">Date</TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[120px]">Type</TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[80px]">Asset</TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[120px] text-right">Amount</TableHead>
                <TableHead className="hidden lg:table-cell text-muted-foreground font-medium min-w-[180px]">Tx Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No transfers found.</TableCell></TableRow>
              ) : rows.map((t, i) => {
                const isDeposit = (t.type || "").toLowerCase().includes("deposit") || t.amount > 0;
                return (
                  <TableRow key={i}>
                    <TableCell><Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{fmtTime(t.timestamp ?? null)}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium",
                        isDeposit
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                      )}>{t.type}</span>
                    </TableCell>
                    <TableCell className="font-semibold">{t.coin}</TableCell>
                    <TableCell className={cn("text-right font-medium", t.amount >= 0 ? "text-emerald-500" : "text-red-500")}>
                      {t.amount >= 0 ? "+" : ""}{t.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {t.coin}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">{t.txHash || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPage={setPage} pageSize={pageSize} onPageSize={setPageSize} total={filtered.length} />
    </>
  );
}

// ── Orders (closed trades) ────────────────────────────────────────────────────

function OrdersTable({ walletAddress, search }: { walletAddress: string; search: string }) {
  const { data, isLoading } = useWalletData(walletAddress);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(8);
  const [sideFilter, setSideFilter] = React.useState("all");
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  // closed trades from positions.data
  const rawOrders: {
    symbol?: string; coin?: string; pair?: string;
    position_side?: number | string;
    avg_open_price?: string; avg_close_price?: string;
    quantity?: string; margin?: string;
    realized_pnl?: string; cum_trading_fee?: string;
    open_time?: string | number; close_time?: string | number;
  }[] = data?.data?.positions?.data || [];

  const filtered = React.useMemo(() => rawOrders.filter((o) => {
    const symbol = o.symbol || o.coin || o.pair || "";
    const q = search.toLowerCase();
    const matchSearch = symbol.toLowerCase().includes(q);
    const isLong = o.position_side === 2 || o.position_side === "2";
    const side = isLong ? "LONG" : "SHORT";
    const matchSide = sideFilter === "all" || side === sideFilter;
    return matchSearch && matchSide;
  }), [rawOrders, search, sideFilter]);

  React.useEffect(() => setPage(1), [search, sideFilter, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const toggleAll = () => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)));
  const toggle = (i: number) => { const s = new Set(selected); s.has(i) ? s.delete(i) : s.add(i); setSelected(s); };

  const hasFilter = sideFilter !== "all";

  return (
    <>
      <div className="flex items-center gap-2 px-5 py-3 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger className={cn("inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md border text-sm font-medium border-border hover:bg-background bg-muted shadow-sm", hasFilter && "border-primary")}>
            <Filter className="size-4" />Filter{hasFilter && <span className="size-1.5 rounded-full bg-primary" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">Side</DropdownMenuLabel>
            {["all", "LONG", "SHORT"].map((s) => (
              <DropdownMenuCheckboxItem key={s} checked={sideFilter === s} onCheckedChange={() => setSideFilter(s)}>
                {s === "all" ? "All Sides" : s}
              </DropdownMenuCheckboxItem>
            ))}
            {hasFilter && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSideFilter("all")} className="text-destructive">Clear filters</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isLoading ? <TableSkeleton cols={8} /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[44px]"><Checkbox checked={selected.size === rows.length && rows.length > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[110px]">Symbol</TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[90px]">Side</TableHead>
                <TableHead className="hidden sm:table-cell text-muted-foreground font-medium min-w-[100px] text-right">Entry</TableHead>
                <TableHead className="hidden sm:table-cell text-muted-foreground font-medium min-w-[100px] text-right">Close</TableHead>
                <TableHead className="hidden md:table-cell text-muted-foreground font-medium min-w-[80px] text-right">Size</TableHead>
                <TableHead className="text-muted-foreground font-medium min-w-[110px] text-right">Realized PnL</TableHead>
                <TableHead className="hidden lg:table-cell text-muted-foreground font-medium min-w-[80px] text-right">Fees</TableHead>
                <TableHead className="hidden lg:table-cell text-muted-foreground font-medium min-w-[140px]">Closed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No closed orders found.</TableCell></TableRow>
              ) : rows.map((o, i) => {
                const isLong = o.position_side === 2 || o.position_side === "2";
                const pnl = parseFloat(o.realized_pnl || "0");
                const fees = parseFloat(o.cum_trading_fee || "0");
                const symbol = o.symbol || o.coin || o.pair || "—";
                return (
                  <TableRow key={i}>
                    <TableCell><Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} /></TableCell>
                    <TableCell className="font-semibold">{symbol}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold",
                        isLong
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800")}>
                        {isLong ? <ArrowUpCircle className="size-3" /> : <ArrowDownCircle className="size-3" />}
                        {isLong ? "Long" : "Short"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-muted-foreground">{o.avg_open_price ? `$${parseFloat(o.avg_open_price).toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-muted-foreground">{o.avg_close_price ? `$${parseFloat(o.avg_close_price).toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-right text-muted-foreground">{o.quantity ? parseFloat(o.quantity).toFixed(4) : "—"}</TableCell>
                    <TableCell className={cn("text-right font-semibold", pnl >= 0 ? "text-emerald-500" : "text-red-500")}>
                      {pnl >= 0 ? "+" : ""}{fmt$(pnl)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right text-muted-foreground">{fmt$(fees)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{fmtTime(o.close_time ?? null)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPage={setPage} pageSize={pageSize} onPageSize={setPageSize} total={filtered.length} />
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function EmployeesTable() {
  const [activeTab, setActiveTab] = React.useState<Tab>("positions");
  const [search, setSearch] = React.useState("");

  const { data: profileData, isLoading: profileLoading } = useUserProfile();
  const walletAddress = profileData?.profile?.own_wallet ?? null;

  React.useEffect(() => setSearch(""), [activeTab]);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b">
        <div className="flex items-center gap-2">
          <Layers className="size-5 text-muted-foreground" />
          <span className="font-medium text-muted-foreground">Trading Activity</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-[200px] h-9"
            />
          </div>
          <div className="hidden sm:block w-px h-6 bg-border" />
          <Button variant="outline" className="gap-2">
            <FileOutput className="size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b px-5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "h-10 px-4 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* No wallet state */}
      {!profileLoading && !walletAddress ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
          No wallet connected.{" "}
          <a href="/profile" className="ml-1 text-primary underline">Set wallet in Profile →</a>
        </div>
      ) : (
        <>
          {activeTab === "positions" && walletAddress && <PositionsTable walletAddress={walletAddress} search={search} />}
          {activeTab === "withdrawals" && walletAddress && <WithdrawalsTable walletAddress={walletAddress} search={search} />}
          {activeTab === "transfers" && walletAddress && <TransfersTable walletAddress={walletAddress} search={search} />}
          {activeTab === "orders" && walletAddress && <OrdersTable walletAddress={walletAddress} search={search} />}
        </>
      )}
    </div>
  );
}
