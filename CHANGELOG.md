# Changelog

---

## W3



---

## W2



---

## W1 — Current state  ·  Jan 21 – May 12, 2026

### Platform

**Scanner** — real-time wallet tracker. Search any address to see open positions, PnL, trade history, funding, and spot activity. Tier 1/Tier 2 data loading for fast time-to-first-data. Mobile-responsive with sticky headers, asset view, and live realtime updates.

**Dashboard** — main landing page with a customisable grid layout, portfolio overview, and live market widgets.

**Watchlist** — save favourite wallets with custom tags. Accessible to logged-in users. Marked as prototype.

**Alerts** — 15 alert types across 5 categories (price threshold, wallet event, etc.) with Telegram bot delivery. Marked as prototype.

**Copy Trade** — early prototype UI for following top wallets. Marked as prototype, may be significantly reworked.

**Reports** — futures tax report wizard: wallet input, period selection, tax jurisdiction, fee deduction, CSV/PDF export. Marked as prototype.

**Aggregator** — drag-and-drop multi-widget dashboard. Marked as prototype.

**Reverse Search** — search by address fragment or referral code.

**Roadmap** — public feature roadmap with W1/W2/W3/Demo phases, status badges, and detail panel.

**Tools** — browsable catalog of on-chain and DeFi tools. Publicly accessible without login at `/tools` and within the AI interface at `/ai?view=tools`.

**Workflow** — workflow builder page (early UI, not fully wired).

> Pages removed from sidebar navigation: Leaderboard (`/mainnet`), SoPoints (`/sopoints`), Platform (`/platform`), Design System (`/design-system`). These redirect to home. Leaderboard data remains accessible via Scanner and AI tool calls.

---

### Authentication & access

- Email/password + Google OAuth via Supabase Auth
- Session context (`SessionContext`) shared across the entire app via `onAuthStateChange`
- Sidebar footer: shows real user email + working logout when logged in; "Sign In" button when logged out
- Auth modal triggered globally via `openAuthModal()` or the `openAuthModal` window event
- `/ai` requires login — anonymous visitors see a sign-in prompt
- `/profile` requires login — shows sign-in prompt for anonymous visitors
- Most pages (Scanner, Tools, Roadmap, Dashboard, etc.) are fully public
- Middleware passes all traffic through — maintenance gate disabled

---

### CommunityScan AI

Full AI chat interface at `/ai`. Requires login.

**Models** — CommunityScan (default), Groq (Llama 3.3 70B, Llama 4 Scout 17B, Qwen 3 32B, GPT OSS 20B, Llama 3.1 8B), Google Gemini (2.5 Flash, 2.5 Pro, 2.0 Flash, 2.0 Flash Lite). Switchable per conversation. Per-model rate limiting with an "Add API key" shortcut shown on limit or error.

**Live data blocks** — structured response cards embedded inline:
- ETF inflows: composed chart, green inflows, cumulative calc, IBIT/FBTC comparison
- Top traders: live Sodex leaderboard with win rates and sparklines
- Referral stats: resolves a referral code to a wallet and shows PnL history
- PnL chart: wallet 30-day history
- Copyable wallet addresses

**System prompt** — non-prescriptive prompt shaping response style and tool availability. Reduces hallucination.

**Knowledge Base** — shared platform KB plus personal notes. Content embedded with Google Gemini embeddings and retrieved via vector similarity. Users can suggest edits (reviewed before going live).

**Chat history** — conversations saved per user, searchable with omnisearch in the AI sidebar.

**Plan tracker** — top-right overlay during AI responses showing tool execution steps (running / done / warning / failed) live as they stream.

**Queue & stop** — additional messages queue while AI is responding; stop button cancels the current stream.

**Scheduling** — configure one-off or recurring AI queries (daily/weekly/custom) with Telegram or Discord delivery. Currently a preview — schedules are not yet executed.

**Example responses** — "View full example response" button appears in the error state only when the user's last message was one of the known example prompts (ETF inflows, Top Traders, Referral). Not shown for arbitrary queries.

**Google key pool rotation** — up to 10 Google API keys (`GOOGLE_GENERATIVE_AI_API_KEY_2..10`) rotated automatically under quota.

---

### Infrastructure & DB

- Supabase PostgreSQL with Row Level Security on all tables
- 52 security linter warnings resolved; search_path locked on all functions
- RLS enabled on `ai_rate_limit_log` and all internal infra tables
- Egress optimisation: Sodex LB and wallet responses cached; cron frequency reduced
- pg_cron jobs: hourly Sodex LB sync, weekly export to GitHub for historical preservation, daily reindex at 04:00 UTC
- Leaderboard bloat fixed (262 MB → 27 MB via vacuum and reindex); no-op upsert suppressed with BEFORE UPDATE trigger
- Vercel Web Analytics + Speed Insights integrated
