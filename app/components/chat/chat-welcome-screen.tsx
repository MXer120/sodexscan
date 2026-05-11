"use client";

import { Button } from "@/app/components/ui/button";
import { AiLogo } from "@/app/components/ui/ai-logo";
import { cn } from "@/app/lib/utils";
import {
  ZapIcon, MessageCircleDashedIcon, WandSparklesIcon, BoxIcon,
  TrendingUpIcon, UsersIcon, BarChart3Icon,
  AlertCircleIcon, ReceiptIcon,
} from "lucide-react";
import { ChatInputBox } from "./chat-input-box";
import type { PreviewId } from "./preview-conversations";

const chatModes = [
  { id: "fast",     label: "Fast",      icon: ZapIcon },
  { id: "in-depth", label: "In-depth",  icon: MessageCircleDashedIcon },
  { id: "magic",    label: "Hive Mind", icon: WandSparklesIcon },
  { id: "holistic", label: "Holistic",  icon: BoxIcon },
];

// Live examples — send to AI
const LIVE_EXAMPLES = [
  {
    id:    "etf"      as const,
    icon:  TrendingUpIcon,
    label: "ETF Inflows",
    prompt: "Show me last month's Bitcoin ETF inflows. Compare IBIT vs FBTC performance and net flows.",
    color: "#6366f1",
  },
  {
    id:    "traders"  as const,
    icon:  BarChart3Icon,
    label: "Top Traders",
    prompt: "Show me the current top traders on Sodex with their live PnL and volume.",
    color: "#f59e0b",
  },
  {
    id:    "referral" as const,
    icon:  UsersIcon,
    label: "Referral Lookup",
    prompt: "Look up referral code SOSO — what wallet address is behind it and show their PnL history.",
    color: "#10b981",
  },
];

// Preview-only — hardcoded, open in full chat view
const PREVIEW_EXAMPLES: { id: PreviewId; icon: React.ElementType; label: string; color: string }[] = [
  { id: "deposit", icon: AlertCircleIcon, label: "Deposit Issue", color: "#ef4444" },
  { id: "fees",    icon: ReceiptIcon,     label: "My Fees",       color: "#8b5cf6" },
];

interface ChatWelcomeScreenProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  selectedMode: string;
  onModeChange: (modeId: string) => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  usePersonalKB?: boolean;
  onPersonalKBChange?: (v: boolean) => void;
  onPreview?: (id: PreviewId) => void;
}

export function ChatWelcomeScreen({
  message, onMessageChange, onSend,
  selectedModel, onModelChange, usePersonalKB, onPersonalKBChange,
  onPreview,
}: ChatWelcomeScreenProps) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto">
      <div className="w-full max-w-[600px] px-4 md:px-6 py-8 flex flex-col gap-5">

        {/* Logo + greeting */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <AiLogo className="size-14" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">CommunityScan AI</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ask anything about Sodex DEX, ETF flows, top traders, and more.
            </p>
          </div>
        </div>

        {/* Live examples */}
        <div className="flex flex-wrap gap-2 justify-center">
          {LIVE_EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => onMessageChange(ex.prompt)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-transparent bg-card/60 hover:bg-card hover:shadow-sm text-left transition-all"
            >
              <div className="size-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${ex.color}20` }}>
                <ex.icon className="size-3" style={{ color: ex.color }} />
              </div>
              <span className="text-xs font-medium">{ex.label}</span>
            </button>
          ))}
        </div>

        {/* Input */}
        <ChatInputBox
          compact
          message={message}
          onMessageChange={onMessageChange}
          onSend={onSend}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          usePersonalKB={usePersonalKB}
          onPersonalKBChange={onPersonalKBChange}
          showTools={true}
        />

        {/* Preview examples — coming soon, open in full chat view */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-muted-foreground text-center uppercase tracking-wide">Coming soon — preview</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {PREVIEW_EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                onClick={() => onPreview?.(ex.id)}
                className={cn(
                  "flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-dashed border-border/60",
                  "bg-card/40 hover:bg-card/80 hover:shadow-sm transition-all opacity-75 hover:opacity-100"
                )}
              >
                <div className="size-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${ex.color}15` }}>
                  <ex.icon className="size-3" style={{ color: ex.color }} />
                </div>
                <span className="text-xs font-medium">{ex.label}</span>
                <span className="text-[9px] font-medium text-muted-foreground bg-muted rounded px-1 py-0.5 leading-none">preview</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mode buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {chatModes.map((mode) => (
            <Button key={mode.id} variant="ghost" disabled
              className="gap-2 opacity-50 cursor-not-allowed" title="Coming soon">
              <mode.icon className="size-4" />
              <span>{mode.label}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">soon</span>
            </Button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          CommunityScan AI can make mistakes. Check important info.
        </p>

      </div>
    </div>
  );
}
