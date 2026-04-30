# CommunityScan / SoDEX — Detailed Feature Specs

Companion to [buildathon-roadmap.md](./buildathon-roadmap.md). This doc is the **build bible** — every approved feature fully planned, followed by the concrete wave-by-wave implementation order.

Dropped from consideration per latest call: monetization, developer platform (public API), moonshots (V), most of UX/a11y/i18n (kept: skeleton/errors/empty-states + timezone + notification prefs), most of growth (kept: onboarding wizard only), on-chain execution (no write path). Security work is scoped to the copy-trading surface only.

**Legend** — Wave tags: `W1` (May 1–12), `W2` (May 18–29), `W3` (Jun 4–15), `Post` (after buildathon). Effort: `S` ≤ 1 day, `M` 2–4 days, `L` ≥ 1 week.

---

## Part 1 — Foundations

### F0.1 `DataSource` abstraction (reads only)
**Wave:** W1 · **Effort:** M · **Blocks:** every alert/agent/brief/chart feature after it

**Problem:** Today the app queries SoDEX directly in a dozen places. The moment we want "SoSoValue as alert source," "CoinGecko as fallback price," or "ask the agent to compare two sources," we'll be writing one-off glue. We need one adapter pattern.

**Interface (TypeScript sketch):**
```ts
// app/lib/data-sources/types.ts
export interface DataSource {
  id: 'sodex' | 'sosovalue' | 'coingecko' | 'defillama' | 'cryptopanic' | ...;
  name: string;
  capabilities: Capability[];

  getPrice?(symbol: string, kind?: 'mark' | 'mid' | 'bid' | 'ask' | 'ref'): Promise<PricePoint>;
  getOHLC?(symbol: string, tf: '1m'|'5m'|'15m'|'1h'|'4h'|'1d', from: Date, to: Date): Promise<Candle[]>;
  getETFFlows?(asset: 'BTC'|'ETH', window: '1d'|'7d'|'30d'): Promise<ETFFlows>;
  getNews?(symbol?: string, since?: Date): Promise<NewsItem[]>;
  getFundingRate?(symbol: string): Promise<FundingPoint>;
  getOpenInterest?(symbol: string): Promise<OIPoint>;
  getOnChainTx?(address: string, since?: Date): Promise<OnChainTx[]>;
  getTVL?(protocol: string): Promise<TVLPoint>;
  getFearGreed?(): Promise<number>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number; lastSuccess: Date }>;
}
```

**Implementation:**
- `app/lib/data-sources/` folder, one file per source.
- `SoDEX`, `SoSoValue`, `CoinGecko`, `Alternative`, `CryptoPanic` in W1 (only the methods they need).
- Each source also populates a `sources` row in `source_health` every 60s (O1.3 below).
- Server-only. Never import from client — access via `/api/data/*` routes that we add per capability.

**Registry helper:**
```ts
// Always returns the best source for a capability, with fallback order
export function pickSource(capability: Capability): DataSource;
```

**DB additions:**
- `source_health(source_id, checked_at, ok, latency_ms, error)` — rolling table, 7-day TTL.
- `user_source_preferences(user_id, capability, primary_source, fallback_sources[])` — filled in by F0.3.

**Acceptance:** Alert cron, Morning Brief, and Research Dashboard all consume sources via `pickSource()` rather than direct fetches.

---

### F0.2 Feature-flag system
**Wave:** W1 · **Effort:** S · **Blocks:** staged reveal of every W2/W3 feature

**Problem:** We want to ship ahead and reveal on schedule. Need both a global kill switch (per-env) and per-user allowlist.

**Data model:**
- `feature_flags(key, enabled_globally, allowed_user_ids[], allowed_roles[], created_at)` — single table.
- Seed rows: `agent_chat`, `morning_brief_custom`, `copytrade_follow`, `team_workspace`, `decision_layer`, `agent_tool_tax`, `agent_tool_xscraper`, … (one per wave-2/3 feature).

**Helpers:**
- Server: `hasFlag(userId, key)` → boolean, O(1) in-memory cached 30s.
- Client: `useFlag(key)` hook; pages gate renders with `<Gated flag="agent_chat">...</Gated>`.
- Admin UI at `/admin/flags` (N1 below): toggle global, add user to allowlist.

**Acceptance:** Flipping one flag removes a feature from the public UI and from Telegram command handlers consistently.

---

### F0.3 Multi-source settings (per-user)
**Wave:** W2 · **Effort:** S · **Depends on:** F0.1

**Problem:** Users want to choose "SoDEX mark" vs. "SoSoValue reference" vs. "CoinGecko" on a per-capability basis. This is the user-facing expression of `DataSource`.

**UI:** `Settings → Data sources` — one dropdown per capability (Price, News, ETF Flows, Funding, OI). Default = our recommendation. Show health badge next to each source.

**Consumed by:** Alerts (E1), Morning Brief, Research Dashboard, Decision Layer (D1), Agent tool calls.

---

### F0.4 `org_id` multi-tenant data model
**Wave:** W3 · **Effort:** M · **Blocks:** all of Part 8 (Teams)

**Problem:** Every user-scoped table today is keyed by `user_id`. Teams need the same data scoped by `org_id` with RLS policies. Retrofitting later is miserable; do the migration in W3 even if the UI ships post-buildathon.

**Migration plan:**
1. Add `organizations(id, slug, name, created_by, created_at)`.
2. Add `organization_members(org_id, user_id, role, joined_at)` where `role ∈ {owner, admin, analyst, dev, viewer}` (`dev` = internal/support role per latest ask).
3. Every user-owned table gets `org_id uuid` nullable; backfill with a "personal" org auto-created per user; set NOT NULL after.
4. Supabase RLS: "user can access row if row.org_id in (select org_id from organization_members where user_id = auth.uid())".
5. Helper `currentOrg(req)` → reads from a `x-current-org` header (set by the frontend org-switcher) and validates membership.
6. All API routes switch to `currentOrg()` instead of `currentUser()` for data scope.

**Tables touched (from repo):** alerts, alert_settings, watchlists, copytrade_follows, content_planner_*, portfolio_snapshots (if exists), agent_conversations (new).

**Acceptance:** A user with two orgs sees entirely different alert sets by switching; RLS blocks cross-org reads on direct Supabase queries.

---

### F0.5 `source_health` monitor widget
**Wave:** W3 · **Effort:** S · **Depends on:** F0.1

A small status widget on `/research` and in admin: three dots per configured source, colored by last `source_health.ok`. Click → drawer with 24h latency sparkline.

---

## Part 2 — Alerts (multi-condition + everything on top)

### AL1 Datasource switch on price alerts
**Wave:** W1 · **Effort:** S · **Depends on:** F0.1

**Mechanics:**
- Alert form adds a `source` dropdown: `SoDEX mark | SoDEX mid | SoDEX bid | SoDEX ask | SoSoValue ref | CoinGecko`.
- Alert rows get `source_id text not null default 'sodex:mark'`.
- `check-price-alerts` cron reads `alert.source_id`, calls `pickSource().getPrice(symbol, kind)`.
- Alert fires include the source in the notification ("BTC crossed $70k on SoSoValue ref").

**Migration:** `alter table alerts add column source_id text not null default 'sodex:mark';`

**Acceptance:** Two alerts on BTC with different sources can fire on the same price crossing or one can fire while the other doesn't (when sources diverge).

---

### AL2 Multi-condition alerts (AND / OR trees)
**Wave:** W2 · **Effort:** M

**User value:** "Notify me when BTC < $65k AND ETH funding > 0.05% AND fear < 25." A single alert, no juggling three.

**Model:**
- `alerts.condition jsonb` — rule tree of shape `{op: 'AND'|'OR', children: [Rule|Group]}` where `Rule = {metric, source_id, operator, value, window?}`.
- Supported metrics: price, funding, OI, ETF_flow, fear_greed, volume, pct_change.
- Evaluator: recursive function server-side, one pass per cron tick per alert.

**UI:** Rule builder component, drag-drop groups, live preview ("would have fired 3x in last 7d").

**Edge cases:**
- Partial data (one source stale) → skip, don't fire stale.
- Throttle: once fires, cool down for `cooldown_minutes` (per-alert field, default 60).

---

### AL3 Alert templates (library)
**Wave:** W2 · **Effort:** S

