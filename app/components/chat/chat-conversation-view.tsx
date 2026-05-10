"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/app/components/ui/button";
import { XIcon, AlertCircleIcon, HistoryIcon } from "lucide-react";
import { ChatMessage } from "./chat-message";
import { ChatInputBox } from "./chat-input-box";
import { AiLogo } from "@/app/components/ui/ai-logo";
import { cn } from "@/app/lib/utils";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex h-full flex-col">
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
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {/* Typing indicator — waiting for first token */}
          {isLoading && (
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
          )}

          {/* Error state */}
          {error && (
            <div className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3",
              "border-destructive/30 bg-destructive/5"
            )}>
              <AlertCircleIcon className="size-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">AI unavailable</p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

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
