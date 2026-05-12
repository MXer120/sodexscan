# Changelog

---

## W3 — AI Overhaul & Public Launch  ·  Apr 30 – May 12, 2026

### Auth & access
- Site is now open to all visitors — maintenance gate in `middleware.ts` disabled
- Sidebar footer is auth-aware: shows real user email + working logout when logged in, "Sign In" button when logged out; both logout buttons (workspace dropdown + footer) call `supabase.auth.signOut()`
- `/ai` page requires login — anonymous visitors see a sign-in prompt
- Admin page opened to all logged-in users; rate limits bypassed for own API keys
- Buildathon role added

### AI — CommunityScan AI (major overhaul)
- Renamed from "AI Assistant" to CommunityScan AI throughout
- **Chat blocks** — structured response cards embedded inline:
  - ETF inflow chart: full redesign with composed chart, green inflows, overflow tabs, cumulative calc, combined default view
  - TopTraders: real win rates, sparklines, 2-block example
  - Referral stats block
  - PnL chart block
  - Copyable wallet addresses
- **Plan tracker** — top-right overlay shows tool execution steps with states (running / done / warning / failed); updates live during streaming
- **Queue & stop** — toolbar collapse into More menu, stop button, queue bubble redesign
- **Scheduling page** — model selector (CommunityScan / Groq / Google Gemini), Telegram & Discord delivery, 24h/AM-PM time picker, UTC label, preview banner
- **Chat UX** — input stays typeable during generation; Chat nav always opens a fresh chat; welcome screen redesigned; chat flicker on navigation fixed
- **Chat history** — loading fixed; omnisearch added to AI sidebar
- **Knowledge Base** — KB logo updated to green
- **Google key pool rotation** — supports `GOOGLE_GENERATIVE_AI_API_KEY_2..10` for automatic rotation under quota
- **Error handling** — propagate actual retry-after time from upstream; round display nicely; minimal limit error shows model name, reset time, and "Add API key" button only
- **Examples** — live block previews on example prompts (no AI call needed); full chat shown on AI error
- System prompt made non-prescriptive to reduce hallucination
- ETF fallback example aligned to real response format
- Various TypeScript and build fixes (mixed `??`/`||` parens, `get_trades` typed args, TS build error in plan states)

### Settings
- Clickable API key links for Groq and Google AI added to settings page
- "Get your free API key here" hint text and underlined link

### Roadmap
- SoSoValue item renamed; statuses adjusted; wallet connection detail removed

### Database
- RLS enabled on `ai_rate_limit_log`

### Project hygiene
- `/scripts`, `/docs`, dev tooling and AI config files removed from repo
- `README.md` added with setup instructions, tech stack, env vars reference, auth table, and feature descriptions
- `CHANGELOG.md` added

---

## W2 — Feature Expansion  ·  Mar 1 – Apr 29, 2026

### Design system
- Design System page added at `/design-system` with Dashboard preview
- `nav_config` DB entry and admin panel entry added
- Full theme isolation, 3-tab layout, navbar clearance fixed
- KPI cards: restore all 4, fix info icon deduplication, remove suffix text, canvas background, crosshair
- Interactive components, KPI footer fix, sidebar SVG icons
- `--ds-*` tokens defined globally on `:root` in `index.css`

### Alert system
- Full alerts page — 15 alert types across 5 categories (price, volume, etc.)
- Telegram bot integration: server-side token, correct webhook URLs, keep-warm GET handler, bot username `communityscan_bot`
- Live prices and realtime sync on alerts page
- Mark / mid / bid / ask price type selector

### Maintenance gate (superseded in W3)
- Middleware-based gate added to block non-admin visitors
- Cookie-based bypass (`mnt-verified=1`, 24h TTL); fail-closed error handling
- Admin-only login flow via `/api/maintenance-verify`

### Scanner upgrades (Sodex API)
- Official Sodex API integrated; deprecated old DB-backed tabs
- New scanner tabs: funding, spot trades (merged), market widget with sorting and combined view
- Funding tab: use `fundingFee` field, no rounding, direction from sign
- Infinite scroll for funding and spot tabs
- `isBlockedAccount` fix; account 1515 blocked at data level