Pre-built presets users can one-click add:
- "Whale opens > $1M SoDEX position"
- "ETF net flow flips negative (24h)"
- "SoDEX mark vs. SoSoValue ref drifts > 50 bps"
- "Funding > 0.08% / 8h"
- "Fear < 20" / "Fear > 75"
- "Token I hold drops > 10% in 1h"

Stored in `alert_templates` table. Add-button clones into the user's `alerts` with editable config.

---

### AL4 Per-channel routing + notification prefs
**Wave:** W2 · **Effort:** S · **Depends on:** SET2

**Model:** `alerts.channels text[]` — subset of `{telegram, discord, email}`. Plus per-user default in `user_notification_prefs`.

**UI:** Per-alert toggle row with the channels the user has connected enabled.

---

### AL5 Rate-limiting / batched notifications
**Wave:** W2 · **Effort:** S

If > 5 alerts fire in a 60s window for the same user, aggregate into one Telegram message ("3 alerts fired: BTC < 65k, ETH funding > 0.05%, fear < 20"). Per-channel logic.

---

### AL6 Alert snoozing + quiet hours
**Wave:** W2 · **Effort:** S

- Per-alert: snooze 1h / 8h / 24h / until a date.
- Per-user: global quiet hours window (e.g. 23:00–07:00 local), alerts queue during window and fire as a single digest at window end.
- Both respect user timezone (SET1).

---

### AL7 Escalation policies
**Wave:** W3 · **Effort:** M

If critical alert not acknowledged in N minutes (user clicks "ack" link in TG / email), re-fire with louder tone + second channel. Max N re-fires.

**Use case:** user set "my BTC long liquidation-risk alert" — if they miss the TG ping, hit email too.

---

### AL8 Shareable alert link
**Wave:** W3 · **Effort:** S

One URL that preloads an alert config for a friend. `/alerts/new?from=<shareId>`. Share button on each alert → copies link.

---

### AL9 "Explain why" — AI context on fire
**Wave:** W2 · **Effort:** M · **Depends on:** AG0 (master agent)

When an alert fires, run a lightweight LLM call: "BTC alert fired because price crossed $70k. Context: ETF inflows were +$400M yesterday, fear 72, NASDAQ green." One-line AI line appended to notification.

Model tier: Haiku for speed. Max 150 tokens output.

---

### AL10 Alert history + realtime feed UI
**Wave:** W1 · **Effort:** S

Migrations `alert_history_realtime`, `alert_history_cleanup` are already in the repo. Just need the UI: reverse-chrono list on `/alerts/history`, Supabase realtime subscription for live tail.

---

## Part 3 — Morning Brief

### MB1 Morning Brief v1 (fixed 08:00 UTC)
**Wave:** W1 · **Effort:** M

**User value:** One daily Telegram message that starts the trading day. Zero config.

**Content (exact order):**
1. 3-line headline: date, market regime (risk-on/off), one sentence from AI.
2. Top 5 watched tokens: price, 24h %, spark-line via ASCII.
3. BTC & ETH ETF net flow (1d / 7d) from SoSoValue.
4. Fear & Greed (Alternative.me).
5. 3 top headlines (SoSoValue news + CryptoPanic fallback).
6. Button row: "Open dashboard" / "Change time" (gated until MB2).

**Cron:** new `morning-brief-fixed` cron, 08:00 UTC daily. Enqueues one job per user with TG connected and `brief_enabled=true`.

**Data model:**
- `brief_settings(user_id, enabled, schedule_hour_utc, schedule_minute_utc, timezone, channels text[])` — for MB1 hour/minute default to 08:00 and hidden.
- `brief_runs(id, user_id, run_at, status, payload jsonb, error)` — for debugging.

**Sources used:**
- SoDEX (prices for watchlist)
- SoSoValue (ETF flows, news)
- Alternative.me (F&G)
- CryptoPanic (news fallback)

**Implementation notes:**
- One LLM call per run (Haiku) to generate the 1-sentence headline, cached 6h per regime-state hash so brief is consistent across users.
- Use `sendMessage` markdownV2, escape `.`, `-`, `|`.

**Acceptance:** Fresh TG account receives a well-formatted brief within 60s of 08:00 UTC after linking.

---

### MB2 Morning Brief v2 (custom time + richer content)
**Wave:** W2 · **Effort:** M · **Depends on:** MB1, SET1

**Adds:**
- Per-user schedule hour/minute in **local** time (use SET1 timezone).
- Cron runs every 15 min; each tick checks which users have `local_time == current_local` in their tz.
- Optional per-user sections: "whale moves on my watchlist," "funding outliers," "AI hot take of the day."
- In-TG inline keyboard to toggle sections on/off.
- `/brief now` TG command to re-run on demand.

---

### MB3 Weekly & event briefs
**Wave:** Post · **Effort:** M

Weekly Sunday recap + ad-hoc event briefs (e.g., FOMC hours, CPI release) fired to subscribers.

---

## Part 4 — Research & Data Exploration

### RD1 `/research` hub
**Wave:** W1 · **Effort:** M · **Depends on:** F0.1

Page with four panels above the fold:
- **ETF Flow panel** — BTC + ETH daily net flow bars, 30d, SoSoValue-powered.
- **Regime card** — bull/bear/crab badge from a simple composite (price 50d/200d MA + F&G + funding).
- **News ticker** — last 10 items from SoSoValue + CryptoPanic, de-duped by URL.
- **F&G dial** — current + 7d sparkline.

Below: two secondary panels:
- **Opportunity Discovery** (re-branded LARP tile) — top 5 LARP-positive wallets with last trade.
- **"What changed overnight"** (MB v2 ships this section; in W1 show a static "available in W2" teaser if the time cost is too high).

---

### RD2 Per-asset deep-dive page
**Wave:** W2 · **Effort:** M

Route: `/asset/[symbol]`. All we know about one ticker:
- Price header with source selector (F0.3).
- Price chart with news annotations (MD pins clickable).
- Funding rate curve.
- OI over time.
- Top leaderboard wallets holding the asset.
- Recent whale transfers (Etherscan).
- Relevant SSI indices that include the asset.
- News list.

**DB:** no new tables; pure composition of existing sources.

---

### RD3 Whale ↔ ETF overlay chart
**Wave:** W2 · **Effort:** M

Dual-axis time series: left axis ETF net flow, right axis SoDEX whale net buying (|long - short| from leaderboard data). Story: "do on-chain whales move with or against ETF flows?"

---

### RD4 Decision Layer (Narralytica counter)
**Wave:** W2 · **Effort:** M

Page `/research/decision?asset=BTC`. User-tunable weighted composite:
- Metrics: ETF Trend, OI, Depth (order-book imbalance), Positioning (whale long/short), Funding, Breadth (% of top 50 above 50d MA), Fear/Greed, Price-vs-MA.
- Each metric has 3 states: positive / neutral / negative.
- Default weights mirror Narralytica for direct comparison; user can rebalance to 100%.
- Output: composite score -100 … +100 + a human sentence ("aligned bullish," "mixed — flows up, funding hot").
- Invalidation rules: show the metric state that would flip the score; "what would it take to go bearish?"
- Comes with 3 saved presets: `conservative`, `degen`, `institutional`.

---

### RD5 Correlations matrix
**Wave:** W2 · **Effort:** M

Rolling 30d Pearson correlation of price returns across user's watchlist. Heatmap. Hover cell → underlying series.

---

### RD6 Macro backdrop card
**Wave:** W2 · **Effort:** S

DXY, SPX, 10Y yield, gold. Free source: the common-APIs list (likely Stooq, Yahoo Finance unofficial, or Alpha Vantage free tier). Refresh every 15 min.

---

## Part 5 — AI Master Agent (the headline feature)

### AG0 Master Agent architecture
**Wave:** W2 · **Effort:** L · **Depends on:** F0.1, almost everything

**Vision (from latest user spec):**
> Give the agent ALL the tools on the website. Post a PnL image, a ref code, an X handle, a screenshot of an X account — say "find this guy." Agent uses reverse search, LARP, X scraper etc. Agent creates alerts, updates watchlist, extracts data, runs the scan page for you, does a tax report, checks incoming listings. When we add a strategy / analysis layer, it plugs in there too.

