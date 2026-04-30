# SoSoValue Buildathon — Roadmap to Win

**Event:** SoSoValue Buildathon (Akindo Wave Hack `JBEQXgN4Zi2jA3wA`)
**Total prize pool:** 10,000 USDC across 3 waves + Demo Day
**Our submission:** `sodexscan` / CommunityScan — agentic finance cockpit on SoDEX + SoSoValue

---

## 1. Event facts (locked)

### Timeline
| Wave | Build | Eval | Prize |
|------|-------|------|-------|
| W1 — Concept / Early Prototype | May 1 – May 12, 2026 | May 13 – 17 | 3,000 USDC |
| W2 — Build Phase I | May 18 – May 29, 2026 | May 30 – Jun 3 | 3,000 USDC |
| W3 — Build Phase II | Jun 4 – Jun 15, 2026 | Jun 16 – 20 | 4,000 USDC |
| Demo Day | TBD | — | — |

### Judging weights
1. **User Value & Practical Impact — 30%**
2. Functionality & Working Demo — 25%
3. Logic, Workflow & Product Design — 20%
4. Data / API Integration — 15%
5. UX & Clarity — 10%

### Hard requirements per wave
- Genuine SoSoValue API integration (not decorative)
- Clear use case, real user value, complete data→action flow
- Public GitHub, README, live demo, short video, team info, **wave changelog**

### Bonuses
SoDEX API integration · AI reasoning · signal/opportunity/explanation features · risk controls · better product experience (panels, bots, automations).

### Resources (must reference / use)
- SoSoValue API: https://sosovalue-1.gitbook.io/sosovalue-api-doc
- SoDEX API: https://sodex.com/documentation/api/api
- Common external APIs: the Notion list (free tiers)
- Discord Buildathon Channel (main feedback loop — post weekly)
- Kickoff workshop: https://luma.com/soSoValue-buildathon

---

## 2. Winning thesis

**Nobody else at this buildathon already has what we have.** Most teams will be on day-1 skeletons. We ship a mature SoDEX analytics product (leaderboard, LARP detector, copytrade, realtime alerts, Telegram bot, content pipeline). The risk is the opposite: **we reveal the finished thing in Wave 1 and the judges have nothing new to score for Waves 2 and 3.**

So the strategy is **staged reveal** — each wave unlocks a new agentic layer that wasn't visible in the previous submission, and the story arc maps 1:1 to the five example directions SoSoValue explicitly listed.

| Wave | Reveal | Maps to judge example |
|------|--------|-----------------------|
| W1 | **Smart Research Dashboard** + **Opportunity Discovery** (read layer) | Smart Research Dashboard, Opportunity Discovery Engine |
| W2 | **Strategy Assistant + Copy-Trading Support** (reason + notify layer) | Strategy Assistant Bot, Copy-Trading Support Tool |
| W3 | **Signal-to-Execution Agent** (act layer, with risk controls) | Signal-to-Execution Agent |

The arc *insight → decision → execution* is literally the "complete flow from data input to actionable output" the rubric rewards under User Value (30%) and Workflow Design (20%).

### Our unfair advantages to emphasize in every wave
- Depth of on-chain SoDEX understanding (LARP detector, copytrade, leaderboard) — competitors can't replicate in 6 weeks
- Already production-deployed on Vercel with real users + auth + Supabase
- Telegram bot as a second surface (most teams will be web-only)
- Content/article generation pipeline (agentic journalism angle)

---

## 3. Per-wave submission plan

> Rule: **hide capabilities behind feature flags**. Build ahead, reveal on schedule. Each wave's video must show a feature the previous wave's video did not.

### Wave 1 — "The Insight Layer" (submit by May 12, 2026)

**Public story:** *"We ingest SoSoValue's ETF flows, news and market-intel into a unified research dashboard, cross-referenced with live on-chain SoDEX activity. The first two SoSoValue-powered modules ship today."*

**Ship:**
- **Morning Brief** (Telegram command `/brief` + web widget) — first version, pulled entirely from SoSoValue. Prices, 24h movement, ETF net flows, top headlines. Fixed 08:00 UTC only; custom times land in W2.
- **Smart Research Dashboard** page — SoSoValue ETF flows panel + BTC/ETH spot tape + news feed (SoSoValue Terminal data).
- **Datasource switch on price alerts** — toggle SoDEX mark/mid/bid/ask **or** SoSoValue reference price, per alert. This is the cleanest "SoSoValue integration" proof on the existing alerts stack.
- **LARP detector** promoted as "Opportunity Discovery Engine" framing (already built — just rebrand + write the case study).
- Landing page tagline locked: *"The research-to-execution cockpit for on-chain traders."*

**Hide (already built, flag off):** copytrade execution UI, signal engine, all write/act paths, multi-broker abstraction.

**Submission package:**
- GitHub: repo public, README rewritten for buildathon framing, screenshots of the 3 modules
- Demo: `sodexscan.com` with a `/buildathon` landing page listing what W1 shipped
- Video (~90s): problem statement → Morning Brief (TG) → Research Dashboard → alert with SoSoValue datasource → one line tease for W2 *"next wave: strategy assistant + copy-trading signals"*
- Changelog: "W1 — Insight Layer. 3 new SoSoValue-powered surfaces."

**Impress hook:** Telegram Morning Brief is tactile and the judges can subscribe themselves. Build a `@sosovalue_buildathon_demo_bot` alias and paste it in the submission.

---

### Wave 2 — "The Reasoning Layer" (submit by May 29, 2026)

**Public story:** *"Research is passive. Reasoning is the moat. Wave 2 turns the dashboard into an agent: it explains moves, proposes plays, and watches wallets for you."*

