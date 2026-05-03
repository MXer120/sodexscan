import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embedMany, embed } from "ai";

function googleEmbedder() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
  // gemini-embedding-2 supports outputDimensionality=768, matching the pgvector schema
  return createGoogleGenerativeAI({ apiKey: key }).textEmbeddingModel(
    "gemini-embedding-2",
    { outputDimensionality: 768 }
  );
}

/** Embed a single string. Returns a 768-dim float array. */
export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: googleEmbedder(), value: text });
  return embedding;
}

/** Embed multiple strings in one batched call. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({ model: googleEmbedder(), values: texts });
  return embeddings;
}

/** Format a float array as a pgvector literal: [0.1,0.2,...] */
export function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
