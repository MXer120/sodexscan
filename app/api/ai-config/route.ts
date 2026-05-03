import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseServer";

async function getUser(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user ?? null;
}

async function isAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "owner" || data?.role === "mod";
}

// GET /api/ai-config?key=system_prompt
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? "system_prompt";
  const { data, error } = await supabaseAdmin
    .from("ai_config").select("key, value, updated_at").eq("key", key).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH /api/ai-config — admin only
export async function PATCH(req: NextRequest) {
  const user = await getUser(req);
  if (!user || !(await isAdmin(user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { key?: string; value?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.key || !body.value?.trim())
    return NextResponse.json({ error: "key and value required" }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("ai_config")
    .upsert({ key: body.key, value: body.value.trim(), updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "key" })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