**Ship:**
- **Custom-time Morning Brief** — per-user cron, Telegram picker, DST-aware. Adds news sentiment from SoSoValue + whale moves from SoDEX. (This is the natural evolution of the W1 brief, makes the W1→W2 diff obvious.)
- **Strategy Assistant bot** (`/ask` in TG, chat panel on web) — LLM with tool-use over SoSoValue API + SoDEX reads. Grounded answers only ("Why did BTC ETF flows flip negative?" → pulls SoSoValue ETF endpoint + annotated chart).
- **Copy-Trading Support Tool** (read-only) — surface the existing copytrade infra as "mirror watch": pick a leaderboard wallet, get Telegram alerts the moment they open a new SoDEX position, with AI commentary ("this wallet's last 5 longs in this pair averaged +X%").
- **Alert history + real-time feed** goes public (already built, just UI polish).
- 87i**Content Planner** shipped as internal "agentic journalism" demo — AI-written daily market note using SoSoValue Terminal + on-chain signals. Pitch: *"a one-person news agency, live."*

**Hide (flagged):** actual order placement, position sizing engine, kill-switch UX.

**Submission package:**
- Video (~2 min): open with W1 recap (5s), then **new surfaces only** — custom brief config → Strategy Assistant Q&A → mirror-watch alert firing in real time → agentic news note. End with *"W3 closes the loop: signal → confirm → execute."*
- Changelog: *"W2 — Reasoning Layer. Adds agent reasoning, per-user scheduling, mirror-watch, agentic content."*
- **Proof of usage:** include screenshot of Discord/Telegram community using the bot (ask early, bribe with something small).

**Impress hook:** the Strategy Assistant must cite its SoSoValue data sources visibly in every answer — this is the "Data / API Integration" (15%) scoring moment and it's where most teams will be weak.

---

### Wave 3 — "The Execution Layer" (submit by Jun 15, 2026)

**Public story:** *"An agentic finance cockpit doesn't just watch — it acts, with your consent and inside your risk budget. Wave 3 closes the loop."*

**Ship:**
- **Signal-to-Execution Agent** — end-to-end: SoSoValue data + SoDEX signal → AI proposes trade (direction, size, stop, take-profit, rationale with cited data) → user confirms in Telegram → order placed via SoDEX execution module → position tracked in portfolio.
- **Risk-control panel** — per-user max position %, daily loss cap, cooling-off timer after N losing trades, "are-you-sure" double-confirmation on any order > threshold. This directly targets the "risk control, confirmation mechanisms" bonus.
- **Multi-broker / multi-source foundation** — introduce a `DataSource` and `ExecutionVenue` abstraction so alerts, briefs and execution can each be pointed at (SoDEX | SoSoValue | third-party-exposed-by-Notion-list). Ship with at least 2 data sources and 1 execution venue wired; the abstraction itself is the W3 deliverable, extra venues post-buildathon. **Frame this as "the first broker-agnostic agentic finance cockpit."**
- **Public audit page** per user: every agent-proposed action, with data it saw, reasoning, and outcome — builds trust and is visually stunning in the video.
- **Polish:** skeleton loaders everywhere, error boundaries, perf fixes from the existing ROADMAP.md (watchlist cache, leaderboard MV). These raise the UX & Clarity score (10%) which is otherwise the weakest criterion for any dense product.

**Submission package:**
- Video (~3 min): one end-to-end scripted run — Telegram Morning Brief arrives → user asks Strategy Assistant a follow-up → assistant proposes a trade → user confirms → trade executes on SoDEX → audit log shows reasoning and outcome. Close with multi-broker slide.
- Changelog: *"W3 — Execution Layer. Closes the research→reasoning→execution loop with risk controls and multi-broker abstraction."*
- Slide deck (reusable for Demo Day): problem, the loop diagram, architecture, 3 wave milestones, roadmap post-buildathon.

**Impress hook:** live execution during Demo Day with pre-funded buildathon account. Judges remember the team that executed on stage.

---

## 4. Feature backlog — mapped to waves

User's explicit asks are all in:

| Feature | Wave | Notes |
|---------|------|-------|
| **Price alert datasource switch (SoDEX ↔ SoSoValue)** | **W1** | Minimal code — dropdown on existing alert config; alert cron reads from selected source. High visibility for "genuine SoSoValue integration." |
| **Morning Brief in Telegram** | **W1** (fixed 08:00 UTC) → **W2** (custom per-user time + richer content) | Perfect two-wave progression. W1 proves it works, W2 shows product maturity. |
| **Multi-broker / multi-datasource architecture** | **W3** | Framed as "broker-agnostic agentic finance." Needs `DataSource` + `ExecutionVenue` interfaces with ≥ 2 data sources and ≥ 1 venue shipped; rest post-buildathon. |

Other features from existing `ROADMAP.md` that fit naturally:

| Existing backlog item | Wave | Why |
|---|---|---|
| Watchlist performance cache | W3 polish | UX 10% scoring |
| Skeleton loaders, error boundaries | W3 polish | UX 10% scoring |
| Wallet comparison tool | W2 or W3 stretch | Good visual, not core to agent story — only if time |
| Google OAuth | W3 polish | Reduces signup friction for judges trying the demo |
| Portfolio analytics | W3 | Fits the "audit page" and post-execution tracking |
| AI insights (`/ai/top-wallet`) | W2 | Fold into the Strategy Assistant |

---

## 5. Judge-impression moments (one per wave)

Each wave needs one single moment a judge will screenshot or remember. Optimize everything else around it.

- **W1 hero moment:** Telegram Morning Brief notification landing at 08:00 with SoSoValue ETF flow data embedded. The bot is the thing a judge can install and keep using between waves — that's compounding attention.
- **W2 hero moment:** Strategy Assistant answering "why is ETH flow negative today?" with a chart, two SoSoValue data citations, and a proposed watchlist change — in < 10 seconds.
- **W3 hero moment:** live Telegram confirmation → SoDEX execution → audit entry — all on video, one continuous screen capture, no cuts.

---

## 6. Resource utilization plan

