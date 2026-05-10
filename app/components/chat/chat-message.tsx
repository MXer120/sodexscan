"use client";

import { cn } from "@/app/lib/utils";
import { AiLogo } from "@/app/components/ui/ai-logo";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { EtfInflowsBlock } from "./blocks/EtfInflowsBlock";
import { TopTradersBlock } from "./blocks/TopTradersBlock";
import { ReferralAnalysisBlock } from "./blocks/ReferralAnalysisBlock";
import { PnlChartBlock } from "./blocks/PnlChartBlock";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

type Segment =
  | { type: "text";  content: string }
  | { type: "block"; name: string; props: Record<string, unknown> }
  | { type: "plan";  raw: string }

// Parses "[BLOCK:name]" and "[BLOCK:name:{...}]" in order,
// returning interleaved text and block segments.
function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  let pos = 0;

  while (pos < content.length) {
    // Find the next tag — either [BLOCK: or [PLAN:
    const blockStart = content.indexOf("[BLOCK:", pos);
    const planStart = content.indexOf("[PLAN:", pos);

    let start: number;
    let tagType: "block" | "plan";
    if (blockStart === -1 && planStart === -1) break;
    if (blockStart === -1) { start = planStart; tagType = "plan"; }
    else if (planStart === -1) { start = blockStart; tagType = "block"; }
    else if (blockStart <= planStart) { start = blockStart; tagType = "block"; }
    else { start = planStart; tagType = "plan"; }

    const before = content.slice(pos, start).trim();
    if (before) segments.push({ type: "text", content: before });

    if (tagType === "plan") {
      // [PLAN:{...}]
      const jsonStart = start + 6; // skip "[PLAN:"
      if (content[jsonStart] !== "{") { pos = start + 1; continue; }
      let depth = 0, end = -1;
      for (let j = jsonStart; j < content.length; j++) {
        if (content[j] === "{") depth++;
        else if (content[j] === "}") { depth--; if (depth === 0) { end = j; break; } }
      }
      if (end === -1 || content[end + 1] !== "]") { pos = start + 1; continue; }
      segments.push({ type: "plan", raw: content.slice(jsonStart, end + 1) });
      pos = end + 2;
      continue;
    }

    // [BLOCK:...] handling
    // Read block name — ends at ":" or "]"
    let i = start + 7;
    while (i < content.length && content[i] !== ":" && content[i] !== "]") i++;
    const name = content.slice(start + 7, i);
    if (!name) { pos = start + 1; continue; }

    if (content[i] === "]") {
      segments.push({ type: "block", name, props: {} });
      pos = i + 1;
      continue;
    }

    // Has JSON props — count braces to find the end
    i++; // skip ":"
    if (content[i] !== "{") { pos = start + 1; continue; }

    let depth = 0, end = -1;
    for (let j = i; j < content.length; j++) {
      if (content[j] === "{") depth++;
      else if (content[j] === "}") { depth--; if (depth === 0) { end = j; break; } }
    }
    if (end === -1 || content[end + 1] !== "]") { pos = start + 1; continue; }

    let props: Record<string, unknown> = {};
    try { props = JSON.parse(content.slice(i, end + 1)); } catch {}
    segments.push({ type: "block", name, props });
    pos = end + 2;
  }

  const tail = content.slice(pos).trim();
  if (tail) segments.push({ type: "text", content: tail });
  return segments;
}

const HEX_RE = /\b(0x[0-9a-fA-F]{40,64})\b/g;

function renderWithCopyables(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(HEX_RE.source, "g");
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(<CopyableChip key={match.index} value={match[1]} />);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] as React.ReactNode : <>{parts}</>;
}

function CopyableChip({ value }: { value: string }) {
  const isAddr = value.length === 42;
  const display = `${value.slice(0, 6)}…${value.slice(-4)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(isAddr ? "Address copied" : "Hash copied", { duration: 1500 });
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={value}
      className="inline-flex items-center gap-1 cursor-pointer font-mono text-[0.82em] bg-muted/70 hover:bg-muted rounded px-1.5 py-0.5 transition-colors mx-0.5 align-middle"
    >
      {display}
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    </button>
  );
}

function BlockRenderer({ name, props }: { name: string; props: Record<string, unknown> }) {
  if (name === "etf_inflows")       return <EtfInflowsBlock props={props} />;
  if (name === "top_traders")       return <TopTradersBlock />;
  if (name === "referral_analysis") return <ReferralAnalysisBlock />;
  if (name === "pnl_chart")         return <PnlChartBlock props={props as { address?: string; days?: number; view?: "daily" | "cumulative" }} />;
  return null;
}

export function ChatMessage({ message, usingKB = false }: { message: Message; usingKB?: boolean }) {
  const isAI = message.sender === "ai";

  if (!isAI) {
    return (
      <div className="flex gap-4 justify-end">
        <div className="rounded-2xl px-4 py-3 max-w-[80%] bg-primary text-primary-foreground">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="shrink-0">
          <Avatar className="size-8"><AvatarFallback>U</AvatarFallback></Avatar>
        </div>
      </div>
    );
  }

  const segments = parseSegments(message.content);

  return (
    <div className="flex gap-4 justify-start">
      <div className="shrink-0 mt-0.5">
        <div className={cn(
          "size-8 rounded-full flex items-center justify-center",
          usingKB ? "ring-2 ring-emerald-500/40 bg-emerald-500/5" : "bg-secondary"
        )}>
          <AiLogo className="size-6 mt-0" green={usingKB} />
        </div>
      </div>

      <div className="flex flex-col gap-3 min-w-0 flex-1">
        {segments.map((seg, i) => {
          if (seg.type === "text") return (
            <div key={i} className="rounded-2xl px-4 py-3 bg-secondary self-start max-w-[80%]">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderWithCopyables(seg.content)}</p>
            </div>
          );
          if (seg.type === "block") return (
            <div key={i} className="w-full">
              <BlockRenderer name={seg.name} props={seg.props} />
            </div>
          );
          // plan segments are invisible — extracted by parent via message content scan
          return null;
        })}
      </div>
    </div>
  );
}
