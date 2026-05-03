/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Auto-seeds ai_tools and kb_chunks if the tables are empty.
 * Requires GOOGLE_GENERATIVE_AI_API_KEY to generate embeddings.
 */
export async function register() {
  // Only run in the Node.js runtime (not Edge), and only on the server
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { autoSeedIfEmpty } = await import("@/app/lib/ai/auto-seed");
    await autoSeedIfEmpty();
  } catch (e) {
    // Non-fatal — app still works, just without retrieval until fixed
    console.error("[instrumentation] AI seed failed:", e instanceof Error ? e.message : e);
  }
}
