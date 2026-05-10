"use client";

import { useState } from "react";
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
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { ChatInputBox } from "./chat-input-box";
import { EtfInflowsBlock } from "./blocks/EtfInflowsBlock";
import { ReferralAnalysisBlock } from "./blocks/ReferralAnalysisBlock";
import { TopTradersBlock } from "./blocks/TopTradersBlock";

const chatModes = [
  { id: "fast", label: "Fast", icon: ZapIcon },
  { id: "in-depth", label: "In-depth", icon: MessageCircleDashedIcon },
  { id: "magic", label: "Hive Mind", icon: WandSparklesIcon },
  { id: "holistic", label: "Holistic", icon: BoxIcon },
];

const EXAMPLE_PROMPTS = [
  {
    id: "etf",
    icon: TrendingUpIcon,
    label: "ETF Inflows",
    title: "Bitcoin ETF inflow analysis",
    description: "Compare IBIT vs FBTC daily flows and net positioning for the past month.",
    prompt: "Show me today's Bitcoin ETF inflows. Compare IBIT vs FBTC performance and net flows for the past month.",
    color: "#6366f1",
  },
  {
    id: "referral",
    icon: UsersIcon,
    label: "Referral Analysis",
    title: "Referral code deep-dive",
    description: "Analyse a referral code's performance metrics, trader quality, and growth strategy.",
    prompt: "Give me info about referral code ALPHA01 — how many referrals, what's their trading volume, and analyse the performance and strategy behind it.",
    color: "#10b981",
  },
  {
    id: "traders",
    icon: BarChart3Icon,
    label: "Top Traders",
    title: "Top wallets this week",
    description: "See the top performing wallets on Sodex with PnL, strategy breakdown, and win rates.",
    prompt: "Who are the top 5 wallets on Sodex this week? Show me their PnL, volume, strategy type, and what's driving their performance.",
    color: "#f59e0b",
  },
] as const;

type BlockId = "etf" | "referral" | "traders";

const BLOCKS: Record<BlockId, React.ComponentType> = {
  etf: EtfInflowsBlock,
  referral: ReferralAnalysisBlock,
  traders: TopTradersBlock,
};

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
  message, onMessageChange, onSend, selectedMode, onModeChange,
  selectedModel, onModelChange, usePersonalKB, onPersonalKBChange,
}: ChatWelcomeScreenProps) {
  const [activeBlock, setActiveBlock] = useState<BlockId | null>(null);

  const handlePromptClick = (promptId: BlockId, prompt: string) => {
    onMessageChange(prompt);
    if (activeBlock === promptId) {
      setActiveBlock(null);
    } else {
      setActiveBlock(promptId);
    }
  };

  const ActiveBlockComponent = activeBlock ? BLOCKS[activeBlock] : null;

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto">
      <div className="w-full max-w-[680px] px-4 md:px-6 pt-12 pb-8 space-y-8">
        {/* Logo + greeting */}
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center size-8 rounded-full">
              <AiLogo className="size-20" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Hey! I&apos;m CommunityScan AI
            </h1>
            <p className="text-2xl text-foreground mt-1">
              Tell me everything you need
            </p>
          </div>
        </div>

        {/* Chat input */}
        <ChatInputBox
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
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">soon</span>
            </Button>
          ))}
        </div>

        {/* Example prompts */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">
            Try an example
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EXAMPLE_PROMPTS.map((p) => {
              const isActive = activeBlock === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePromptClick(p.id, p.prompt)}
                  className={cn(
                    "group relative flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all",
                    isActive
                      ? "bg-card border-transparent shadow-md ring-1"
                      : "bg-card/50 hover:bg-card hover:shadow-sm"
                  )}
                  style={isActive ? { borderColor: `${p.color}40` } : {}}
                >
                  <div
                    className="size-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${p.color}18` }}
                  >
                    <p.icon className="size-4" style={{ color: p.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold" style={{ color: p.color }}>{p.label}</span>
                    </div>
                    <p className="text-sm font-medium leading-tight">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{p.description}</p>
                  </div>
                  {isActive && (
                    <span
                      className="absolute top-3 right-3 text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: p.color }}
                    >
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active building block */}
        {ActiveBlockComponent && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Interactive Preview
              </p>
              <button
                onClick={() => setActiveBlock(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Close ×
              </button>
            </div>
            <ActiveBlockComponent />
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-sm text-muted-foreground text-center pb-4">
          CommunityScan AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
