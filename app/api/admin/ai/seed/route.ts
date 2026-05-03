/**
 * POST /api/admin/ai/seed
 * Seeds ai_tools and kb_chunks with embeddings.
 * Owner-only. Run once after deploy or when tools/KB change.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseServer";
import { embedBatch } from "@/app/lib/ai/embeddings";
import { TOOL_SEED, KB_SEED } from "@/app/lib/ai/seed-data";

async function getUser(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user;
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner")
    return NextResponse.json({ error: "Owner only" }, { status: 403 });

  const results = { tools: 0, chunks: 0, errors: [] as string[] };

  // ── Seed tools ─────────────────────────────────────────────────────────────
  try {
    const toolTexts = TOOL_SEED.map((t) =>
      `${t.description} ${t.example ?? ""} ${t.id}`
    );
    const toolEmbeddings = await embedBatch(toolTexts);

    for (let i = 0; i < TOOL_SEED.length; i++) {
      const tool = TOOL_SEED[i];
      const { error } = await supabaseAdmin.from("ai_tools").upsert(
        {
          id: tool.id,
          namespace: tool.namespace,
          description: tool.description,
          example: tool.example ?? null,
          schema_def: tool.schema_def,
          enabled: true,
          embedding: JSON.stringify(toolEmbeddings[i]),
        },
        { onConflict: "id" }
      );
      if (error) results.errors.push(`tool ${tool.id}: ${error.message}`);
      else results.tools++;
    }
  } catch (e) {
    results.errors.push(`tools batch: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── Seed KB chunks ─────────────────────────────────────────────────────────
  try {
    const kbTexts = KB_SEED.map((c) =>
      `${c.title ?? ""} ${c.content}`
    );
    const kbEmbeddings = await embedBatch(kbTexts);

    for (let i = 0; i < KB_SEED.length; i++) {
      const chunk = KB_SEED[i];
      const hash = Buffer.from(chunk.content).toString("base64").slice(0, 32);

      const { error } = await supabaseAdmin.from("kb_chunks").upsert(
        {
          source_id: chunk.source_id,
          doc_type: chunk.doc_type,
          title: chunk.title ?? null,
          content: chunk.content,
          tags: chunk.tags ?? [],
          embedding: JSON.stringify(kbEmbeddings[i]),
          hash,
        },
        { onConflict: "source_id" }
      );
      if (error) results.errors.push(`chunk ${chunk.source_id}: ${error.message}`);
      else results.chunks++;
    }
  } catch (e) {
    results.errors.push(`kb batch: ${e instanceof Error ? e.message : String(e)}`);
  }

  const status = results.errors.length > 0 ? 207 : 200;
  return NextResponse.json(results, { status });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
