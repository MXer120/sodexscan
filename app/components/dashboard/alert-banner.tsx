"use client";

import { Button } from "@/app/components/ui/button";
import { FileOutput, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";

const prices = [
  { symbol: "BTC", price: "$96,842", change: "+2.14%", up: true },
  { symbol: "ETH", price: "$3,412", change: "+1.87%", up: true },
  { symbol: "SOL", price: "$178.40", change: "-0.43%", up: false },
  { symbol: "BNB", price: "$622.10", change: "+0.91%", up: true },
  { symbol: "XRP", price: "$2.21", change: "-1.12%", up: false },
];

export function AlertBanner() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">Live</span>
        </div>
        {prices.map((p) => (
          <div key={p.symbol} className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-muted-foreground">{p.symbol}</span>
            <span className="text-sm font-semibold">{p.price}</span>
            <span className={`flex items-center gap-0.5 text-xs font-medium ${p.up ? "text-emerald-500" : "text-red-500"}`}>
              {p.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {p.change}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Button variant="outline" size="sm" className="gap-2">
          <FileOutput className="size-4" />
          Export
        </Button>
        <Button size="sm" className="gap-2 bg-foreground text-background hover:bg-foreground/90">
          New
          <span className="h-4 w-px bg-background/20" />
          <ChevronDown className="size-4" />
        </Button>
      </div>
    </div>
  );
}