**Runtime:**
- Claude Sonnet 4.6 default (better reasoning, still cheap), Opus for deep dives if user enables, Haiku for fast ops like `/explain`.
- Anthropic SDK with tool-use. Server-side only (keys never touch client).
- Every turn logged to `agent_conversations(id, user_id, turn_no, role, content, tool_calls jsonb, tool_results jsonb, created_at)`.
- Rate limit: 30 turns/hour per user free tier. Track in `agent_usage`.

**Conversation surfaces:**
- Web: `/agent` chat page with streaming.
- Telegram: `/ask <question>` (one-shot) and `/chat` (enters a session, subsequent messages are conversation).
- Discord: `/ask` (Post — when we add Discord bot).

**Tool schema:** every tool declared with Anthropic-SDK-standard JSON schema, one file per tool under `app/lib/agent/tools/*.ts`, each exporting `{name, description, inputSchema, run(ctx, input)}`.

**Safety rails:**
- No tool is allowed to perform on-chain writes (execution is out of scope).
- Alert/watchlist mutations require user confirmation on first use of that tool in a session.
- All tool calls must cite sources in the final answer.
- 4-tool-call limit per turn (avoid runaway).

**Citations:** Every answer with a tool call appends a compact `Sources:` footer listing each tool call's output origin.

---

### AG0 tool catalog (each a feature)

Below each tool has its own mini-spec. The master agent composes them.

#### AT1 `wallet_scan` — run the scan page
**Wave:** W2 · **Effort:** M

Input: `{address: string}`.
Returns: rank, PnL, volume, top 3 pairs, last 5 trades, LARP score, associated labels. Wraps existing scan endpoints.

#### AT2 `larp_lookup` — LARP score + reasoning
**Wave:** W2 · **Effort:** S

Input: `{address: string}`. Returns LARP verdict + the features that drove it (we already have the detector).

#### AT3 `reverse_image_search` — find provenance of an image
**Wave:** W2 · **Effort:** M

Input: `{image_url: string}`.
Flow: POST to Google Vision Web Detection API *or* TinEye API → list of web pages where the image appears + similar images.
Use case: user uploads a PnL screenshot → agent finds the original tweet.

External: Google Vision (pay-per-call, tiny cost) or TinEye (free-tier limited). Fallback to SerpAPI Lens.

#### AT4 `x_scrape` — X/Twitter account + post scraper
**Wave:** W2 · **Effort:** L

Input: `{handle?: string, post_url?: string, query?: string}`.
Returns: profile bio, recent 20 posts, pinned, follower count, linked wallets found in bio/posts.

Implementation tiers (pick one):
- **a.** Official X API v2 ($100/mo basic) — cleanest.
- **b.** Scraper service (Apify `twitter-scraper`, or Bright Data) — cheap, unreliable.
- **c.** Nitter instance proxy — free, legally grey, flaky.

Decision: apply for X API via Buildathon form; fallback Apify if rejected. Cache responses 1h in `x_cache`.

#### AT5 `image_ocr` — extract text from an image
**Wave:** W2 · **Effort:** S

We already have `eng.traineddata` (Tesseract) committed. Route user-uploaded images through a server-side OCR handler; returns extracted text to the agent. Use case: screenshot of an X bio containing a ref code or wallet address.

#### AT6 `find_this_person` — composite identity lookup
**Wave:** W2 · **Effort:** M · **Depends on:** AT3, AT4, AT5, AT1, AT2

Input: any of `{image?: image, ref_code?: string, x_handle?: string, x_screenshot?: image}`.

Composed flow:
1. If image → OCR for text + reverse image search.
2. If ref_code → query our own `referrals` table → find owning user → associated wallets.
3. If x_handle → x_scrape; extract wallet addresses from bio/tweets.
4. Cross-reference candidate wallets with LARP and scan data.
5. Return ranked candidates with confidence + evidence.

**This is the flagship agent demo.** The W2 video should feature it.

#### AT7 `alert_crud` — create / update / delete alerts via chat
**Wave:** W2 · **Effort:** S · **Depends on:** AL1, AL2

`create_alert({condition, channels, source_id})`, `update_alert`, `delete_alert`. Always shows a confirm card in the chat UI before executing (client intercepts tool call, user hits ✓).

#### AT8 `watchlist_crud`
**Wave:** W2 · **Effort:** S

Same pattern: add/remove wallets or tokens, confirm before execute.

#### AT9 `portfolio_read`
**Wave:** W2 · **Effort:** S

Returns user's open SoDEX positions, PnL, and 30d history. Read-only. Used by Portfolio Doctor (AG1) and `/ask` questions about "how am I doing."

#### AT10 `tax_report` — generate tax CSV
**Wave:** W3 · **Effort:** M

Input: `{year: number, method: 'FIFO'|'LIFO'|'HIFO'}`.
Flow:
- Pull user's SoDEX trades + spot balances for year.
- Match buys→sells per method.
- Produce realized PnL per lot, aggregated by quarter + annual summary.
- Output CSV + one-page HTML summary.

**Explicitly not tax advice.** Disclaimer card shown first time.

#### AT11 `incoming_listings` — monitor newly added pairs
**Wave:** W2 · **Effort:** M

Cron every 5min diffs `sodex_pairs` against last snapshot. New pairs dropped into `incoming_listings`. Tool returns last N with metadata (first-hour volume, first trades).

Agent use: "any hot new listings today?" → returns ranked list with a one-liner each.

#### AT12 `news_search` — semantic news query
**Wave:** W2 · **Effort:** M · **Depends on:** DI5 (embeddings)

Input: `{query, since?, tokens?}`. Runs against a vector index of SoSoValue + CryptoPanic news. Returns top 10 with scores.

#### AT13 `onchain_context` — Etherscan-backed tx lookups
**Wave:** W2 · **Effort:** S

Input: `{address, since?}`. Returns last 20 txs, contract interactions, token approvals, net flow by token.

#### AT14 `defi_tvl` — DefiLlama
**Wave:** W2 · **Effort:** S

Input: `{protocol}`. Returns TVL timeline + peer comparison.

#### AT15 `social_sentiment` — LunarCrush / Santiment
**Wave:** W3 · **Effort:** M

Input: `{symbol, window}`. Returns social volume, sentiment score, top posters.

#### AT16 `sosovalue_api` — raw SoSoValue passthrough
**Wave:** W2 · **Effort:** S

Catch-all tool for SoSoValue endpoints the agent might need that aren't covered by specific tools. Restricted to whitelisted endpoints.

#### AT17 `strategy_backtest` — run a strategy on history
**Wave:** W3 · **Effort:** L · **Depends on:** ST1 below

Input: a strategy spec (see ST1). Returns backtest PnL curve, Sharpe, max DD.

#### AT18 `copy_trade_plan` — plan a copy-trade follow
**Wave:** W3 · **Effort:** M · **Depends on:** CT2

Input: `{leader_wallet, size_cap, pairs_filter?}`. Returns a "follow plan": sizing, expected exposure, worst-case drawdown based on leader's past.

**No execution.** Output is a plan the user can later act on manually.

---

### AG1 Portfolio Doctor
**Wave:** W3 · **Effort:** M · **Depends on:** AG0, AT9

Weekly scheduled agent run: reviews open positions, flags concentration risk, correlation clusters, drawdown vs. benchmark, stale unmanaged positions.

Output: a narrated TG message + archived `portfolio_reports(user_id, ran_at, report_md, highlights jsonb)`.

---

### AG2 `/explain <symbol>` one-shot
**Wave:** W2 · **Effort:** S · **Depends on:** AG0

Haiku-tier fast answer: 3 bullets (price+flow, news, on-chain). Sub-3-second target.

---

### AG3 `/chart <symbol> <tf>`
**Wave:** W2 · **Effort:** M

Node-canvas chart rendering. Price line + news pins. Returns PNG to TG / inline on web chat.

---

### AG4 Agent timeline / conversation history
**Wave:** W3 · **Effort:** S · **Depends on:** AG0

UI page `/agent/history` — every turn the agent ever took for this user, searchable. Each answer is permalinkable.

---

### AG5 Saved agent skills ("tuned prompts")
**Wave:** Post · **Effort:** M

