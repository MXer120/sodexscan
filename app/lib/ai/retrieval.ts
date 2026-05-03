import { supabaseAdmin } from "@/app/lib/supabaseServer";
import { embedText } from "./embeddings";

export interface RetrievedTool {
  id: string;
  namespace: string;
  description: string;
  example: string | null;
  schema_def: Record<string, unknown>;
  rrf_score: number;
}

export interface RetrievedChunk {
  id: string;
  source_id: string;
  doc_type: string;
  title: string | null;
  content: string;
  url: string | null;
  tags: string[];
  rrf_score: number;
}

/**
 * Retrieve the most relevant tools for a query using hybrid search (vector + BM25 + RRF).
 */
export async function retrieveTools(
  query: string,
  { namespace, limit = 6 }: { namespace?: string; limit?: number } = {}
): Promise<RetrievedTool[]> {
  const embedding = await embedText(query);

  const { data, error } = await supabaseAdmin.rpc("retrieve_tools", {
    query_embedding: JSON.stringify(embedding),
    query_text: query,
    ns: namespace ?? null,
    match_limit: limit,
  });

  if (error) {
    console.error("[retrieval] tool RPC error:", error.message);
    return [];
  }
  return (data ?? []) as RetrievedTool[];
}

/**
 * Retrieve the most relevant KB chunks for a query using hybrid search.
 */
export async function retrieveKB(
  query: string,
  {
    docTypes,
    tags,
    limit = 4,
  }: { docTypes?: string[]; tags?: string[]; limit?: number } = {}
): Promise<RetrievedChunk[]> {
  const embedding = await embedText(query);

  const { data, error } = await supabaseAdmin.rpc("retrieve_kb", {
    query_embedding: JSON.stringify(embedding),
    query_text: query,
    doc_types: docTypes ?? null,
    tag_filter: tags ?? null,
    match_limit: limit,
  });

  if (error) {
    console.error("[retrieval] KB RPC error:", error.message);
    return [];
  }
  return (data ?? []) as RetrievedChunk[];
}

/** Log what was retrieved for monitoring / eval */
export async function logRetrieval(params: {
  sessionId?: string;
  userId?: string | null;
  queryText: string;
  intent?: string;
  toolIds?: string[];
  chunkIds?: string[];
  model?: string;
}): Promise<void> {
  try {
    await supabaseAdmin.from("ai_retrieval_log").insert({
      session_id: params.sessionId ?? null,
      user_id: params.userId ?? null,
      query_text: params.queryText,
      intent: params.intent ?? null,
      retrieved_tool_ids: params.toolIds ?? [],
      retrieved_chunk_ids: params.chunkIds ?? [],
      model: params.model ?? null,
    });
  } catch { /* non-critical */ }
}
