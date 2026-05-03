import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseServer";

async function getUser(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user ?? null;
}

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "owner" || data?.role === "mod";
}

// GET /api/kb/submissions — admin: list all; user: list own
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdmin(user.id);
  let query = supabaseAdmin
    .from("kb_submissions")
    .select("id, doc_type, title, content, tags, status, reviewer_note, created_at, updated_at, user_id, chunk_id")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!admin) query = query.eq("user_id", user.id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// PATCH /api/kb/submissions — admin: review (approve/deny)
export async function PATCH(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { id: string; status: "approved" | "denied"; note?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.id || !["approved","denied"].includes(body.status))
    return NextResponse.json({ error: "id and status required" }, { status: 400 });

  // Update submission status
  const { data: sub, error: subErr } = await supabaseAdmin
    .from("kb_submissions")
    .update({ status: body.status, reviewer_id: user.id, reviewer_note: body.note ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", body.id)
    .select("*")
    .single();

  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });

  // If approved: upsert into kb_chunks
  if (body.status === "approved" && sub) {
    await supabaseAdmin.from("kb_chunks").upsert({
      ...(sub.chunk_id ? { id: sub.chunk_id } : {}),
      source_id: sub.source_id ?? sub.id,
      doc_type:  sub.doc_type,
      title:     sub.title,
      content:   sub.content,
      tags:      sub.tags ?? [],
      hash:      Buffer.from(sub.content).toString("base64").slice(0, 32),
    }, { onConflict: sub.chunk_id ? "id" : "source_id" });
  }

  return NextResponse.json({ ok: true });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
