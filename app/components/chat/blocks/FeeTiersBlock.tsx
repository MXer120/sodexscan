"use client";

import { useState } from "react";
import { cn } from "@/app/lib/utils";

const PERPS_TIERS = [
  { tier: "0", vol: "≤ $5M",    maker: "0.012%", taker: "0.040%" },
  { tier: "1", vol: "> $5M",    maker: "0.010%", taker: "0.036%" },
  { tier: "2", vol: "> $25M",   maker: "0.006%", taker: "0.032%" },
  { tier: "3", vol: "> $100M",  maker: "0.002%", taker: "0.028%" },
  { tier: "4", vol: "> $500M",  maker: "0.000%", taker: "0.026%" },
  { tier: "5", vol: "> $2B",    maker: "0.000%", taker: "0.024%" },
  { tier: "6", vol: "> $7B",    maker: "0.000%", taker: "0.022%" },
] as const;

const SPOT_TIERS = [
  { tier: "0", vol: "≤ $5M",    maker: "0.035%", taker: "0.065%" },
  { tier: "1", vol: "> $5M",    maker: "0.025%", taker: "0.055%" },
  { tier: "2", vol: "> $25M",   maker: "0.015%", taker: "0.045%" },
  { tier: "3", vol: "> $100M",  maker: "0.005%", taker: "0.035%" },
  { tier: "4", vol: "> $500M",  maker: "0.000%", taker: "0.030%" },
  { tier: "5", vol: "> $2B",    maker: "0.000%", taker: "0.025%" },
  { tier: "6", vol: "> $7B",    maker: "0.000%", taker: "0.020%" },
] as const;

const SOSO_DISCOUNTS = [
  { soso: "0",         discount: "0%"  },
  { soso: "≥ 30",      discount: "5%"  },
  { soso: "≥ 300",     discount: "10%" },
  { soso: "≥ 3,000",   discount: "15%" },
  { soso: "≥ 30,000",  discount: "20%" },
  { soso: "≥ 300,000", discount: "30%" },
  { soso: "≥ 1.5M",    discount: "40%" },
] as const;

export interface FeeTiersBlockProps {
  highlightTier?: string;
  tab?: "perps" | "spot" | "staking";
}

type Tab = "perps" | "spot" | "staking";

export function FeeTiersBlock({ props = {} }: { props?: FeeTiersBlockProps }) {
  const [tab, setTab] = useState<Tab>(props.tab ?? "perps");
  const ht = props.highlightTier;

  const tiers = tab === "perps" ? PERPS_TIERS : SPOT_TIERS;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b bg-muted/20 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sodex Fee Tiers</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Weighted vol = perps + 2× spot · resets daily UTC midnight</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(["perps", "spot", "staking"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize",
                tab === t ? "bg-background border shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Fee table */}
      {tab !== "staking" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tier</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">30D Volume</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Maker</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Taker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tiers.map((t) => {
                const active = ht === t.tier;
                return (
                  <tr key={t.tier} className={cn(active ? "bg-primary/8" : "hover:bg-muted/20")}>
                    <td className="px-4 py-2.5 font-medium">
                      <div className="flex items-center gap-2">
                        Tier {t.tier}
                        {active && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">you</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{t.vol}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-500">{t.maker}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-amber-500">{t.taker}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SOSO staking discounts */}
      {tab === "staking" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Staked SOSO</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Fee discount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {SOSO_DISCOUNTS.map((d) => (
                <tr key={d.soso} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium font-mono">{d.soso}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-indigo-400">{d.discount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-5 py-2.5 border-t bg-muted/20">
        <p className="text-[11px] text-muted-foreground">
          {tab === "staking"
            ? "Staking discount stacks on top of volume tier — applied to both maker and taker rates."
            : "Tier based on weighted 30D volume. Maker rebates available at high volume share — see docs."}
        </p>
      </div>
    </div>
  );
}