User writes a prompt + tool allow-list + pins it as a button on `/agent`. Example: "Morning check — run portfolio doctor + top-3 news + any watchlist price breakout." One click fires.

---

### AG6 Customize AI (per-user)
**Wave:** W3 · **Effort:** S · **Depends on:** AG0, SET5

User settings:
- Preferred model tier (Haiku / Sonnet / Opus).
- Tone preset (terse / detailed / analytical / playful).
- Default tool allow-list (turn off tax tool if they never want it).
- Preferred citation style (inline vs. footnote).

Stored in `user_agent_settings`.

---

## Part 6 — Strategies & Copy-Trading

### ST1 Strategy layer (analysis strategies)
**Wave:** W3 · **Effort:** L · **Depends on:** AG0, F0.1

**Vision:** A library of strategies that are data-driven rules, not positions. Each strategy returns a signal score per (asset, timestamp). Examples:
- "Funding reversion" — flag overheated funding.
- "ETF breakout alignment" — BTC > 20d MA AND ETF 3d net flow > $500M.
- "Whale consensus" — > N of top-20 LARP wallets newly net-long.

**Spec shape:**
```ts
{
  id: string;
  name: string;
  description: string;
  scope: { assets: string[] };
  inputs: { metric, source, window }[];
  rule: BooleanExpression; // AND/OR of conditions
  invalidation: BooleanExpression;
  score_weights?: Record<string, number>; // optional, if composite
}
```

**Routes:** `/strategies` (browse), `/strategies/[id]` (detail + backtest + "alert me when this fires").

**Agent integration:** tool `strategy_run({id, asset})` and `strategy_backtest` (AT17).

---

### CT1 Copy-trading upgrades — current page refresh
**Wave:** W2 · **Effort:** M

**Current state:** migration `20260420000003_copytrade.sql` exists; page needs rebuild.

**New `/copytrade` layout:**
1. **Leader board** tabs: Top 10 Winners (30d PnL) / Top 10 Losers (30d PnL, *invert* strategy) / Watchlist wallets.
2. Each row: wallet address, 30d PnL %, Sharpe, pairs, LARP score, "Follow" button.
3. Sidebar: "Ask AI to find copy-traders" — prompt box that runs an agent with `larp_lookup + wallet_scan` over the top 200 and returns a ranked recommendation with reasoning.

**"Invert" mode:** For a Losers row, the Follow action tracks the inverse — if leader longs, we flag the opposite signal. Useful contrarian play.

---

### CT2 Follow wallet via scan / AI
**Wave:** W2 · **Effort:** M · **Depends on:** AG0

**Follow = watch.** No execution yet. "Follow" creates a row in `copytrade_follows(user_id, leader_wallet, mode text 'mirror'|'invert', size_cap_usd, created_at)`.

When the leader opens a new position on SoDEX:
- `positions_sync` cron diffs positions → detects new entry.
- Dispatches notification to all followers: TG message with leader's trade + AI commentary ("this wallet's last 8 longs on this pair averaged +12%").
- Optional: "Plan my trade" button → calls `copy_trade_plan` tool (AT18) → returns a plan card the user can screenshot / manually execute.

---

### CT3 Execution planning panel (no execution)
**Wave:** W3 · **Effort:** M · **Depends on:** CT2

Dedicated `/copytrade/plan` page. For each active follow: show current leader exposure, the calculated mirror / invert target, a "how you'd size it" row, slippage estimate. **Nothing executes.** User sees exactly what *would* happen, screenshots, places trade manually on SoDEX.

**Why this framing:** respects the "no 100% safe copy execution yet" constraint while still delivering real value. Positions us for future W-Post execution add-on.

---

### CT4 AI copy-trader recommender
**Wave:** W2 · **Effort:** M · **Depends on:** AG0

Explicit agent skill (AG5 pattern): "Find me 3 wallets to consider copying given my risk profile" → scans leaderboard, scores by Sharpe + consistency + win rate vs. drawdown, returns ranked list with rationale + supporting charts.

---

## Part 7 — Portfolio analytics (upgrades to existing scan page)

**Current state:** `/scan` page shows basic PnL / positions / history for any wallet.

### PA1 Benchmark comparison overlay
**Wave:** W3 · **Effort:** M

Add a second line to the equity curve: benchmark of choice (BTC hodl / SSI index / custom). Show alpha % in header.

### PA2 Per-pair attribution
**Wave:** W3 · **Effort:** M

Stacked-bar chart: PnL by pair, sortable. Table with pair, trades, win rate, avg PnL, total PnL.

### PA3 Risk metrics band
**Wave:** W3 · **Effort:** S

Header row: Sharpe, Sortino, max DD, calmar, win rate, profit factor. All computed from existing trade data.

### PA4 Daily/weekly equity curve toggle
**Wave:** W3 · **Effort:** S

Simple toggle on the existing chart.

### PA5 Trade journal + AI
**Wave:** W2 (auto log) → W3 (AI) · **Effort:** M total · **Depends on:** AG0

**Auto trade journal:**
- `trade_journal(trade_id, user_id, wallet, pair, opened_at, closed_at, side, size, entry, exit, pnl, tags text[], notes text, ai_summary text, created_at)`
- Populated by `positions_sync` cron when it detects a position close.
- User can add manual `notes` + `tags` (scalp, swing, thesis tag).

**AI layer:**
- Weekly AG1 Portfolio Doctor run also writes `ai_summary` for each trade (3 sentences: what you did, what happened, what to learn).
- Tag auto-classifier: agent tags trades by inferred style (scalp / swing / reversal / momentum).

**Export:** Journal page shows all trades, filter by tag, CSV export.

### PA6 CSV export
**Wave:** W3 · **Effort:** S

---

## Part 8 — Teams & Workspaces (foundation in W3, UI post-buildathon)

### TM1 Multi-tenant model (`org_id`)
Already specced as F0.4. Ship in W3.

### TM2 Team creation UI
**Wave:** Post · **Effort:** M

`/settings/orgs` — create org, name, slug. Auto-membership as `owner`.

### TM3 Invite flow
**Wave:** Post · **Effort:** M

- Owner/admin sends invite by email.
- Signed invite token (HMAC), 7d TTL.
- Invitee accepts → becomes `analyst` by default.

### TM4 Roles & permissions
**Wave:** Post (but codify enum in W3) · **Effort:** M

Roles: `owner, admin, analyst, dev, viewer`.
- `owner`: everything.
- `admin`: manage members, settings.
- `analyst`: create/edit alerts, watchlists, run agent.
- `dev`: internal/support role — access to feature flags, admin tools, but not member management. **This is the "dev role" from the latest requirements.**
- `viewer`: read-only.

Permissions table: `role_permissions(role, permission)` seeded.

### TM5 Org-level dev / admin accounts
**Wave:** W3 · **Effort:** S

Minimal: a `users.is_superadmin boolean` flag + `/admin/*` pages guarded by it. This lets *us* (developers) have full access without the full team UI.

### TM6 Shared watchlists + alerts
**Wave:** Post · **Effort:** M · **Depends on:** F0.4

Watchlists / alerts can be scoped to org. New dropdown at the top: `Personal | Team X`. Writes respect role permissions.

### TM7 Org-level audit log
**Wave:** Post · **Effort:** M

`audit_log(org_id, user_id, action, target_type, target_id, metadata jsonb, created_at)`. Page showing last 500 actions.

### TM8 Org activity feed
**Wave:** Post · **Effort:** S

In-app feed: "Alice added wallet 0x123," "Bob confirmed signal from whale-consensus." Derived from audit_log.

### TM9 Shared analyst notebook
**Wave:** Post · **Effort:** M

Rich-text Markdown notes per entity (wallet / pair / alert / strategy). Multi-author with last-edit tracking.

---

## Part 9 — Surfaces

Per latest call: **Telegram, Discord, Email only.** Drop everything else.

### SF1 Telegram bot — full command set
**Wave:** W1 base, grows each wave · **Effort:** ongoing

**W1 commands:**
- `/start` – link account (existing)
- `/brief` – one-off brief
- `/alerts` – list / disable
- `/watch ADDRESS` – add to watchlist
- `/scan ADDRESS` – quick scan

**W2 adds:**
- `/ask <question>` – one-shot agent
- `/chat` – session mode
- `/explain SYMBOL`
- `/chart SYMBOL TF`
- `/brief now`
- `/brief settings`