| Resource | How we use it | Wave |
|---|---|---|
| **SoSoValue API** (Terminal, ETF, SSI, news) | Morning Brief, Research Dashboard, alert datasource, Strategy Assistant grounding, agentic news | W1, W2, W3 |
| **SoDEX API** | Leaderboard, positions, LARP detector, copytrade, mirror-watch, execution | W1 (reads) → W3 (writes) |
| **External APIs (Notion list)** | Fill gaps: CoinGecko/Alternative.me for fear-greed, CryptoPanic for secondary headlines, Etherscan for on-chain context | W2, W3 |
| **Buildathon access form** | Apply **in week 1 of W1 build** (by May 3). Request elevated quotas for both APIs. Attach our existing sodexscan.com as proof of seriousness. | Day 1 of W1 |
| **Discord Buildathon Channel** | Post weekly progress update with GIF. Ask one well-crafted question per week to stay visible to judges/sponsors. | Every week |
| **Kickoff workshop (Luma)** | One team member attends live, asks a question, names-drops our project | Pre-W1 |

---

## 7. Risk register & mitigations

| Risk | Mitigation |
|---|---|
| SoSoValue API access delayed → can't ship W1 integration | Apply via form on day 1. Have a fallback using public SoSoValue endpoints / Terminal scraping read-only, replaced with official API once granted. |
| Judges think we're submitting "an existing product with a thin SoSoValue veneer" | Every wave video opens with "what's new this wave." W1 ships a feature that *only* works because of SoSoValue (datasource-switched alerts + brief). W2 adds agent reasoning grounded in SoSoValue citations. W3 closes the loop. The delta per wave is the whole point. |
| Live execution breaks on Demo Day | Dry-run recorded backup video. Buildathon-specific test wallet pre-funded. Kill-switch demonstrable as a feature, not a bug. |
| One-person team bandwidth | W1 surfaces are 80% assembly of existing parts — protects against over-scoping. W3 risk controls double as bandwidth insurance (we can show the agent refusing a trade, which is itself a feature demo). |
| Forgetting to post a wave changelog | Add it to the submission checklist below. Missed changelog = zero on Functionality criterion. |

---

## 8. Per-wave submission checklist

For every wave, before the deadline:

- [ ] Feature flags on `main` match the wave's "public" set
- [ ] `README.md` "What's new in Wave N" section added
- [ ] Live demo URL verified working in clean browser
- [ ] Video recorded, uploaded, link tested in incognito
- [ ] Short written changelog in the Akindo submission form
- [ ] GitHub tag `wave-1` / `wave-2` / `wave-3` pushed
- [ ] Discord Buildathon Channel post with the video link
- [ ] Team info, contact, target users all updated
- [ ] Telegram demo bot reachable, `/start` works on a fresh account

---

## 9. Immediate next actions (this week, pre-W1 build window)

1. Submit the Buildathon API access form: https://forms.gle/2nuJT2qNbUQsyyZy8
2. Join the Discord Buildathon Channel; introduce sodexscan
3. Register for the Luma kickoff workshop
4. Spec out `DataSource` interface shape (used starting W1 for alerts, reused in W3)
5. Draft the W1 landing copy and video script outline
6. Set up feature-flag infra (if not already) so staged reveal is trivial
7. Branch strategy confirmed: keep `feature/design-system` for current work, per memory

---

## 10. Wave 1 build worklist (May 1 – May 12, 2026)

**Starting point:** everything currently in `main` + work-in-progress (alerts with mark/mid/bid/ask, Telegram bot wired, SoSoValue cache + cron, LARP detector, content planner, copytrade migration, realtime alert triggers). Treat all of that as the **W1 baseline** — it's what the repo looks like today.

### What to continue / finish during W1 (ship to `main`, flags on)

| # | Task | Effort | Why it's W1 |
|---|---|---|---|
| 1 | `DataSource` abstraction (SoDEX, SoSoValue) — the interface only, + 2 implementations for *reads* | 1 day | Underpins every wave; gets the "genuine SoSoValue integration" box ticked cleanly |
| 2 | **Alert datasource switch** (SoDEX mark/mid/bid/ask ↔ SoSoValue reference price) — dropdown in alert config, cron reads from selected source | 0.5 day | The cleanest, most visible SoSoValue feature on an existing shipped system |
| 3 | **Morning Brief v1 in Telegram** — fixed 08:00 UTC, one message: top 5 prices + 24h move, BTC/ETH ETF net flow (SoSoValue), 3 top headlines | 2 days | Hero W1 moment; judges can install the bot |
| 4 | **Smart Research Dashboard page** — new route `/research` pulling ETF flows panel + news ticker + market regime card, 100% SoSoValue-powered | 2 days | The "Smart Research Dashboard" example direction, made tangible |
| 5 | LARP detector **rebrand** to "Opportunity Discovery" surface (copy change + one overview card on `/research`) | 2h | Frames existing work under the buildathon thesis without rebuilding |
| 6 | **`/buildathon` landing page** with thesis, wave roadmap, changelog, demo-bot link | 0.5 day | Judge-facing home; kills the "is this just an existing product?" concern |
| 7 | **Feature-flag infra** (simple env + per-user allowlist) — gate all W2/W3 UI behind flags | 0.5 day | Lets us keep building ahead without leaking |
| 8 | README rewrite for buildathon framing, screenshots, setup instructions | 0.5 day | Required deliverable |
| 9 | Video recording + upload (90s, scripted) | 1 day | Required deliverable |
| 10 | Feedback loop — 1 Discord Buildathon post mid-wave, 1 at submit | ongoing | Visibility to judges/sponsors |

Total: ~8 dev-days + 1 day video. Comfortably fits 12 days solo.

### What NOT to start before Wave 2 begins (May 18)

- Strategy Assistant / LLM tool-use layer
- Custom-time / per-user Morning Brief scheduling
- Mirror-watch (copytrade-driven alerts with AI commentary)
- Content Planner "agentic journalism" public demo
- Any chart-in-Telegram image generation
- Any wallet-comparison tool

