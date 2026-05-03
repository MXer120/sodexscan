import { supabaseAdmin } from "@/app/lib/supabaseServer";

export interface UserContext {
  wallet: string | null;
}

export async function getUserContext(userId: string): Promise<UserContext> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("own_wallet")
    .eq("id", userId)
    .single();
  return { wallet: data?.own_wallet ?? null };
}

export function buildSystemPrompt(base: string, ctx: UserContext | null): string {
  if (!ctx?.wallet) return base;
  return (
    base +
    `\n\n## Current user's wallet\n${ctx.wallet}\nWhen the user says "my wallet", "my balance", "my positions", "my trades", etc. — use this address automatically without asking.`
  );
}

export async function logUsage(params: {
  userId: string | null;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string;
}): Promise<void> {
  try {
    await supabaseAdmin.from("ai_usage_log").insert({
      user_id: params.userId,
      model: params.model,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.totalTokens,
      finish_reason: params.finishReason,
    });
  } catch {
    // non-critical — don't let logging failures break the response
  }
}
