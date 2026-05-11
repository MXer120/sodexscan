import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { generateText, streamText, type CoreMessage } from "ai";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseServer";
import { SYSTEM_PROMPT as SYSTEM_PROMPT_FALLBACK } from "@/app/lib/ai/system-prompt";

async function getSystemPrompt(): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from("ai_config").select("value").eq("key", "system_prompt").single();
    return data?.value || SYSTEM_PROMPT_FALLBACK;
  } catch { return SYSTEM_PROMPT_FALLBACK; }
}
import { parseToolCalls, executeTools, formatToolResults, stripToolTags } from "@/app/lib/ai/tool-executor";
import { autoSeedIfEmpty } from "@/app/lib/ai/auto-seed";
import { buildSystemPrompt, getUserContext, logUsage } from "@/app/lib/ai/user-context";
import { routeIntent } from "@/app/lib/ai/intent-router";
import { retrieveTools, retrieveKB, logRetrieval } from "@/app/lib/ai/retrieval";
import { packContext } from "@/app/lib/ai/context-packer";
import {
  checkRateLimit,
  getUserRole,
  resolveIdentifier,
  resolveRole,
} from "@/app/lib/ai/rate-limit";

// ── Model registry ─────────────────────────────────────────────────────────────
const GOOGLE_MODELS = new Set([
  "gemini-2.5-flash","gemini-2.5-pro",
  "gemini-2.0-flash","gemini-2.0-flash-lite",
]);
const GROQ_MODELS = new Set([
  "llama-3.3-70b-versatile",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3-32b",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
]);
const DEFAULT_MODEL = "communityscan";
const MAX_HISTORY   = 30;

// ── Groq key pool ──────────────────────────────────────────────────────────────
function getGroqKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY);
  for (let i = 2; i <= 10; i++) { const k = process.env[`GROQ_API_KEY_${i}`]; if (k) keys.push(k); }
  return keys;
}

function isQuotaError(e: unknown): boolean {
  const s = ((e as Record<string,unknown>)?.statusCode as number) ?? 0;
  const m = e instanceof Error ? e.message : String(e);
  return s === 429 || m.includes("quota") || m.includes("RESOURCE_EXHAUSTED") || m.includes("rate limit") || m.includes("429");
}

// ── CommunityScan slot list ────────────────────────────────────────────────────
// Builds the priority-ordered list of {label, model} to try.
// User keys (if provided) are tried first; then platform keys.
interface CSSlot { label: string; model: ReturnType<typeof resolveModel> }

function buildCSSlots(userGroqKey?: string, userGoogleKey?: string): CSSlot[] {
  const slots: CSSlot[] = [];

  // User-provided Google key — highest priority
  if (userGoogleKey) {
    const g = createGoogleGenerativeAI({ apiKey: userGoogleKey });
    slots.push({ label: "user-google/gemini-2.5-flash", model: g("gemini-2.5-flash") });
    slots.push({ label: "user-google/gemini-2.0-flash", model: g("gemini-2.0-flash") });
  }

  // Platform Google key
  const gKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (gKey) {
    const g = createGoogleGenerativeAI({ apiKey: gKey });
    slots.push({ label: "gemini-2.5-flash", model: g("gemini-2.5-flash") });
    slots.push({ label: "gemini-2.0-flash", model: g("gemini-2.0-flash") });
  }

  // User-provided Groq key
  if (userGroqKey) {
    for (const modelId of ["llama-3.3-70b-versatile", "meta-llama/llama-4-scout-17b-16e-instruct"]) {
      slots.push({ label: `user-groq/${modelId}`, model: createGroq({ apiKey: userGroqKey })(modelId) });
    }
  }

  // Platform Groq keys
  const groqModels = [
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "qwen/qwen3-32b",
    "openai/gpt-oss-20b",
    "llama-3.1-8b-instant",
  ];
  const groqKeys = getGroqKeys();
  for (const modelId of groqModels) {
    for (const key of groqKeys) {
      slots.push({ label: `${modelId}/…${key.slice(-6)}`, model: createGroq({ apiKey: key })(modelId) });
    }
  }
  return slots;
}

// Cursor advances across requests so load is spread
let _csIdx = 0;