### What NOT to start before Wave 3 begins (Jun 4)

- Any write/execution path to SoDEX (order placement, cancel, modify)
- Risk-control panel (position caps, daily loss cap, cooldown)
- Double-confirmation / kill-switch UX
- `ExecutionVenue` abstraction and second venue wiring
- Public per-user audit log of agent actions
- Portfolio analytics / post-execution tracking
- Watchlist cache refactor, leaderboard materialized view, skeleton-loader sweep (save them for the W3 "polish" story)

### What to actively avoid at every wave

- Don't re-skin the existing product mid-wave — we want the old pages recognizable so the *new* wave delta is unmistakable
- Don't ship half-finished execution paths hidden in DevTools; judges poke
- Don't post the W2 feature in a W1 Discord update by accident

---

## 11. Feature idea pool

Pick from this when a wave has slack, or bank for post-buildathon. Grouped by layer so they're easy to slot into the right wave.

### Research / Insight (Wave 1 or 2 extras)
- **ETF Flow of the Day card** — SoSoValue daily ETF net-flow leaderboard embedded on `/research`
- **Whale ↔ ETF cross-chart** — overlay SoSoValue ETF flows and SoDEX whale net buying on one chart; the story is "is retail buying what institutions are buying?"
- **Index replication tracker** — compare user's SoDEX holdings against a chosen SSI index, show drift %
- **Market regime card** — bull / bear / crab classification from SoSoValue macro + on-chain velocity
- **Sentiment radar** — per-token news sentiment rollup (SoSoValue Terminal news, rolling 24h)
- **News-annotated price chart** — price line with pin markers for every SoSoValue headline touching that ticker
- **Fear & Greed merged wall** — SoSoValue + Alternative.me side-by-side, drift alert when they disagree
- **"What changed overnight"** home widget — diff of watchlist prices, flows and news vs. 24h ago

### Signals / Opportunity (Wave 2)
- **Copycat alerts** — "wallet X just opened a new SoDEX position" → TG DM with AI one-liner on why it might matter
- **Whale vs. flow divergence** — alert when whale net-buy contradicts ETF net-flow (opposite direction)
- **Source-drift alert** — fires when SoSoValue reference and SoDEX mark drift > N bps (arb signal, also a data-quality signal)
- **Liquidation heatmap** near current price, per pair
- **Funding-rate arb watch** — SoDEX funding vs. major CEX, flag gaps
- **Event calendar widget** — upcoming SSI rebalances, known ETF filing deadlines, token unlocks
- **Earnings-style alerts for crypto** — "BTC ETF decision tomorrow" card 24h before
- **Wallet-to-watchlist suggester** — user follows wallet X, we suggest the 3 tokens they're most exposed to
- **Inflow-driven watchlist auto-refresh** — top 10 inflow tokens of the day added to a system watchlist

### Agent / Reasoning (Wave 2 core)
- **`/ask` in Telegram** — LLM grounded on SoSoValue + SoDEX reads, citations required in every reply
- **`/explain TOKEN`** — 3 bullets: current price & 24h flow, latest relevant news, on-chain activity summary
- **`/chart TOKEN [tf]`** — generates PNG chart with news pins, returned in TG
- **Daily AI market note** — agentic journalism post at 07:30, before the Morning Brief; framed as a "one-person news agency"
- **Portfolio doctor** — weekly AI review of user's positions: concentration risk, correlation, drawdown vs. benchmark
- **"Why is this wallet profitable?"** — pattern detection on LARP leaderboard (scalper vs. swing, favorite pairs, entry-timing heuristics)
- **Model-tiered reasoning** — fast Haiku for `/brief` and `/explain`, Opus for `/ask` deep dives (already our CLAUDE.md routing)
- **Strategy backtester (read-only)** — "what if I'd copied wallet X for 30 days?" (uses existing historical data)
- **Multi-step agent with visible thought** — user sees "searching news → querying flows → computing correlation" as it works; demo gold

### Execution / Action (Wave 3 core)
- **Signal → confirm → execute loop** — the flagship W3 feature
- **Telegram one-tap copy-trade** — leaderboard wallet opens a position; user hits confirm; we mirror with user-defined size cap
- **Scheduled DCA agent** — "buy $X of ETH every Monday at 14:00 UTC, but skip if fear < 20"
- **Stop-loss / take-profit bot** with trailing options, all user-confirmed on create
- **Grid trading module** on SoDEX — only if time in W3
- **Portfolio rebalancer** — bring user's holdings into a chosen SSI index allocation (diff + execute plan)
- **Agent spending budget** — per-user USD cap per day the agent is allowed to transact without fresh human OK

### Risk / Trust (Wave 3 bonus — direct rubric hit)
- **Per-user position-size cap** (% of portfolio)
- **Daily loss cap** — agent disabled automatically after cap hit, admin-style override required
- **Cooldown after N losing trades** — anti-tilt mechanic, unique angle
- **Double-confirm** on any order > threshold
- **Pre-trade slippage estimate** visible in the confirm card
- **Public audit page** — per agent action: timestamp, data inputs, reasoning, outcome; this is the "trust through transparency" pitch
- **Kill switch** — big red button on `/agent/settings` with instant effect + Telegram confirmation

### Multi-broker / Multi-source (Wave 3 architectural)
- **`DataSource` interface** — `getPrice(symbol)`, `getFlows(symbol)`, `getNews(symbol, since)` with SoDEX, SoSoValue, CoinGecko implementations
- **`ExecutionVenue` interface** — `quote`, `placeOrder`, `cancelOrder`, `getPositions`; SoDEX live, stub for one more venue to prove the abstraction
- **Source-selection UI** at 3 touchpoints: alerts, brief content, agent grounding — same dropdown pattern throughout for consistency
- **Source health monitor** — small status widget: "SoSoValue: OK · SoDEX: OK · CoinGecko: lagging" so users see which source powers what