### Leaderboard & SoPoints (W2 refinements)
- Sodex API as source for total all-time LB (zero DB calls)
- Weekly LB sync: oldest-first, batch 150/run, 1-min interval, timeout fix, skip no-op upserts
- "Your Row" uses Sodex rank API; shows skeleton shimmer while loading
- `Nuclear` cache: version auto-invalidates stale localStorage, TTL 2 min
- Export only new weeks, never overwrite historical
- Fix export CI; freeze cron to Saturday 00:00 UTC
- pg_cron: hourly LB sync; daily reindex cron at 04:00 UTC
- `upsert_leaderboard_batch` RPC updated: `unrealized_pnl` + `first_trade_ts_ms`
- BEFORE UPDATE trigger added to suppress no-op writes
- Leaderboard bloat fix (262 MB → 27 MB after vacuum + reindex)
- Weekly Total PnL: use `sodex_pnl` not futures; add sort options

### Aggregator
- Hotkey added; smaller horizontal grid increments; more widgets
- Assistant, tutorial, edit mode, performance mode
- Platform templates; bug fixes

### Auth & permissions
- Google OAuth security upgrade
- `handle_new_user` trigger fix (`ON CONFLICT`)
- Admin nav hidden for non-mods; page auth enforced from `page_config`
- OG images use favicon SVG + dark background

### Performance & DB
- 52 Supabase security linter warnings fixed (search_path + RLS)
- RLS enabled on 3 internal infrastructure tables
- 16 performance warnings fixed: RLS initplan, duplicate/unused indexes, missing FK indexes
- Egress optimization: cache Sodex LB and wallet responses; reduce cron frequency
- `egress+loading`: kill `select(*)`, fix daily hang, consolidate queries
- Remove `search_history` table, unused lib, and cron

### Ticket system (internal)
- Ticket system v1: mod roles, Discord bot, ticket dashboard
- Auto-assigned tickets, mod orange highlight, dropdowns
- Ticket close redirects to correct ticket view

### UI & UX
- Smooth page transitions
- Skeleton mesh on all pages
- Consistent navbar across all roles
- SEO and AI SEO improvements
- Aggregator black screen fixed
- Realtime updates for scanner and scan widgets

---

## W1 — Foundation  ·  Jan 21 – Feb 28, 2026

### Project setup
- Initial commit; Next.js app with Supabase sync deployment
- Vercel Web Analytics and Speed Insights integrated
- Rebranding to CommunityScan Sodex

### Scanner (core feature)
- Scanner V2: full redesign with coin logos, responsive layout
- Tier 1 / Tier 2 data loading distinction for faster initial display
- Faster loading animation; reduced delay to first data
- Sticky headers; asset view for performance tab
- Realtime updates for scan and scan widgets
- PnL chart scale and colour breakpoint alignment fixed
- Load-on-scroll working again after regression
- Liquidation price logic updated + MMR added
- Transfer overview + delta display

### Leaderboard & SoPoints
- Leaderboard: CSV → Supabase, export function added
- Correct LB ranking; page-specific DB requests; caching added
- Week-based leaderboard and SoPoints estimate
- Spot LB: Sodex wallet exclusion, `<1pt` redistribution, reordering
- SoPoints page V1: overview, estimated LB, legacy view
- Personal competitiveness score on SoPoints page
- Full automation for spot LB and weekly snapshots
- Spot LB week 6 bug fixes
- SoPoints disclaimer added

### Auth system
- Email/password + Google OAuth (signup and login)
- Google auth security upgrade; multiple OAuth fixes
- Privacy Policy, Impressum, T&C pages added for OAuth compliance
- Wallet Tags & Groups system; own wallet linking in profile page

### AI (v1)
- AI chat v1, v2, v3 implementation
- PnL Calendar — weekly, monthly, yearly views with popup detail
- Hover overview in yearly PnL chart

### Profile & UX
- Profile page: own wallet, rank display, optimized queries
- Updated login/register UX
- Announcement bar (multiple types, ad as default)
- Sign-up CTA; landing page scan box functionality restored
- Notifications and share button
- Mobile: full mobile support, bottom navbar, command palette (cmdk), search bar enhancements

### Watchlist & search
- Functioning watchlist with Supabase persistence
- Reverse Search V1
- Public DNS + referral page
- Search by rank and public DNS

### Coin & asset display
- Coin logo matching across all pages
- BaseCoin matching fixed
- Support for defissi, memessi, ussi logos
- Document titles added

### Platform tools
- Platform Calculator
- Platform Size and Growth projection
- Aggregator V1 with admin page navbar config; full control via admin/pages
- Permission consistency: stored in localStorage for 6h; admin and profile bug fixes
- Quick access to ~40 external scanners

### DB & infrastructure
- SodexDesign Language schema; Top 10 24h pairs; new users tracking
- Leaderboard: exclude Sodex-owned wallets; show sync status; show zero data setting
- Query optimisation passes
- V0.1 label on light mode; Paper theme; light mode added
