import type { RetrievedTool, RetrievedChunk } from "./retrieval";

const CHARS_PER_TOKEN = 4; // rough approximation

function countTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Build the dynamic portion of the system prompt from retrieved tools and KB chunks.
 * Respects a token budget — tools are prioritised over KB chunks.
 */
export function packContext(
  tools: RetrievedTool[],
  chunks: RetrievedChunk[],
  tokenBudget = 3000
): string {
  const sections: string[] = [];
  let used = 0;

  // ── Tools ──────────────────────────────────────────────────────────────────
  if (tools.length > 0) {
    const toolLines: string[] = [];
    for (const t of tools) {
      const line = t.example
        ? `${t.example}\n${t.description}`
        : `[TOOL:${t.id}:${JSON.stringify(Object.fromEntries(
            Object.entries(t.schema_def?.properties ?? {}).map(([k, v]) => [
              k, (v as Record<string, string>).type ?? "string",
            ])
          ))}]\n${t.description}`;

      if (used + countTokens(line) > tokenBudget * 0.6) break; // tools get 60% of budget max
      toolLines.push(line);
      used += countTokens(line);
    }
    if (toolLines.length > 0) {
      sections.push("## Available tools\n" + toolLines.join("\n\n"));
    }
  }

  // ── KB chunks ──────────────────────────────────────────────────────────────
  if (chunks.length > 0) {
    const kbLines: string[] = [];
    for (const c of chunks) {
      const header = c.title ? `### ${c.title}` : `### ${c.source_id}`;
      const block = `${header}\n${c.content}`;
      if (used + countTokens(block) > tokenBudget) break;
      kbLines.push(block);
      used += countTokens(block);
    }
    if (kbLines.length > 0) {
      sections.push("## Relevant platform knowledge\n" + kbLines.join("\n\n"));
    }
  }

  return sections.join("\n\n");
}
