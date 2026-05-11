import { NextRequest } from "next/server";
import { resolve_refcode } from "@/app/lib/tools/handlers/resolve_refcode";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return Response.json({ error: "code required" }, { status: 400 });
  try {
    const result = await resolve_refcode({ code });
    return Response.json(result, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
