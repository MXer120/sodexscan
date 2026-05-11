import { NextRequest } from "next/server";
import { get_trades } from "@/app/lib/tools/handlers/get_trades";

export async function GET(req: NextRequest) {
  const addr = req.nextUrl.searchParams.get("address");
  if (!addr) return Response.json({ error: "address required" }, { status: 400 });

  try {
    // Call directly (no 25-item slice) — max 1000 trades, all time
    const data = await get_trades({
      address: addr.toLowerCase(),
      market: "all",
      window: "all",
      max_items: 1000,
      symbol: undefined,
      from: undefined,
      to: undefined,
    });
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
