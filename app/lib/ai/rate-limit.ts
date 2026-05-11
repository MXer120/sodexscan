import { supabaseAdmin } from "@/app/lib/supabaseServer";

export type UserRole = "owner" | "mod" | "buildathon" | "user" | "anon";

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number; // seconds; 0 when allowed
}

/** Resolve the rate-limit tier from the profile role + auth state. */
export function resolveRole(profileRole: string | null, isAuthenticated: boolean): UserRole {
  if (profileRole === "owner") return "owner";
  if (profileRole === "mod") return "mod";
  if (profileRole === "buildathon") return "buildathon";
  if (isAuthenticated) return "user";
  return "anon";
}

/**
 * Check rate limit.
 * Owners are never limited — we skip the DB call entirely.
 * Everyone else is checked against per-minute + per-day counters via RPC.
 *
 * Limits:
 *   mod        → 100 / min, 2 000 / day
 *   buildathon →  60 / min,   600 / day  (3× user)
 *   user       →  20 / min,   200 / day
 *   anon       →   5 / min,    20 / day
 */
export async function checkRateLimit(
  identifier: string,
  role: UserRole
): Promise<RateLimitResult> {
  if (role === "owner") return { allowed: true, retryAfter: 0 };

  const { data, error } = await supabaseAdmin.rpc("check_ai_rate_limit", {
    p_identifier: identifier,
    p_role: role,
  });

  if (error) {
    console.warn("[rate-limit] RPC error, failing open:", error.message);
    return { allowed: true, retryAfter: 0 };
  }

  const row = (data as { allowed: boolean; retry_after: number }[] | null)?.[0];
  return {
    allowed: row?.allowed ?? true,
    retryAfter: row?.retry_after ?? 0,
  };
}

/** Look up the user's role from profiles. Returns null if not found. */
export async function getUserRole(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return (data?.role as string) ?? null;
}

/** Stable rate-limit key — user ID if authed, else first IP from forwarded header. */
export function resolveIdentifier(userId: string | undefined, req: Request): string {
  if (userId) return `user:${userId}`;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "anon";
  return `ip:${ip}`;
}
