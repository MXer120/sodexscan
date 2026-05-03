import { tool } from "ai";
import { z } from "zod";
import { get_balance } from "@/app/lib/tools/handlers/get_balance";
import { get_open_positions } from "@/app/lib/tools/handlers/get_open_positions";
import { get_pnl_history } from "@/app/lib/tools/handlers/get_pnl_history";
import { get_trades } from "@/app/lib/tools/handlers/get_trades";
import { get_rank } from "@/app/lib/tools/handlers/get_rank";
import { get_account_id } from "@/app/lib/tools/handlers/get_account_id";
import { get_prices } from "@/app/lib/tools/handlers/get_prices";
import { get_evm_holdings } from "@/app/lib/tools/handlers/get_evm_holdings";
import { get_account_overview } from "@/app/lib/tools/handlers/get_account_overview";

const ADDR = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM address (0x…)");
const WINDOW = z.enum(["24h", "7d", "30d", "all"]).optional();

// Normalize addresses to lowercase so the model can pass either case
function addr(a: string): string {
  return a.toLowerCase();
}

// Wrap every tool execute: catch errors so the model gets a structured message
// instead of an unhandled exception killing the step. Also trims large arrays.
function safe<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  return fn()
    .then((result) => {
      // Arrays with >25 items are trimmed to avoid blowing the context window
      if (Array.isArray(result) && result.length > 25) {
        return (result as unknown[]).slice(0, 25) as unknown as T;
      }
      return result;
    })
    .catch((err: unknown) => ({
      error: err instanceof Error ? err.message : "Failed to fetch data from Sodex",
    }));
}

export const aiTools = {
  get_account_overview: tool({
    description:
      "Full wallet snapshot: equity, PnL rank, volume rank, cumulative PnL/volume, unrealized PnL, and balance breakdown by spot/perps/evm. Use this first for any wallet question.",
    parameters: z.object({
      address: ADDR,
      fields: z
        .array(z.enum(["rank", "balance", "unrealized", "cumulative", "breakdown"]))
        .optional()
        .describe("Subset of fields to return. Omit for all."),
    }),
    execute: async ({ address, fields }) =>
      safe(() => get_account_overview({ address: addr(address), fields })),
  }),

  get_balance: tool({
    description: "USD balance for a wallet address. market = spot | perps | evm | total.",
    parameters: z.object({
      address: ADDR,
      market: z
        .enum(["spot", "perps", "evm", "total"])
        .optional()
        .default("total"),
    }),
    execute: async ({ address, market }) =>
      safe(() => get_balance({ address: addr(address), market })),
  }),

  get_open_positions: tool({
    description:
      "Live open perpetuals positions for a wallet. Returns symbol, side, size, entry/mark price, leverage, liquidation price, unrealized PnL.",
    parameters: z.object({
      address: ADDR,
      symbol: z.string().optional().describe("Filter to a single symbol, e.g. BTC"),
      sort_by: z
        .enum(["notional", "unrealized_pnl", "leverage"])
        .optional()
        .default("notional"),
      limit: z.number().int().min(1).max(50).optional().default(20),
    }),
    execute: async ({ address, symbol, sort_by, limit }) =>
      safe(() => get_open_positions({ address: addr(address), symbol, sort_by, limit })),
  }),

  get_pnl_history: tool({
    description:
      "Historical PnL series for a wallet. Use for trend analysis and chart data.",
    parameters: z.object({
      address: ADDR,
      view: z
        .enum(["daily", "weekly", "monthly"])
        .optional()
        .default("daily"),
      days: z.number().int().min(1).max(365).optional().default(30),
    }),
    execute: async ({ address, view, days }) =>
      safe(() => get_pnl_history({ address: addr(address), view, days, from: undefined, to: undefined })),
  }),

  get_trades: tool({
    description:
      "Trade fill history for a wallet. Returns individual fills with symbol, side, price, qty, fee, and realized PnL.",
    parameters: z.object({
      address: ADDR,
      market: z.enum(["perps", "spot", "all"]).optional().default("all"),
      symbol: z.string().optional(),
      window: WINDOW.default("7d"),
      max_items: z.number().int().min(1).max(50).optional().default(20),
    }),
    execute: async ({ address, market, symbol, window, max_items }) =>
      safe(() =>
        get_trades({ address: addr(address), market, symbol, window, from: undefined, to: undefined, max_items })
      ),
  }),

  get_rank: tool({
    description:
      "Leaderboard rank for a wallet address. Returns PnL rank and/or volume rank for a given window.",
    parameters: z.object({
      address: ADDR,
      window: WINDOW.default("all"),
      sort: z.enum(["pnl", "volume", "both"]).optional().default("both"),
    }),
    execute: async ({ address, window, sort }) =>
      safe(() => get_rank({ address: addr(address), window, sort })),
  }),

  get_account_id: tool({
    description:
      "Resolve the numeric Sodex account ID for a wallet address.",
    parameters: z.object({
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid 0x wallet address"),
    }),
    execute: async ({ address }) =>
      safe(() => get_account_id({ address })),
  }),

  get_prices: tool({
    description:
      "Live mark prices for Sodex perps and spot vTokens. Pass specific symbols or omit to get all.",
    parameters: z.object({
      symbols: z
        .array(z.string())
        .optional()
        .describe("e.g. ['BTC','ETH','SOL']. Omit for all prices."),
    }),
    execute: async ({ symbols }) =>
      safe(() => get_prices({ symbols })),
  }),

  get_evm_holdings: tool({
    description:
      "SOSO-chain EVM wallet holdings: native SOSO balance, vToken balances, staked positions, and LP vault positions.",
    parameters: z.object({
      address: ADDR,
    }),
    execute: async ({ address }) =>
      safe(() => get_evm_holdings({ address: addr(address) })),
  }),
};
