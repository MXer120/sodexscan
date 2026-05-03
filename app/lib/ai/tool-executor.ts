import type { User } from "@supabase/supabase-js";
import { get_balance }               from "@/app/lib/tools/handlers/get_balance";
import { get_balance_breakdown }      from "@/app/lib/tools/handlers/get_balance_breakdown";
import { get_open_positions }         from "@/app/lib/tools/handlers/get_open_positions";
import { get_pnl_history }            from "@/app/lib/tools/handlers/get_pnl_history";
import { get_pnl_daily }              from "@/app/lib/tools/handlers/get_pnl_daily";
import { get_trades }                 from "@/app/lib/tools/handlers/get_trades";
import { get_rank }                   from "@/app/lib/tools/handlers/get_rank";
import { get_account_id }             from "@/app/lib/tools/handlers/get_account_id";
import { get_prices }                 from "@/app/lib/tools/handlers/get_prices";
import { get_evm_holdings }           from "@/app/lib/tools/handlers/get_evm_holdings";
import { get_evm_transactions }       from "@/app/lib/tools/handlers/get_evm_transactions";
import { get_evm_token_transfers }    from "@/app/lib/tools/handlers/get_evm_token_transfers";
import { get_account_overview }       from "@/app/lib/tools/handlers/get_account_overview";
import { get_symbols }                from "@/app/lib/tools/handlers/get_symbols";
import { get_incoming_listings }      from "@/app/lib/tools/handlers/get_incoming_listings";
import { get_open_orders }            from "@/app/lib/tools/handlers/get_open_orders";
import { get_funding_history }        from "@/app/lib/tools/handlers/get_funding_history";
import { get_funding_total }          from "@/app/lib/tools/handlers/get_funding_total";
import { get_performance_by_asset }   from "@/app/lib/tools/handlers/get_performance_by_asset";
import { get_recent_activity }        from "@/app/lib/tools/handlers/get_recent_activity";
import { get_transfers }              from "@/app/lib/tools/handlers/get_transfers";
import { get_alias }                  from "@/app/lib/tools/handlers/get_alias";
import { resolve_refcode }            from "@/app/lib/tools/handlers/resolve_refcode";
import { list_alerts }                from "@/app/lib/tools/handlers/list_alerts";
import { watchlist_add }              from "@/app/lib/tools/handlers/watchlist_add";
import { watchlist_remove }           from "@/app/lib/tools/handlers/watchlist_remove";
import { alias_set }                  from "@/app/lib/tools/handlers/alias_set";
import { alias_delete }               from "@/app/lib/tools/handlers/alias_delete";
import { group_create }               from "@/app/lib/tools/handlers/group_create";
import { group_assign }               from "@/app/lib/tools/handlers/group_assign";
import { alert_create }               from "@/app/lib/tools/handlers/alert_create";
import { alert_update }               from "@/app/lib/tools/handlers/alert_update";
import { alert_delete }               from "@/app/lib/tools/handlers/alert_delete";
import { alert_toggle }               from "@/app/lib/tools/handlers/alert_toggle";

export interface ToolContext {
  user: User | null;
}

type Args = Record<string, unknown>;
type Handler = (args: Args, ctx: ToolContext) => Promise<unknown>;

function addr(a: unknown): string {
  return typeof a === "string" ? a.toLowerCase() : String(a);
}

async function safe(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    const r = await fn();
    if (Array.isArray(r) && r.length > 25) return (r as unknown[]).slice(0, 25);
    return r;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch data" };
  }
}