### Platform / Surfaces (any wave)
- **Discord bot** alongside Telegram — same commands, different surface (W2 stretch)
- **Email digest** alternative to Telegram Morning Brief — same content, daily 08:00 local
- **Mobile PWA** with push notifications — enables the "Morning Brief lands as push" moment without Telegram
- **Browser extension** — annotates any SoDEX wallet address on Twitter/X with leaderboard rank + last trades (insane virality potential, probably post-buildathon)
- **Shareable trade cards** — already have `pnlcard.png` infra; extend to "agent-suggested trade" cards with reasoning
- **X/Twitter post generator** — user approves an auto-drafted post about their position or a market event

### Growth / Stickiness (post-buildathon mostly, mention in video closer)
- **Agent performance leaderboard** — public, per-user agent PnL; gamifies the product
- **Referral codes** — already half-built in the repo
- **Watch-party mode** — multiple users follow the same leaderboard wallet live, see each other's reactions
- **Badge system** — "early buildathon user," "first agent trade," "survived -10% drawdown"

### UX / Clarity (sprinkle across waves; concentrate in W3)
- Skeleton loaders everywhere data is async (5 biggest pages)
- Error boundaries with retry, from existing `ROADMAP.md`
- Empty-state illustrations (no alerts, no watchlist, no positions)
- Google OAuth — drops signup friction for judges testing the demo
- Dark-mode polish (existing theme is basic)
- Onboarding coachmarks on first Telegram `/start` and first `/research` visit

---

## 12. Quick decision guide — where should an idea go?

When a new idea arrives mid-buildathon, use this:

- Is it a **read-only surface powered by SoSoValue**? → W1 if fast, W2 if needs LLM.
- Does it **reason, explain, or propose** but doesn't execute? → W2.
- Does it **execute, or need risk controls to be safe**? → W3.
- Does it only **polish / make existing flows prettier**? → W3 (bank as UX story).
- Does it **require a new abstraction layer** (broker, source, venue)? → W3 and ship with the abstraction.
- Can it **ship in under 4 hours and is highly demo-friendly**? → Slot into the current wave regardless; demos win judges.

---

## 13. Competitor scan — narralytica.xyz

What they are: a **single-focus decision-intelligence dashboard** for BTC/ETH. A weighted-signal layer that combines ETF Trend (20%), OI (16%), Depth (14%), Positioning (12%), Funding (10%), Breadth (6%), Fear/Greed (4%), and Price into a single "context" read. Includes signal alignment and invalidation logic.

What they're **not**: no Telegram, no Discord, no multi-asset coverage, no wallet leaderboard, no copy-trade, no execution, no user accounts (as far as visible), no social layer, no agentic workflows, BTC/ETH only.

**How we win the comparison on paper:**
- **Breadth** — every SoDEX pair vs. 2 assets.
- **Surfaces** — Telegram bot, web, email, (later) Discord + mobile PWA vs. one web page.
- **Depth** — LARP detector, wallet leaderboards, copy-trade, portfolio analytics, agentic news — they have none of this.
- **Execution** — we close the loop, they don't.
- **Teams** — we plan shared workspaces, they're single-user.
- **Their strong idea worth borrowing:** a weighted **Decision Layer module** with transparent metric weights and invalidation rules. Build ours as one page under `/research/decision`, per-asset, user-tunable weights. **Slot into W2.**

---

## 14. Mega feature list

Treat this as the full backlog. Every item tagged with suggested wave (W1/W2/W3/Post) and t-shirt effort (S ≤ 1d, M 2–4d, L ≥ 1w). "Post" = after the buildathon, but worth mentioning in the W3 video's closing slide to show vision.

### A. Accounts, Teams & Workspaces

The switch from a solo power-tool to a multi-seat platform is one of the biggest usability unlocks.

- **A1. Team workspace** with shared leaderboards, shared alerts, shared watchlists. Owner/admin/member roles. (Post, L — **but tease in W3 slide**)
- **A2. Invite flow** — email invite links with expiring tokens, accept page. (Post, M)
- **A3. Shared watchlist** inside a team. One person adds a wallet → everyone gets the alerts. (Post, M)
- **A4. Role-based permissions** — who can create/edit alerts, who can see execution audit, who can act on behalf of team. (Post, M)
- **A5. Team-level agent budget** — a single spending cap the whole team draws from. (Post, M)
- **A6. Activity feed** per team — "Alice added wallet X to watchlist," "Bob confirmed a signal." (Post, S)
- **A7. Team chat channel** — lightweight comment thread per wallet / alert / signal. (Post, M)
- **A8. Multi-tenant data model** — `org_id` column everywhere, RLS policies in Supabase. **Ship the migration in W3** even if UI is post-buildathon; it's a strategic foundation. (W3, M)
- **A9. Seat-based pricing** rails — Stripe customer + subscription per org. (Post, M)
- **A10. SSO / SAML** for serious orgs. (Post, L)
- **A11. Audit log per org** — every action attributed to a user. (Post, M)
- **A12. Shared "analyst notebook"** — rich-text notes per wallet/pair, visible to whole team. (Post, M)
- **A13. Team templates** — save a research dashboard layout, clone for every new team. (Post, M)
- **A14. Public team profile** — optional, for research shops wanting distribution. (Post, S)

### B. Identity & Auth

- **B1. Google OAuth** (W3, S) — existing drop-off fix
- **B2. Wallet connect (SIWE — Sign-In with Ethereum)** as primary or secondary auth. (W3, M) — fits the on-chain thesis
- **B3. Telegram-as-auth** — unlocks TG-first users. (W3, M)
- **B4. Magic link email** fallback. (Post, S)
- **B5. 2FA (TOTP + recovery codes)**. (Post, M)
- **B6. Session device list** — revoke sessions. (Post, S)
- **B7. Account recovery flow** with email + backup codes. (Post, M)

### C. Research & Data Exploration