**W3 adds:**
- `/portfolio` – my stats
- `/journal` – recent trades
- `/follow ADDRESS` – copy-watch setup (no exec)

**Infra:** All handlers in a single router; middleware for `requireAuth`, `requireFlag`.

### SF2 Discord bot
**Wave:** W2 · **Effort:** M

Mirror of TG command surface. Slash commands. Uses the same handler layer; thin Discord.js wrapper.

### SF3 Email digest
**Wave:** W2 · **Effort:** M · **Depends on:** MB2, SET2

Daily (or weekly) email. Same content as Morning Brief but rendered as MJML → HTML email. User picks frequency + sections in SET2.

Provider: Resend (free 100/day dev tier). `emails(id, user_id, template, payload, sent_at, opened_at, clicked_at)`.

### SF4 TG / Discord / Email parity layer
**Wave:** W2 · **Effort:** S

A `Notification` object with variants for each surface; one `send(notification, channels)` helper that renders correctly for each. Keeps things DRY.

---

## Part 10 — Sharing & virality (W3 max)

### SH1 PnL card generator
**Wave:** W3 · **Effort:** M

Reuse existing `pnlcard.png` infra. Templates:
- Portfolio PnL (7d / 30d / all-time).
- Single trade closed.
- Weekly recap.

Endpoint: `/api/cards/pnl?user=...&window=30d&theme=light` → 1200×630 PNG ready for X/Twitter.

### SH2 Signal card
**Wave:** W3 · **Effort:** M

"CommunityScan flagged this signal at 14:02 UTC" card with the data inputs + result. Shareable when the agent surfaces an opportunity.

### SH3 Wallet-scan card
**Wave:** W3 · **Effort:** S

Snapshot card for any scanned wallet: rank, PnL, top pair. Shareable URL `/scan/0x...?card=true` returns the card PNG via OG tags.

### SH4 "Share this" button — everywhere
**Wave:** W3 · **Effort:** S

On every chart / alert / signal / scan: a button that (a) screenshots the component, (b) uploads to our CDN, (c) returns a share URL + copies to clipboard. Uses `html-to-image` lib.

---

## Part 11 — Admin & Ops

### OP1 Superadmin panel
**Wave:** W3 · **Effort:** S

Guarded by `users.is_superadmin`. Pages:
- `/admin/users` — list, filter, impersonate (opens a session-as-them).
- `/admin/flags` — feature flags UI.
- `/admin/crons` — last run / success per cron.
- `/admin/agent-usage` — LLM calls, tokens, errors.
- `/admin/source-health` — detail view of F0.5 widget.

### OP2 In-team role management
**Wave:** Post · **Effort:** M · **Depends on:** TM4

Within each org: members list, role change dropdown, remove. Owner-only.

### OP3 Cron-health dashboard
**Wave:** W3 · **Effort:** S

Extend `cron_runs(cron_name, started_at, finished_at, status, error, rows_affected)` — seed wrappers around every cron. Dashboard view at `/admin/crons`.

### OP4 Sentry + PostHog
**Wave:** W3 · **Effort:** S

- Sentry for exceptions + source maps.
- PostHog for click analytics + feature-flag-driven A/B on landing.

### OP5 BetterUptime / status page
**Wave:** Post · **Effort:** S

### OP6 Internal feedback inbox
**Wave:** Post · **Effort:** S

Widget "?" bottom-right; posts to Slack.

---

## Part 12 — Data Infrastructure (expanded)

### DI1 Unified `DataSource` — covered in F0.1

### DI2 Source-health monitor — F0.5

### DI3 Materialized leaderboard view
**Wave:** W3 · **Effort:** S

Supabase materialized view `leaderboard_stats_mv` refreshed by cron every 30 min. Indexes on `wallet_address`, `pnl_rank`, `volume_rank`.

### DI4 Watchlist positions cache
**Wave:** W3 · **Effort:** M

Cron `sync-watchlist-positions` pre-computes open positions per watched wallet into `watchlist_positions_cache`. UI reads from cache; instant load.

### DI5 Embedding pipeline
**Wave:** W2 · **Effort:** M · **Blocks:** AT12 (news_search)

- New table `doc_embeddings(id, doc_type, doc_id, embedding vector(1536), content_hash, created_at)` using pgvector (Supabase supports).
- Content ingested: SoSoValue news articles, CryptoPanic items, our own content-planner articles, agent conversation summaries.
- Embedding model: `voyage-3-lite` (cheap, quality) or OpenAI `text-embedding-3-small`.
- HNSW index for ANN search.
- Job runner: Inngest step function triggered on new news rows.

### DI6 Upstash Redis cache
**Wave:** Post · **Effort:** M

Hot-key cache for leaderboard page responses, price snapshots, frequently-called API endpoints. TTL 30–300s.

### DI7 Job queue (Inngest)
**Wave:** W3 · **Effort:** M

Replace ad-hoc Vercel crons with Inngest:
- Retry semantics built-in.
- Fan-out for per-user Morning Brief.
- Step functions for long-running agent flows (e.g. tax report).
- Observability in Inngest dashboard.

### DI8 Backfill CLI
**Wave:** Post · **Effort:** M

`npm run backfill -- --cron sync-leaderboard --from 2026-03-01 --to 2026-03-07` — re-runs any cron for a date range. Critical for data-quality fixes.

### DI9 Data-quality sentinels
**Wave:** W3 · **Effort:** S

Per-table: "last row older than N minutes" → fires an internal alert (our own alert system, nice dogfood). Seeds entries for price, news, positions, leaderboard.

### DI10 Multi-source fallback routing
**Wave:** W2 · **Effort:** S · **Depends on:** F0.1, F0.5

`pickSource()` (from F0.1) uses health + user prefs to route: if primary source stale > N min, silently switch to fallback and log.

### DI11 CDC → warehouse for analytics
**Wave:** Post · **Effort:** L

Pipe Postgres changes to a DuckDB / ClickHouse warehouse for heavy analytics without loading OLTP. Overkill for buildathon but worth listing.

### DI12 Internal event bus
**Wave:** W3 · **Effort:** M

Postgres `events(id, type, payload, created_at)` + `LISTEN/NOTIFY` on inserts. In-process subscribers: alert evaluator, audit log writer, agent context updater. Removes cron tight-coupling.

### DI13 Snapshot / time-travel tables
**Wave:** Post · **Effort:** M

For positions, leaderboard, F&G — keep daily snapshots so "what was this wallet's rank on 2026-03-15?" is answerable in O(1).

### DI14 Rate-limit middleware
**Wave:** W3 · **Effort:** S

Upstash Ratelimit for `/api/agent/*`, `/api/data/*`. Tiers: free 30 req/min, logged-in 120, team 500.

### DI15 Secret/config abstraction
**Wave:** W1 · **Effort:** S

Single `getConfig(key)` that reads from env + DB-backed overrides (so admins can flip a runtime toggle without redeploy). Enables quick source-swap in emergencies.

---

## Part 13 — Security (copy-trading only scope)

### SE1 Follow-risk disclaimer
**Wave:** W2 · **Effort:** S

First time a user clicks "Follow" on `/copytrade` → modal explaining no guarantees, not financial advice, checkbox to acknowledge. Persisted in `user_acknowledgements(user_id, kind, acknowledged_at)`.

### SE2 Follow-size cap
**Wave:** W2 · **Effort:** S

Per-follow `size_cap_usd` mandatory. Default 100. Even though there's no execution yet, this prevents the *plan* output (CT3) from outputting unhedged numbers.

### SE3 Kill switch for copy-trading
**Wave:** W3 · **Effort:** S

`/copytrade` header button "Pause all follows." Sets `copytrade_follows.paused=true`. All follow notifications silenced.

---

## Part 14 — Settings & Personalization

### SET1 Per-user timezone
**Wave:** W1 · **Effort:** S

`users.timezone text not null default 'UTC'`. Onboarding wizard sets it (detect from browser). Drives Morning Brief schedule, quiet hours, journal dates.

### SET2 Notification channel preferences
**Wave:** W2 · **Effort:** S

`user_notification_prefs(user_id, channel, enabled, default_for_category text[])`. UI: toggles per category (alerts / brief / journal / agent / copytrade).