// Extract the actual retry-after seconds from a quota error, trying multiple SDK paths
function slotRetryAfter(e: unknown): number {
  const err = e as Record<string, unknown>;
  const h = (err?.responseHeaders ?? err?.headers) as Record<string,string> | undefined;
  if (h?.["retry-after"]) { const n = parseFloat(h["retry-after"]); if (!isNaN(n) && n > 0) return Math.ceil(n); }
  if (typeof err?.responseBody === "string") {
    try {
      const b = JSON.parse(err.responseBody as string);
      const ra = b?.error?.retry_after ?? b?.retry_after;
      if (ra) { const n = parseFloat(String(ra)); if (!isNaN(n) && n > 0) return Math.ceil(n); }
    } catch {}
  }
  return 0; // unknown
}

function exhaustedError(minRetry: number) {
  return Object.assign(
    new Error("All CommunityScan slots exhausted — quota reached"),
    { retryAfter: minRetry > 0 ? minRetry : 60 }
  );
}

async function communityScanGenerate(
  opts: Omit<Parameters<typeof generateText>[0], "model">,
  userGroqKey?: string,
  userGoogleKey?: string,
): Promise<Awaited<ReturnType<typeof generateText>>> {
  const slots = buildCSSlots(userGroqKey, userGoogleKey);
  if (!slots.length) throw new Error("No API keys configured");
  const start = _csIdx;
  let minRetry = 0;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[(start + i) % slots.length];
    try {
      const result = await generateText({ model: slot.model, maxRetries: 0, ...opts });
      _csIdx = (start + i + 1) % slots.length;
      console.log(`[cs:gen] ${slot.label}`);
      return result;
    } catch (e) {
      if (isQuotaError(e)) {
        const ra = slotRetryAfter(e);
        if (ra > 0 && (minRetry === 0 || ra < minRetry)) minRetry = ra;
        console.log(`[cs:gen] quota on ${slot.label}${ra ? ` (retry ${ra}s)` : ""}, next`);
        continue;
      }
      throw e;
    }
  }
  throw exhaustedError(minRetry);
}

async function communityScanStream(
  opts: Omit<Parameters<typeof streamText>[0], "model">,
  userGroqKey?: string,
  userGoogleKey?: string,
): Promise<ReturnType<typeof streamText>> {
  const slots = buildCSSlots(userGroqKey, userGoogleKey);
  if (!slots.length) throw new Error("No API keys configured");
  const start = _csIdx;
  let minRetry = 0;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[(start + i) % slots.length];
    try {
      const result = await streamText({ model: slot.model, maxRetries: 0, ...opts });
      _csIdx = (start + i + 1) % slots.length;
      console.log(`[cs:stream] ${slot.label}`);
      return result;
    } catch (e) {
      if (isQuotaError(e)) {
        const ra = slotRetryAfter(e);
        if (ra > 0 && (minRetry === 0 || ra < minRetry)) minRetry = ra;
        console.log(`[cs:stream] quota on ${slot.label}${ra ? ` (retry ${ra}s)` : ""}, next`);
        continue;
      }
      throw e;
    }
  }
  throw exhaustedError(minRetry);
}

function resolveModel(id: string) {
  const modelId = GOOGLE_MODELS.has(id) || GROQ_MODELS.has(id) ? id : "llama-3.3-70b-versatile";
  if (GOOGLE_MODELS.has(modelId)) {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
    return createGoogleGenerativeAI({ apiKey: key })(modelId);
  }
  const keys = getGroqKeys();
  if (!keys.length) throw new Error("GROQ_API_KEY not configured");
  return createGroq({ apiKey: keys[0] })(modelId);
}

function textToDataStream(text: string): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream({ start(c) {
    if (text) c.enqueue(enc.encode(`0:${JSON.stringify(text)}\n`));
    c.enqueue(enc.encode(`d:${JSON.stringify({finishReason:"stop",usage:{promptTokens:0,completionTokens:0}})}\n`));
    c.close();
  }});
  return new Response(stream, { headers: { "Content-Type":"text/plain; charset=utf-8","X-Vercel-AI-Data-Stream":"v1" }});
}