- **C1. Research hub `/research`** with ETF flows, news, regime card. (W1, M) ← already in plan
- **C2. Per-asset deep dive page** — one URL, one ticker, everything we know. (W2, M)
- **C3. Whale ↔ ETF overlay chart**. (W2, M)
- **C4. Sentiment radar** per token (Terminal news rolling 24h + CryptoPanic). (W2, M)
- **C5. News-annotated price chart**. (W2, M)
- **C6. Market regime classifier** card (bull / bear / crab). (W2, S)
- **C7. Fear & Greed merged wall** (SoSoValue + Alternative.me). (W1, S)
- **C8. "What changed overnight"** widget. (W2, S)
- **C9. Index replication tracker** (SSI index vs. user holdings). (W2, M)
- **C10. Token metadata panel** — supply, FDV, holders (Etherscan), social links. (W2, S)
- **C11. Correlations matrix** — rolling 30d correlation across user's watchlist. (W2, M)
- **C12. Macro backdrop card** — DXY, SPX, gold, 10Y yields via a common-APIs source. (W2, S)
- **C13. On-chain activity tape** — tx count, active addresses, gas. (W2, M)

### D. Signals, Decision Layer & Opportunity Discovery

- **D1. Narralytica-style Decision Layer** — weighted composite signal per asset, user-tunable weights, invalidation rules shown. **Main competitive counter.** (W2, M)
- **D2. Source-drift alert** (SoSoValue ref vs. SoDEX mark > N bps). (W2, S)
- **D3. Funding-rate arb watch** (SoDEX vs. CEX). (W2, M)
- **D4. Whale vs. flow divergence** alert. (W2, M)
- **D5. Liquidation heatmap** near price. (W2, M)
- **D6. Event calendar** — SSI rebalances, ETF filings, unlocks. (W2, S)
- **D7. Wallet pattern classifier** — scalper / swing / copy-trader. (W2, M)
- **D8. Top-wallet consensus signal** — "7 of top 20 LARP wallets long ETH right now." (W2, M)
- **D9. Entry-timing heatmap** — what times of day top wallets open positions. (W2, M)
- **D10. Strategy backtester (read-only)** over the existing historical data. (W2/W3, L)
- **D11. ETF flow leaderboard of the day**. (W1, S)
- **D12. Mean-reversion / momentum flag** per pair. (W2, S)

### E. Alerts & Notifications

- **E1. Datasource switch on price alerts** (SoDEX ↔ SoSoValue). (W1, S) ← in plan
- **E2. Alert history UI + realtime feed**. (W2, S)
- **E3. Multi-condition alerts** (AND/OR trees: "price < X AND funding > Y"). (Post, M)
- **E4. Alert snoozing and per-alert quiet hours**. (Post, S)
- **E5. Alert templates** — "whale opens > $1M position," "ETF net flow flips negative." One-click add. (W2, S)
- **E6. Per-channel routing** — alert A → Telegram only, alert B → Telegram + email. (Post, S)
- **E7. Rate-limiting / aggregation** — bundle 10 alerts in a 60s window into one TG message with details. (W2, S)
- **E8. Escalation** — if not acknowledged in N minutes, re-fire louder / to a second channel. (Post, M)
- **E9. Auto-expire & auto-pause** after N triggers. (W1, S — partially exists)
- **E10. Alert shared-link** — one URL that preloads the alert config for a friend. (Post, S)
- **E11. Alert "explain why"** — when an alert fires, an AI line explains the likely cause using SoSoValue news + flow context. (W2, M)

### F. AI Agents & Copilots

- **F1. `/ask` grounded LLM in Telegram + web** with citations required. (W2, M)
- **F2. `/explain TOKEN`** — 3-bullet context. (W2, S)
- **F3. `/chart TOKEN [tf]`** — chart PNG with news pins. (W2, M)
- **F4. Portfolio Doctor** weekly AI review. (W2/W3, M)
- **F5. "Why is this wallet profitable?"** AI explanation. (W2, M)
- **F6. Daily AI market note** (agentic journalism). (W2, M)
- **F7. Strategy Assistant chat** on web with tool-use visible. (W2, M)
- **F8. Multi-model tier routing** — Haiku for light, Sonnet for standard, Opus for deep. (W2, S)
- **F9. Saved "agent skills"** — user writes a prompt + pins it as a button, like ChatGPT GPTs. (Post, M)
- **F10. Compare two wallets with AI commentary**. (W3, M)
- **F11. Agent timeline view** — see every question asked, every answer, linkable. (W3, S)

### G. Execution & Trading (W3 only; nothing earlier)

- **G1. Signal → confirm → execute loop.** (W3, L)
- **G2. TG one-tap copy-trade** from a leaderboard wallet. (W3, M)
- **G3. Scheduled DCA** (cron + agent). (W3, M)
- **G4. Stop-loss / take-profit bot**, with trailing. (W3, M)
- **G5. Grid trading module**. (Post, L)
- **G6. Portfolio rebalancer** — diff user holdings vs. a target (SSI or custom), show + execute plan. (Post, L)
- **G7. Pre-trade slippage estimator** built into the confirm card. (W3, S)
- **G8. Dry-run mode** — execute against a sim wallet with real market data. (W3, M)

### H. Copy-trading & Social

- **H1. Mirror-watch** (alerts when followed wallet opens/closes, AI commentary). (W2, M) ← in plan
- **H2. One-click copy-trade** (actual copy, sized by cap). (W3, M)
- **H3. Leaderboard-based copy baskets** — auto-follow top 5 LARP wallets. (Post, M)
- **H4. Public agent-PnL leaderboard** — opt-in. (Post, M)
- **H5. Follower graph** — see who copies whom. (Post, S)
- **H6. "Steal this strategy" button** — clone a user's alert set + watchlist. (Post, S)
- **H7. Wallet tagging and shared tags** (community-sourced labels). (Post, M)

