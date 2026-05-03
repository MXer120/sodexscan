import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseServer";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("ai_tools")
    .select("id, namespace, description, example")
    .eq("enabled", true)
    .order("namespace")
    .order("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
