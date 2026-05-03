import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseServer";

async function getUserFromRequest(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// GET /api/chat/history — list chats or load one by ?id=
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const { data, error } = await supabaseAdmin
      .from("ai_chat_history")
      .select("id, title, messages, model, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabaseAdmin
    .from("ai_chat_history")
    .select("id, title, model, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/chat/history — upsert a chat
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; messages?: unknown; model?: string; title?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { id, messages, model, title } = body;
  if (!Array.isArray(messages)) return NextResponse.json({ error: "messages required" }, { status: 400 });

  const payload = {
    user_id: user.id,
    messages,
    model: model ?? null,
    title: title ?? deriveTitle(messages as { role: string; content: unknown }[]),
    ...(id ? { id } : {}),
  };

  const { data, error } = await supabaseAdmin
    .from("ai_chat_history")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}

// DELETE /api/chat/history?id=
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("ai_chat_history")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

function deriveTitle(messages: { role: string; content: unknown }[]): string {
  const first = messages.find((m) => m.role === "user");
  const text = typeof first?.content === "string" ? first.content : "";
  return text.slice(0, 60) || "New conversation";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
