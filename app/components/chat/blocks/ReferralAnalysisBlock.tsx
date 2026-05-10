"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Users, TrendingUp, DollarSign, BarChart3, ArrowRight } from "lucide-react";
import { cn } from "@/app/lib/utils";

function genActivity(n: number, base: number, seed: number) {
  const out = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const skip = d.getDay() === 0 || d.getDay() === 6;
    const pseudo = Math.abs(Math.sin(i * seed + seed)) * base;
    out.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      referrals: skip ? 0 : Math.round(pseudo + 2),
      volume: skip ? 0 : +(pseudo * 12000 + 5000).toFixed(0),
    });
  }
  return out;
}

interface ReferralProfile {
  code: string;
  owner: string;
  tier: string;
  tierColor: string;
  totalReferrals: number;
  activeTraders: number;
  conversionRate: string;
  totalVolume: string;
  totalEarnings: string;
  strategy: string;
  insights: string[];
  data: ReturnType<typeof genActivity>;
}

const SAMPLE_PROFILES: Record<string, ReferralProfile> = {
  ALPHA01: {
    code: "ALPHA01",
    owner: "0x7f3a...e92c",
    tier: "Elite",
    tierColor: "#6366f1",
    totalReferrals: 847,
    activeTraders: 312,
    conversionRate: "36.8%",
    totalVolume: "$14.2M",
    totalEarnings: "$71,200",
    strategy: "High-volume community builder targeting crypto Twitter and Discord communities. Focuses on active futures traders with proven track records.",
    insights: [
      "Peak referral activity on Mondays and Fridays (social posting schedule)",
      "Avg referred trader volume: $45,500/month",
      "Churned users mostly below $10K volume — early-stage traders",
      "Strong retention among traders who follow copy-trade signal channels",
    ],
    data: genActivity(30, 28, 1.7),
  },
  WHALE99: {
    code: "WHALE99",
    owner: "0x2b81...441f",
    tier: "Pro",
    tierColor: "#10b981",
    totalReferrals: 204,
    activeTraders: 98,
    conversionRate: "48.0%",
    totalVolume: "$8.7M",
    totalEarnings: "$43,500",
    strategy: "Quality-over-quantity referrer. Targets high-net-worth traders through private Telegram groups. Extremely high conversion and retention rates.",
    insights: [
      "Best conversion rate in the top 50 referrers",
      "All referrals come from a single private Telegram group",
      "Avg referred trader volume: $88,000/month — top 5% of all referred users",
      "Zero churn in first 30 days — strong onboarding support provided",
    ],
    data: genActivity(30, 7, 2.9),
  },
};

const DEFAULT_CODE = "ALPHA01";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="p-3 rounded-lg border bg-card/50 flex gap-3 items-start">
      <div className="size-8 rounded-md flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
        <Icon className="size-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function ReferralAnalysisBlock() {
  const [input, setInput] = useState("");
  const [code, setCode] = useState(DEFAULT_CODE);
  const [metric, setMetric] = useState<"referrals" | "volume">("referrals");

  const profile = SAMPLE_PROFILES[code.toUpperCase()] ?? SAMPLE_PROFILES[DEFAULT_CODE];

  const handleSearch = () => {
    const key = input.trim().toUpperCase();
    if (SAMPLE_PROFILES[key]) setCode(key);
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Referral Code Analysis</p>

        {/* Search */}
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 h-8 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Enter referral code (e.g. ALPHA01)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            Analyze <ArrowRight className="size-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <span className="font-semibold">{profile.code}</span>
          <span
            className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
            style={{ background: profile.tierColor }}
          >
            {profile.tier}
          </span>
          <span className="text-xs text-muted-foreground">{profile.owner}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 px-5 py-4">
        <StatCard icon={Users} label="Total Referrals" value={profile.totalReferrals.toLocaleString()} sub={`${profile.activeTraders} active`} color="#6366f1" />
        <StatCard icon={TrendingUp} label="Conversion Rate" value={profile.conversionRate} sub="vs 24% avg" color="#10b981" />
        <StatCard icon={BarChart3} label="Total Volume" value={profile.totalVolume} color="#f59e0b" />
        <StatCard icon={DollarSign} label="Est. Earnings" value={profile.totalEarnings} color="#ec4899" />
      </div>

      {/* Activity chart */}
      <div className="px-5 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">30-Day Activity</p>
          <div className="flex gap-1">
            <button
              onClick={() => setMetric("referrals")}
              className={cn("px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
                metric === "referrals" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Referrals
            </button>
            <button
              onClick={() => setMetric("volume")}
              className={cn("px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
                metric === "volume" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Volume
            </button>
          </div>
        </div>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={profile.data}>
              <defs>
                <linearGradient id="refGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#71717a" }} interval={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#71717a" }} width={32}
                tickFormatter={metric === "volume" ? (v) => `$${(v / 1000).toFixed(0)}k` : undefined} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const val = Number(payload[0]?.value ?? 0);
                  return (
                    <div className="bg-popover border border-border rounded-lg p-2.5 shadow-lg text-xs">
                      <p className="font-medium mb-1">{label}</p>
                      <p className="text-indigo-400">
                        {metric === "referrals" ? `${val} referrals` : `$${(val / 1000).toFixed(1)}k volume`}
                      </p>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey={metric} stroke="#6366f1" strokeWidth={2} fill="url(#refGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strategy */}
      <div className="px-5 py-4 border-t">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Strategy Analysis</p>
        <p className="text-xs text-foreground leading-relaxed mb-3">{profile.strategy}</p>
        <div className="flex flex-col gap-1.5">
          {profile.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="size-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t bg-muted/20 flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground truncate">Sample data · enter a code above to analyse</p>
        <button
          onClick={() => setInput("")}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0 border rounded px-2 py-0.5 hover:bg-muted/50"
          title="Reset to default view"
        >
          Full controls
        </button>
      </div>
    </div>
  );
}