### I. Portfolio & Performance Analytics

- **I1. `/portfolio` page for the user's own wallet** — PnL, win rate, drawdown, best pair. (W3, M)
- **I2. Benchmark comparison** — your return vs. SSI index vs. BTC. (W3, M)
- **I3. Daily/weekly equity curve**. (W3, S)
- **I4. Per-pair attribution** — which pairs made/lost you money. (W3, M)
- **I5. Trade-by-trade log export (CSV)**. (Post, S)
- **I6. Tax estimate module** — unrealized vs. realized, FIFO. (Post, L)
- **I7. Risk metrics** — Sharpe, Sortino, max DD. (W3, S)

### J. Content, News & Agentic Journalism

- **J1. Content Planner public surface** — queue + published posts. (W2, M)
- **J2. Daily AI market note at 07:30 UTC.** (W2, M)
- **J3. Weekly deep-dive article** on a featured token. (Post, M)
- **J4. Article → Telegram broadcast** for subscribers. (W2, S)
- **J5. SEO-friendly article URLs** + OG cards. (Post, S)
- **J6. User comments + reactions on articles**. (Post, M)
- **J7. "Cite my trade" tool** — embed a trade card into an article. (Post, S)
- **J8. Editorial review queue** — human approval before auto-publish. (W2, S)

### K. Bots & Surfaces

- **K1. Telegram bot** — already live; add `/brief`, `/ask`, `/explain`, `/chart`, `/alerts`, `/watch`, `/portfolio`. (W1→W3, progressive)
- **K2. Discord bot** — same command set, different surface. (Post, M)
- **K3. Email digest** — daily/weekly, user-configurable sections. (Post, M)
- **K4. Mobile PWA** with push notifications via web push. (Post, M)
- **K5. Browser extension** — annotate any SoDEX wallet on X/Twitter + Telegram + Discord with leaderboard rank + recent trades. (Post, L) — highest virality bet
- **K6. iOS/Android native shells** (Capacitor wrap of PWA). (Post, M)
- **K7. Widget set** — sharable iframe/embed for blogs and Twitter cards. (Post, M)
- **K8. TradingView custom indicator** pulling our signals. (Post, L) — credibility move
- **K9. Raycast / Alfred extension** — launcher hotkey for `/ask`. (Post, S) — power-user delight
- **K10. WhatsApp bot** (Post, M) — untapped in crypto

### L. Sharing, Virality & Community

- **L1. Shareable PnL cards** (extend existing `pnlcard.png` infra with new templates). (W3, S)
- **L2. "Agent suggested this trade" cards** — shareable reasoning snapshot. (W3, S)
- **L3. X/Twitter post draft generator** from portfolio events. (Post, M)
- **L4. Public wallet-analysis pages** with OG images. (Post, M) — SEO play
- **L5. Referral program with codes + leaderboard**. (Post, M) — already partially in repo
- **L6. Badges** — "first agent trade," "survived -10% DD," "early builder." (Post, S)
- **L7. Weekly recap email** — "your week with CommunityScan." (Post, M)
- **L8. Public "signal wall"** — opt-in stream of everyone's agent signals. (Post, M)

### M. Monetization & Pricing

- **M1. Pricing page + Stripe checkout**. (Post, M)
- **M2. Free / Pro / Team tiers** — free gets 3 alerts, Pro unlimited, Team includes seats. (Post, M)
- **M3. Metered billing for agent usage** (LLM calls + executions). (Post, L)
- **M4. Credit system** for heavy AI features (`/ask` with Opus costs credits). (Post, M)
- **M5. Free-trial of Pro for Buildathon voters** — direct CTA in W3 video. (W3, S)
- **M6. Annual plan with discount**. (Post, S)
- **M7. Gift plans / team bulk licenses**. (Post, S)
- **M8. Affiliate / referral payouts**. (Post, M)

### N. Admin, Ops & Internal Tools

- **N1. Admin usage panel** — partially exists (`app/api/admin/usage/`). Extend with per-user stats, top wallets, top alerts. (W3, S)
- **N2. Feature-flag dashboard** (UI over the flag store). (W3, S)
- **N3. Cron-job health page** — last run, status, success rate per cron. (W3, S)
- **N4. Sentry + PostHog wiring**. (W3, S)
- **N5. BetterUptime / status page** public. (Post, S)
- **N6. Cost dashboard** — Supabase + OpenAI + Anthropic + Vercel combined spend. (Post, M)
- **N7. Support inbox** (integrated with email/TG). (Post, M)
- **N8. Feedback widget** on every page (Post, S)

### O. Data Infrastructure & Pipelines

- **O1. `DataSource` interface** with SoDEX + SoSoValue reads. (W1, S)
- **O2. `ExecutionVenue` interface** with SoDEX live + one stub. (W3, M)
- **O3. Source-health monitor** widget. (W3, S)
- **O4. Materialized leaderboard view**. (W3, S) — from existing ROADMAP
- **O5. Watchlist positions cache** cron. (W3, M) — from existing ROADMAP
- **O6. Upstash Redis** for hot queries. (Post, M) — from existing ROADMAP
- **O7. Data-quality checks** — stale-data sentinel on every surface. (W3, S)
- **O8. Backfill tools** — CLI to re-run a cron for a date range. (Post, M)
- **O9. Job queue (BullMQ / Inngest)** for agent tasks. (Post, M)
- **O10. Dune + Etherscan + Nansen-free-tier integrations** via `DataSource`. (Post, M)

### P. Security, Privacy & Compliance

- **P1. Per-user agent spending cap + daily loss cap**. (W3, S)
- **P2. Kill switch** on agent. (W3, S)
- **P3. Double-confirm on orders > threshold**. (W3, S)
- **P4. Risk disclaimer on first agent use**. (W3, S)
- **P5. Rate-limit + abuse detection** on public endpoints. (Post, S)
- **P6. GDPR delete-me flow**. (Post, M)
- **P7. Encrypted storage for any exchange keys** (if ever needed). (Post, M)
- **P8. Bug-bounty page** / security.txt. (Post, S)
- **P9. SOC-2-lite** internal controls checklist. (Post, L)