// ── POST /api/chat ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {

  // ── Auth — Bearer token from Authorization header (localStorage-based auth) ─
  const token = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return new Response("Sign in to use CommunityScan AI.", { status: 401 });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return new Response("Sign in to use CommunityScan AI.", { status: 401 });

  // User-provided keys forwarded from localStorage — never logged or stored
  const userGroqKey   = req.headers.get("X-User-Groq-Key")   || undefined;
  const userGoogleKey = req.headers.get("X-User-Google-Key") || undefined;

  const [profileRole, userCtx, systemPrompt] = await Promise.all([
    getUserRole(user.id),
    getUserContext(user.id),
    getSystemPrompt(),
  ]);
  const role = resolveRole(profileRole, true);

  // ── Rate limit (owners are unlimited and bypass this check entirely) ───────
  const identifier = resolveIdentifier(user.id, req);
  const { allowed, retryAfter } = await checkRateLimit(identifier, role);
  if (!allowed) {
    const limits: Record<string,string> = { mod:"100/min·2000/day", user:"20/min·200/day" };
    return new Response(`Rate limit exceeded (${limits[role]??"unknown"}). Retry in ${retryAfter}s.`,
      { status:429, headers:{"Retry-After":String(retryAfter)} });
  }

  // ── Parse + validate ───────────────────────────────────────────────────────
  let body: { messages?:unknown; modelId?:unknown; includeFullHistory?:unknown; usePersonalKB?:unknown };
  try { body = await req.json(); } catch { return new Response("Invalid JSON",{status:400}); }

  const { messages, modelId, includeFullHistory, usePersonalKB } = body;
  if (!Array.isArray(messages) || messages.length === 0)
    return new Response("messages required",{status:400});

  for (const m of messages) {
    if (typeof m!=="object"||m===null) return new Response("Bad message",{status:400});
    const msg = m as Record<string,unknown>;
    if (!["user","assistant","system","tool"].includes(msg.role as string))
      return new Response("Bad message role",{status:400});
    if (typeof msg.content!=="string"&&!Array.isArray(msg.content))
      return new Response("Bad message content",{status:400});
    if (typeof msg.content==="string"&&msg.content.length>8000)
      return new Response("Message too long",{status:400});
  }

  const histLimit = includeFullHistory===true ? MAX_HISTORY : 10;
  const contextMessages = (messages as unknown[]).slice(-histLimit) as CoreMessage[];

  // ── Model ──────────────────────────────────────────────────────────────────
  const requestedId = typeof modelId==="string" ? modelId : DEFAULT_MODEL;
  const isCS     = requestedId === "communityscan";
  const isGoogle = GOOGLE_MODELS.has(requestedId);
  let model: ReturnType<typeof resolveModel> | null = null;
  if (!isCS) {
    try { model = resolveModel(requestedId); }
    catch (e) { return new Response(`${e instanceof Error?e.message:"Model unavailable"}. Add API key to .env.local.`,{status:503}); }
  }

  // ── Lazy seed: embed tools + KB on first ever request if DB is empty ──────
  void autoSeedIfEmpty();

  // ── Retrieval: intent → tools + KB ────────────────────────────────────────
  const lastUserMsg = [...contextMessages].reverse().find(m=>m.role==="user");
  const lastText = typeof lastUserMsg?.content==="string" ? lastUserMsg.content : "";

  let dynamicContext = "";
  let retrievedToolIds: string[] = [];
  let retrievedChunkIds: string[] = [];
  let intent = "chat";

  try {
    const { needsTools, needsKB, toolQuery, kbQuery } = await routeIntent(lastText);
    intent = [needsTools?"tools":"", needsKB?"kb":""].filter(Boolean).join("+") || "chat";

    const [tools, chunks] = await Promise.all([
      needsTools ? retrieveTools(toolQuery, { limit: 6 }) : Promise.resolve([]),
      needsKB    ? retrieveKB(kbQuery, { limit: 4 })     : Promise.resolve([]),
    ]);

    retrievedToolIds  = tools.map(t=>t.id);
    retrievedChunkIds = chunks.map(c=>c.id);

    dynamicContext = packContext(tools, chunks, 3000);
    console.log(`[chat] intent=${intent} tools=[${retrievedToolIds.join(",")}] kb=${chunks.length}chunks`);
  } catch (e) {
    console.warn("[chat] retrieval failed, falling back to no context:", e instanceof Error ? e.message : e);
  }

  // Log retrieval asynchronously
  void logRetrieval({
    userId: user?.id ?? null,
    queryText: lastText,
    intent,
    toolIds: retrievedToolIds,
    chunkIds: retrievedChunkIds,
    model: requestedId,
  });

  // ── Personal KB: inject user's own entries when requested ─────────────────
  let personalKBContext = "";
  if (usePersonalKB === true && user?.id) {
    const { data: personal } = await supabaseAdmin
      .from("kb_user_entries")
      .select("title, content, category")
      .eq("user_id", user.id)
      .order("category").order("created_at", { ascending: false })
      .limit(40);
    if (personal && personal.length > 0) {
      personalKBContext = "\n\n## Your personal knowledge base\nThe following entries are from the user's personal KB. Use these preferentially over the shared knowledge.\n"
        + (personal as {title:string;content:string;category:string}[])
            .map(e => `### ${e.title} (${e.category})\n${e.content}`)
            .join("\n\n");
    }
  }

  // ── Build system prompt: persona + user context + retrieved context ─────────
  const baseSystem = buildSystemPrompt(systemPrompt, userCtx);
  const fullSystem = [baseSystem, dynamicContext, personalKBContext]
    .filter(Boolean).join("\n\n");

  const baseOpts = {
    system: fullSystem,
    maxTokens: 2000,
    temperature: 0.3,
    abortSignal: req.signal,
  };

  async function callGenerate(msgs: CoreMessage[]) {
    const opts = { ...baseOpts, messages: msgs };
    if (isCS) return communityScanGenerate(opts, userGroqKey, userGoogleKey);
    try { return await generateText({ model: model!, maxRetries: isGoogle?0:1, ...opts }); }
    catch (e) {
      if (isGoogle && isQuotaError(e)) return communityScanGenerate(opts, userGroqKey, userGoogleKey);
      throw e;
    }
  }

  async function callStream(msgs: CoreMessage[], extraSystem?: string) {
    const sys = extraSystem ? `${fullSystem}\n\n${extraSystem}` : fullSystem;
    const opts = { ...baseOpts, system: sys, messages: msgs };
    if (isCS) return communityScanStream(opts, userGroqKey, userGoogleKey);
    try { return await streamText({ model: model!, maxRetries: isGoogle?0:1, ...opts }); }
    catch (e) {
      if (isGoogle && isQuotaError(e)) return communityScanStream(opts, userGroqKey, userGoogleKey);
      throw e;
    }
  }

  // ── Two-pass tool execution ────────────────────────────────────────────────
  try {
    const { text: firstText, usage: u1, finishReason: r1 } = await callGenerate(contextMessages);

    const toolCalls = parseToolCalls(firstText);

    if (toolCalls.length === 0) {
      const total = (u1?.promptTokens??0)+(u1?.completionTokens??0);
      console.log(`[chat] pass=1 no-tools reason=${r1} tokens=${total}`);
      void logUsage({ userId:user?.id??null, model:requestedId, promptTokens:u1?.promptTokens??0, completionTokens:u1?.completionTokens??0, totalTokens:total, finishReason:r1 });
      return textToDataStream(stripToolTags(firstText));
    }

    console.log(`[chat] pass=1 tools=[${toolCalls.map(t=>t.name).join(",")}]`);
    const toolResults = await executeTools(toolCalls, { user: user ?? null });

    const secondMessages: CoreMessage[] = [
      ...contextMessages,
      { role:"assistant", content: firstText },
      { role:"user",      content: formatToolResults(toolResults) },
    ];

    const result = await callStream(
      secondMessages,
      "Tool results provided above. Give your final answer. Do NOT emit [TOOL:...] tags."
    );

    return result.toDataStreamResponse({
      getErrorMessage: (e) => e instanceof Error ? e.message : "AI error",
    });

  } catch (e) {
    console.error("[chat]", e);
    const msg = e instanceof Error ? e.message : String(e);
    const status = ((e as Record<string,unknown>)?.statusCode as number) ?? 0;
    if (status===401||msg.includes("API key")) return new Response("Invalid API key.",{status:502});
    if (isQuotaError(e)) {
      // Use retryAfter attached by exhaustedError(), or fall back to slotRetryAfter()
      const attached = (e as { retryAfter?: number }).retryAfter;
      const retryAfter = attached ?? slotRetryAfter(e) || 60;
      return new Response(`Quota exceeded for "${requestedId}". Retry in ${retryAfter}s.`,{status:429,headers:{"Retry-After":String(retryAfter)}});
    }
    return new Response(msg||"AI error. Please try again.",{status:502});
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
