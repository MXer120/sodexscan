export type PreviewId = "deposit" | "fees";

export interface PreviewMessage {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

export const PREVIEW_META: Record<PreviewId, { label: string; desc: string }> = {
  deposit: { label: "Deposit Issue",  desc: "Why didn't my deposit credit?" },
  fees:    { label: "My Fees",        desc: "Fee tier based on volume & staking" },
};

const now = new Date();

export const PREVIEW_CONVERSATIONS: Record<PreviewId, PreviewMessage[]> = {
  // ── Deposit not credited ──────────────────────────────────────────────────
  deposit: [
    {
      id: "d-1",
      sender: "user",
      timestamp: now,
      content: "My 500 USDC deposit from 3 hours ago never arrived on Sodex. TX: 0x4f7a69c3d8e2b1a054f3c8d92e1b7a043f6c8d9e2f5b3a1c9e8d7f6b4a3c2e1d",
    },
    {
      id: "d-2",
      sender: "ai",
      timestamp: now,
      content: `[PLAN:{"steps":["Fetch transaction on Etherscan","Identify token contract via ValueScan","Cross-check Sodex deposit registry"],"done":[0,1,2],"active":-1,"failed":[],"warning":[]}]

Found the issue. Your transaction sent **USDC.e** (bridged Polygon USDC), not the native USDC that Sodex accepts.

[BLOCK:transaction:{"hash":"0x4f7a69c3d8e2b1a054f3c8d92e1b7a043f6c8d9e2f5b3a1c9e8d7f6b4a3c2e1d","from":"0x96c475f6dBfD140DD21365FD2c7d143a47cD5476","chain":"Polygon","token":"USDC.e","tokenContract":"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174","expectedToken":"Native USDC","expectedContract":"0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359","amount":"500","status":"unrecognized","label":"Deposit Transaction","note":"USDC.e is a bridged token from Ethereum. Sodex only accepts Circle's native USDC on Polygon (0x3c49...). The two share the same symbol but are different contracts."}]

**Root cause:** Sodex's deposit contract only whitelists the **native USDC** contract address. Your USDC.e passed the balance check (same symbol, valid transaction) but was rejected by the registry.

**What to do:**
1. Your 500 USDC.e is **not lost** — it is held in the deposit contract
2. Swap USDC.e → native USDC on a DEX (1inch, Uniswap), then deposit again
3. Or open a Sodex support ticket to recover the original deposit`,
    },
  ],

  // ── Fee structure + what are my fees ─────────────────────────────────────
  fees: [
    {
      id: "f-1",
      sender: "user",
      timestamp: now,
      content: "How does the fee structure work on Sodex?",
    },
    {
      id: "f-2",
      sender: "ai",
      timestamp: now,
      content: `Sodex uses a volume-based tier model, with optional **SOSO staking discounts** on top. Tiers are based on your weighted 30-day volume: **perps vol + 2× spot vol**.

[BLOCK:fee_tiers]

Makers (limit orders) always pay less than takers. At Tier 4+, maker fees drop to zero. The staking tab shows additional discounts applied on top of your volume tier.`,
    },
    {
      id: "f-3",
      sender: "user",
      timestamp: now,
      content: "What are my fees?",
    },
    {
      id: "f-4",
      sender: "ai",
      timestamp: now,
      content: `[PLAN:{"steps":["Fetch 14-day perps + spot volume","Check staked SOSO on ValueChain","Calculate tier and apply staking discount"],"done":[0,1,2],"active":-1,"failed":[],"warning":[]}]

Here are your current rates:

[BLOCK:fee_tiers:{"highlightTier":"0"}]

**Your 14-day snapshot:**
- Perps volume: **$18,240**
- Spot volume: **$2,970** (×2 = $5,940 weighted)
- Weighted total: **$24,180** → **Tier 0**
- Staked SOSO: **0** → no staking discount

**Your rates:**
- Perps — Maker: **0.012%** · Taker: **0.040%**
- Spot — Maker: **0.035%** · Taker: **0.065%**

To reach Tier 1 ($5M weighted volume) your activity would need to scale significantly. The faster lever is staking: **just 30 SOSO** gives a 5% discount off all fees today. Not financial advice.`,
    },
  ],
};