### Q. Settings & Personalization

- **Q1. Per-user timezone** (drives custom-brief time, daily summaries). (W2, S)
- **Q2. Per-user locale** for number / date formatting. (Post, S)
- **Q3. Notification channel preferences** (TG on, email off, etc.). (W2, S)
- **Q4. Display preferences** — dark/light/high-contrast, compact/spacious. (W3, S)
- **Q5. Favorite pairs pinning** at the top of lists. (Post, S)
- **Q6. Custom dashboard layout** — drag-drop widgets. (Post, L)
- **Q7. Keyboard shortcuts** (`?` opens cheatsheet). (Post, S)
- **Q8. Saved views** on leaderboard / research pages. (Post, S)

### R. UX, Accessibility & i18n

- **R1. Skeleton loaders** on big pages. (W3, S)
- **R2. Error boundaries** + retry buttons. (W3, S)
- **R3. Empty-state illustrations**. (W3, S)
- **R4. Global command palette** (`Cmd-K`) — search wallets, pages, pairs. (Post, M)
- **R5. Toast system** unified. (W3, S)
- **R6. Onboarding coachmarks** first `/start`, first `/research`. (W3, S)
- **R7. i18n framework + JP locale first** (AKINDO is JP-rooted — win favour). (Post, M)
- **R8. WCAG AA color + focus states**. (Post, M)
- **R9. Mobile responsive pass** on every page. (Post, M)
- **R10. Print-friendly portfolio page**. (Post, S)

### S. Onboarding & Growth

- **S1. Interactive `/demo` sandbox** — try every feature against fake data, no signup. (W3, M) — BIG judge magnet
- **S2. 3-step onboarding wizard** — pick watchlist, connect TG, set Morning Brief time. (W2, M)
- **S3. "Try this example query"** prompts on the Strategy Assistant. (W2, S)
- **S4. Email course** — 5-day series on "how to trade with an agent." (Post, M)
- **S5. Product Hunt launch prep**. (Post, M)
- **S6. Open-source starter kit** — clone the `DataSource`/`ExecutionVenue` interfaces as a public repo. (Post, L) — developer community play

### T. Developer Platform / Public API

- **T1. Public REST API** for alerts + signals, with API keys. (Post, L)
- **T2. Webhooks** — user-configured URL hit on signal / alert / trade. (Post, M)
- **T3. Zapier / Make integration**. (Post, M)
- **T4. MCP server** exposing our tools to Claude Desktop / Cursor. (Post, M) — on-brand for buildathon bonus
- **T5. Slack app**. (Post, M)

### U. Third-party integrations (Notion "Common APIs" list)

High-free-tier crypto + data APIs worth wiring via our `DataSource`:

- **U1. CoinGecko** (free) — cross-check prices, supply, FDV. (W2, S)
- **U2. CoinMarketCap** (free tier) — alt source for price. (W2, S)
- **U3. DefiLlama** — TVL, chain stats, stablecoin flows. (W2, M)
- **U4. Alternative.me** — Fear & Greed. (W1, S)
- **U5. CryptoPanic** — news aggregation with sentiment. (W2, S)
- **U6. Etherscan / Alchemy / Infura** — on-chain context, tx lookups. (W2, M)
- **U7. Dune** — ad-hoc analytics. (Post, M)
- **U8. The Graph** subgraphs — historical on-chain queries. (Post, M)
- **U9. LunarCrush / Santiment** — social sentiment. (Post, M)
- **U10. Messari** — protocol fundamentals. (Post, M)
- **U11. CoinDesk/NewsAPI** — secondary news. (Post, S)
- **U12. Binance public API** — cross-venue depth for funding-arb. (W2, M)
- **U13. X/Twitter API** — feed of key influencer accounts + our own posting. (Post, M)
- **U14. Google Calendar / ICS** — event calendar imports. (Post, S)

### V. Experimental / Moonshots (mention in W3 closing slide)

- **V1. Agent marketplace** — publish your signal/agent, others subscribe. (Post)
- **V2. On-chain verifiable agent trail** — every agent action hashed on-chain for trust. (Post)
- **V3. Voice mode** in Telegram — send a voice note, get an analyst reply. (Post)
- **V4. Vision on charts** — user screenshots a chart, agent analyzes it. (Post)
- **V5. "Paper AUM" tournament** — monthly, agents compete with sim capital; winners get real prize pool. (Post)
- **V6. Agent MCP server for Claude Desktop / Cursor** — lets devs trade via IDE. (Post)
- **V7. Podcast auto-generated** from the daily market note (TTS). (Post)
- **V8. NFT badges for top users**, soulbound. (Post)

---

## 15. Where usability actually improves the most

If the goal is "our site is really usable," the highest-leverage moves are **not** features — they're infrastructure. In priority order:

1. **Teams + shared data model** (A8 → A1) — converts the product from a toy to a tool a group will pay for.
2. **Interactive `/demo` sandbox** (S1) — every judge, investor and potential user has a zero-friction way to try the product.
3. **Onboarding wizard** (S2) — the first 90 seconds determine retention.
4. **Skeleton loaders + error boundaries + empty states** (R1-R3) — makes the existing product feel finished.
5. **Notification channel preferences + per-user timezone** (Q1, Q3) — unlocks custom Morning Brief, basis for every future personalization.
6. **`DataSource` + `ExecutionVenue` abstractions** (O1, O2) — unlocks multi-broker story and every future integration.
7. **Command palette (`Cmd-K`)** (R4) — power-user delight, raises the perceived quality ceiling.
8. **Public API + webhooks** (T1, T2) — long-tail of third-party growth, impresses technical judges.

These eight, done well, make the difference between "cool hackathon project" and "product I'd sign up for."
