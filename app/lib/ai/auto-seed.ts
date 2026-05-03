import { supabaseAdmin } from "@/app/lib/supabaseServer";
// auto-seed uses the same direct Google API call as the seed script
// (the AI SDK's embedMany uses batchEmbedContents which isn't supported on this key)
async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: 768 }),
    });
    if (!res.ok) throw new Error(`Embed failed ${res.status}: ${await res.text()}`);
    const data = await res.json() as { embedding: { values: number[] } };
    results.push(data.embedding.values);
    await new Promise(r => setTimeout(r, 100));
  }
  return results;
}
import { TOOL_SEED, KB_SEED } from "./seed-data";

/**
 * Idempotent seed — compares TOOL_SEED / KB_SEED against what's already in the
 * DB and only embeds + upserts the rows that are missing or new.
 * Safe to call on every server startup.
 */
export async function autoSeedIfEmpty(): Promise<void> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn("[auto-seed] Skipped — GOOGLE_GENERATIVE_AI_API_KEY not set");
    return;
  }

  // ── Find missing tools ─────────────────────────────────────────────────────
  const { data: existingTools } = await supabaseAdmin
    .from("ai_tools").select("id");
  const existingToolIds = new Set((existingTools ?? []).map((r: { id: string }) => r.id));
  const missingTools = TOOL_SEED.filter(t => !existingToolIds.has(t.id));

  if (missingTools.length > 0) {
    console.log(`[auto-seed] Embedding ${missingTools.length} new tools…`);
    const texts = missingTools.map(t => `${t.description} ${t.example ?? ""} ${t.id}`);
    const embeddings = await embedBatch(texts);
    const rows = missingTools.map((t, i) => ({
      id: t.id,
      namespace: t.namespace,
      description: t.description,
      example: t.example ?? null,
      schema_def: t.schema_def,
      enabled: true,
      embedding: JSON.stringify(embeddings[i]),
    }));
    const { error } = await supabaseAdmin.from("ai_tools").upsert(rows, { onConflict: "id" });
    if (error) console.error("[auto-seed] tools error:", error.message);
    else console.log(`[auto-seed] Seeded ${rows.length} tools ✓`);
  }

  // ── Find missing KB chunks ─────────────────────────────────────────────────
  const { data: existingChunks } = await supabaseAdmin
    .from("kb_chunks").select("source_id");
  const existingSourceIds = new Set((existingChunks ?? []).map((r: { source_id: string }) => r.source_id));
  const missingChunks = KB_SEED.filter(c => !existingSourceIds.has(c.source_id));

  if (missingChunks.length > 0) {
    console.log(`[auto-seed] Embedding ${missingChunks.length} new KB chunks…`);
    const texts = missingChunks.map(c => `${c.title ?? ""} ${c.content}`);
    const embeddings = await embedBatch(texts);
    const rows = missingChunks.map((c, i) => ({
      source_id: c.source_id,
      doc_type: c.doc_type,
      title: c.title ?? null,
      content: c.content,
      tags: c.tags ?? [],
      embedding: JSON.stringify(embeddings[i]),
      hash: Buffer.from(c.content).toString("base64").slice(0, 32),
    }));
    const { error } = await supabaseAdmin.from("kb_chunks").upsert(rows, { onConflict: "source_id" });
    if (error) console.error("[auto-seed] kb error:", error.message);
    else console.log(`[auto-seed] Seeded ${rows.length} KB chunks ✓`);
  }

  if (missingTools.length === 0 && missingChunks.length === 0) {
    console.log("[auto-seed] All tools and KB chunks already seeded ✓");
  }
}
