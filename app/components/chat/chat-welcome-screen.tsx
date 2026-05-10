"use client";

import { Button } from "@/app/components/ui/button";
import { AiLogo } from "@/app/components/ui/ai-logo";
import { cn } from "@/app/lib/utils";
import {
  ZapIcon,
  MessageCircleDashedIcon,
  WandSparklesIcon,
  BoxIcon,
  TrendingUpIcon,
  UsersIcon,
  BarChart3Icon,
} from "lucide-react";
import { ChatInputBox } from "./chat-input-box";

const chatModes = [
  { id: "fast",     label: "Fast",      icon: ZapIcon },
  { id: "in-depth", label: "In-depth",  icon: MessageCircleDashedIcon },
  { id: "magic",    label: "Hive Mind", icon: WandSparklesIcon },
  { id: "holistic", label: "Holistic",  icon: BoxIcon },
];

const EXAMPLE_PROMPTS = [
  {
    id: "etf",
    icon: TrendingUpIcon,
    label: "ETF Inflows",
    description: "Compare IBIT vs FBTC flows",
    prompt: "Show me today's Bitcoin ETF inflows. Compare IBIT vs FBTC performance and net flows for the past month.",
    color: "#6366f1",
  },
  {
    id: "referral",
    icon: UsersIcon,
    label: "Referral Analysis",
    description: "Deep-dive a referral code",
    prompt: "Give me info about referral code ALPHA01 — how many referrals, what's their trading volume, and analyse the performance and strategy behind it.",
    color: "#10b981",
  },
  {
    id: "traders",
    icon: BarChart3Icon,
    label: "Top Traders",
    description: "Top wallets this week",
    prompt: "Who are the top 5 wallets on Sodex this week? Show me their PnL, volume, strategy type, and what's driving their performance.",
    color: "#f59e0b",
  },
] as const;

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
}

export function ChatWelcomeScreen({
  message, onMessageChange, onSend,
  selectedModel, onModelChange, usePersonalKB, onPersonalKBChange,
}: ChatWelcomeScreenProps) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto">
      <div className="w-full max-w-[600px] px-4 md:px-6 py-8 flex flex-col gap-5">

        {/* Logo + greeting */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <AiLogo className="size-16" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">CommunityScan AI</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ask anything about Sodex DEX, ETF flows, top traders, and more.
            </p>
          </div>
        </div>

        {/* Example prompts — compact chips above input */}
        <div className="flex flex-wrap gap-2 justify-center">
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p.id}
              onClick={() => onMessageChange(p.prompt)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border bg-card/60 hover:bg-card hover:shadow-sm text-left transition-all"
            >
              <div
                className="size-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${p.color}20` }}
              >
                <p.icon className="size-3" style={{ color: p.color }} />
              </div>
              <span className="text-xs font-medium">{p.label}</span>
            </button>
          ))}
        </div>

        {/* Input — compact */}
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

        {/* Mode buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {chatModes.map((mode) => (
            <Button
              key={mode.id}
              variant="ghost"
              disabled
              className="gap-2 opacity-50 cursor-not-allowed"
              title="Coming soon"
            >
              <mode.icon className="size-4" />
              <span>{mode.label}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                soon
              </span>
            </Button>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center">
          CommunityScan AI can make mistakes. Check important info.
        </p>

      </div>
    </div>
  );
}
