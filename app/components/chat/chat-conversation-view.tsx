"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { XIcon, AlertCircleIcon, HistoryIcon, KeyIcon } from "lucide-react";
import { ChatMessage } from "./chat-message";
import { ChatInputBox } from "./chat-input-box";
import { AI_MODELS } from "./chat-input-box";
import { EtfInflowsBlock } from "./blocks/EtfInflowsBlock";
import { TopTradersBlock } from "./blocks/TopTradersBlock";
import { ReferralAnalysisBlock } from "./blocks/ReferralAnalysisBlock";
import { AiLogo } from "@/app/components/ui/ai-logo";
import { cn } from "@/app/lib/utils";
import Link from "next/link";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

type PlanStatus = "done" | "active" | "failed" | "warning" | "pending";
interface PlanStep { text: string; status: PlanStatus }
interface ParsedPlan {
  steps: PlanStep[];
  doneCount: number;
  failedCount: number;
  warningCount: number;
  totalCount: number;
}

// Finds the LAST [PLAN:...] tag in the content — so streaming updates are reflected
function extractPlanFromContent(content: string): ParsedPlan | null {
  let lastStart = -1;
  let search = 0;
  while (true) {
    const pos = content.indexOf("[PLAN:", search);
    if (pos === -1) break;
    lastStart = pos;
    search = pos + 1;
  }
  if (lastStart === -1) return null;
  const jsonStart = lastStart + 6;
  if (content[jsonStart] !== "{") return null;
  let depth = 0, end = -1;
  for (let i = jsonStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  try {
    const parsed = JSON.parse(content.slice(jsonStart, end + 1)) as {
      steps?: string[];
      done?:    number[];
      active?:  number;
      failed?:  number[];
      warning?: number[];
    };
    const steps   = parsed.steps   ?? [];
    const done    = new Set(parsed.done    ?? []);
    const failed  = new Set(parsed.failed  ?? []);
    const warning = new Set(parsed.warning ?? []);
    const active  = parsed.active ?? -1;
    return {
      steps: steps.map((text, i) => ({
        text,
        status: (
          failed.has(i)  ? "failed"  :
          warning.has(i) ? "warning" :
          done.has(i)    ? "done"    :
          i === active   ? "active"  :
                           "pending"
        ) as PlanStatus,
      })),
      doneCount:    done.size,
      failedCount:  failed.size,
      warningCount: warning.size,
      totalCount:   steps.length,
    };
  } catch { return null; }
}

interface ChatConversationViewProps {
  messages: Message[];
  totalMessages: number;
  message: string;
  onMessageChange: (value: string) => void;
  onSend: (content: string) => void;
  onReset: () => void;
  isLoading?: boolean;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  usePersonalKB?: boolean;
  onPersonalKBChange?: (v: boolean) => void;
  error?: string;
  contextLimitActive?: boolean;
  onExpandContext?: () => void;
  queue?: string[];
  onQueueRemove?: (index: number) => void;
  onStop?: () => void;
}

export function ChatConversationView({
  messages, totalMessages, message, onMessageChange, onSend, onReset,
  isLoading = false, selectedModel, onModelChange,
  usePersonalKB = false, onPersonalKBChange,
  error, contextLimitActive = false, onExpandContext,
  queue, onQueueRemove, onStop,
}: ChatConversationViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [planOpen,    setPlanOpen]    = useState(false);
  const [livePreview, setLivePreview] = useState<"etf" | "traders" | "referral" | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const currentPlan = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender !== "ai") continue;
      const p = extractPlanFromContent(messages[i].content);
      if (p && p.totalCount > 0) return p;
    }
    return null;
  }, [messages]);

  return (
    <div className="flex h-full flex-col relative">

      {/* Plan indicator — absolute top-right */}
      {currentPlan && (
        <button
          onClick={() => setPlanOpen(v => !v)}
          className="absolute top-3 right-4 z-20 flex items-center gap-1.5 text-[11px] font-medium border rounded-full px-2.5 py-1 transition-colors hover:bg-accent bg-background/80 backdrop-blur-sm shadow-sm"
        >
          <span className={cn(
            "size-1.5 rounded-full shrink-0",
            currentPlan.failedCount  > 0 ? "bg-red-500" :
            currentPlan.warningCount > 0 ? "bg-yellow-500" :
            currentPlan.doneCount === currentPlan.totalCount ? "bg-emerald-500" :
            "bg-primary animate-pulse"
          )} />
          {currentPlan.doneCount + currentPlan.failedCount + currentPlan.warningCount}/{currentPlan.totalCount} steps
        </button>
      )}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
        <div className="max-w-[640px] mx-auto space-y-6">

          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {totalMessages} message{totalMessages !== 1 ? "s" : ""}
            </span>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={onReset}
              className="size-8 rounded-full border"
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          {/* Context limit banner */}
          {contextLimitActive && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <HistoryIcon className="size-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  AI sees the last 10 messages.{" "}
                  <span className="text-foreground font-medium">
                    {totalMessages - 10} earlier
                  </span>{" "}
                  are hidden.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onExpandContext}
                className="shrink-0 h-7 text-xs"
              >
                Load all {totalMessages}
              </Button>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} usingKB={usePersonalKB && msg.sender === "ai"} />
          ))}

          {/* Typing indicator — waiting for first token */}
          {isLoading && (() => {
            // Detect if the last user message matches a known example type
            const lastUser = [...messages].reverse().find(m => m.sender === "user");
            const c = lastUser?.content?.toLowerCase() ?? "";
            const isEtf      = c.includes("etf") || c.includes("inflow");
            const isTraders  = c.includes("trader") || c.includes("leaderboard") || (c.includes("top") && c.includes("wallet"));
            const isReferral = c.includes("referral");
            const hasMatch   = isEtf || isTraders || isReferral;
            return (
              <>
                {hasMatch && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">See live data while AI thinks:</span>
                      {isEtf && (
                        <button onClick={() => setLivePreview(p => p === "etf" ? null : "etf")}
                          className={cn("text-[11px] border rounded-full px-2.5 py-1 transition-colors font-medium",
                            livePreview === "etf" ? "bg-[#6366f1]/10 border-[#6366f1]/40 text-[#6366f1]" : "hover:bg-accent text-muted-foreground")}>
                          ETF Flows ↓
                        </button>
                      )}
                      {isTraders && (
                        <button onClick={() => setLivePreview(p => p === "traders" ? null : "traders")}
                          className={cn("text-[11px] border rounded-full px-2.5 py-1 transition-colors font-medium",
                            livePreview === "traders" ? "bg-[#f59e0b]/10 border-[#f59e0b]/40 text-[#f59e0b]" : "hover:bg-accent text-muted-foreground")}>
                          Top Traders ↓
                        </button>
                      )}
                      {isReferral && (
                        <button onClick={() => setLivePreview(p => p === "referral" ? null : "referral")}
                          className={cn("text-[11px] border rounded-full px-2.5 py-1 transition-colors font-medium",
                            livePreview === "referral" ? "bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981]" : "hover:bg-accent text-muted-foreground")}>
                          Referral Data ↓
                        </button>
                      )}
                    </div>
                    {livePreview === "etf"      && <EtfInflowsBlock />}
                    {livePreview === "traders"  && <TopTradersBlock />}
                    {livePreview === "referral" && <ReferralAnalysisBlock />}
                  </div>
                )}
                <div className="flex gap-4 justify-start">
                  <div className="shrink-0">
                <div className="size-8 rounded-full bg-secondary flex items-center justify-center">
                  <AiLogo className="size-6 mt-0" />
                </div>
              </div>
              <div className="rounded-2xl px-4 py-3 bg-secondary flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
              </>
            );
          })()}

          {/* Error state */}
          {error && (() => {
            const isLimit = error.includes("Rate limit exceeded") || error.includes("Quota exceeded");
            if (!isLimit) {
              return (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                  <AlertCircleIcon className="size-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">AI unavailable</p>
                </div>
              );
            }
            const retryMatch = error.match(/Retry in (\d+)s/i);
            const retrySecs  = retryMatch ? parseInt(retryMatch[1]) : 60;
            // Round to nearest 5s; show minutes if ≥ 60s
            const rounded = Math.ceil(retrySecs / 5) * 5;
            const retryLabel = rounded >= 120 ? `~${Math.round(rounded / 60)} min`
                             : rounded >= 60  ? "~1 min"
                             : `~${rounded}s`;
            const modelLabel = AI_MODELS.find(m => m.id === selectedModel)?.label ?? selectedModel;
            return (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-500 truncate">{modelLabel} — limit reached</p>
                  <p className="text-xs text-muted-foreground">Resets in {retryLabel}</p>
                </div>
                <Link
                  href="/settings?section=api-keys"
                  className="inline-flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-1.5 hover:bg-accent transition-colors shrink-0"
                >
                  <KeyIcon className="size-3" />
                  Add API key
                </Link>
              </div>
            );
          })()}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Floating AI plan panel */}
      {planOpen && currentPlan && (
        <div className="absolute bottom-[76px] right-4 w-80 rounded-xl border bg-popover shadow-2xl z-30 overflow-hidden"
          style={{ minHeight: "30%" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">AI Plan</span>
              <span className={cn(
                "text-[11px] px-1.5 py-0.5 rounded-full font-medium",
                currentPlan.failedCount  > 0 ? "bg-red-500/15 text-red-500" :
                currentPlan.warningCount > 0 ? "bg-yellow-500/15 text-yellow-500" :
                currentPlan.doneCount === currentPlan.totalCount ? "bg-emerald-500/15 text-emerald-500" :
                "bg-primary/15 text-primary"
              )}>
                {currentPlan.doneCount + currentPlan.failedCount + currentPlan.warningCount}/{currentPlan.totalCount}
              </span>
            </div>
            <button onClick={() => setPlanOpen(false)}
              className="size-6 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-sm">
              ×
            </button>
          </div>
          <div className="px-4 py-3 space-y-3">
            {currentPlan.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                {/* Done — green checkmark */}
                {step.status === "done" && (
                  <div className="size-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4l1.5 1.5 3-3" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                {/* Active — pulsing blue dot */}
                {step.status === "active" && (
                  <div className="size-4 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  </div>
                )}
                {/* Failed — red X */}
                {step.status === "failed" && (
                  <div className="size-4 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                      <path d="M1.5 1.5l4 4M5.5 1.5l-4 4" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
                {/* Warning — yellow exclamation */}
                {step.status === "warning" && (
                  <div className="size-4 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[8px] font-bold text-yellow-500 leading-none">!</span>
                  </div>
                )}
                {/* Pending — empty ring */}
                {step.status === "pending" && (
                  <div className="size-4 rounded-full border border-border flex items-center justify-center shrink-0 mt-0.5">
                    <span className="size-1 rounded-full bg-muted-foreground/30" />
                  </div>
                )}
                <span className={cn(
                  "text-sm leading-tight",
                  step.status === "done"    ? "line-through text-muted-foreground/50" :
                  step.status === "failed"  ? "text-red-400" :
                  step.status === "warning" ? "text-yellow-400" :
                  "text-foreground"
                )}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message queue — faded bubbles above input */}
      {queue && queue.length > 0 && (
        <div className="px-4 md:px-8 pb-0">
          <div className="max-w-[640px] mx-auto space-y-1.5 pb-3">
            {queue.map((msg, i) => (
              <div key={i} className="flex items-end justify-end gap-2 group">
                <button
                  onClick={() => onQueueRemove?.(i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity mb-1 shrink-0 p-1 rounded text-muted-foreground/50 hover:text-muted-foreground"
                  title="Remove from queue (or press Esc)"
                >
                  <XIcon className="size-3" />
                </button>
                <div className="rounded-2xl px-4 py-2.5 bg-primary/20 max-w-[80%]">
                  <p className="text-sm text-foreground/40 leading-relaxed">{msg}</p>
                </div>
              </div>
            ))}
            {/* "waiting" indicator */}
            <div className="flex items-center justify-end gap-1 pr-1">
              <span className="text-[10px] text-muted-foreground/40 mr-0.5">queued</span>
              <span className="size-1 rounded-full bg-muted-foreground/25 animate-bounce [animation-delay:0ms]" />
              <span className="size-1 rounded-full bg-muted-foreground/25 animate-bounce [animation-delay:150ms]" />
              <span className="size-1 rounded-full bg-muted-foreground/25 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      <div className="px-4 md:px-8 py-[17px]">
        <div className="max-w-[640px] mx-auto">
          <ChatInputBox
            message={message}
            onMessageChange={onMessageChange}
            onSend={() => { if (message.trim()) onSend(message); }}
            onStop={onStop}
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            usePersonalKB={usePersonalKB}
            onPersonalKBChange={onPersonalKBChange}
            showTools={true}
            placeholder="Continue the conversation..."
            disabled={isLoading}
            queue={queue}
            onQueueRemove={onQueueRemove}
          />
        </div>
      </div>
    </div>
  );
}