// ── Tool registry ──────────────────────────────────────────────────────────────
const TOOLS: Record<string, Handler> = {
  // ── Wallet / account ────────────────────────────────────────────────────────
  get_account_overview: (a) =>
    safe(() => get_account_overview({ address: addr(a.address), fields: a.fields as string[] | undefined })),

  get_balance: (a) =>
    safe(() => get_balance({ address: addr(a.address), market: (a.market ?? "total") as "spot"|"perps"|"evm"|"total" })),

  get_balance_breakdown: (a) =>
    safe(() => get_balance_breakdown({ address: addr(a.address), market: (a.market ?? "total") as "spot"|"perps"|"evm"|"total" })),

  get_open_positions: (a) =>
    safe(() => get_open_positions({ address: addr(a.address), symbol: a.symbol as string | undefined, sort_by: (a.sort_by ?? "notional") as "notional"|"unrealized_pnl"|"leverage", limit: (a.limit ?? 20) as number })),

  get_pnl_history: (a) =>
    safe(() => get_pnl_history({ address: addr(a.address), view: (a.view ?? "daily") as "daily"|"weekly"|"monthly", days: (a.days ?? 30) as number, from: undefined, to: undefined })),

  get_pnl_daily: (a) =>
    safe(() => get_pnl_daily({ address: addr(a.address), days: (a.days ?? 30) as number })),

  get_trades: (a) =>
    safe(() => get_trades({ address: addr(a.address), market: (a.market ?? "all") as "perps"|"spot"|"all", symbol: a.symbol as string|undefined, window: (a.window ?? "7d") as "24h"|"7d"|"30d"|"all", from: undefined, to: undefined, max_items: (a.max_items ?? 20) as number })),

  get_open_orders: (a) =>
    safe(() => get_open_orders({ address: addr(a.address), market: (a.market ?? "all") as "perps"|"spot"|"all", symbol: a.symbol as string|undefined, limit: (a.limit ?? 20) as number })),

  get_funding_history: (a) =>
    safe(() => get_funding_history({ address: addr(a.address), symbol: a.symbol as string|undefined, window: (a.window ?? "7d") as "24h"|"48h"|"7d"|"30d"|"all"|"custom", from: undefined, to: undefined, max_items: (a.max_items ?? 20) as number })),

  get_funding_total: (a) =>
    safe(() => get_funding_total({ address: addr(a.address), window: (a.window ?? "7d") as "1h"|"4h"|"12h"|"24h"|"48h"|"7d"|"30d"|"all"|"custom", from: undefined, to: undefined, symbol: a.symbol as string|undefined, breakdown: (a.breakdown ?? false) as boolean })),

  get_performance_by_asset: (a) =>
    safe(() => get_performance_by_asset({ address: addr(a.address), market: (a.market ?? "perps") as "perps"|"all", window: (a.window ?? "30d") as "24h"|"48h"|"7d"|"30d"|"all"|"custom", from: undefined, to: undefined, limit: (a.limit ?? 10) as number, sort: (a.sort ?? "total_pnl") as "total_pnl"|"volume"|"trades" })),

  get_rank: (a) =>
    safe(() => get_rank({ address: addr(a.address), window: (a.window ?? "all") as "24h"|"7d"|"30d"|"all"|undefined, sort: (a.sort ?? "both") as "pnl"|"volume"|"both" })),

  get_recent_activity: (a) =>
    safe(() => get_recent_activity({ address: addr(a.address), types: a.types as string[]|undefined, window: (a.window ?? "7d") as string, limit: (a.limit ?? 20) as number })),

  get_transfers: (a) =>
    safe(() => get_transfers({ address: addr(a.address), type: (a.type ?? "all") as "all"|"deposit"|"withdrawal"|"internal", window: (a.window ?? "7d") as string, from: undefined, to: undefined, max_items: (a.max_items ?? 20) as number })),

  // ── EVM ─────────────────────────────────────────────────────────────────────
  get_evm_holdings: (a) =>
    safe(() => get_evm_holdings({ address: addr(a.address) })),

  get_evm_transactions: (a) =>
    safe(() => get_evm_transactions({ address: addr(a.address), limit: (a.limit ?? 20) as number })),

  get_evm_token_transfers: (a) =>
    safe(() => get_evm_token_transfers({ address: addr(a.address), limit: (a.limit ?? 20) as number })),

  // ── Market ───────────────────────────────────────────────────────────────────
  get_account_id: (a) =>
    safe(() => get_account_id({ address: a.address as string })),

  get_prices: (a) =>
    safe(() => get_prices({ symbols: a.symbols as string[]|undefined })),

  get_symbols: () =>
    safe(() => get_symbols()),

  get_incoming_listings: (a) =>
    safe(() => get_incoming_listings({ market: (a.market ?? "futures") as "spot"|"futures" })),

  // ── Wallet meta (requires auth) ──────────────────────────────────────────────
  get_alias: (a, ctx) =>
    safe(() => get_alias({ address: addr(a.address) }, ctx)),

  resolve_refcode: (a) =>
    safe(() => resolve_refcode({ code: String(a.code ?? "") })),

  // ── User actions (requires auth) ─────────────────────────────────────────────
  list_alerts: (_a, ctx) =>
    safe(() => list_alerts({}, ctx)),

  watchlist_add: (a, ctx) =>
    safe(() => watchlist_add({ address: addr(a.address) }, ctx)),

  watchlist_remove: (a, ctx) =>
    safe(() => watchlist_remove({ address: addr(a.address) }, ctx)),

  alias_set: (a, ctx) =>
    safe(() => alias_set({ address: addr(a.address), name: String(a.name ?? "") }, ctx)),

  alias_delete: (a, ctx) =>
    safe(() => alias_delete({ address: addr(a.address) }, ctx)),

  group_create: (a, ctx) =>
    safe(() => group_create({ name: String(a.name ?? ""), color: a.color as string|undefined }, ctx)),

  group_assign: (a, ctx) =>
    safe(() => group_assign({ address: addr(a.address), group_name: a.group_name as string|undefined }, ctx)),

  alert_create: (a, ctx) =>
    safe(() => alert_create({ type: a.type, target: a.target, thresholds: a.thresholds, channels: a.channels, label: a.label, market: a.market, max_triggers: a.max_triggers, active_for: a.active_for, price_source: a.price_source }, ctx)),

  alert_update: (a, ctx) =>
    safe(() => alert_update({ id: String(a.id ?? ""), ...a }, ctx)),

  alert_delete: (a, ctx) =>
    safe(() => alert_delete({ id: String(a.id ?? "") }, ctx)),

  alert_toggle: (a, ctx) =>
    safe(() => alert_toggle({ id: String(a.id ?? ""), enabled: Boolean(a.enabled) }, ctx)),
};