### SET3 Customize navbar
**Wave:** W3 · **Effort:** M

`user_nav_prefs(user_id, order text[], hidden text[], pinned text[])`. Settings page UI with drag-drop. Reads injected into `Navbar.jsx` (remember the memory note: adding a new page still requires entry in `FALLBACK_NAV` + `PATH_ICON_NAME`, so keep defaults there and let the user override).

### SET4 Theme / display preferences
**Wave:** W3 · **Effort:** S

Density (compact/spacious), chart default timeframe, date format. Stored in `user_display_prefs`.

### SET5 Customize AI (wraps AG6)
**Wave:** W3 · **Effort:** S · **See AG6**

### SET6 Favorite pairs pinning
**Wave:** W2 · **Effort:** S

Tiny: `user_favorites(user_id, kind, symbol)`. Surfaces everywhere symbols are listed.

### SET7 Saved views
**Wave:** Post · **Effort:** S

Per-page saved filter presets. E.g. leaderboard "my filter" = sort by Sharpe, min 30d trades, only USDT pairs.

---

## Part 15 — Onboarding & baseline UX

### ON1 3-step onboarding wizard
**Wave:** W2 · **Effort:** M

Runs on first login. Steps:
1. **Watchlist** — enter 1–5 wallets or tokens. Pre-filled with "Top 3 LARP-positive wallets" as default.
2. **Telegram** — "Connect Telegram" button → existing flow. Skippable.
3. **Morning Brief** — set time + timezone. (Requires SET1.)

Skip-able at each step; resumable from a banner if unfinished.

### UX1 Skeleton loaders
**Wave:** W3 · **Effort:** S

Add `<Skeleton>` to the 5 biggest async-loaded sections: leaderboard table, portfolio header, research panels, alert list, agent history.

### UX2 Error boundaries + retry
**Wave:** W3 · **Effort:** S

`layout.js` gets an `<ErrorBoundary>` with fallback UI. Route-level boundaries on `/research`, `/agent`, `/portfolio`, `/alerts`.

### UX3 Empty states
**Wave:** W3 · **Effort:** S

Illustrated empty state + CTA for: no alerts, no watchlist, no journal entries, no follows. Each has a "Try example" button.

---

## Part 16 — Third-party APIs — concrete use cases

Per your ask: *for what could we use each API?*

| API | Free tier | Agent tool | Concrete use inside CommunityScan |
|---|---|---|---|
| **CoinGecko** | generous, no key | `data_source` | Price fallback when SoSoValue stalls; supply / FDV / category data on per-asset page; filling the `DataSource.getPrice` interface as second option. |
| **CoinMarketCap** | 10k/mo | `data_source` | Alt-source for price; CMC categories (AI, RWA, LSD) power a "sector heatmap" on `/research`. |
| **DefiLlama** | free, no key | `defi_tvl` (AT14) | TVL for per-asset deep dive; stablecoin flow card on `/research` (USDT/USDC net mint/burn); "treasury health" tool for DAO-token queries. |
| **Alternative.me (Fear & Greed)** | free | `fear_greed` | F&G dial on `/research`; Decision Layer input; alert metric ("fire when fear < 20"). |
| **CryptoPanic** | 1k/day free | `news_search` | News fallback when SoSoValue down; secondary feed in per-asset page; embeds into embedding pipeline (DI5). |
| **Etherscan** | 5 r/s free | `onchain_context` (AT13) | Look up whale transfers, contract interactions, token approvals when agent answers "why did this wallet sell." |
| **Alchemy** | generous free | `onchain_context` | Faster than Etherscan for bulk. Also webhook-based whale transfer detection (future). |
| **The Graph** | free pay-per-query | agent tool | Historical subgraph queries — e.g. "this pool's TVL a month ago" for backtests. |
| **Dune** | pay-as-you-go, small free | agent tool `dune_query` | Run pre-built Dune queries for on-chain analytics the agent references in answers. |
| **LunarCrush** | free tier | `social_sentiment` (AT15) | Social volume / sentiment score on per-asset page; Decision Layer's "Breadth" metric can incorporate social metric. |
| **Santiment** | limited free | `social_sentiment` | Alt social sentiment; devtraction for the "this token is being shilled" signal. |
| **Messari** | free for many endpoints | agent tool | Protocol fundamentals card on per-asset page. |
| **NewsAPI / CoinDesk RSS** | free | `news_search` | Broad-market news for the macro backdrop card (RD6). |
| **X / Twitter API v2** | $100/mo basic | `x_scrape` (AT4) | "Find this person," influencer watch, ref-code resolution, post scraping for handles mentioned in SoSoValue news. |
| **Apify / Bright Data** | pay-per-run | `x_scrape` fallback | When X API is down or too expensive. |
| **TinEye API** | free tier limited | `reverse_image_search` (AT3) | PnL-image provenance lookups. |
| **Google Cloud Vision** | $1.50 / 1k calls | `reverse_image_search` | Preferred primary — better recall than TinEye. |
| **SerpAPI** | free trial | general web search tool | Agent falls back to general web search when specialized tools miss. |
| **Alternative.me / Alpha Vantage / Stooq** | free | `macro_data` | DXY, SPX, gold, yields for RD6 backdrop card. |
| **Binance public** | free, no key | `ccex_data` | Cross-venue funding/OI for arb signals (D3). |
| **Etherscan Webhooks / Alchemy Webhooks** | free | pipeline | Real-time whale transfer detection for copytrade notifications (CT2). |
| **Resend** | 100/day dev | email transport | SF3 email digest sender. |
| **Inngest** | free generous | job queue | DI7 background jobs + fan-out. |
| **Upstash (Redis / Ratelimit)** | free tier | cache + rate-limit | DI6 cache + DI14 rate-limit. |
| **Sentry** | free for small | error tracking | OP4. |
| **PostHog** | free for indie | analytics | OP4. |
| **pgvector** (Supabase) | free | embeddings | DI5 vector index; `news_search` backing store. |
| **Voyage AI / OpenAI embeddings** | cheap | embeddings | Embedding generation for DI5. |
| **Anthropic Claude** | per-use | agent LLM | AG0 master agent runtime. |
| **Ocrad.js / Tesseract (local)** | free | `image_ocr` (AT5) | Already have `eng.traineddata` committed — use for OCR tool. |

---

# Part 17 — Final implementation plan (build order)

Three waves, 12 days each. Each wave is planned **by day** so we always know what's on the critical path.

## Wave 1 (May 1 – May 12, 2026) — "Insight Layer"

**Goal:** Ship a buildathon-ready product that demonstrates genuine SoSoValue integration, names the thesis, and lays foundations for W2.

### Day 1–2 (May 1–2) — Foundations
- F0.1 `DataSource` interface + SoDEX, SoSoValue, Alternative.me, CryptoPanic, CoinGecko implementations (capabilities used in W1 only).
- F0.2 Feature-flag system + admin seeds.
- DI15 `getConfig` with DB overrides.
- SET1 timezone column on users (used by MB1 for date rendering).
- **Buildathon API access form submitted** (not code, but critical — first action).

### Day 3 (May 3) — Alerts foundation
- AL1 Datasource switch on alerts (UI + cron + migration).
- AL10 Alert history UI + realtime feed.

### Day 4–5 (May 4–5) — Morning Brief v1
- MB1 cron, TG render, brief_settings + brief_runs tables, Haiku headline generation.

### Day 6 (May 6) — Research Hub
- RD1 `/research` page: ETF flow panel, regime card, news ticker, F&G dial, rebranded LARP tile.

### Day 7 (May 7) — TG commands + smoke tests
- SF1 W1 command set (`/brief`, `/alerts`, `/watch`, `/scan`).
- End-to-end smoke tests: fresh signup → linked TG → received brief.

### Day 8 (May 8) — Buildathon landing + buildathon storytelling
- `/buildathon` landing page with wave changelog, video embed slot.
- README rewrite for buildathon framing.
- Screenshots for all new pages.

### Day 9 (May 9) — Video + polish
- 90s video script + recording.
- Copy pass on all new surfaces.
- Tiny bugs.

### Day 10–11 (May 10–11) — Buffer + Discord post
- Buffer for unknowns.
- Discord Buildathon Channel intro + W1 preview.

