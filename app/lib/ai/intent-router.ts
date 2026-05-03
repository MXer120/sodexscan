import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

export interface Intent {
  needsTools: boolean;   // user needs on-chain data
  needsKB: boolean;      // user needs platform knowledge / docs
  toolQuery: string;     // refined query for tool retrieval
  kbQuery: string;       // refined query for KB retrieval
}

const ROUTER_SYSTEM = `You classify chat messages for a crypto DEX assistant.
Respond with ONLY a JSON object — no explanation, no markdown.

Schema:
{
  "needsTools": boolean,   // true if the user wants live on-chain data (balances, positions, prices, ranks, trades, holdings, referral codes)
  "needsKB": boolean,      // true if the user wants platform info (how Sodex works, deposits, bridge, staking, vTokens, fees, FAQ)
  "toolQuery": string,     // 1-sentence query for tool retrieval (empty string if needsTools=false)
  "kbQuery": string        // 1-sentence query for KB retrieval (empty string if needsKB=false)
}

Examples:
- "hello" → {"needsTools":false,"needsKB":false,"toolQuery":"","kbQuery":""}
- "what's my balance" → {"needsTools":true,"needsKB":false,"toolQuery":"wallet balance","kbQuery":""}
- "how do I deposit USDC?" → {"needsTools":false,"needsKB":true,"toolQuery":"","kbQuery":"how to deposit USDC bridge"}
- "show BTC price and explain funding rates" → {"needsTools":true,"needsKB":true,"toolQuery":"BTC price mark","kbQuery":"funding rate explanation"}`;

export async function routeIntent(lastUserMessage: string): Promise<Intent> {
  const fallback: Intent = {
    needsTools: false,
    needsKB: false,
    toolQuery: lastUserMessage,
    kbQuery: lastUserMessage,
  };

  // Use a small fast model — this is latency-critical
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ...fallback, needsTools: true, needsKB: true };

  try {
    const groq = createGroq({ apiKey: key });
    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      system: ROUTER_SYSTEM,
      prompt: lastUserMessage,
      maxTokens: 120,
      temperature: 0,
    });

    const json = JSON.parse(text.trim());
    return {
      needsTools: Boolean(json.needsTools),
      needsKB: Boolean(json.needsKB),
      toolQuery: String(json.toolQuery || lastUserMessage),
      kbQuery: String(json.kbQuery || lastUserMessage),
    };
  } catch {
    // On any failure, assume both might be needed (safe default)
    return { ...fallback, needsTools: true, needsKB: true };
  }
}