// ── Parser ─────────────────────────────────────────────────────────────────────
export interface ToolCall { name: string; args: Args; }

export function parseToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf("[TOOL:", i);
    if (start === -1) break;
    const colon = text.indexOf(":", start + 6);
    if (colon === -1) { i = start + 1; continue; }
    const name = text.slice(start + 6, colon).trim();
    const braceStart = text.indexOf("{", colon + 1);
    if (braceStart === -1) { i = start + 1; continue; }
    let depth = 0, braceEnd = -1;
    for (let j = braceStart; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") { depth--; if (depth === 0) { braceEnd = j; break; } }
    }
    if (braceEnd === -1) { i = start + 1; continue; }
    try { calls.push({ name, args: JSON.parse(text.slice(braceStart, braceEnd + 1)) }); }
    catch { /* malformed */ }
    i = braceEnd + 1;
  }
  return calls;
}

export function stripToolTags(text: string): string {
  return text.replace(/\[TOOL:\w+:\{[^]*?\}\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

// ── Executor ───────────────────────────────────────────────────────────────────
export interface ToolResult { name: string; args: Args; result: unknown; }

export async function executeTools(calls: ToolCall[], ctx: ToolContext): Promise<ToolResult[]> {
  return Promise.all(
    calls.map(async ({ name, args }) => ({
      name, args,
      result: TOOLS[name]
        ? await TOOLS[name](args, ctx)
        : { error: `Tool "${name}" does not exist. Only tools listed in your prompt are available.` },
    }))
  );
}

export function formatToolResults(results: ToolResult[]): string {
  const lines = results.map(({ name, args, result }) =>
    `${name}(${JSON.stringify(args)}):\n${JSON.stringify(result, null, 2)}`
  );
  return (
    "[Tool Results]\n" + lines.join("\n\n") + "\n[/Tool Results]\n\n" +
    "Using these results, provide a complete and helpful response. Do NOT include [TOOL:...] tags in your answer."
  );
}