### Day 12 (May 12) — Submit
- Final smoke test in incognito.
- GitHub tag `wave-1`.
- Submission form filled.
- Discord announce.

**W1 ships (publicly):** `DataSource` abstraction, alert datasource switch, Morning Brief v1, `/research` hub, `/buildathon` landing, TG v1 command set, feature-flag system.

**W1 stays flagged off (built ahead if time):** nothing — W1 is tight. Don't start W2 features.

---

## Wave 2 (May 18 – May 29, 2026) — "Reasoning Layer"

**Goal:** the agent becomes the product. Headline demo is "find this guy" — an end-to-end multi-tool agent run.

### Day 1–2 (May 18–19) — Agent core
- AG0 master agent architecture: Anthropic SDK wiring, `agent_conversations` table, streaming on web, TG `/ask` and `/chat`, tool-use loop, rate-limit.
- AG2 `/explain SYMBOL` (Haiku).

### Day 3 (May 20) — Tool catalog — data reads
- AT1 wallet_scan, AT2 larp_lookup, AT9 portfolio_read, AT13 onchain_context, AT14 defi_tvl, AT16 sosovalue passthrough.
- F0.3 multi-source settings page.

### Day 4 (May 21) — Tool catalog — write-ish + image
- AT5 image_ocr, AT7 alert_crud (with confirm cards), AT8 watchlist_crud.
- AT3 reverse_image_search (Google Vision primary, TinEye fallback).

### Day 5 (May 22) — X scraper + composite
- AT4 x_scrape (X API if approved, Apify fallback) + `x_cache` table.
- AT6 find_this_person composite — the flagship agent skill.

### Day 6 (May 23) — News + embeddings
- DI5 embedding pipeline + `doc_embeddings` table.
- AT12 news_search (semantic).
- AT11 incoming_listings cron + tool.

### Day 7 (May 24) — Research expansion + Decision Layer
- RD2 per-asset deep dive.
- RD3 whale-vs-ETF overlay.
- RD4 Decision Layer page (Narralytica counter) with presets.
- RD6 macro backdrop card (free API).

### Day 8 (May 25) — Alerts expansion
- AL2 multi-condition rule builder.
- AL3 alert templates.
- AL4 per-channel routing + SET2 notification prefs.
- AL5 rate-limit batching.
- AL6 snoozing + quiet hours.
- AL9 "explain why" (wraps agent Haiku call).

### Day 9 (May 26) — Morning Brief v2 + surfaces
- MB2 custom-time brief + expanded sections.
- SF2 Discord bot (same command set).
- SF3 email digest (Resend + MJML).
- SF4 notification parity layer.

### Day 10 (May 27) — Copy-trading v1
- CT1 `/copytrade` redesign (winners/losers/invert tabs, AI sidebar).
- CT2 follow → watch (no execution).
- CT4 AI copy-trader recommender.
- SE1 risk disclaimer + SE2 follow-size cap.
- PA5 trade-journal auto-log portion (AI layer in W3).

### Day 11 (May 28) — ON1 onboarding + polish
- ON1 3-step onboarding wizard.
- AT10 tax_report scaffold (UI placeholder, full logic in W3).
- Polish, bugs.
- Video recording (2 min).

### Day 12 (May 29) — Submit
- GitHub tag `wave-2`.
- Submission, Discord post.

**W2 ships:** master agent + full tool suite, per-asset deep dive, Decision Layer, multi-condition alerts, MB2, Discord + email surfaces, copytrade v1, onboarding, trade-journal auto-log.

**Stays flagged off (built ahead):** anything execution-adjacent; strategy backtester engine if time; `org_id` migration if time.

---

## Wave 3 (Jun 4 – Jun 15, 2026) — "Closing the Loop (without executing)"

**Goal:** product maturity. Trust, depth, polish. This is the wave where judges see a finished thing.

### Day 1–2 (Jun 4–5) — Multi-tenant foundation
- F0.4 `org_id` migration across all user-scoped tables.
- TM5 superadmin flag + `/admin/*` guard.
- OP1 superadmin panel (users, flags, crons, agent usage).
- OP3 cron-health dashboard.
- OP4 Sentry + PostHog.

### Day 3 (Jun 6) — Strategy layer + backtester
- ST1 strategy model + `/strategies` browse + detail pages.
- AT17 strategy_backtest tool + engine.
- Seed 5 strategies (funding reversion, ETF breakout, whale consensus, invert-losers, fear extremes).

### Day 4 (Jun 7) — Copy-trading depth
- CT3 `/copytrade/plan` execution-planning panel.
- AT18 copy_trade_plan agent tool.
- SE3 kill switch.

### Day 5 (Jun 8) — Portfolio upgrades
- PA1 benchmark overlay.
- PA2 per-pair attribution.
- PA3 risk metrics band.
- PA4 timeframe toggle.
- PA5 trade-journal AI layer (summaries, auto-tags).
- PA6 CSV export.

### Day 6 (Jun 9) — Tax + Portfolio Doctor
- AT10 tax_report full logic (FIFO/LIFO/HIFO, CSV + HTML summary).
- AG1 Portfolio Doctor scheduled run.
- AG4 agent timeline page.
- AG6 / SET5 customize AI settings.

### Day 7 (Jun 10) — Sharing + virality
- SH1 PnL card generator.
- SH2 signal card.
- SH3 wallet-scan OG card.
- SH4 universal "share this" button with html-to-image.

### Day 8 (Jun 11) — Data infra polish + alerts escalation
- DI3 leaderboard MV.
- DI4 watchlist positions cache.
- DI7 Inngest migration for crons.
- DI9 data-quality sentinels.
- DI10 fallback routing.
- DI12 internal event bus.
- DI14 rate-limit middleware.
- AL7 alert escalation.
- AL8 shareable alert link.

### Day 9 (Jun 12) — Settings depth
- SET3 customize navbar.
- SET4 display prefs.
- SET6 favorite pairs.
- AG5 saved agent skills (optional if time).

### Day 10 (Jun 13) — UX sweep
- UX1 skeleton loaders.
- UX2 error boundaries + retry.
- UX3 empty states.
- F0.5 source-health widget live on `/research`.
- AT15 social_sentiment tool wired.

### Day 11 (Jun 14) — Video + polish + Demo Day prep
- 3-min video scripted + recorded.
- Slide deck for Demo Day: problem, loop diagram, 3-wave arc, roadmap.
- End-to-end dry run of the "find this guy" + Portfolio Doctor + Decision Layer demos.

### Day 12 (Jun 15) — Submit
- GitHub tag `wave-3`.
- Submission + Discord post.
- Notify judges the live demo is ready.

**W3 ships:** strategy layer + backtester, copy-trade planning, full portfolio analytics + AI trade journal, tax report, agentic audit trail, sharing cards, multi-tenant foundation, superadmin tools, Sentry/PostHog, UX polish, data-infra upgrades.

---

# Part 18 — What to start first (TL;DR)

**If you can only do 10 things in Wave 1, do these, in this order:**

1. Submit Buildathon API access form.
2. F0.1 `DataSource` abstraction + 5 source implementations.
3. F0.2 feature-flag system.
4. SET1 per-user timezone.
5. AL1 alert datasource switch.
6. MB1 Morning Brief v1 at 08:00 UTC.
7. RD1 `/research` hub.
8. SF1 Telegram command set (W1 subset).
9. `/buildathon` landing + README + video.
10. Submit, Discord announce.

**Highest ROI single items across all waves:**

- **AG0 master agent + AT6 find_this_person composite** — W2 headline.
- **RD4 Decision Layer** — single page that tells Narralytica to sit down.
- **MB1 → MB2 Morning Brief** — sticky daily touchpoint; retains users across all 3 waves.
- **CT1+CT2 copy-trading redesign with AI recommender** — satisfies social-finance thesis without execution risk.
- **PA5 Trade Journal + AI** — unique angle no competitor has; deeply personal value.

**Do not start before its wave**, no matter how tempting:

- Any execution / on-chain write path (scope is still read-only).
- Team-management UI (only the `org_id` migration ships in W3 — UI is Post).
- Monetization surfaces.
- Native mobile / browser-extension / TradingView — surfaces are TG + Discord + email only.

---

# Part 19 — Running the AI for free (buildathon budget = $0)

