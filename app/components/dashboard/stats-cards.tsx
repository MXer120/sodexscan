"use client";

import { Wallet, TrendingUp, Layers } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { useUserProfile } from "@/app/hooks/useProfile";
import { useWalletData, useWalletLeaderboard } from "@/app/hooks/useWalletData";

function fmt$(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function StatSkeleton() {
  return (
    <div className="relative p-5 rounded-xl border bg-card overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-6 w-full">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="size-10 rounded-md shrink-0" />
      </div>
    </div>
  );
}

export function StatsCards() {
  const { data: profileData, isLoading: profileLoading } = useUserProfile();
  const walletAddress = profileData?.profile?.own_wallet ?? null;

  const { data: walletData, isLoading: walletLoading } = useWalletData(walletAddress);
  const { data: leaderboard, isLoading: lbLoading } = useWalletLeaderboard(walletAddress);

  if (profileLoading || !profileData || (walletAddress && walletLoading)) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatSkeleton /><StatSkeleton /><StatSkeleton />
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative p-5 rounded-xl border bg-card overflow-hidden">
            <p className="text-sm text-muted-foreground">No wallet connected.</p>
            <a href="/profile" className="text-sm text-primary underline">Set wallet in Profile →</a>
          </div>
        ))}
      </div>
    );
  }

  // Equity
  const futuresBals: { walletBalance?: string }[] = walletData?.data?.account_details?.data?.balances || [];
  const spotBals: { balance?: string }[] = walletData?.data?.balances?.data?.spotBalance || [];
  const futuresEquity = futuresBals.reduce((s, b) => s + parseFloat(b.walletBalance || "0"), 0);
  const spotEquity = spotBals.reduce((s, b) => s + parseFloat(b.balance || "0"), 0);
  const totalEquity = futuresEquity + spotEquity;

  // PnL (all-time cumulative from leaderboard)
  const totalPnl: number | null = leaderboard?.cumulative_pnl ?? null;
  const pnlRank: number | null = leaderboard?.pnl_rank ?? null;
  const totalVol: number | null = leaderboard?.cumulative_volume ?? null;

  // Open positions
  const allPositions: {
    positionSize?: string;
    positionSide?: string;
    unrealizedProfit?: string;
  }[] = walletData?.data?.account_details?.data?.positions || [];
  const openPositions = allPositions.filter((p) => parseFloat(p.positionSize || "0") !== 0);
  const longCount = openPositions.filter((p) => (p.positionSide || "").toUpperCase() === "LONG").length;
  const shortCount = openPositions.filter((p) => (p.positionSide || "").toUpperCase() === "SHORT").length;
  const totalUPnl = openPositions.reduce((s, p) => s + parseFloat(p.unrealizedProfit || "0"), 0);

  const stats = [
    {
      title: "Total Equity",
      value: fmt$(totalEquity),
      subtitle: `Futures ${fmt$(futuresEquity)} · Spot ${fmt$(spotEquity)}`,
      icon: Wallet,
      accent: "text-foreground",
    },
    {
      title: "All-Time PnL",
      value: totalPnl !== null
        ? `${totalPnl >= 0 ? "+" : ""}${fmt$(totalPnl)}`
        : lbLoading ? "..." : "—",
      subtitle: pnlRank
        ? `Rank #${pnlRank} · Vol ${fmt$(totalVol)}`
        : lbLoading ? "Loading..." : "No leaderboard data",
      icon: TrendingUp,
      accent: totalPnl !== null
        ? totalPnl >= 0 ? "text-emerald-500" : "text-red-500"
        : "text-foreground",
    },
    {
      title: "Open Positions",
      value: String(openPositions.length),
      subtitle: `Long: ${longCount} · Short: ${shortCount} · uPnL ${totalUPnl >= 0 ? "+" : ""}${fmt$(totalUPnl)}`,
      icon: Layers,
      accent: "text-blue-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {stats.map((stat) => (
        <div key={stat.title} className="relative p-5 rounded-xl border bg-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="flex flex-col gap-6">
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <p className={`text-2xl sm:text-[26px] font-semibold tracking-tight ${stat.accent}`}>
                {stat.value}
              </p>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="text-sm font-medium">{stat.subtitle}</span>
              </div>
            </div>
            <Button variant="outline" size="icon" className="size-10">
              <stat.icon className="size-5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
