import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseServer";

async function getUser(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user ?? null;
}

// GET /api/kb — list all shared KB chunks
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("kb_chunks")
    .select("id, source_id, doc_type, title, content, tags, updated_at")
    .order("doc_type")
    .order("title");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/kb — submit a change for review
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { chunk_id?: string; source_id?: string; doc_type?: string; title?: string; content?: string; tags?: string[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("kb_submissions").insert({
    user_id:   user.id,
    chunk_id:  body.chunk_id ?? null,
    source_id: body.source_id ?? null,
    doc_type:  body.doc_type ?? "doc",
    title:     body.title ?? null,
    content:   body.content,
    tags:      body.tags ?? [],
    status:    "pending",
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
