import { NextRequest } from "next/server";
import { get_trades } from "@/app/lib/tools/handlers/get_trades";

const PER_MARKET = 500;
const TOTAL_CAP  = 1000;

type Trade = { time?: number; realized_pnl?: number; [k: string]: unknown };
type TradesResult = { trades?: Trade[]; error?: string };

function daysToWindow(days: number): string {
  if (days === 7)  return "7d";
  if (days === 30) return "30d";
  if (days === 1)  return "24h";
  return "all";
}

async function fetchMarket(addr: string, market: "perps" | "spot", cap: number, window: string): Promise<Trade[]> {
  const res = (await get_trades({ address: addr, market, symbol: undefined, window, from: undefined, to: undefined, max_items: cap })) as TradesResult;
  return Array.isArray(res?.trades) ? res.trades : [];
}

export async function GET(req: NextRequest) {
  const addr = req.nextUrl.searchParams.get("address");
  if (!addr) return Response.json({ error: "address required" }, { status: 400 });

  const days   = parseInt(req.nextUrl.searchParams.get("days") ?? "0");
  const window = daysToWindow(days);

  try {
    // 500 spot + 500 futures in parallel, capped by the requested window
    const [perps, spot] = await Promise.all([
      fetchMarket(addr.toLowerCase(), "perps", PER_MARKET, window),
      fetchMarket(addr.toLowerCase(), "spot",  PER_MARKET, window),
    ]);

    let trades = [...perps, ...spot];

    // Backfill: if one market is exhausted, fill the remainder from the other
    if (trades.length < TOTAL_CAP) {
      const perpsShort = perps.length < PER_MARKET;
      const spotShort  = spot.length  < PER_MARKET;
      const needed     = TOTAL_CAP - trades.length;

      if (!perpsShort && spotShort && needed > 0) {
        const extra = await fetchMarket(addr.toLowerCase(), "perps", PER_MARKET + needed, window);
        trades = [...spot, ...extra];
      } else if (perpsShort && !spotShort && needed > 0) {
        const extra = await fetchMarket(addr.toLowerCase(), "spot", PER_MARKET + needed, window);
        trades = [...perps, ...extra];
      }
    }

    trades.sort((a, b) => (b.time ?? 0) - (a.time ?? 0));
    trades = trades.slice(0, TOTAL_CAP);

    return Response.json(
      { address: addr, window, count: trades.length, trades },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
