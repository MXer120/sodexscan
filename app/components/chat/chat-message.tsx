"use client";

import { cn } from "@/app/lib/utils";
import { AiLogo } from "@/app/components/ui/ai-logo";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { EtfInflowsBlock } from "./blocks/EtfInflowsBlock";
import { TopTradersBlock } from "./blocks/TopTradersBlock";
import { ReferralAnalysisBlock } from "./blocks/ReferralAnalysisBlock";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

type Segment =
  | { type: "text";  content: string }
  | { type: "block"; name: string; props: Record<string, unknown> }

// Parses "[BLOCK:name]" and "[BLOCK:name:{...}]" in order,
// returning interleaved text and block segments.
function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  let pos = 0;

  while (pos < content.length) {
    const start = content.indexOf("[BLOCK:", pos);
    if (start === -1) break;

    const before = content.slice(pos, start).trim();
    if (before) segments.push({ type: "text", content: before });

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

function BlockRenderer({ name, props }: { name: string; props: Record<string, unknown> }) {
  if (name === "etf_inflows")       return <EtfInflowsBlock props={props} />;
  if (name === "top_traders")       return <TopTradersBlock />;
  if (name === "referral_analysis") return <ReferralAnalysisBlock />;
  return null;
}

export function ChatMessage({ message }: { message: Message }) {
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
        <div className="size-8 rounded-full bg-secondary flex items-center justify-center">
          <AiLogo className="size-6 mt-0" />
        </div>
      </div>

      <div className="flex flex-col gap-3 min-w-0 flex-1">
        {segments.map((seg, i) =>
          seg.type === "text" ? (
            <div key={i} className="rounded-2xl px-4 py-3 bg-secondary self-start max-w-[80%]">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{seg.content}</p>
            </div>
          ) : (
            <div key={i} className="w-full">
              <BlockRenderer name={seg.name} props={seg.props} />
            </div>
          )
        )}
      </div>
    </div>
  );
}