The master agent (AG0) is the headline feature. Nothing kills a hackathon submission faster than a demo that times out because the credit ran out. Strategy: **tiered routing across free providers**, with a safe local fallback.

## Free LLM providers worth stacking

| Provider | Models | Free tier | Best use in our stack |
|---|---|---|---|
| **Google AI Studio (Gemini API)** | Gemini 2.0 Flash, 1.5 Flash, 1.5 Pro | 15 req/min, 1M tok/day on Flash; Pro lower | **Primary Tier-1 workhorse.** Morning Brief headline, `/explain`, alert-explain-why, most tool-calling agent runs. Tool use supported. |
| **Groq** | Llama 3.3 70B, Llama 3.1 8B, Mixtral, Qwen | 30 RPM, ~14k tok/min, fully free | **Speed lane** — `/explain`, short agent turns where latency matters. 500 tok/s inference. |
| **GitHub Models** (public preview) | GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet, Claude 3 Opus, Llama 3.1, Phi-4, Mistral Large | Daily request cap per model, completely free during preview | **Tier-2 quality lane** — Strategy Assistant deep dives, Portfolio Doctor, find-this-person composite. Claude Sonnet access *free* here is the killer angle. |
| **Cloudflare Workers AI** | Llama 3.1, Mistral, BGE embeddings, Flux image gen, Whisper | Generous daily neuron budget free | **Embeddings + fallback** — backs the DI5 embedding pipeline; tiny-model fallbacks when other providers rate-limit. |
| **Mistral La Plateforme** | Mistral Large, Small, Codestral | Free tier (rate-limited) | Backup slot in the router. |
| **OpenRouter** | Rotating free models (Llama variants, Gemma, some Mistral) | `:free` variants, rate-limited | Absolute last-resort fallback in the router. |
| **Hugging Face Inference API** | Many open models | Free personal tier | Experimentation, offline batch. |
| **Cohere trial** | Command R, embeddings | Free trial | Classification tasks if needed. |
| **Ollama / LM Studio (local)** | Llama 3.1, Qwen 2.5, Phi-4, Mistral, etc. | Free (your hardware) | Dev-machine only. Good for prompt iteration. Not production. |

## Free credits worth explicitly applying for

- **Buildathon Access Form** (https://forms.gle/2nuJT2qNbUQsyyZy8) — apply day 1. Apart from SoSoValue + SoDEX API, Buildathon participants sometimes receive LLM credit grants from sponsors. Mention we need Anthropic / OpenAI credits.
- **Anthropic startup / hackathon credits** — ask in their Discord / support; has been granted to buildathon teams in the past.
- **Google Cloud for Startups** — $1k+ credits including Vertex AI; application has ~2-week turnaround.
- **Vercel AI SDK partners** — Groq, xAI, Together occasionally run hackathon promos (check Discord/Twitter during buildathon window).
- **GitHub for Students / Education pack** — free Copilot + Models access.
- **SerpAPI** — 100 free searches/month for reverse-image-search tool (AT3).
- **TinEye** — limited free queries.
- **Apify** — $5/mo free platform credit (enough for X scraping in our volume).

## Non-LLM AI services that are free for our volume

| Need | Free option |
|---|---|
| **OCR** (AT5) | **Tesseract.js / local Tesseract** — `eng.traineddata` already committed in the repo. Zero cost. |
| **Reverse image search** (AT3) | **Google Cloud Vision free tier** — 1,000 image detections/month free; enough for a demo. TinEye API free slot as backup. |
| **Embeddings** (DI5) | **Cloudflare Workers AI** (`@cf/baai/bge-small-en-v1.5`) free tier → `pgvector` on Supabase free tier for storage. No external spend. Alternative: **Gemini `embedding-001`** — free tier of Google AI Studio. |
| **Speech-to-text** (voice mode, Post feature) | **Cloudflare Workers AI Whisper** free neurons. |
| **Image generation** (sharing cards, Post) | **Cloudflare Workers AI Flux schnell** free tier. |
| **Vector DB** | `pgvector` inside our existing Supabase — free, no new service. |
| **Web search tool** | **SerpAPI free plan** (100/mo) or **Tavily free tier** (1000/mo), or scraping DuckDuckGo HTML directly. |
| **News aggregation** | **CryptoPanic free tier** 1k/day + RSS ingests — zero cost. |

## Proposed LLM routing policy (fits our existing `DataSource` pattern)

Create `app/lib/llm/providers.ts` mirroring the `DataSource` approach:

```ts
export interface LLMProvider {
  id: 'gemini' | 'groq' | 'github-models' | 'cloudflare' | 'mistral' | 'openrouter' | 'local';
  tier: 1 | 2 | 3;          // 1 = cheap+fast, 2 = balanced, 3 = premium
  supports: ('tool-use' | 'json-mode' | 'vision' | 'long-context')[];
  generate(opts): AsyncIterable<Token>;
  healthCheck(): Promise<ProviderHealth>;
}
```

Router policy:

| Task | Primary | Fallback chain |
|---|---|---|
| `/explain` SYMBOL (short, fast) | Groq Llama-3.3-70B | Gemini 2.0 Flash → Cloudflare Llama |
| Morning Brief headline | Gemini 2.0 Flash (cached 6h, shared across users) | Groq → GitHub Models GPT-4o-mini |
| Alert "explain why" | Gemini 2.0 Flash | Groq → GitHub Models |
| `/ask` / `/chat` general | Gemini 2.0 Flash with tool-use | GitHub Models Claude 3.5 Sonnet (when Gemini rate-limits) → Groq (no-tools fallback) |
| Find-this-person composite (multi-tool, hard) | **GitHub Models Claude 3.5 Sonnet** | Gemini 1.5 Pro → GPT-4o |
| Portfolio Doctor weekly | GitHub Models Claude 3.5 Sonnet | Gemini 1.5 Pro |
| Tax report narration | Gemini 2.0 Flash | Groq Llama |
| Trade-journal summaries (bulk) | Groq (cheap+fast for volume) | Gemini Flash |
| Embeddings | Cloudflare Workers AI BGE | Gemini embedding-001 |

Each call logs to `llm_usage(provider, model, user_id, tokens_in, tokens_out, latency_ms, tier, purpose, error, at)` so we can see when a provider starts rate-limiting and auto-cool it for N minutes.

## Rate-limit survival playbook

- **Cache aggressively.** Headline line per regime-hash (6h), `/explain` per (symbol, minute) (60s), research panels (30s). LLM calls are the most expensive thing on the platform; cache almost everything the user sees.
- **Haiku-equivalent for volume.** Use Gemini Flash / Groq Llama-8B for anything hit more than once per minute. Save Sonnet / Opus / GPT-4o for per-user deep dives.
- **Shadow mode on premium models.** When we want to *try* GPT-4o vs. Claude Sonnet for a task, run both via `llm_usage`-logged shadow calls on 5% of traffic, compare quality offline.
- **Deterministic temperature where possible.** Cache hits explode when `temperature=0`.
- **Background summarization.** Long agent conversations get summarized into a rolling context budget, cutting tokens per turn.

## Secrets & config (stays safe)

- Keys live in `.env.local` for dev, Vercel env for prod.
- **Never ship a provider key to the client.** All agent calls route through `/api/agent/*` server routes.
- `getConfig()` (DI15) reads DB overrides → lets us disable a specific provider at runtime if it goes down.

## Day-1 checklist (pre-W1 build window)

- [ ] Sign up for Google AI Studio → get Gemini API key.
- [ ] Sign up for Groq → get API key.
- [ ] Enable GitHub Models (`gh extension install github/gh-models` or web console) → get token.
- [ ] Sign up for Cloudflare Workers AI → get account ID + token.
- [ ] Sign up for Mistral La Plateforme → get API key.
- [ ] Apply for Buildathon Access Form.
- [ ] Apply for Anthropic hackathon credits via Discord.
- [ ] Apply for Google Cloud for Startups (for Vision API free tier).
- [ ] Stub `LLMProvider` interface + register all 5 providers with dummy calls.
- [ ] Implement `llm_usage` table + simple dashboard at `/admin/llm-usage`.

**Result: we can run the entire buildathon demo — including heavy agent runs — without ever paying a cent in LLM fees.** Any post-buildathon scaling is a monetization question, not a technical one.
