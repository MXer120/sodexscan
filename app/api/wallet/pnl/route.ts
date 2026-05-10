import { NextRequest } from "next/server";
import { get_pnl_daily } from "@/app/lib/tools/handlers/get_pnl_daily";

export async function GET(req: NextRequest) {
  const addr  = req.nextUrl.searchParams.get("address");
  const days  = parseInt(req.nextUrl.searchParams.get("days") ?? "30");

  if (!addr) return Response.json({ error: "address required" }, { status: 400 });

  try {
    const data = await get_pnl_daily({ address: addr.toLowerCase(), days: Math.min(days, 90) });
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
